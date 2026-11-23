/// <reference lib="webworker" />

import {
    env,
    pipeline,
    type AutomaticSpeechRecognitionPipelineType,
} from "@huggingface/transformers";
import ortWasmModuleUrl from "../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url";
import ortWasmBinaryUrl from "../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url";
import { cachedWhisperRuntime, WhisperRuntimeCacheError } from "./whisperRuntimeCache";
import { WHISPER_MODEL_CACHE, WhisperModelCache, WhisperModelCacheError } from "./whisperModelCache";
import type {
    WhisperBackend,
    WhisperPreparationStage,
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

let modelCache: WhisperModelCache | null = null;
let transcriber: AutomaticSpeechRecognitionPipelineType | null = null;
let backend: WhisperBackend | null = null;
let preparing: Promise<void> | null = null;
let processing = false;
let activeTranscribeId = 0;
let offlineMjsBlobUrl: string | null = null;
let disposed = false;
let preparationStage: WhisperPreparationStage = "runtime_assets";
let preparationBackend: WhisperBackend | undefined;
let preparationStarted = 0;

function setPreparationStage(stage: WhisperPreparationStage, selectedBackend = preparationBackend, force = false): void {
    if (!force && stage === preparationStage && selectedBackend === preparationBackend) return;
    preparationStage = stage;
    preparationBackend = selectedBackend;
    emit({ type: "PREPARATION_STAGE", stage, backend: selectedBackend, elapsedMs: Date.now() - preparationStarted });
}

function emit(event: WhisperWorkerEvent): void {
    if (!disposed || event.type === "DISPOSED") self.postMessage(event);
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function ensureOfflineWasmRuntime(): Promise<void> {
    if (!("caches" in self) || !wasmEnvironment)
        throw new WhisperRuntimeCacheError("runtime_cache_unavailable", "Cache runtime tidak tersedia di browser ini.");
    let cache: Cache;
    try { cache = await self.caches.open(ONNX_RUNTIME_CACHE); }
    catch { throw new WhisperRuntimeCacheError("runtime_cache_unavailable", "Cache runtime tidak dapat dibuka."); }
    const [mjsResponse, wasmResponse] = await Promise.all([
        cachedWhisperRuntime(cache, mjsAssetUrl, self.navigator.onLine),
        cachedWhisperRuntime(cache, wasmAssetUrl, self.navigator.onLine),
    ]);
    if (!wasmEnvironment.wasmBinary) wasmEnvironment.wasmBinary = await wasmResponse.arrayBuffer();
    if (!self.navigator.onLine && !offlineMjsBlobUrl) {
        offlineMjsBlobUrl = URL.createObjectURL(new Blob([await mjsResponse.arrayBuffer()], { type: "text/javascript" }));
        wasmEnvironment.wasmPaths = { mjs: offlineMjsBlobUrl, wasm: wasmAssetUrl };
    }
}

async function createPipelineWithOptions(
    selectedBackend: WhisperBackend,
    localFilesOnly: boolean,
) {
    // Transformers.js 3.8.1 rejects local_files_only before looking in cache
    // when allowLocalModels is false (its browser default). Online cache misses
    // still use the normal Hub fetch path; no forced cache-only first download.
    env.allowLocalModels = localFilesOnly;
    const instance = await pipeline("automatic-speech-recognition", MODEL_ID, {
        device: selectedBackend,
        dtype: WHISPER_DTYPE,
        local_files_only: localFilesOnly,
        progress_callback: (progress) => {
            if (progress.status === "initiate") modelCache?.beginFile(progress.file);
            const file = "file" in progress ? progress.file : undefined;
            const source = file && progress.status !== "initiate" ? modelCache?.source(file, localFilesOnly) : "unknown";
            if (progress.status === "progress" || progress.status === "download") setPreparationStage("model_assets", selectedBackend);
            else if (progress.status === "done" || progress.status === "ready") setPreparationStage("pipeline", selectedBackend);
            emit({
                type: "MODEL_PROGRESS",
                backend: selectedBackend,
                file,
                source,
                progress:
                    progress.status === "progress"
                        ? Math.round(progress.progress)
                        : undefined,
            });
        },
    });
    try { modelCache?.assertPersisted(); }
    catch (error) { await releasePipeline(instance); throw error; }
    return instance;
}

async function createPipeline(selectedBackend: WhisperBackend) {
    const preferLocalOnly = !self.navigator.onLine;
    try {
        return await createPipelineWithOptions(selectedBackend, preferLocalOnly);
    } catch (error) {
        if (error instanceof WhisperModelCacheError) throw error;
        if (preferLocalOnly && modelCache?.hadMiss && error instanceof Error && /local_files_only|not found locally/.test(error.message)) {
            throw new WhisperModelCacheError("model_cache_missing_offline", "Cache model belum lengkap atau berisi artefak tidak valid. Siapkan model saat internet tersedia.");
        }
        // The installed loader is already cache-first. Re-running every failed
        // pipeline cache-only cannot repair runtime or inference failures.
        throw error;
    }
}

async function warmupPipeline(
    instance: AutomaticSpeechRecognitionPipelineType,
): Promise<void> {
    const silentSample = new Float32Array(8_000);
    // Exercise the actual encoder/decoder without unrestricted silent generation.
    // A failed probe is not evidence that the pipeline is usable.
    await instance(silentSample, {
        language: "Indonesian", task: "transcribe", max_new_tokens: 2,
    });
}

async function releasePipeline(instance: AutomaticSpeechRecognitionPipelineType): Promise<void> {
    try { await instance.dispose(); }
    catch {
        const error = new Error("Whisper pipeline cleanup failed; restart the worker.");
        error.name = "WhisperDisposalError";
        throw error;
    }
}

async function prepareBackend(selectedBackend: WhisperBackend) {
    setPreparationStage("pipeline", selectedBackend);
    const instance = await createPipeline(selectedBackend);
    if (disposed) { await releasePipeline(instance); return null; }
    try {
        setPreparationStage("warmup", selectedBackend);
        await warmupPipeline(instance);
    } catch (error) {
        await releasePipeline(instance);
        throw error;
    }
    if (disposed) { await releasePipeline(instance); return null; }
    return instance;
}

async function prepare(requestedBackend?: WhisperBackend): Promise<void> {
    if (disposed) return;
    if (preparing) return preparing;
    if (transcriber && backend) {
        emit({ type: "READY", backend });
        return;
    }
    preparationStarted = Date.now();
    preparationBackend = undefined;
    setPreparationStage("runtime_assets", undefined, true);
    const heartbeat = self.setInterval(() => emit({
        type: "PREPARATION_HEARTBEAT", stage: preparationStage,
        backend: preparationBackend, elapsedMs: Date.now() - preparationStarted,
    }), 15_000);

    preparing = (async () => {
        await ensureOfflineWasmRuntime();
        if (disposed) return;
        try {
            modelCache = new WhisperModelCache(await self.caches.open(WHISPER_MODEL_CACHE), MODEL_ID);
            env.useCustomCache = true;
            env.customCache = modelCache;
        } catch {
            throw new WhisperModelCacheError("model_cache_unavailable", "Cache model tidak dapat dibuka. Periksa izin dan ruang penyimpanan browser.");
        }
        if (disposed) return;
        if (requestedBackend !== "wasm" && "gpu" in self.navigator) {
            try {
                transcriber = await prepareBackend("webgpu");
                if (transcriber) backend = "webgpu";
            } catch (error) {
                if (error instanceof WhisperModelCacheError || (error instanceof Error && error.name === "WhisperDisposalError")) throw error;
                transcriber = null;
                backend = null;
                emit({ type: "BACKEND_FALLBACK", message: errorMessage(error) });
            }
        }
        if (disposed) return;
        if (!transcriber) {
            transcriber = await prepareBackend("wasm");
            if (transcriber) backend = "wasm";
        }
        if (disposed) return;
        if (!backend || !transcriber) throw new Error("Backend Whisper tidak tersedia.");
        emit({ type: "READY", backend });
    })().catch((error) => {
        emit({ type: "ERROR", stage: "prepare", preparationStage,
            code: error instanceof WhisperModelCacheError || error instanceof WhisperRuntimeCacheError ? error.code : "initialization_failed", fatal: true, message: errorMessage(error) });
    }).finally(() => {
        self.clearInterval(heartbeat);
        preparing = null;
    });
    return preparing;
}

async function transcribe(audio: Float32Array): Promise<void> {
    if (disposed || !transcriber || !backend || processing) return;
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
    disposed = true;
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

self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    event.preventDefault();
    emit({ type: "ERROR", stage: preparing ? "prepare" : "transcribe",
        preparationStage, fatal: true, code: "worker_rejection",
        message: "Whisper mengalami kesalahan internal. Coba siapkan ulang." });
    disposed = true;
    cancelTranscription();
});
