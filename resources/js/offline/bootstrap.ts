import { resolveRelawanContinuity } from "./relawanContinuity";

const target = document.getElementById("offline-state");
async function render() {
    if (!target) return;
    const result = await resolveRelawanContinuity();
    if (result.state === "ELIGIBLE") {
        target.innerHTML = "";
        const heading = document.createElement("h2");
        heading.textContent = "Mode lapangan offline";
        const identity = document.createElement("p");
        identity.textContent =
            result.context.display_name +
            (result.context.shelter_name
                ? ` · ${result.context.shelter_name}`
                : "");
        const note = document.createElement("p");
        note.textContent =
            "Identitas perangkat ini pernah diverifikasi. Data yang tersimpan di perangkat tetap tersedia untuk tahap lanjutan.";
        target.append(heading, identity, note);
    } else {
        target.innerHTML = "";
        const heading = document.createElement("h2");
        heading.textContent = "Koneksi tidak tersedia";
        const note = document.createElement("p");
        note.textContent =
            result.state === "STORAGE_UNAVAILABLE"
                ? "Penyimpanan perangkat tidak dapat dibaca. Mode lapangan offline belum tersedia."
                : "Masuk kembali saat perangkat terhubung ke internet. Data lokal yang sudah tersimpan tetap dipertahankan.";
        target.append(heading, note);
    }
}
void render();
