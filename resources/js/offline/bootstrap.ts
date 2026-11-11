import "@/../css/app.css";
import { createApp, h } from "vue";
import { i18nPlugin } from "@/i18n";
import { resolveRelawanContinuity } from "./relawanContinuity";
import OfflineRelawanShell from "@/relawan/OfflineRelawanShell.vue";

function isEnLocale(): boolean {
    try {
        return localStorage.getItem("rapid_mind_locale") === "en";
    } catch {
        return false;
    }
}

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
    const isEn = isEnLocale();
    const continuity = await resolveRelawanContinuity();
    if (continuity.state !== "ELIGIBLE") {
        message(
            isEn ? "Field access unavailable" : "Akses lapangan belum tersedia",
            continuity.state === "STORAGE_UNAVAILABLE"
                ? isEn
                    ? "Device storage cannot be read. Try again when storage is available."
                    : "Penyimpanan perangkat tidak dapat dibaca. Coba lagi saat tersedia."
                : isEn
                  ? "Sign in again when connected to the internet. Local data remains preserved."
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
        })
            .use(i18nPlugin)
            .mount(mountPoint);
    } catch {
        message(
            isEn ? "Device data unavailable" : "Data perangkat belum tersedia",
            isEn
                ? "Local storage or this page could not be opened. Saved data remains preserved."
                : "Penyimpanan lokal atau halaman ini belum dapat dibuka. Data yang tersimpan tetap dipertahankan.",
        );
    }
}
void start();
