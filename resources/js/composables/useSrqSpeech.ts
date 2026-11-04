import { ref, computed, onUnmounted } from "vue";
import { LocalAudioCapture } from "@/stt/audioCapture";
import { WhisperClient } from "@/stt/whisperClient";
import type {
    WhisperBackend,
    WhisperStatus,
    WhisperWorkerEvent,
} from "@/stt/types";

export function useSrqSpeech(
    enabled: () => boolean,
    onTranscript: (text: string) => void | Promise<void>,
) {
    const sttStatus = ref<WhisperStatus>("idle");
    const sttBackend = ref<WhisperBackend | null>(null);
    const sttProgress = ref<number | null>(null);
    const sttMessage = ref(
        "Siapkan model saat internet tersedia agar dapat digunakan kembali secara offline.",
    );
    const transcriptSnippet = ref("");
    const sttInterpretationNotice = ref("");
    let whisperClient: WhisperClient | null = null;
    let audioCapture: LocalAudioCapture | null = null;
    let sttSession = 0;
    const sttButtonDisabled = computed(
        () =>
            !enabled() || ["preparing", "processing"].includes(sttStatus.value),
    );
    const sttButtonLabel = computed(() => {
        switch (sttStatus.value) {
            case "preparing":
                return "Menyiapkan STT…";
            case "ready":
                return "Mulai Rekam";
            case "recording":
                return "Selesai & Transkripsikan";
            case "processing":
                return "Memproses di Perangkat…";
            case "error":
                return "Coba Siapkan Lagi";
            default:
                return "Siapkan STT Offline";
        }
    });
    const sttStatusLabel = computed(() => {
        switch (sttStatus.value) {
            case "preparing":
                return "STT sedang disiapkan";
            case "ready":
                return "STT siap";
            case "recording":
                return "Perekaman aktif";
            case "processing":
                return "Transkripsi lokal diproses";
            case "error":
                return "STT tidak tersedia";
            default:
                return "STT lokal belum siap";
        }
    });

    function handleWorkerEvent(event: WhisperWorkerEvent) {
        switch (event.type) {
            case "MODEL_PROGRESS":
                sttStatus.value = "preparing";
                sttBackend.value = event.backend;
                if (typeof event.progress === "number")
                    sttProgress.value = event.progress;
                sttMessage.value =
                    event.backend === "webgpu"
                        ? "Mencoba menyiapkan Whisper dengan WebGPU."
                        : "Menyiapkan Whisper dengan WASM / CPU.";
                break;
            case "READY":
                sttStatus.value = "ready";
                sttBackend.value = event.backend;
                sttProgress.value = 100;
                sttMessage.value =
                    "Model siap. Rekam satu ujaran pendek untuk transkripsi Bahasa Indonesia.";
                break;
            case "BACKEND_FALLBACK":
                sttStatus.value = "preparing";
                sttBackend.value = "wasm";
                sttProgress.value = null;
                sttMessage.value =
                    "WebGPU tidak dapat dimulai. Mencoba backend WASM / CPU.";
                break;
            case "PROCESSING":
                sttStatus.value = "processing";
                sttBackend.value = event.backend;
                sttMessage.value =
                    "Audio sedang ditranskripsikan secara lokal.";
                break;
            case "RESULT":
                sttStatus.value = "ready";
                sttBackend.value = event.backend;
                transcriptSnippet.value = event.transcript;
                sttInterpretationNotice.value = "";
                if (event.transcript) {
                    sttMessage.value =
                        "Transkripsi selesai dan diperiksa dengan aturan SRQ konservatif.";
                    void onTranscript(event.transcript);
                } else {
                    sttMessage.value =
                        "Tidak ada ucapan yang dikenali. Coba rekam lagi di tempat yang lebih tenang.";
                }
                break;
            case "ERROR":
                sttStatus.value =
                    event.stage === "transcribe" && sttBackend.value
                        ? "ready"
                        : "error";
                sttMessage.value =
                    event.stage === "prepare"
                        ? "Whisper tidak dapat disiapkan di perangkat ini. Jawaban manual tetap dapat digunakan."
                        : "Transkripsi gagal. Coba rekam ulang; jawaban manual tetap dapat digunakan.";
                break;
        }
    }

    function prepareStt() {
        if (whisperClient && sttStatus.value === "error") {
            whisperClient.dispose();
            whisperClient = null;
        }
        if (!whisperClient) {
            const client = new WhisperClient((event) => {
                if (enabled() && whisperClient === client)
                    handleWorkerEvent(event);
            });
            whisperClient = client;
        }
        sttStatus.value = "preparing";
        sttProgress.value = null;
        sttMessage.value = navigator.onLine
            ? "Mengunduh atau membuka model yang sudah tersimpan di cache perangkat."
            : "Mencoba membuka model yang sebelumnya sudah disiapkan di perangkat.";
        whisperClient.prepare();
    }

    async function startRecording() {
        const session = sttSession;
        const capture = new LocalAudioCapture();
        audioCapture = capture;
        transcriptSnippet.value = "";
        sttInterpretationNotice.value = "";
        try {
            await capture.start();
            if (sttSession !== session || audioCapture !== capture) {
                capture.cancel();
                return;
            }
            sttStatus.value = "recording";
            sttMessage.value =
                "Mikrofon aktif. Ucapkan satu jawaban, lalu selesaikan rekaman.";
        } catch (error) {
            if (sttSession !== session || audioCapture !== capture) return;
            audioCapture = null;
            sttStatus.value = "ready";
            if (
                error instanceof DOMException &&
                error.name === "NotAllowedError"
            ) {
                sttMessage.value =
                    "Izin mikrofon ditolak. Izinkan mikrofon atau gunakan jawaban manual.";
            } else if (
                error instanceof DOMException &&
                error.name === "NotFoundError"
            ) {
                sttMessage.value =
                    "Mikrofon tidak ditemukan. Jawaban manual tetap dapat digunakan.";
            } else {
                sttMessage.value =
                    "Mikrofon tidak dapat dimulai. Jawaban manual tetap dapat digunakan.";
            }
        }
    }

    async function stopAndTranscribe() {
        const capture = audioCapture;
        const client = whisperClient;
        const session = sttSession;
        if (!capture || !client) return;
        audioCapture = null;
        sttStatus.value = "processing";
        sttMessage.value = "Menyiapkan audio untuk Whisper di perangkat.";
        try {
            const audio = await capture.stop();
            if (sttSession !== session || whisperClient !== client) return;
            client.transcribe(audio);
        } catch {
            if (sttSession !== session || whisperClient !== client) return;
            sttStatus.value = "ready";
            sttMessage.value =
                "Rekaman tidak dapat diproses. Coba rekam ulang.";
        }
    }

    function cancelRecording() {
        audioCapture?.cancel();
        audioCapture = null;
        sttStatus.value = "ready";
        sttMessage.value = "Rekaman dibatalkan. Mikrofon sudah dimatikan.";
    }

    function handleSttAction() {
        if (!enabled()) return;
        if (sttStatus.value === "idle" || sttStatus.value === "error")
            prepareStt();
        else if (sttStatus.value === "ready") void startRecording();
        else if (sttStatus.value === "recording") void stopAndTranscribe();
    }

    function cleanupStt() {
        sttSession += 1;
        audioCapture?.cancel();
        audioCapture = null;
        whisperClient?.dispose();
        whisperClient = null;
        sttStatus.value = "idle";
        sttBackend.value = null;
        sttProgress.value = null;
        sttMessage.value =
            "Siapkan model saat internet tersedia agar dapat digunakan kembali secara offline.";
        transcriptSnippet.value = "";
        sttInterpretationNotice.value = "";
    }

    onUnmounted(cleanupStt);
    return {
        sttStatus,
        sttBackend,
        sttProgress,
        sttMessage,
        transcriptSnippet,
        sttInterpretationNotice,
        sttButtonDisabled,
        sttButtonLabel,
        sttStatusLabel,
        handleSttAction,
        cancelRecording,
        cleanupStt,
    };
}
