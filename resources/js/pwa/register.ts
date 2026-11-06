import { reactive } from "vue";

export const offlineReadiness = reactive<{
    state: "DEVELOPMENT" | "UNSUPPORTED" | "INSTALLING" | "CHECKING" | "READY" | "INCOMPLETE" | "ERROR";
    updateWaiting: boolean;
}>({ state: "DEVELOPMENT", updateWaiting: false });

let registration: ServiceWorkerRegistration | undefined;
let started = false;
let inspection = 0;

async function inspectController(): Promise<void> {
    const version = ++inspection;
    const worker = navigator.serviceWorker.controller;
    offlineReadiness.updateWaiting = !!registration?.waiting;
    if (!worker) {
        offlineReadiness.state = "INSTALLING";
        return;
    }
    offlineReadiness.state = "CHECKING";
    const channel = new MessageChannel();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const ready = await new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(false), 5_000);
            channel.port1.onmessage = event => resolve(
                event.data?.type === "RAPID_MIND_OFFLINE_STATUS" && event.data.ready === true,
            );
            worker.postMessage({ type: "RAPID_MIND_CHECK_OFFLINE" }, [channel.port2]);
        });
        if (version === inspection && worker === navigator.serviceWorker.controller)
            offlineReadiness.state = ready ? "READY" : "INCOMPLETE";
    } catch {
        if (version === inspection) offlineReadiness.state = "ERROR";
    } finally {
        clearTimeout(timer);
        channel.port1.close();
        channel.port2.close();
    }
}

function watchInstallation(): void {
    const worker = registration?.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
        if (worker.state === "redundant" && !navigator.serviceWorker.controller)
            offlineReadiness.state = "ERROR";
        if (worker.state === "installed" || worker.state === "activated")
            void inspectController();
    });
}

export function registerRelawanServiceWorker(): void {
    if (!import.meta.env.PROD) return;
    if (!("serviceWorker" in navigator)) {
        offlineReadiness.state = "UNSUPPORTED";
        return;
    }
    if (started) { void inspectController(); return; }
    started = true;
    offlineReadiness.state = "INSTALLING";
    navigator.serviceWorker.addEventListener("controllerchange", () => void inspectController());
    void navigator.serviceWorker.register("/build/serviceWorker.js", {
        scope: "/relawan/", updateViaCache: "none",
    }).then(value => {
        registration = value;
        registration.addEventListener("updatefound", watchInstallation);
        watchInstallation();
        void inspectController();
        // A failed online update check must not invalidate a verified offline cache.
        void registration.update().catch(() => {});
    }).catch(() => {
        started = false;
        offlineReadiness.state = "ERROR";
    });
}
