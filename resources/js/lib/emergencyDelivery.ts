import type { LocalEmergency } from "../offline/db";

// These describe technical receipt only, never a Healthcare action.
export function emergencyDeliveryStatus(
    local?: Pick<LocalEmergency, "sync_state" | "realtime_status" | "routing_status">,
) {
    const state = local?.sync_state ?? "SYNCED"; // No local record: server-rendered detail.
    const accepted = state === "SYNCED";
    const label = {
        LOCAL_SAVED: "Tersimpan di perangkat — menunggu sinkronisasi",
        PENDING_SYNC:
            "Menunggu sinkronisasi — penerimaan server belum terkonfirmasi",
        SYNCING: "Permintaan sedang berlangsung — menunggu konfirmasi server",
        SYNC_FAILED: "Hasil pengiriman belum terkonfirmasi",
        SYNCED: "Diterima server",
    }[state];
    return {
        accepted,
        label,
        detail: accepted
            ? "Penerimaan server terkonfirmasi. Ini belum membuktikan Healthcare telah menerima notifikasi, mengakui, atau menindaklanjuti laporan."
            : "Catatan tetap tersimpan di perangkat. Penerimaan server belum terkonfirmasi; kirim ulang menggunakan ID insiden yang sama.",
        realtime: accepted
            ? local?.routing_status === "UNRESOLVED"
                ? "Penanggung jawab Faskes belum ditetapkan. Laporan tersimpan di server; penerimaan Healthcare belum terkonfirmasi."
                : local?.realtime_status === "UNAVAILABLE"
                ? "Notifikasi realtime belum tersedia saat pengiriman. Penerimaan oleh Healthcare belum terkonfirmasi."
                : "Penerimaan notifikasi realtime oleh Healthcare belum terkonfirmasi."
            : "Status notifikasi realtime belum terkonfirmasi.",
    };
}

// Deliberately accepts no clinical/context arguments and preselects no recipient.
export const emergencySmsHref = `sms:?body=${encodeURIComponent(
    "Saya membutuhkan bantuan darurat. Mohon hubungi saya untuk koordinasi bantuan dan lokasi.",
)}`;
export const emergencySmsGuidance =
    "Pilih penerima yang telah Anda pastikan dapat dihubungi melalui SMS. Periksa dan kirim sendiri; aplikasi tidak mengirim otomatis atau memverifikasi pengiriman. SMS biasa tidak terenkripsi oleh RAPID-MIND. Jangan sertakan identitas atau rincian klinis yang tidak diperlukan.";
