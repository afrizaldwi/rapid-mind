/// <reference lib="webworker" />

import {
    env,
    pipeline,
    type AutomaticSpeechRecognitionPipelineType,
} from "@huggingface/transformers";
import ortWasmModuleUrl from "../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url";
import ortWasmBinaryUrl from "../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url";
import type {
    WhisperBackend,
    WhisperWorkerEvent,
    WhisperWorkerRequest,
} from "./types";

declare const self: DedicatedWorkerGlobalScope;

const MODEL_ID = "cmaree/Bagus-whisper-small-id-onnx";
const ONNX_RUNTIME_CACHE = "rapid-mind-onnx-runtime-v1";
// Use q4 (int4 weights with FP32 activations) on both WebGPU and WASM.
// Empirical testing on Bagus-whisper-small-id-onnx showed q4f16 causes FP16
// WebGPU shader token drift ("ssaya" / 448-token repetition loops) and 2.5x–3.8x
// slower FP16 emulation on WASM, whereas q4 achieves 100% transcript accuracy
// on both backends while sharing the same cached ONNX artifacts.
const WHISPER_DTYPE = {
    encoder_model: "q4",
    decoder_model_merged: "q4",
} as const;

env.useBrowserCache = true;
const wasmEnvironment = env.backends.onnx.wasm;
if (!wasmEnvironment) throw new Error("ONNX WASM runtime tidak tersedia.");
const mjsAssetUrl = new URL(ortWasmModuleUrl, self.location.origin).href;
const wasmAssetUrl = new URL(ortWasmBinaryUrl, self.location.origin).href;
wasmEnvironment.wasmPaths = {
    mjs: mjsAssetUrl,
    wasm: wasmAssetUrl,
};
wasmEnvironment.numThreads = self.crossOriginIsolated
    ? Math.min(
          8,
          Math.max(2, Math.floor((self.navigator?.hardwareConcurrency || 4) / 2)),
      )
    : 1;

let transcriber: AutomaticSpeechRecognitionPipelineType | null = null;
let backend: WhisperBackend | null = null;
let preparing: Promise<void> | null = null;
let processing = false;
let activeTranscribeId = 0;
let offlineMjsBlobUrl: string | null = null;

function emit(event: WhisperWorkerEvent): void {
    self.postMessage(event);
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function fetchAndCacheRuntimeAsset(
    cache: Cache,
    url: string,
): Promise<Response | undefined> {
    const cached = await cache.match(url);
    if (cached) return cached;
    if (!self.navigator.onLine) return undefined;
    try {
        const response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) {
            await cache.put(url, response.clone());
            return response;
        }
    } catch {
        // Ignore network failure and rely on existing cache if present.
    }
    return undefined;
}

async function ensureOfflineWasmRuntime(): Promise<void> {
    if (!("caches" in self) || !wasmEnvironment) return;
    try {
        const cache = await self.caches.open(ONNX_RUNTIME_CACHE);
        const [mjsResponse, wasmResponse] = await Promise.all([
            fetchAndCacheRuntimeAsset(cache, mjsAssetUrl),
            fetchAndCacheRuntimeAsset(cache, wasmAssetUrl),
        ]);
        if (wasmResponse && !wasmEnvironment.wasmBinary) {
            wasmEnvironment.wasmBinary = await wasmResponse.arrayBuffer();
        }
        if (!self.navigator.onLine && mjsResponse && !offlineMjsBlobUrl) {
            const mjsBuffer = await mjsResponse.arrayBuffer();
            offlineMjsBlobUrl = URL.createObjectURL(
                new Blob([mjsBuffer], { type: "text/javascript" }),
            );
            wasmEnvironment.wasmPaths = {
                mjs: offlineMjsBlobUrl,
                wasm: wasmAssetUrl,
            };
        }
    } catch {
        // Non-fatal: continue with default asset URLs.
    }
}

