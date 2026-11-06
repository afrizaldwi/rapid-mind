import "@/../css/app.css";
import { createApp, h } from "vue";
import { resolveRelawanContinuity } from "./relawanContinuity";
import {
    resolveOfflineRoute,
    type OfflineRouteResult,
} from "@/relawan/offlineRoutes";
import { relawanRuntimeKey, type RelawanRuntime } from "@/relawan/runtime";
import { startRelawanSessionRecovery } from "./sessionRecovery";
import {
    clinicalKeyReady,
    clinicalKeyVersion,
    encryptedMode,
} from "./encryptedClinicalStorage";
import { syntheticLegacyFixture } from "./clinicalStorageInitialization";
import { readUnlockedRelawan, type OfflineOwnerProfile } from "./offlineOwnerProfile";
import OfflineEncryptionGate from "@/components/Relawan/OfflineEncryptionGate.vue";

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
        const owner = continuity.context.owner_user_id;
        let route: OfflineRouteResult;
        let profile: OfflineOwnerProfile | undefined;
        for (;;) {
            const encrypted = syntheticLegacyFixture() ? await encryptedMode(owner) : true;
            if (encrypted && !clinicalKeyReady(owner))
                await waitForOfflineUnlock(owner);
            const version = clinicalKeyVersion();
            try {
                route = await resolveOfflineRoute(
                    owner,
                    window.location.pathname,
                );
            } catch (error) {
                if (
                    encrypted &&
                    (version !== clinicalKeyVersion() ||
                        !clinicalKeyReady(owner))
                )
                    continue;
                throw error;
            }
            if (!syntheticLegacyFixture()) profile = await readUnlockedRelawan(owner);
            const stillEligible = await resolveRelawanContinuity();
            if (
                stillEligible.state !== "ELIGIBLE" ||
                stillEligible.context.owner_user_id !== owner
            ) {
                message(
                    "Akses lapangan belum tersedia",
                    "Masuk kembali saat terhubung ke internet. Data lokal tetap dipertahankan.",
                );
                return;
            }
            const modeNow = await encryptedMode(owner);
            if (
                modeNow !== encrypted ||
                (modeNow &&
                    (version !== clinicalKeyVersion() ||
                        !clinicalKeyReady(owner)))
            )
                continue;
            break;
        }
        if ("unavailable" in route) {
            message("Halaman tidak tersedia", route.unavailable);
            return;
        }
        const runtime: RelawanRuntime = {
            mode: "OFFLINE_FIELD_MODE",
            owner: continuity.context.owner_user_id,
            name: profile?.name ?? continuity.context.display_name,
            shelterId: profile?.shelterId ?? continuity.context.shelter_id,
            shelterName: profile?.shelterName ?? continuity.context.shelter_name,
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
        startRelawanSessionRecovery(continuity.context.owner_user_id);
    } catch {
        message(
            "Data perangkat belum tersedia",
            "Penyimpanan lokal atau halaman ini belum dapat dibuka. Data yang tersimpan tetap dipertahankan.",
        );
    }
}
function waitForOfflineUnlock(owner: number): Promise<void> {
    if (!target) return Promise.resolve();
    const gateHost = document.createElement("div");
    target.replaceChildren(gateHost);
    return new Promise<void>((resolve) => {
        const gate = createApp({
            render: () =>
                h(OfflineEncryptionGate, {
                    owner,
                    onUnlocked: () => {
                        gate.unmount();
                        target.replaceChildren();
                        resolve();
                    },
                }),
        });
        gate.mount(gateHost);
    });
}
void start();
