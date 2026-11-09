import "@/../css/app.css";
import { createApp, h } from "vue";
import { resolveRelawanContinuity } from "./relawanContinuity";
import OfflineRelawanShell from "@/relawan/OfflineRelawanShell.vue";

const target = document.getElementById("offline-state");
function message(title: string, detail: string) {
    if (!target) return;
    target.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = title;
    const note = document.createElement("p");
    note.textContent = detail;
    target.append(heading, note);
}
async function start() {
    if (!target) return;
    const continuity = await resolveRelawanContinuity();
    if (continuity.state !== "ELIGIBLE") {
        message(
            "Akses lapangan belum tersedia",
            continuity.state === "STORAGE_UNAVAILABLE"
                ? "Penyimpanan perangkat tidak dapat dibaca. Coba lagi saat tersedia."
                : "Masuk kembali saat terhubung ke internet. Data lokal tetap dipertahankan.",
        );
        return;
    }
    try {
        const mountPoint = document.createElement("div");
        document.body.replaceChildren(mountPoint);
        createApp({
            render: () => h(OfflineRelawanShell, {
                owner: continuity.context.owner_user_id,
            }),
        }).mount(mountPoint);
    } catch {
        message(
            "Data perangkat belum tersedia",
            "Penyimpanan lokal atau halaman ini belum dapat dibuka. Data yang tersimpan tetap dipertahankan.",
        );
    }
}
void start();
