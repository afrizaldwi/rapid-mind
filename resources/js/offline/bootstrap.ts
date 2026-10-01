import "@/../css/app.css";
import { createApp, h } from "vue";
import { resolveRelawanContinuity } from "./relawanContinuity";
import { resolveOfflineRoute } from "@/relawan/offlineRoutes";
import { relawanRuntimeKey, type RelawanRuntime } from "@/relawan/runtime";

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
        const route = await resolveOfflineRoute(
            continuity.context.owner_user_id,
            window.location.pathname,
        );
        const stillEligible = await resolveRelawanContinuity();
        if (
            stillEligible.state !== "ELIGIBLE" ||
            stillEligible.context.owner_user_id !==
                continuity.context.owner_user_id
        ) {
            message(
                "Akses lapangan belum tersedia",
                "Masuk kembali saat terhubung ke internet. Data lokal tetap dipertahankan.",
            );
            return;
        }
        if ("unavailable" in route) {
            message("Halaman tidak tersedia", route.unavailable);
            return;
        }
        const runtime: RelawanRuntime = {
            mode: "OFFLINE_FIELD_MODE",
            owner: continuity.context.owner_user_id,
            name: continuity.context.display_name,
            shelterId: continuity.context.shelter_id,
            shelterName: continuity.context.shelter_name,
            path: window.location.pathname,
            pageProps: route.props,
            navigate(path) {
                window.location.assign(path);
            },
            reload() {},
        };
        const mountPoint = document.createElement("div");
        document.body.replaceChildren(mountPoint);
        const app = createApp({
            render: () => h(route.component, route.props),
        });
        app.provide(relawanRuntimeKey, runtime);
        app.mount(mountPoint);
    } catch {
        message(
            "Data perangkat belum tersedia",
            "Penyimpanan lokal atau halaman ini belum dapat dibuka. Data yang tersimpan tetap dipertahankan.",
        );
    }
}
void start();