async function createPipelineWithOptions(
    selectedBackend: WhisperBackend,
    localFilesOnly: boolean,
) {
    return pipeline("automatic-speech-recognition", MODEL_ID, {
        device: selectedBackend,
        dtype: WHISPER_DTYPE,
        local_files_only: localFilesOnly,
        progress_callback: (progress) => {
            emit({
                type: "MODEL_PROGRESS",
                backend: selectedBackend,
                file: "file" in progress ? progress.file : undefined,
                progress:
                    progress.status === "progress"
                        ? Math.round(progress.progress)
                        : undefined,
            });
        },
    });
}

async function createPipeline(selectedBackend: WhisperBackend) {
    await ensureOfflineWasmRuntime();
    const preferLocalOnly = !self.navigator.onLine;
    try {
        return await createPipelineWithOptions(selectedBackend, preferLocalOnly);
    } catch (error) {
        if (!preferLocalOnly) {
            return await createPipelineWithOptions(selectedBackend, true);
        }
        throw error;
    }
}

async function warmupPipeline(
    instance: AutomaticSpeechRecognitionPipelineType,
): Promise<void> {
    try {
        const silentSample = new Float32Array(8_000);
        await instance(silentSample, {
            language: "Indonesian",
            task: "transcribe",
        });
    } catch {
        // Warmup failure is non-fatal; actual transcription will still run.
    }
}

async function prepare(requestedBackend?: WhisperBackend): Promise<void> {
    if (transcriber && backend) {
        emit({ type: "READY", backend });
        return;
    }
    if (preparing) return preparing;

    preparing = (async () => {
        if (requestedBackend !== "wasm" && "gpu" in navigator) {
            try {
                transcriber = await createPipeline("webgpu");
                backend = "webgpu";
            } catch (error) {
                transcriber = null;
                backend = null;
                emit({
                    type: "BACKEND_FALLBACK",
                    message: errorMessage(error),
                });
            }
        }

        if (!transcriber) {
            try {
                transcriber = await createPipeline("wasm");
                backend = "wasm";
            } catch (wasmError) {
                throw new Error(errorMessage(wasmError));
            }
        }

        const readyBackend = backend;
        if (!readyBackend || !transcriber) {
            throw new Error("Backend Whisper tidak tersedia.");
        }
        await warmupPipeline(transcriber);
        emit({ type: "READY", backend: readyBackend });
    })()
        .catch((error) => {
            emit({
                type: "ERROR",
                stage: "prepare",
                message: errorMessage(error),
            });
        })
        .finally(() => {
            preparing = null;
        });

    return preparing;
}

async function transcribe(audio: Float32Array): Promise<void> {
    if (!transcriber || !backend || processing) return;
    processing = true;
    const transcribeId = ++activeTranscribeId;
    emit({ type: "PROCESSING", backend });

    try {
        const result = await transcriber(audio, {
            language: "Indonesian",
            task: "transcribe",
        });
        if (transcribeId !== activeTranscribeId) return;
        const item = Array.isArray(result) ? result[0] : result;
        emit({
            type: "RESULT",
            backend,
            transcript: item?.text?.trim() ?? "",
        });
    } catch (error) {
        if (transcribeId !== activeTranscribeId) return;
        emit({
            type: "ERROR",
            stage: "transcribe",
            message: errorMessage(error),
        });
    } finally {
        if (transcribeId === activeTranscribeId) {
            processing = false;
        }
    }
}

function cancelTranscription(): void {
    activeTranscribeId += 1;
    processing = false;
}

async function dispose(): Promise<void> {
    cancelTranscription();
    await preparing;
    await transcriber?.dispose();
    transcriber = null;
    backend = null;
    if (offlineMjsBlobUrl) {
        URL.revokeObjectURL(offlineMjsBlobUrl);
        offlineMjsBlobUrl = null;
    }
    emit({ type: "DISPOSED" });
}

self.addEventListener(
    "message",
    (event: MessageEvent<WhisperWorkerRequest>) => {
        switch (event.data.type) {
            case "PREPARE":
                void prepare(event.data.backend);
                break;
            case "TRANSCRIBE":
                void transcribe(event.data.audio);
                break;
            case "CANCEL":
                cancelTranscription();
                break;
            case "DISPOSE":
                void dispose();
                break;
        }
    },
);
