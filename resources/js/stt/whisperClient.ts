import type { WhisperWorkerEvent, WhisperWorkerRequest, WhisperPreparationStage, WhisperBackend } from "./types";
import { WhisperPreparationWatchdog } from "./whisperPreparationWatchdog.ts";

export class WhisperClient {
    private worker: Worker;
    private disposed = false;
    private preparing = false;
    private ready = false;
    private stage: WhisperPreparationStage = "worker_start";
    private preparationStarted = 0;
    private preparationBackend: WhisperBackend | undefined;
    private readonly progress = new Map<string, number>();
    private readonly onEvent: (event: WhisperWorkerEvent) => void;
    private readonly watchdog: WhisperPreparationWatchdog;

    constructor(onEvent: (event: WhisperWorkerEvent) => void) {
        this.onEvent = onEvent;
        this.watchdog = new WhisperPreparationWatchdog(
            () => this.onEvent({ type: "PREPARATION_SLOW", stage: this.stage, elapsedMs: Date.now() - this.preparationStarted }),
            code => this.fail(code),
        );
        this.worker = this.createWorker();
    }

    private createWorker(): Worker {
        const worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), {
            type: "module", name: "rapid-mind-whisper",
        });
        worker.addEventListener("message", (event: MessageEvent<WhisperWorkerEvent>) => {
            if (this.disposed || this.worker !== worker) return;
            const data = event.data;
            let forward = false;
            if (data.type === "PREPARATION_STAGE") {
                forward = this.stage !== data.stage || this.preparationBackend !== data.backend;
                this.stage = data.stage;
                this.preparationBackend = data.backend;
                // No audio, transcript, identifiers, URLs or error payloads.
                if (import.meta.env?.DEV) console.debug("[Whisper preparation]", {
                    stage: data.stage, backend: data.backend, elapsedMs: data.elapsedMs,
                });
            } else if (data.type === "MODEL_PROGRESS" && typeof data.progress === "number") {
                const key = data.file ?? "model";
                forward = data.progress > (this.progress.get(key) ?? -1);
                this.progress.set(key, Math.max(data.progress, this.progress.get(key) ?? -1));
            }
            if (this.preparing) this.watchdog.activity(forward);
            if (data.type === "READY") {
                this.ready = true;
                this.preparing = false;
                this.watchdog.stop();
                if (import.meta.env?.DEV) console.debug("[Whisper preparation]", {
                    stage: "ready", backend: data.backend, elapsedMs: Date.now() - this.preparationStarted,
                });
            } else if (data.type === "ERROR" && (data.stage === "prepare" || data.fatal)) {
                this.fail(data.code ?? "initialization_failed", data.message, data.preparationStage);
                return;
            }
            this.onEvent(data);
        });
        worker.addEventListener("error", () => this.fail("worker_error"));
        worker.addEventListener("messageerror", () => this.fail("worker_message_error"));
        return worker;
    }

    prepare(): void {
        if (this.disposed || this.preparing || this.ready) return;
        this.preparing = true;
        this.preparationStarted = Date.now();
        this.progress.clear();
        this.watchdog.start();
        this.post({ type: "PREPARE" });
    }

    transcribe(audio: Float32Array): void {
        if (this.disposed || !this.ready) return;
        const durationSeconds = Math.max(0.5, audio.length / 16_000);
        try {
            this.worker.postMessage({ type: "TRANSCRIBE", audio, durationSeconds } satisfies WhisperWorkerRequest, [audio.buffer]);
        } catch { this.fail("worker_post_failed"); }
    }

    cancel(): void {
        if (this.ready) this.post({ type: "CANCEL" });
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.preparing = this.ready = false;
        this.watchdog.stop();
        // Termination, not a queued DISPOSE, stops stalled WASM/warm-up execution.
        // Browser/model caches and clinical storage are deliberately untouched.
        this.worker.terminate();
    }

    private fail(code: string, message = "Persiapan Whisper terhenti. Coba siapkan ulang atau gunakan jawaban manual.", stage = this.stage): void {
        if (this.disposed) return;
        const duringPreparation = !this.ready;
        if (import.meta.env?.DEV) console.debug("[Whisper preparation]", {
            stage: "failed", preparationStage: stage, code, elapsedMs: Date.now() - this.preparationStarted,
        });
        this.dispose();
        this.onEvent({ type: "ERROR", stage: duringPreparation ? "prepare" : "transcribe",
            preparationStage: stage, fatal: true, code, message });
    }

    private post(message: WhisperWorkerRequest): void {
        if (this.disposed) return;
        try { this.worker.postMessage(message); }
        catch { this.fail("worker_post_failed"); }
    }
}
