import type { WhisperModelSource } from "./whisperModelCache";
import type { WhisperPreparationStage } from "./types";
type Message = { id: string; en: string };

const labels: Record<WhisperPreparationStage, Message> = {
    worker_start: { id: "memulai worker", en: "starting the worker" },
    runtime_assets: { id: "berkas runtime WASM", en: "WASM runtime assets" },
    pipeline: { id: "pipeline / inisialisasi runtime", en: "pipeline / runtime initialization" },
    model_assets: { id: "berkas model", en: "model assets" },
    warmup: { id: "uji kesiapan dengan audio sintetis", en: "synthetic-audio readiness probe" },
};
const modelLabels: Record<WhisperModelSource, Message> = {
    cache: { id: "memuat berkas model dari cache perangkat", en: "loading model files from device cache" },
    browser_fetch: { id: "mengambil berkas model melalui browser (jaringan atau cache HTTP)", en: "fetching model files through the browser (network or HTTP cache)" },
    unknown: { id: "membaca berkas model; sumber belum diketahui", en: "reading model files; source not yet known" },
};
export function whisperPreparationMessage(stage: WhisperPreparationStage, slow = false, source: WhisperModelSource = "unknown"): Message {
    const label = stage === "model_assets" ? modelLabels[source] : labels[stage];
    return {
        id: `Menyiapkan Whisper: ${label.id}. STT belum siap merekam.${slow ? " Tahap ini memerlukan waktu lebih lama. Anda dapat membatalkan persiapan; jawaban manual tetap tersedia." : ""}`,
        en: `Preparing Whisper: ${label.en}. STT is not ready to record.${slow ? " This stage is taking longer. You can cancel preparation; manual answers remain available." : ""}`,
    };
}
export function whisperPreparationFailure(stage: WhisperPreparationStage, code?: string): Message {
    if (code === "runtime_cache_missing_offline") return {
        id: "Cache runtime belum lengkap atau berisi berkas tidak valid. Siapkan Whisper saat internet tersedia, lalu coba lagi. Jawaban manual tetap tersedia.",
        en: "The runtime cache is incomplete or contains invalid files. Prepare Whisper with internet access, then retry. Manual answers remain available.",
    };
    if (code === "runtime_asset_invalid" || code === "runtime_cache_unavailable") return {
        id: "Berkas runtime tidak valid atau tidak dapat disimpan. Periksa koneksi, izin dan ruang penyimpanan browser, lalu coba siapkan ulang. Jawaban manual tetap tersedia.",
        en: "Runtime files are invalid or could not be cached. Check the connection, browser storage permission and free space, then retry preparation. Manual answers remain available.",
    };
    if (code === "model_cache_missing_offline") return {
        id: "Cache model belum lengkap atau berisi berkas tidak valid. Siapkan Whisper saat internet tersedia, lalu coba lagi. Jawaban manual tetap tersedia.",
        en: "The model cache is incomplete or contains invalid files. Prepare Whisper with internet access, then retry. Manual answers remain available.",
    };
    if (code === "model_cache_unavailable") return {
        id: "Cache model tidak dapat dibuka atau disimpan. Periksa izin dan ruang penyimpanan browser, lalu coba lagi. Jawaban manual tetap tersedia.",
        en: "The model cache could not be opened or saved. Check browser storage permission and free space, then retry. Manual answers remain available.",
    };
    const timedOut = code === "prepare_unresponsive" || code === "prepare_stalled";
    return {
        id: `${timedOut ? "Persiapan melewati batas tunggu pemulihan" : "Persiapan Whisper gagal"} pada tahap ${labels[stage].id}. Coba siapkan ulang atau gunakan jawaban manual. Cache model tetap dipertahankan.`,
        en: `${timedOut ? "Preparation exceeded the recovery wait limit" : "Whisper preparation failed"} at ${labels[stage].en}. Retry preparation or use manual answers. Model caches are retained.`,
    };
}
