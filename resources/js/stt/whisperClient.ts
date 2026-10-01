import type { WhisperWorkerEvent, WhisperWorkerRequest } from "./types";

export class WhisperClient {
    private worker: Worker;
    private disposed = false;
    private readonly onEvent: (event: WhisperWorkerEvent) => void;

    constructor(onEvent: (event: WhisperWorkerEvent) => void) {
        this.onEvent = onEvent;
        this.worker = this.createWorker();
    }

    private createWorker(): Worker {
        const worker = new Worker(
            new URL("./whisper.worker.ts", import.meta.url),
            {
                type: "module",
                name: "rapid-mind-whisper",
            },
        );
        worker.addEventListener(
            "message",
            (event: MessageEvent<WhisperWorkerEvent>) => {
                if (event.data.type === "BACKEND_FALLBACK") {
                    this.onEvent(event.data);
                    worker.terminate();
                    if (this.disposed) return;
                    this.worker = this.createWorker();
                    this.post({ type: "PREPARE", backend: "wasm" });
                    return;
                }
                this.onEvent(event.data);
            },
        );
        worker.addEventListener("error", (event) => {
            if (this.disposed || this.worker !== worker) return;
            this.onEvent({
                type: "ERROR",
                stage: "prepare",
                message: event.message || "Whisper worker gagal dijalankan.",
            });
        });
        return worker;
    }

    prepare(): void {
        this.post({ type: "PREPARE" });
    }

    transcribe(audio: Float32Array): void {
        if (this.disposed) return;
        const message: WhisperWorkerRequest = { type: "TRANSCRIBE", audio };
        this.worker.postMessage(message, [audio.buffer]);
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const worker = this.worker;
        worker.postMessage({ type: "DISPOSE" } satisfies WhisperWorkerRequest);
        window.setTimeout(() => worker.terminate(), 1_000);
    }

    private post(message: WhisperWorkerRequest): void {
        if (!this.disposed) this.worker.postMessage(message);
    }
}
