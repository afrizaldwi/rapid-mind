import type { WhisperModelSource } from "./whisperModelCache";

export type SttMode = "offline" | "online";

export type WhisperBackend = "webgpu" | "wasm";

export type WhisperPreparationStage = "worker_start" | "runtime_assets" | "pipeline" | "model_assets" | "warmup";

export type WhisperStatus =
    | "idle"
    | "preparing"
    | "ready"
    | "recording"
    | "processing"
    | "error";

export type WhisperWorkerRequest =
    | { type: "PREPARE"; backend?: WhisperBackend }
    | { type: "TRANSCRIBE"; audio: Float32Array; durationSeconds?: number }
    | { type: "CANCEL" }
    | { type: "DISPOSE" };

export type WhisperWorkerEvent =
    | { type: "PREPARATION_STAGE" | "PREPARATION_HEARTBEAT" | "PREPARATION_SLOW";
        stage: WhisperPreparationStage; backend?: WhisperBackend; elapsedMs: number }
    | {
          type: "MODEL_PROGRESS";
          backend: WhisperBackend;
          file?: string;
          source?: WhisperModelSource;
          progress?: number;
      }
    | { type: "READY"; backend: WhisperBackend }
    | { type: "BACKEND_FALLBACK"; message: string }
    | { type: "PROCESSING"; backend: WhisperBackend }
    | { type: "RESULT"; backend: WhisperBackend; transcript: string }
    | {
          type: "ERROR";
          stage: "prepare" | "transcribe";
          preparationStage?: WhisperPreparationStage;
          fatal?: boolean;
          code?: string;
          message: string;
      }
    | { type: "DISPOSED" };
