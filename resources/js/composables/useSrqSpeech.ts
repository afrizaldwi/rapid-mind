import type { WhisperModelSource } from "@/stt/whisperModelCache";
import { isSpeechLanguage, type SpeechLanguage } from "@/stt/speechLanguage";
import { ref, computed, onUnmounted, watch } from "vue";
import { LocalAudioCapture } from "@/stt/audioCapture";
import { whisperPreparationMessage, whisperPreparationFailure } from "@/stt/whisperPreparationPresentation";
import { WhisperClient } from "@/stt/whisperClient";
import {
    WebSpeechClient,
    isWebSpeechSupported,
    type WebSpeechEvent,
} from "@/stt/webSpeechClient";
import type {
    SttMode,
    WhisperBackend,
    WhisperPreparationStage,
    WhisperStatus,
    WhisperWorkerEvent,
} from "@/stt/types";
import { useI18n } from "@/i18n";

type LocalizedMessage = { id: string; en: string } | string;

const OFFLINE_IDLE_MESSAGE: LocalizedMessage = {
    id: "Siapkan model saat internet tersedia agar dapat digunakan kembali secara offline.",
    en: "Prepare the model while internet is available so it can be reused offline.",
};

function webSpeechErrorMessage(
    code: string,
    fallback: string,
    language: SpeechLanguage,
): LocalizedMessage {
    switch (code) {
        case "listening-ended":
            return {
                id: "Sesi suara terputus. Tekan Mulai Rekam untuk mencoba lagi.",
                en: "Listening was interrupted. Select Start Recording to try again.",
            };
        case "stop-failed":
            return {
                id: "Rekaman tidak dapat diselesaikan. Coba rekam ulang.",
                en: "Recording could not finish. Please record again.",
            };
        case "not-allowed":
            return {
                id: "Izin mikrofon ditolak. Izinkan mikrofon di pengaturan browser atau gunakan jawaban manual.",
                en: "Microphone permission was denied. Allow microphone access in browser settings or use manual answers.",
            };
        case "service-not-allowed":
            return {
                id: "Layanan pengenalan suara browser tidak diizinkan pada perangkat ini. Gunakan STT Offline (Bahasa Indonesia) atau jawaban manual.",
                en: "Browser speech recognition service is not allowed on this device. Use Offline STT (Indonesian only) or manual answers.",
            };
        case "network":
            return {
                id: "Layanan pengenalan suara online gagal terhubung. Anda dapat beralih ke STT Offline (Bahasa Indonesia) atau mengisi jawaban manual.",
                en: "Online speech recognition service failed to connect. You can switch to Offline STT (Indonesian only) or fill answers manually.",
            };
        case "language-not-supported":
            return {
                id: `Bahasa ${language} tidak didukung layanan pengenalan suara browser ini. Pilih bahasa lain atau gunakan jawaban manual.`,
                en: `The selected language (${language}) is not supported by this browser's speech recognition service. Choose another language or use manual answers.`,
            };
        case "audio-capture":
            return {
                id: "Mikrofon tidak ditemukan atau tidak dapat diakses. Jawaban manual tetap dapat digunakan.",
                en: "Microphone not found or inaccessible. Manual answers remain available.",
            };
        case "no-speech":
            return {
                id: "Tidak ada ucapan yang terdeteksi. Coba rekam ulang di tempat yang lebih tenang.",
                en: "No speech detected. Try recording again in a quieter place.",
            };
        case "unsupported":
            return {
                id: "Browser ini tidak mendukung Web Speech API. Gunakan STT Offline (Bahasa Indonesia) atau pilih jawaban secara manual.",
                en: "This browser does not support the Web Speech API. Use Offline STT (Indonesian only) or select answers manually.",
            };
        case "not-supported":
            return {
                id: "Browser ini tidak mendukung Web Speech API. Gunakan STT Offline (Bahasa Indonesia).",
                en: "This browser does not support the Web Speech API. Use Offline STT (Indonesian only).",
            };
        default:
            return fallback
                ? {
                      id: fallback,
                      en: "Online speech recognition could not complete transcription. Use Offline STT (Indonesian only) or manual answers.",
                  }
                : {
                      id: "Pengenalan suara online tidak dapat menyelesaikan transkripsi. Gunakan STT Offline (Bahasa Indonesia) atau jawaban manual.",
                      en: "Online speech recognition could not complete transcription. Use Offline STT (Indonesian only) or manual answers.",
                  };
    }
}

