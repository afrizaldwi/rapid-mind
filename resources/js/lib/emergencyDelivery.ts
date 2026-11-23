import type { LocalEmergency } from "../offline/db";

// These describe technical receipt only, never a Healthcare action.
export function emergencyDeliveryStatus(
    local?: Pick<LocalEmergency, "sync_state" | "realtime_status" | "routing_status">,
    locale: string = "id",
) {
    const isEn = locale === "en";
    const state = local?.sync_state ?? "SYNCED"; // No local record: server-rendered detail.
    const accepted = state === "SYNCED";
    const label = isEn
        ? {
              LOCAL_SAVED: "Saved on device — awaiting synchronization",
              PENDING_SYNC:
                  "Awaiting synchronization — server receipt unconfirmed",
              SYNCING: "Request in progress — awaiting server confirmation",
              SYNC_FAILED: "Delivery outcome unconfirmed",
              SYNCED: "Accepted by server",
          }[state]
        : {
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
        detail: isEn
            ? accepted
                ? "Server receipt confirmed. This does not prove Healthcare has received notification, acknowledged, or acted on the report."
                : "Record remains stored on this device. Server receipt unconfirmed; resend using the same incident ID."
            : accepted
              ? "Penerimaan server terkonfirmasi. Ini belum membuktikan Healthcare telah menerima notifikasi, mengakui, atau menindaklanjuti laporan."
              : "Catatan tetap tersimpan di perangkat. Penerimaan server belum terkonfirmasi; kirim ulang menggunakan ID insiden yang sama.",
        realtime: isEn
            ? accepted
                ? local?.routing_status === "UNRESOLVED"
                    ? "Responsible Healthcare facility has not been assigned yet. Report is saved on server; Healthcare receipt unconfirmed."
                    : local?.realtime_status === "UNAVAILABLE"
                      ? "Realtime notification was unavailable during submission. Healthcare receipt unconfirmed."
                      : "Realtime notification receipt by Healthcare is not yet confirmed."
                : "Realtime notification status unconfirmed."
            : accepted
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

export function getEmergencySmsHref(locale: string = "id"): string {
    if (locale === "en") {
        return `sms:?body=${encodeURIComponent(
            "I need urgent emergency assistance. Please contact me to coordinate support and location.",
        )}`;
    }
    return emergencySmsHref;
}

export function getEmergencySmsGuidance(locale: string = "id"): string {
    if (locale === "en") {
        return "Select a recipient you have confirmed is reachable via SMS. Review and send manually; the app does not send automatically or verify delivery. Standard SMS is not encrypted by RAPID-MIND. Do not include unnecessary identity or clinical details.";
    }
    return emergencySmsGuidance;
}
