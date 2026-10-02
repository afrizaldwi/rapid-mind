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
// Request the same experiment artifacts on both backends. Actual q4f16 WASM
// compatibility remains a browser-runtime gate for this model.
const WHISPER_DTYPE = {
    encoder_model: "q4f16",
    decoder_model_merged: "q4f16",
} as const;

env.useBrowserCache = true;
const wasmEnvironment = env.backends.onnx.wasm;
if (!wasmEnvironment) throw new Error("ONNX WASM runtime tidak tersedia.");
wasmEnvironment.wasmPaths = {
    mjs: new URL(ortWasmModuleUrl, self.location.origin).href,
    wasm: new URL(ortWasmBinaryUrl, self.location.origin).href,
};

let transcriber: AutomaticSpeechRecognitionPipelineType | null = null;
let backend: WhisperBackend | null = null;
let preparing: Promise<void> | null = null;
let processing = false;

function emit(event: WhisperWorkerEvent): void {
    self.postMessage(event);
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function createPipeline(selectedBackend: WhisperBackend) {
    return pipeline("automatic-speech-recognition", MODEL_ID, {
        device: selectedBackend,
        dtype: WHISPER_DTYPE,
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
                emit({
                    type: "BACKEND_FALLBACK",
                    message: errorMessage(error),
                });
                return;
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
        if (!readyBackend) throw new Error("Backend Whisper tidak tersedia.");
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
    emit({ type: "PROCESSING", backend });

    try {
        const result = await transcriber(audio, {
            language: "Indonesian",
            task: "transcribe",
        });
        const item = Array.isArray(result) ? result[0] : result;
        emit({
            type: "RESULT",
            backend,
            transcript: item?.text?.trim() ?? "",
        });
    } catch (error) {
        emit({
            type: "ERROR",
            stage: "transcribe",
            message: errorMessage(error),
        });
    } finally {
        processing = false;
    }
}

async function dispose(): Promise<void> {
    await preparing;
    await transcriber?.dispose();
    transcriber = null;
    backend = null;
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
            case "DISPOSE":
                void dispose();
                break;
        }
    },
);
