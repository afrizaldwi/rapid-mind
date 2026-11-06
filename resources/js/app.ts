import "../css/app.css";

import { router, createInertiaApp } from "@inertiajs/vue3";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createApp, h, type DefineComponent } from "vue";
import { configureEcho } from "@laravel/echo-vue";
import { lockRelawanContinuity, type VerifiedRelawan } from "./offline/relawanContinuity";

import { onClinicalInvalidation } from "./offline/clinicalAccessFence";
onClinicalInvalidation(() => router.clearHistory());

const realtimeUsesTls = window.location.protocol === "https:";
const realtimePort = Number(window.location.port || (realtimeUsesTls ? 443 : 80));

configureEcho({
    broadcaster: "reverb",
    wsHost: window.location.hostname,
    wsPort: realtimePort,
    wssPort: realtimePort,
    forceTLS: realtimeUsesTls,
    enabledTransports: ["ws", "wss"],
});

// Retire only a known RAPID-MIND worker at the old root scope.
// Other registrations on this origin may belong to unrelated applications.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
            try {
                const scopePath = new URL(reg.scope).pathname;
                const script = reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL;
                if (scopePath === "/" && script && new URL(script).pathname === "/build/serviceWorker.js") {
                    void reg.unregister();
                }
            } catch {
                // Ignore URL parsing errors
            }
        }
    }).catch(() => {});
}

// Inertia's installed history encryptor falls back to plaintext without
// SubtleCrypto. Do not initialize clinical history in that environment.
const clinicalPath = /^\/(relawan|healthcare)(\/|$)/.test(window.location.pathname);
if (clinicalPath && !window.crypto?.subtle) {
    const notice = document.createElement("p");
    notice.textContent = "Akses klinis memerlukan browser dengan enkripsi aman (HTTPS atau localhost). Data tidak dibuka. Untuk kondisi darurat, tetap dampingi penyintas dan hubungi bantuan medis melalui sarana yang tersedia.";
    document.body.replaceChildren(notice);
} else createInertiaApp({
    title: (title) => (title ? `${title} — RAPID-MIND` : "RAPID-MIND"),

    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.vue`,
            import.meta.glob<DefineComponent>("./Pages/**/*.vue"),
        ),

    setup({ el, App, props, plugin }) {
        // Inertia has consumed this bootstrap JSON. Do not retain a second
        // plaintext clinical payload in the DOM after the view is locked.
        document.querySelector('script[data-page="app"][type="application/json"]')?.remove();
        const user = (props.initialPage.props.auth as { user?: VerifiedRelawan | null } | undefined)?.user;
        if (user && user.role !== "RELAWAN") {
            void lockRelawanContinuity().catch(() => {});
        }
        createApp({
            render: () => h(App, props),
        })
            .use(plugin)
            .mount(el);
    },
});
