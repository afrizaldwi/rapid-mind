export type WhisperBackend = "webgpu" | "wasm";

export type WhisperStatus =
    | "idle"
    | "preparing"
    | "ready"
    | "recording"
    | "processing"
    | "error";

export type WhisperWorkerRequest =
    | { type: "PREPARE"; backend?: WhisperBackend }
    | { type: "TRANSCRIBE"; audio: Float32Array }
    | { type: "DISPOSE" };

export type WhisperWorkerEvent =
    | {
          type: "MODEL_PROGRESS";
          backend: WhisperBackend;
          file?: string;
          progress?: number;
      }
    | { type: "READY"; backend: WhisperBackend }
    | { type: "BACKEND_FALLBACK"; message: string }
    | { type: "PROCESSING"; backend: WhisperBackend }
    | { type: "RESULT"; backend: WhisperBackend; transcript: string }
    | {
          type: "ERROR";
          stage: "prepare" | "transcribe";
          message: string;
      }
    | { type: "DISPOSED" };
