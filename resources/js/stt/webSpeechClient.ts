export type WebSpeechEvent =
    | { type: "START" }
    | { type: "INTERIM"; transcript: string }
    | { type: "FINAL"; transcript: string }
    | { type: "END"; hadFinal: boolean; hadInterim: boolean }
    | {
          type: "ERROR";
          code: string;
          message: string;
          suggestOfflineFallback: boolean;
      };

interface BrowserSpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface BrowserSpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
    readonly length: number;
    [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message?: string;
}

interface BrowserSpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: ((this: BrowserSpeechRecognition, ev: Event) => unknown) | null;
    onresult:
        | ((
              this: BrowserSpeechRecognition,
              ev: BrowserSpeechRecognitionEvent,
          ) => unknown)
        | null;
    onerror:
        | ((
              this: BrowserSpeechRecognition,
              ev: BrowserSpeechRecognitionErrorEvent,
          ) => unknown)
        | null;
    onend: ((this: BrowserSpeechRecognition, ev: Event) => unknown) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
        SpeechRecognition?: BrowserSpeechRecognitionConstructor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isWebSpeechSupported(): boolean {
    return getSpeechRecognitionConstructor() !== null;
}

function mapWebSpeechError(code: string): {
    message: string;
    suggestOfflineFallback: boolean;
} {
    switch (code) {
        case "not-allowed":
            return {
                message:
                    "Izin mikrofon ditolak. Izinkan mikrofon di pengaturan browser atau gunakan jawaban manual.",
                suggestOfflineFallback: false,
            };
        case "service-not-allowed":
            return {
                message:
                    "Layanan pengenalan suara browser tidak diizinkan pada perangkat ini. Gunakan STT Offline atau jawaban manual.",
                suggestOfflineFallback: true,
            };
        case "network":
            return {
                message:
                    "Layanan pengenalan suara online gagal terhubung. Anda dapat beralih ke STT Offline atau mengisi jawaban manual.",
                suggestOfflineFallback: true,
            };
        case "language-not-supported":
            return {
                message:
                    "Bahasa Indonesia (id-ID) tidak didukung oleh layanan pengenalan suara browser ini. Gunakan STT Offline.",
                suggestOfflineFallback: true,
            };
        case "audio-capture":
            return {
                message:
                    "Mikrofon tidak ditemukan atau tidak dapat diakses. Jawaban manual tetap dapat digunakan.",
                suggestOfflineFallback: false,
            };
        case "no-speech":
            return {
                message:
                    "Tidak ada ucapan yang terdeteksi. Coba rekam ulang di tempat yang lebih tenang.",
                suggestOfflineFallback: false,
            };
        default:
            return {
                message:
                    "Pengenalan suara online tidak dapat menyelesaikan transkripsi. Gunakan STT Offline atau jawaban manual.",
                suggestOfflineFallback: true,
            };
    }
}

export class WebSpeechClient {
    private recognition: BrowserSpeechRecognition | null = null;
    private disposed = false;
    private cancelled = false;
    private stopping = false;
    private finalSegments: string[] = [];
    private hadInterim = false;
    private hadError = false;
    private readonly onEvent: (event: WebSpeechEvent) => void;

    constructor(onEvent: (event: WebSpeechEvent) => void) {
        this.onEvent = onEvent;
    }

    start(): void {
        if (this.disposed) return;
        const Ctor = getSpeechRecognitionConstructor();
        if (!Ctor) {
            this.onEvent({
                type: "ERROR",
                code: "unsupported",
                message:
                    "Browser ini tidak mendukung Web Speech API. Gunakan STT Offline atau pilih jawaban secara manual.",
                suggestOfflineFallback: true,
            });
            return;
        }

        this.abortCurrent();
        this.cancelled = false;
        this.stopping = false;
        this.finalSegments = [];
        this.hadInterim = false;
        this.hadError = false;

        const rec = new Ctor();
        rec.lang = "id-ID";
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        this.recognition = rec;

        rec.onstart = () => {
            if (this.isStale(rec)) return;
            this.onEvent({ type: "START" });
        };

        rec.onresult = (event: BrowserSpeechRecognitionEvent) => {
            if (this.isStale(rec)) return;
            let interimText = "";
            let newFinalAdded = false;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                const text = res?.[0]?.transcript?.trim() ?? "";
                if (!text) continue;
                if (res.isFinal) {
                    this.finalSegments.push(text);
                    newFinalAdded = true;
                } else {
                    interimText = interimText ? `${interimText} ${text}` : text;
                }
            }

            if (interimText) {
                this.hadInterim = true;
                const combinedPreview = [
                    ...this.finalSegments,
                    interimText,
                ].join(" ");
                this.onEvent({
                    type: "INTERIM",
                    transcript: combinedPreview.trim(),
                });
            }

            if (newFinalAdded) {
                const finalTranscript = this.finalSegments.join(" ").trim();
                if (finalTranscript) {
                    this.onEvent({
                        type: "FINAL",
                        transcript: finalTranscript,
                    });
                }
            }
        };

        rec.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
            if (this.isStale(rec)) return;
            if (event.error === "aborted" && (this.cancelled || this.stopping)) {
                return;
            }
            this.hadError = true;
            const mapped = mapWebSpeechError(event.error || "unknown");
            this.onEvent({
                type: "ERROR",
                code: event.error || "unknown",
                message: mapped.message,
                suggestOfflineFallback: mapped.suggestOfflineFallback,
            });
        };

        rec.onend = () => {
            if (this.recognition === rec) {
                this.recognition = null;
            }
            if (this.disposed || this.cancelled || this.hadError) return;
            this.onEvent({
                type: "END",
                hadFinal: this.finalSegments.length > 0,
                hadInterim: this.hadInterim,
            });
        };

        try {
            rec.start();
        } catch {
            this.recognition = null;
            this.onEvent({
                type: "ERROR",
                code: "start-failed",
                message:
                    "Pengenalan suara online tidak dapat dimulai. Gunakan STT Offline atau jawaban manual.",
                suggestOfflineFallback: true,
            });
        }
    }

    stop(): void {
        if (this.disposed || this.cancelled || !this.recognition) return;
        this.stopping = true;
        try {
            this.recognition.stop();
        } catch {
            this.abortCurrent();
        }
    }

    cancel(): void {
        this.cancelled = true;
        this.finalSegments = [];
        this.hadInterim = false;
        this.abortCurrent();
    }

    abort(): void {
        this.cancel();
    }

    dispose(): void {
        this.disposed = true;
        this.cancel();
    }

    private isStale(rec: BrowserSpeechRecognition): boolean {
        return this.disposed || this.cancelled || this.recognition !== rec;
    }

    private abortCurrent(): void {
        const rec = this.recognition;
        this.recognition = null;
        if (!rec) return;
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
            rec.abort();
        } catch {
            // Ignore browser-specific abort errors on already-stopped instances.
        }
    }
}
