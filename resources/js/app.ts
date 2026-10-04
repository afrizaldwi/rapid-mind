import "../css/app.css";

import { createInertiaApp } from "@inertiajs/vue3";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createApp, h, type DefineComponent } from "vue";
import { configureEcho } from "@laravel/echo-vue";
import { lockRelawanContinuity, type VerifiedRelawan } from "./offline/relawanContinuity";

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

// Safely clear any legacy/stale service workers registered with broad root scope ('/')
// that can intercept /login or non-relawan routes, while preserving legitimate /relawan/ PWA
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
            try {
                const scopePath = new URL(reg.scope).pathname;
                if (scopePath !== "/relawan/") {
                    void reg.unregister();
                }
            } catch {
                // Ignore URL parsing errors
            }
        }
    }).catch(() => {});
}

createInertiaApp({
    title: (title) => (title ? `${title} — RAPID-MIND` : "RAPID-MIND"),

    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.vue`,
            import.meta.glob<DefineComponent>("./Pages/**/*.vue"),
        ),

    setup({ el, App, props, plugin }) {
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
