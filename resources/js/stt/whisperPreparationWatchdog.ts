// Allow slow CPU/WASM devices substantial time. Heartbeats show responsiveness,
// not forward progress. Active downloads can exceed the no-progress deadline.
export const WHISPER_PREPARE_SLOW_MS = 90_000;
export const WHISPER_PREPARE_SILENCE_MS = 10 * 60_000;
export const WHISPER_PREPARE_STALL_MS = 20 * 60_000;
const CHECK_INTERVAL_MS = 15_000;

export class WhisperPreparationWatchdog {
    private timer: ReturnType<typeof setInterval> | undefined;
    private lastActivity = 0;
    private lastProgress = 0;
    private warned = false;

    constructor(
        onSlow: () => void,
        onFailure: (code: "prepare_unresponsive" | "prepare_stalled") => void,
    ) {
        this.onSlow = onSlow;
        this.onFailure = onFailure;
    }
    private readonly onSlow: () => void;
    private readonly onFailure: (code: "prepare_unresponsive" | "prepare_stalled") => void;

    start(): void {
        this.stop();
        this.lastActivity = this.lastProgress = Date.now();
        this.warned = false;
        this.timer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
    }

    activity(forwardProgress = false): void {
        this.lastActivity = Date.now();
        if (forwardProgress) {
            this.lastProgress = this.lastActivity;
            this.warned = false;
        }
    }

    stop(): void {
        if (this.timer !== undefined) clearInterval(this.timer);
        this.timer = undefined;
    }

    private check(): void {
        const now = Date.now();
        const failure = now - this.lastActivity >= WHISPER_PREPARE_SILENCE_MS ? "prepare_unresponsive"
            : now - this.lastProgress >= WHISPER_PREPARE_STALL_MS ? "prepare_stalled" : null;
        if (failure) {
            this.stop();
            this.onFailure(failure);
        } else if (!this.warned && now - this.lastProgress >= WHISPER_PREPARE_SLOW_MS) {
            this.warned = true;
            this.onSlow();
        }
    }
}