export function useSrqSpeech(
    enabled: () => boolean,
    onTranscript: (text: string, language: SpeechLanguage) => void | Promise<void>,
    owner?: number,
) {
    const { isEn } = useI18n();
    const resolveMessage = (msg: LocalizedMessage) =>
        typeof msg === "string" ? msg : isEn.value ? msg.en : msg.id;

    const sttMode = ref<SttMode>("offline");
    const onlineLanguage = ref<SpeechLanguage>(isEn.value ? "en-US" : "id-ID");
    let languageOverridden = false;
    const spokenLanguage = computed<SpeechLanguage>(() => sttMode.value === "offline" ? "id-ID" : onlineLanguage.value);
    const spokenLanguageLabel = computed(() => spokenLanguage.value === "en-US"
        ? (isEn.value ? "English (en-US)" : "Bahasa Inggris (en-US)")
        : (isEn.value ? "Indonesian (id-ID)" : "Bahasa Indonesia (id-ID)"));
    const webSpeechSupported = ref<boolean>(isWebSpeechSupported());
    const onlineConsentGranted = ref(false);
    const consentKey = owner && Number.isSafeInteger(owner) && owner > 0
        ? `rapid_mind_stt_online_consent_v1:${owner}`
        : null;
    const sttFallbackSuggested = ref(false);

    const sttStatus = ref<WhisperStatus>("idle");
    const awaitingMicrophone = ref(false);
    const sttBackend = ref<WhisperBackend | null>(null);
    const sttProgress = ref<number | null>(null);
    const sttPreparationStage = ref<WhisperPreparationStage | null>(null);
    const sttPreparationElapsed = ref(0);
    const sttModelSource = ref<WhisperModelSource>("unknown");
    const sttPreparationSlow = ref(false);
    let offlinePreparationError: LocalizedMessage | null = null;
    const rawSttMessage = ref<LocalizedMessage>(OFFLINE_IDLE_MESSAGE);
    const sttMessage = computed(() => resolveMessage(rawSttMessage.value));
    const interimTranscript = ref("");
    const transcriptSnippet = ref("");
    const sttInterpretationNotice = ref("");

    let whisperClient: WhisperClient | null = null;
    let offlineBackendReady: WhisperBackend | null = null;
    let offlinePreparing = false;
    let webSpeechClient: WebSpeechClient | null = null;
    let audioCapture: LocalAudioCapture | null = null;
    let sttSession = 0;

    // Follow locale only until an explicit override; never retarget an active mic.
    watch([isEn, sttStatus], () => {
        if (languageOverridden || awaitingMicrophone.value || ["recording", "processing", "error"].includes(sttStatus.value)) return;
        onlineLanguage.value = isEn.value ? "en-US" : "id-ID";
    }, { flush: "sync" });

    const onlineConsentRequired = computed(
        () =>
            sttMode.value === "online" &&
            webSpeechSupported.value &&
            !onlineConsentGranted.value,
    );

    const sttButtonDisabled = computed(() => {
        if (!enabled() || awaitingMicrophone.value) return true;
        if (["preparing", "processing"].includes(sttStatus.value)) return true;
        if (sttMode.value === "online") {
            return !webSpeechSupported.value || !onlineConsentGranted.value;
        }
        return false;
    });

    const sttButtonLabel = computed(() => {
        if (awaitingMicrophone.value)
            return isEn.value ? "Opening microphone…" : "Membuka mikrofon…";
        if (sttMode.value === "online") {
            if (!webSpeechSupported.value) {
                return isEn.value
                    ? "Web Speech Unsupported"
                    : "Web Speech Tidak Didukung";
            }
            if (!onlineConsentGranted.value) {
                return isEn.value
                    ? "Accept Online Privacy First"
                    : "Setujui Privasi Online Dahulu";
            }
            switch (sttStatus.value) {
                case "recording":
                    return isEn.value
                        ? "Stop & Process Final"
                        : "Selesai & Proses Final";
                case "processing":
                    return isEn.value
                        ? "Waiting for Final Result…"
                        : "Menunggu Hasil Final…";
                default:
                    return isEn.value
                        ? "Start Recording (Online)"
                        : "Mulai Rekam (Online)";
            }
        }
        switch (sttStatus.value) {
            case "preparing":
                return isEn.value ? "Preparing STT…" : "Menyiapkan STT…";
            case "ready":
                return isEn.value ? "Start Recording" : "Mulai Rekam";
            case "recording":
                return isEn.value
                    ? "Stop & Transcribe"
                    : "Selesai & Transkripsikan";
            case "processing":
                return isEn.value
                    ? "Processing on Device…"
                    : "Memproses di Perangkat…";
            case "error":
                return isEn.value ? "Retry Preparing" : "Coba Siapkan Lagi";
            default:
                return isEn.value
                    ? "Prepare Offline STT (Indonesian only)"
                    : "Siapkan STT Offline (Bahasa Indonesia)";
        }
    });

    const sttStatusLabel = computed(() => {
        if (sttMode.value === "online") {
            if (!webSpeechSupported.value) {
                return isEn.value
                    ? "Online STT is not supported by this browser"
                    : "STT Online tidak didukung browser";
            }
            if (!onlineConsentGranted.value) {
                return isEn.value
                    ? "Waiting for Online STT privacy consent"
                    : "Menunggu persetujuan privasi STT Online";
            }
            switch (sttStatus.value) {
                case "recording":
                    return isEn.value
                        ? "Online STT recording active"
                        : "Perekaman STT Online aktif";
                case "processing":
                    return isEn.value
                        ? "Waiting for Online STT final result"
                        : "Menunggu hasil final STT Online";
                case "error":
                    return isEn.value
                        ? "Online STT encountered an error"
                        : "STT Online mengalami kendala";
                default:
                    return isEn.value
                        ? "Online STT ready (synthetic data only)"
                        : "STT Online siap (khusus data sintetis)";
            }
        }
        switch (sttStatus.value) {
            case "preparing":
                return isEn.value
                    ? "Preparing STT model"
                    : "STT sedang disiapkan";
            case "ready":
                return isEn.value ? "STT ready" : "STT siap";
            case "recording":
                return isEn.value ? "Recording active" : "Perekaman aktif";
            case "processing":
                return isEn.value
                    ? "Processing local transcription"
                    : "Transkripsi lokal diproses";
            case "error":
                return isEn.value ? "STT unavailable" : "STT tidak tersedia";
            default:
                return isEn.value
                    ? "Local STT not ready"
                    : "STT lokal belum siap";
        }
    });

    function handleWorkerEvent(event: WhisperWorkerEvent) {
        switch (event.type) {
            case "PREPARATION_STAGE":
            case "PREPARATION_HEARTBEAT":
            case "PREPARATION_SLOW":
                if (!offlinePreparing) return;
                sttPreparationStage.value = event.stage;
                sttPreparationElapsed.value = event.elapsedMs;
                if (event.type === "PREPARATION_STAGE") sttPreparationSlow.value = false;
                if (event.type === "PREPARATION_SLOW") sttPreparationSlow.value = true;
                if (event.backend) sttBackend.value = event.backend;
                if (sttMode.value === "offline")
                    rawSttMessage.value = whisperPreparationMessage(event.stage, sttPreparationSlow.value, sttModelSource.value);
                break;
            case "MODEL_PROGRESS":
                if (!offlinePreparing) return;
                sttBackend.value = event.backend;
                sttModelSource.value = event.source ?? "unknown";
                if (typeof event.progress === "number") sttProgress.value = event.progress;
                if (sttMode.value !== "offline") return;
                sttStatus.value = "preparing";
                rawSttMessage.value = whisperPreparationMessage(sttPreparationStage.value ?? "model_assets", sttPreparationSlow.value, sttModelSource.value);
                break;
            case "READY":
                if (!offlinePreparing) return;
                sttPreparationStage.value = null;
                sttPreparationSlow.value = false;
                offlinePreparationError = null;
                offlinePreparing = false;
                offlineBackendReady = event.backend;
                sttBackend.value = event.backend;
                sttProgress.value = 100;
                if (sttMode.value === "offline") {
                    sttStatus.value = "ready";
                    rawSttMessage.value = {
                        id: "Model siap. Rekam satu ujaran pendek untuk transkripsi Bahasa Indonesia.",
                        en: "Model ready. Record a short utterance for Indonesian speech transcription.",
                    };
                }
                break;
            case "BACKEND_FALLBACK":
                if (sttMode.value !== "offline") return;
                sttStatus.value = "preparing";
                sttBackend.value = "wasm";
                sttProgress.value = null;
                rawSttMessage.value = {
                    id: "WebGPU tidak dapat dimulai. Mencoba backend WASM / CPU.",
                    en: "WebGPU could not start. Trying WASM / CPU backend.",
                };
                break;
            case "PROCESSING":
                if (sttMode.value !== "offline") return;
                sttStatus.value = "processing";
                sttBackend.value = event.backend;
                rawSttMessage.value = {
                    id: "Audio sedang ditranskripsikan secara lokal.",
                    en: "Audio is being transcribed locally on-device.",
                };
                break;
            case "RESULT":
                if (sttMode.value !== "offline") return;
                sttStatus.value = "ready";
                sttBackend.value = event.backend;
                interimTranscript.value = "";
                transcriptSnippet.value = event.transcript;
                sttInterpretationNotice.value = "";
                if (event.transcript) {
                    rawSttMessage.value = {
                        id: "Transkripsi selesai dan diperiksa dengan aturan SRQ konservatif.",
                        en: "Transcription completed and checked against conservative SRQ rules.",
                    };
                    void onTranscript(event.transcript, "id-ID");
                } else {
                    rawSttMessage.value = {
                        id: "Tidak ada ucapan yang dikenali. Coba rekam lagi di tempat yang lebih tenang.",
                        en: "No speech recognized. Try recording again in a quieter environment.",
                    };
                }
                break;
            case "ERROR":
                if (event.stage === "prepare" || event.fatal) {
                    offlinePreparing = false;
                    offlineBackendReady = null;
                    whisperClient?.dispose();
                    whisperClient = null;
                    offlinePreparationError = event.stage === "transcribe" ? {
                        id: "Worker Whisper terhenti. Siapkan ulang STT atau gunakan jawaban manual. Cache model dipertahankan.",
                        en: "The Whisper worker stopped. Prepare STT again or use manual answers. Model caches are retained.",
                    } : whisperPreparationFailure(event.preparationStage ?? sttPreparationStage.value ?? "worker_start", event.code);
                    if (sttMode.value === "offline") {
                        sttStatus.value = "error";
                        rawSttMessage.value = offlinePreparationError;
                    }
                } else if (sttMode.value === "offline") {
                    sttStatus.value = offlineBackendReady ? "ready" : "error";
                    rawSttMessage.value = {
                        id: "Transkripsi gagal. Coba rekam ulang; jawaban manual tetap dapat digunakan.",
                        en: "Transcription failed. Try recording again; manual answers remain available.",
                    };
                }
                break;
        }
    }

    function handleWebSpeechEvent(event: WebSpeechEvent, session: number, language: SpeechLanguage) {
        if (!enabled() || sttSession !== session || sttMode.value !== "online")
            return;
        switch (event.type) {
            case "START":
                sttStatus.value = "recording";
                sttFallbackSuggested.value = false;
                rawSttMessage.value = {
                    id: `Mikrofon aktif (STT Online ${language}). Ucapkan satu jawaban, lalu tekan Selesai.`,
                    en: `Microphone active (Online STT ${language}). Speak one answer, then press Stop.`,
                };
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
                    rawSttMessage.value = {
                        id: "Transkripsi Online final selesai dan diperiksa dengan aturan SRQ konservatif.",
                        en: "Final Online transcription finished and checked against conservative SRQ rules.",
                    };
                    void onTranscript(event.transcript, language);
                }
                break;
            case "END":
                sttStatus.value = webSpeechSupported.value ? "ready" : "error";
                interimTranscript.value = "";
                if (!event.hadFinal) {
                    if (event.hadInterim) {
                        rawSttMessage.value = {
                            id: "Transkrip sementara belum terkonfirmasi sebagai hasil final sehingga tidak mengisi jawaban. Coba rekam ulang atau gunakan tombol manual.",
                            en: "Interim transcript was not confirmed as final so it did not populate answers. Try recording again or use manual buttons.",
                        };
                    } else if (!sttFallbackSuggested.value) {
                        rawSttMessage.value = {
                            id: "Tidak ada ucapan final yang dikenali. Coba rekam lagi atau gunakan jawaban manual.",
                            en: "No final speech recognized. Try recording again or use manual answers.",
                        };
                    }
                }
                break;
            case "ERROR":
                interimTranscript.value = "";
                stopActiveCaptureOnly();
                sttFallbackSuggested.value = language === "id-ID" && event.suggestOfflineFallback;
                sttStatus.value = "error";
                rawSttMessage.value = webSpeechErrorMessage(
                    event.code,
                    event.message,
                    language,
                );
                break;
        }
    }

    function stopActiveCaptureOnly() {
        sttSession += 1;
        awaitingMicrophone.value = false;
        audioCapture?.cancel();
        audioCapture = null;
        whisperClient?.cancel?.();
        webSpeechClient?.abort();
        interimTranscript.value = "";
    }

    function selectSpeechLanguage(language: SpeechLanguage) {
        if (!enabled() || sttMode.value !== "online" || !isSpeechLanguage(language)) return;
        languageOverridden = true;
        if (language === onlineLanguage.value) return;
        stopActiveCaptureOnly();
        webSpeechClient?.dispose();
        webSpeechClient = null;
        onlineLanguage.value = language;
        transcriptSnippet.value = "";
        sttInterpretationNotice.value = "";
        sttFallbackSuggested.value = false;
        sttStatus.value = webSpeechSupported.value && onlineConsentGranted.value ? "ready" : "idle";
        rawSttMessage.value = {
            id: `Bahasa ucapan dipilih: ${language}. Tekan Mulai Rekam untuk sesi baru.`,
            en: `Spoken language selected: ${language}. Select Start Recording for a new session.`,
        };
    }

    function selectSttMode(mode: SttMode) {
        if (!enabled() || mode === sttMode.value) return;
        stopActiveCaptureOnly();
        sttInterpretationNotice.value = "";
        transcriptSnippet.value = "";
        sttMode.value = mode;

        if (mode === "online") {
            if (consentKey) {
                try {
                    onlineConsentGranted.value ||= window.localStorage.getItem(consentKey) === "accepted";
                } catch { /* Browser storage may be unavailable. */ }
            }
            webSpeechSupported.value = isWebSpeechSupported();
            if (!webSpeechSupported.value) {
                sttStatus.value = "error";
                sttFallbackSuggested.value = spokenLanguage.value === "id-ID";
                rawSttMessage.value = {
                    id: "Browser ini tidak mendukung Web Speech API (SpeechRecognition). Gunakan mode STT Offline (Bahasa Indonesia) atau tombol jawaban manual.",
                    en: "This browser does not support Web Speech API (SpeechRecognition). Use Offline STT (Indonesian only) mode or manual answer buttons.",
                };
                return;
            }
            sttFallbackSuggested.value = false;
            if (!onlineConsentGranted.value) {
                sttStatus.value = "idle";
                rawSttMessage.value = {
                    id: "Mode STT Online memerlukan persetujuan privasi eksplisit sebelum dapat digunakan.",
                    en: "Online STT mode requires explicit privacy consent before it can be used.",
                };
            } else {
                sttStatus.value = "ready";
                rawSttMessage.value = {
                    id: "Mode STT Online aktif untuk pengujian suara/data sintetis. Tekan Mulai Rekam (Online) untuk berbicara.",
                    en: "Online STT mode active for synthetic voice/data testing. Press Start Recording (Online) to speak.",
                };
            }
            return;
        }

        // Switching to offline mode
        sttFallbackSuggested.value = false;
        if (whisperClient && offlineBackendReady) {
            sttBackend.value = offlineBackendReady;
            sttStatus.value = "ready";
            sttProgress.value = 100;
            rawSttMessage.value = {
                id: "Model siap. Rekam satu ujaran pendek untuk transkripsi Bahasa Indonesia.",
                en: "Model ready. Record a short utterance for Indonesian speech transcription.",
            };
        } else if (offlinePreparing) {
            sttStatus.value = "preparing";
            rawSttMessage.value = whisperPreparationMessage(sttPreparationStage.value ?? "worker_start", sttPreparationSlow.value, sttModelSource.value);
        } else if (offlinePreparationError) {
            sttStatus.value = "error";
            rawSttMessage.value = offlinePreparationError;
        } else {
            sttStatus.value = "idle";
            rawSttMessage.value = OFFLINE_IDLE_MESSAGE;
        }
    }

    function grantOnlineConsent() {
        if (!enabled()) return;
        webSpeechSupported.value = isWebSpeechSupported();
        if (!webSpeechSupported.value) {
            sttStatus.value = "error";
            sttFallbackSuggested.value = spokenLanguage.value === "id-ID";
            rawSttMessage.value = {
                id: "Browser ini tidak mendukung Web Speech API. Gunakan mode STT Offline (Bahasa Indonesia).",
                en: "This browser does not support the Web Speech API. Use Offline STT (Indonesian only) mode.",
            };
            return;
        }
        onlineConsentGranted.value = true;
        if (consentKey) {
            try {
                window.localStorage.setItem(consentKey, "accepted");
            } catch { /* Consent applies to this session when storage is unavailable. */ }
        }
        sttFallbackSuggested.value = false;
        if (sttMode.value === "online") {
            sttStatus.value = "ready";
            rawSttMessage.value = {
                id: "Persetujuan privasi STT Online diterima untuk pengujian sintetis. Tekan Mulai Rekam (Online) untuk berbicara.",
                en: "Online STT privacy consent accepted for synthetic testing. Press Start Recording (Online) to speak.",
            };
        }
    }

    function declineOnlineConsent() {
        selectSttMode("offline");
    }

    function fallbackToOffline() {
        selectSttMode("offline");
    }

    function prepareStt() {
        if (offlinePreparing) return;
        if (whisperClient && sttStatus.value === "error") {
            whisperClient.dispose();
            whisperClient = null;
            offlineBackendReady = null;
        }
        sttStatus.value = "preparing";
        offlinePreparing = true;
        offlinePreparationError = null;
        sttProgress.value = null;
        sttPreparationStage.value = "worker_start";
        sttPreparationElapsed.value = 0;
        sttModelSource.value = "unknown";
        sttPreparationSlow.value = false;
        rawSttMessage.value = whisperPreparationMessage("worker_start");
        try {
            if (!whisperClient) {
                const client = new WhisperClient((event) => {
                    if (enabled() && whisperClient === client) handleWorkerEvent(event);
                });
                whisperClient = client;
            }
            whisperClient.prepare();
        } catch {
            handleWorkerEvent({ type: "ERROR", stage: "prepare", fatal: true, code: "worker_start_failed",
                message: "Whisper worker tidak dapat dimulai." });
        }
    }

    async function startOfflineRecording() {
        const session = sttSession;
        const capture = new LocalAudioCapture();
        audioCapture = capture;
        awaitingMicrophone.value = true;
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
            rawSttMessage.value = {
                id: "Mikrofon aktif. Ucapkan satu jawaban, lalu selesaikan rekaman.",
                en: "Microphone active. Speak one answer, then stop recording.",
            };
        } catch (error) {
            if (sttSession !== session || audioCapture !== capture) return;
            audioCapture = null;
            sttStatus.value = "ready";
            if (
                error instanceof DOMException &&
                error.name === "NotAllowedError"
            ) {
                rawSttMessage.value = {
                    id: "Izin mikrofon ditolak. Izinkan mikrofon atau gunakan jawaban manual.",
                    en: "Microphone permission denied. Allow microphone access or use manual answers.",
                };
            } else if (
                error instanceof DOMException &&
                error.name === "NotFoundError"
            ) {
                rawSttMessage.value = {
                    id: "Mikrofon tidak ditemukan. Jawaban manual tetap dapat digunakan.",
                    en: "Microphone not found. Manual answers remain available.",
                };
            } else {
                rawSttMessage.value = {
                    id: "Mikrofon tidak dapat dimulai. Jawaban manual tetap dapat digunakan.",
                    en: "Microphone could not start. Manual answers remain available.",
                };
            }
        } finally {
            if (session === sttSession) awaitingMicrophone.value = false;
        }
    }

    async function stopAndTranscribeOffline() {
        const capture = audioCapture;
        const client = whisperClient;
        const session = sttSession;
        if (!capture || !client) return;
        audioCapture = null;
        sttStatus.value = "processing";
        rawSttMessage.value = {
            id: "Menyiapkan audio untuk Whisper di perangkat.",
            en: "Preparing audio for on-device Whisper.",
        };
        try {
            const audio = await capture.stop();
            if (sttSession !== session || whisperClient !== client) return;
            if (audio.length === 0) {
                sttStatus.value = "ready";
                rawSttMessage.value = {
                    id: "Tidak ada suara yang terdeteksi. Coba rekam ulang lebih jelas.",
                    en: "No audio detected. Try recording again more clearly.",
                };
                return;
            }
            client.transcribe(audio);
        } catch {
            if (sttSession !== session || whisperClient !== client) return;
            sttStatus.value = "ready";
            rawSttMessage.value = {
                id: "Rekaman tidak dapat diproses. Coba rekam ulang.",
                en: "Recording could not be processed. Try recording again.",
            };
        }
    }

    function startOnlineRecognition() {
        webSpeechSupported.value = isWebSpeechSupported();
        if (!webSpeechSupported.value) {
            sttStatus.value = "error";
            sttFallbackSuggested.value = spokenLanguage.value === "id-ID";
            rawSttMessage.value = {
                id: "Browser ini tidak mendukung Web Speech API. Gunakan mode STT Offline (Bahasa Indonesia).",
                en: "This browser does not support the Web Speech API. Use Offline STT (Indonesian only) mode.",
            };
            return;
        }
        if (!onlineConsentGranted.value) {
            sttStatus.value = "idle";
            rawSttMessage.value = {
                id: "Setujui ketentuan privasi STT Online terlebih dahulu sebelum merekam.",
                en: "Accept the Online STT privacy notice before recording.",
            };
            return;
        }
        const session = ++sttSession;
        interimTranscript.value = "";
        transcriptSnippet.value = "";
        sttInterpretationNotice.value = "";
        sttFallbackSuggested.value = false;
        webSpeechClient?.dispose();
        const language = onlineLanguage.value;
        webSpeechClient = new WebSpeechClient((event) => {
            handleWebSpeechEvent(event, session, language);
        }, language);
        sttStatus.value = "recording";
        rawSttMessage.value = {
            id: `Memulai pengenalan suara Online (${language})…`,
            en: `Starting Online speech recognition (${language})…`,
        };
        webSpeechClient.start();
    }

    function stopOnlineRecognition() {
        if (!webSpeechClient) return;
        sttStatus.value = "processing";
        rawSttMessage.value = {
            id: "Menyelesaikan pengenalan suara Online…",
            en: "Finalizing Online speech recognition…",
        };
        webSpeechClient.stop();
    }

    function cancelRecording() {
        if (sttMode.value === "offline" && offlinePreparing) {
            whisperClient?.dispose();
            whisperClient = null;
            offlinePreparing = false;
            offlineBackendReady = null;
            offlinePreparationError = null;
            sttPreparationStage.value = null;
            sttProgress.value = null;
            sttStatus.value = "idle";
            rawSttMessage.value = {
                id: "Persiapan STT dibatalkan. Cache model dipertahankan; jawaban manual tetap tersedia.",
                en: "STT preparation canceled. Model caches are retained; manual answers remain available.",
            };
            return;
        }
        stopActiveCaptureOnly();
        if (sttMode.value === "online") {
            sttStatus.value =
                webSpeechSupported.value && onlineConsentGranted.value
                    ? "ready"
                    : "idle";
            rawSttMessage.value = {
                id: "Perekaman STT Online dibatalkan. Transkrip sementara tidak digunakan.",
                en: "Online STT recording canceled. Interim transcript discarded.",
            };
            return;
        }
        sttStatus.value = offlineBackendReady ? "ready" : "idle";
        rawSttMessage.value = {
            id: "Rekaman dibatalkan. Mikrofon sudah dimatikan.",
            en: "Recording canceled. Microphone turned off.",
        };
    }

    function handleSttAction() {
        if (sttButtonDisabled.value) return;
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
        awaitingMicrophone.value = false;
        audioCapture?.cancel();
        audioCapture = null;
        whisperClient?.dispose();
        whisperClient = null;
        offlineBackendReady = null;
        offlinePreparing = false;
        offlinePreparationError = null;
        sttPreparationStage.value = null;
        sttPreparationElapsed.value = 0;
        sttModelSource.value = "unknown";
        sttPreparationSlow.value = false;
        webSpeechClient?.dispose();
        webSpeechClient = null;
        sttMode.value = "offline";
        languageOverridden = false;
        onlineLanguage.value = isEn.value ? "en-US" : "id-ID";
        onlineConsentGranted.value = false;
        sttFallbackSuggested.value = false;
        sttStatus.value = "idle";
        sttBackend.value = null;
        sttProgress.value = null;
        rawSttMessage.value = OFFLINE_IDLE_MESSAGE;
        interimTranscript.value = "";
        transcriptSnippet.value = "";
        sttInterpretationNotice.value = "";
    }

    onUnmounted(cleanupStt);
    return {
        sttMode,
        onlineLanguage: computed(() => onlineLanguage.value),
        spokenLanguage,
        spokenLanguageLabel,
        selectSpeechLanguage,
        webSpeechSupported,
        onlineConsentRequired,
        onlineConsentGranted,
        sttFallbackSuggested,
        sttStatus,
        sttBackend,
        sttProgress,
        sttPreparationStage,
        sttPreparationElapsed,
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
