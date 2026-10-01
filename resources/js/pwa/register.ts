export function registerRelawanServiceWorker(): void {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
        .register("/build/serviceWorker.js", { scope: "/relawan/" })
        .catch(() => {
            /* Online Laravel use remains available. */
        });
}
