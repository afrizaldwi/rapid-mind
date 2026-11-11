import { ref, computed, onUnmounted } from "vue";
import { LocalAudioCapture } from "@/stt/audioCapture";
import { WhisperClient } from "@/stt/whisperClient";
import {
    WebSpeechClient,
    isWebSpeechSupported,
    type WebSpeechEvent,
} from "@/stt/webSpeechClient";
import type {
    SttMode,
    WhisperBackend,
    WhisperStatus,
    WhisperWorkerEvent,
} from "@/stt/types";

const OFFLINE_IDLE_MESSAGE =
    "Siapkan model saat internet tersedia agar dapat digunakan kembali secara offline.";

export function useSrqSpeech(
    enabled: () => boolean,
    onTranscript: (text: string) => void | Promise<void>,
) {
    const sttMode = ref<SttMode>("offline");
    const webSpeechSupported = ref<boolean>(isWebSpeechSupported());
    const onlineConsentGranted = ref(false);
    const sttFallbackSuggested = ref(false);

    const sttStatus = ref<WhisperStatus>("idle");
    const sttBackend = ref<WhisperBackend | null>(null);
    const sttProgress = ref<number | null>(null);
    const sttMessage = ref(OFFLINE_IDLE_MESSAGE);
    const interimTranscript = ref("");
    const transcriptSnippet = ref("");
    const sttInterpretationNotice = ref("");

    let whisperClient: WhisperClient | null = null;
    let offlineBackendReady: WhisperBackend | null = null;
    let webSpeechClient: WebSpeechClient | null = null;
    let audioCapture: LocalAudioCapture | null = null;
    let sttSession = 0;

    const onlineConsentRequired = computed(
        () =>
            sttMode.value === "online" &&
            webSpeechSupported.value &&
            !onlineConsentGranted.value,
    );

    const sttButtonDisabled = computed(() => {
        if (!enabled()) return true;
        if (["preparing", "processing"].includes(sttStatus.value)) return true;
        if (sttMode.value === "online") {
            return !webSpeechSupported.value || !onlineConsentGranted.value;
        }
        return false;
    });

    const sttButtonLabel = computed(() => {
        if (sttMode.value === "online") {
            if (!webSpeechSupported.value) {
                return "Web Speech Tidak Didukung";
            }
            if (!onlineConsentGranted.value) {
                return "Setujui Privasi Online Dahulu";
            }
            switch (sttStatus.value) {
                case "recording":
                    return "Selesai & Proses Final";
                case "processing":
                    return "Menunggu Hasil Final…";
                default:
                    return "Mulai Rekam (Online)";
            }
        }
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
        if (sttMode.value === "online") {
            if (!webSpeechSupported.value) {
                return "STT Online tidak didukung browser";
            }
            if (!onlineConsentGranted.value) {
                return "Menunggu persetujuan privasi STT Online";
            }
            switch (sttStatus.value) {
                case "recording":
                    return "Perekaman STT Online aktif";
                case "processing":
                    return "Menunggu hasil final STT Online";
                case "error":
                    return "STT Online mengalami kendala";
                default:
                    return "STT Online siap (khusus data sintetis)";
            }
        }
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
                if (sttMode.value !== "offline") return;
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
                offlineBackendReady = event.backend;
                sttBackend.value = event.backend;
                sttProgress.value = 100;
                if (sttMode.value === "offline") {
                    sttStatus.value = "ready";
                    sttMessage.value =
                        "Model siap. Rekam satu ujaran pendek untuk transkripsi Bahasa Indonesia.";
                }
                break;
            case "BACKEND_FALLBACK":
                if (sttMode.value !== "offline") return;
                sttStatus.value = "preparing";
                sttBackend.value = "wasm";
                sttProgress.value = null;
                sttMessage.value =
                    "WebGPU tidak dapat dimulai. Mencoba backend WASM / CPU.";
                break;
            case "PROCESSING":
                if (sttMode.value !== "offline") return;
                sttStatus.value = "processing";
                sttBackend.value = event.backend;
                sttMessage.value =
                    "Audio sedang ditranskripsikan secara lokal.";
                break;
            case "RESULT":
                if (sttMode.value !== "offline") return;
                sttStatus.value = "ready";
                sttBackend.value = event.backend;
                interimTranscript.value = "";
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
                if (event.stage === "prepare") {
                    offlineBackendReady = null;
                }
                if (sttMode.value !== "offline") return;
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

    function handleWebSpeechEvent(event: WebSpeechEvent, session: number) {
        if (!enabled() || sttSession !== session || sttMode.value !== "online")
            return;
        switch (event.type) {
            case "START":
                sttStatus.value = "recording";
                sttFallbackSuggested.value = false;
                sttMessage.value =
                    "Mikrofon aktif (STT Online id-ID). Ucapkan satu jawaban, lalu tekan Selesai.";
                break;
            case "INTERIM":
                interimTranscript.value = event.transcript;
                break;
            case "FINAL":
                interimTranscript.value = "";
                transcriptSnippet.value = event.transcript;
                sttInterpretationNotice.value = "";
                sttFallbackSuggested.value = false;
                if (event.transcript) {
                    sttMessage.value =
                        "Transkripsi Online final selesai dan diperiksa dengan aturan SRQ konservatif.";
                    void onTranscript(event.transcript);
                }
                break;
            case "END":
                sttStatus.value = webSpeechSupported.value ? "ready" : "error";
                interimTranscript.value = "";
                if (!event.hadFinal) {
                    if (event.hadInterim) {
                        sttMessage.value =
                            "Transkrip sementara belum terkonfirmasi sebagai hasil final sehingga tidak mengisi jawaban. Coba rekam ulang atau gunakan tombol manual.";
                    } else if (!sttFallbackSuggested.value) {
                        sttMessage.value =
                            "Tidak ada ucapan final yang dikenali. Coba rekam lagi atau gunakan jawaban manual.";
                    }
                }
                break;
            case "ERROR":
                interimTranscript.value = "";
                sttFallbackSuggested.value = event.suggestOfflineFallback;
                sttStatus.value =
                    event.code === "not-supported" ? "error" : "ready";
                sttMessage.value = event.message;
                break;
        }
    }

    function stopActiveCaptureOnly() {
        sttSession += 1;
        audioCapture?.cancel();
        audioCapture = null;
        whisperClient?.cancel?.();
        webSpeechClient?.abort();
        interimTranscript.value = "";
    }

    function selectSttMode(mode: SttMode) {
        if (!enabled()) return;
        stopActiveCaptureOnly();
        sttInterpretationNotice.value = "";
        sttMode.value = mode;

        if (mode === "online") {
            webSpeechSupported.value = isWebSpeechSupported();
            if (!webSpeechSupported.value) {
                sttStatus.value = "error";
                sttFallbackSuggested.value = true;
                sttMessage.value =
                    "Browser ini tidak mendukung Web Speech API (SpeechRecognition). Gunakan mode STT Offline atau tombol jawaban manual.";
                return;
            }
            sttFallbackSuggested.value = false;
            if (!onlineConsentGranted.value) {
                sttStatus.value = "idle";
                sttMessage.value =
                    "Mode STT Online memerlukan persetujuan privasi eksplisit sebelum dapat digunakan.";
            } else {
                sttStatus.value = "ready";
                sttMessage.value =
                    "Mode STT Online aktif untuk pengujian suara/data sintetis. Tekan Mulai Rekam (Online) untuk berbicara.";
            }
            return;
        }

        // Switching to offline mode
        sttFallbackSuggested.value = false;
        if (whisperClient && offlineBackendReady) {
            sttBackend.value = offlineBackendReady;
            sttStatus.value = "ready";
            sttProgress.value = 100;
            sttMessage.value =
                "Model siap. Rekam satu ujaran pendek untuk transkripsi Bahasa Indonesia.";
        } else {
            sttStatus.value = "idle";
            sttMessage.value = OFFLINE_IDLE_MESSAGE;
        }
    }

    function grantOnlineConsent() {
        if (!enabled()) return;
        webSpeechSupported.value = isWebSpeechSupported();
        if (!webSpeechSupported.value) {
            sttStatus.value = "error";
            sttFallbackSuggested.value = true;
            sttMessage.value =
                "Browser ini tidak mendukung Web Speech API. Gunakan mode STT Offline.";
            return;
        }
        onlineConsentGranted.value = true;
        sttFallbackSuggested.value = false;
        if (sttMode.value === "online") {
            sttStatus.value = "ready";
            sttMessage.value =
                "Persetujuan privasi STT Online diterima untuk pengujian sintetis. Tekan Mulai Rekam (Online) untuk berbicara.";
        }
    }

    function declineOnlineConsent() {
        selectSttMode("offline");
    }

    function fallbackToOffline() {
        selectSttMode("offline");
    }

    function prepareStt() {
        if (whisperClient && sttStatus.value === "error") {
            whisperClient.dispose();
            whisperClient = null;
            offlineBackendReady = null;
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

    async function startOfflineRecording() {
        const session = sttSession;
        const capture = new LocalAudioCapture();
        audioCapture = capture;
        interimTranscript.value = "";
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

    async function stopAndTranscribeOffline() {
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
            if (audio.length === 0) {
                sttStatus.value = "ready";
                sttMessage.value =
                    "Tidak ada suara yang terdeteksi. Coba rekam ulang lebih jelas.";
                return;
            }
            client.transcribe(audio);
        } catch {
            if (sttSession !== session || whisperClient !== client) return;
            sttStatus.value = "ready";
            sttMessage.value =
                "Rekaman tidak dapat diproses. Coba rekam ulang.";
        }
    }

    function startOnlineRecognition() {
        webSpeechSupported.value = isWebSpeechSupported();
        if (!webSpeechSupported.value) {
            sttStatus.value = "error";
            sttFallbackSuggested.value = true;
            sttMessage.value =
                "Browser ini tidak mendukung Web Speech API. Gunakan mode STT Offline.";
            return;
        }
        if (!onlineConsentGranted.value) {
            sttStatus.value = "idle";
            sttMessage.value =
                "Setujui ketentuan privasi STT Online terlebih dahulu sebelum merekam.";
            return;
        }
        const session = ++sttSession;
        interimTranscript.value = "";
        transcriptSnippet.value = "";
        sttInterpretationNotice.value = "";
        sttFallbackSuggested.value = false;
        webSpeechClient?.dispose();
        webSpeechClient = new WebSpeechClient((event) => {
            handleWebSpeechEvent(event, session);
        });
        sttStatus.value = "recording";
        sttMessage.value = "Memulai pengenalan suara Online (id-ID)…";
        webSpeechClient.start();
    }

    function stopOnlineRecognition() {
        if (!webSpeechClient) return;
        sttStatus.value = "processing";
        sttMessage.value = "Menyelesaikan pengenalan suara Online…";
        webSpeechClient.stop();
    }

    function cancelRecording() {
        stopActiveCaptureOnly();
        if (sttMode.value === "online") {
            sttStatus.value =
                webSpeechSupported.value && onlineConsentGranted.value
                    ? "ready"
                    : "idle";
            sttMessage.value =
                "Perekaman STT Online dibatalkan. Transkrip sementara tidak digunakan.";
            return;
        }
        sttStatus.value = offlineBackendReady ? "ready" : "idle";
        sttMessage.value = "Rekaman dibatalkan. Mikrofon sudah dimatikan.";
    }

    function handleSttAction() {
        if (!enabled()) return;
        if (sttMode.value === "online") {
            if (!webSpeechSupported.value || !onlineConsentGranted.value)
                return;
            if (sttStatus.value === "recording") {
                stopOnlineRecognition();
            } else if (
                sttStatus.value === "ready" ||
                sttStatus.value === "idle" ||
                sttStatus.value === "error"
            ) {
                startOnlineRecognition();
            }
            return;
        }

        if (sttStatus.value === "idle" || sttStatus.value === "error")
            prepareStt();
        else if (sttStatus.value === "ready") void startOfflineRecording();
        else if (sttStatus.value === "recording")
            void stopAndTranscribeOffline();
    }

    function cleanupStt() {
        sttSession += 1;
        audioCapture?.cancel();
        audioCapture = null;
        whisperClient?.dispose();
        whisperClient = null;
        offlineBackendReady = null;
        webSpeechClient?.dispose();
        webSpeechClient = null;
        sttMode.value = "offline";
        onlineConsentGranted.value = false;
        sttFallbackSuggested.value = false;
        sttStatus.value = "idle";
        sttBackend.value = null;
        sttProgress.value = null;
        sttMessage.value = OFFLINE_IDLE_MESSAGE;
        interimTranscript.value = "";
        transcriptSnippet.value = "";
        sttInterpretationNotice.value = "";
    }

    onUnmounted(cleanupStt);
    return {
        sttMode,
        webSpeechSupported,
        onlineConsentRequired,
        onlineConsentGranted,
        sttFallbackSuggested,
        sttStatus,
        sttBackend,
        sttProgress,
        sttMessage,
        interimTranscript,
        transcriptSnippet,
        sttInterpretationNotice,
        sttButtonDisabled,
        sttButtonLabel,
        sttStatusLabel,
        selectSttMode,
        grantOnlineConsent,
        declineOnlineConsent,
        fallbackToOffline,
        handleSttAction,
        cancelRecording,
        cleanupStt,
    };
}
