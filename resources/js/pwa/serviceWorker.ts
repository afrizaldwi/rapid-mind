/// <reference lib="webworker" />
import {
    cleanupOutdatedCaches,
    precacheAndRoute,
    matchPrecache,
    addPlugins,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";
import { fetchRelawanNavigation } from "./offlineNavigation";
import { cacheableAsset } from "./assetCachePolicy";

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

// Updates wait for every old controlled tab to close. Never take over a draft.
// First installation can claim pages after its complete precache succeeds.

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        await self.clients.claim();
        for (const client of await self.clients.matchAll({ type: "window" }))
            client.postMessage({ type: "RAPID_MIND_STORAGE_PROTOCOL", version: 2 });
    })());
});

const assets = [
    ...self.__WB_MANIFEST,
    // Matches the explicit public logo version in the application and shell.
    { url: "/logo.png?v=3", revision: "3" },
];
const assetPlugin = {
    // Check before Workbox copies redirected responses and loses that flag.
    fetchDidSucceed: async ({ request, response }: { request: Request; response: Response }) => {
        if (!cacheableAsset(request, response)) throw new Error("Respons aset offline tidak sesuai.");
        return response;
    },
    cacheWillUpdate: async ({ request, response }: { request: Request; response: Response }) =>
        cacheableAsset(request, response) ? response : null,
};
addPlugins([assetPlugin]);
precacheAndRoute(assets);
cleanupOutdatedCaches();

// Readiness is a verified cache inventory from the controlling worker, not a
// successful register() call. No clinical payload or owner identifier is sent.
self.addEventListener("message", event => {
    if (event.data?.type !== "RAPID_MIND_CHECK_OFFLINE" || !event.ports[0]) return;
    event.waitUntil((async () => {
        try {
            const present = await Promise.all(assets.map(async entry => {
                const response = await matchPrecache(entry.url);
                return !!response && cacheableAsset(new Request(new URL(entry.url, self.location.origin)), response);
            }));
            event.ports[0].postMessage({ type: "RAPID_MIND_OFFLINE_STATUS", ready: present.every(Boolean) });
        } catch {
            event.ports[0].postMessage({ type: "RAPID_MIND_OFFLINE_STATUS", ready: false });
        }
    })());
});

// Never intercept or cache authentication, API, or non-relawan routes
registerRoute(
    ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname === "/login" ||
            url.pathname === "/logout" || url.pathname.endsWith(".webmanifest") ||
            url.pathname.startsWith("/api/") ||
            url.pathname.startsWith("/sanctum/") ||
            url.pathname.startsWith("/admin/") ||
            url.pathname.startsWith("/healthcare/")),
    new NetworkOnly(),
);

// The ONNX runtime is emitted as same-origin Vite assets. Cache these large,
// stable hashed files on first use without raising the global precache limit.
registerRoute(
    ({ url }) =>
        url.origin === self.location.origin &&
        /\/build\/assets\/ort-wasm-simd-threaded\.jsep(?:-[^/]+)?\.(?:mjs|wasm)$/.test(
            url.pathname,
        ),
    new CacheFirst({ cacheName: "rapid-mind-onnx-runtime-v1", plugins: [assetPlugin] }),
);

// Navigation requests strictly scoped to /relawan/
registerRoute(
    ({ request, url }) =>
        request.mode === "navigate" &&
        request.method === "GET" &&
        url.origin === self.location.origin &&
        url.pathname.startsWith("/relawan/"),
    async ({ request }) => {
        try {
            return await fetchRelawanNavigation(request);
        } catch {
            const cachedOffline = await matchPrecache("/build/offline.html");
            if (cachedOffline) {
                return cachedOffline;
            }
            return new Response(
                '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Offline - RAPID-MIND</title></head><body style="font-family: sans-serif; padding: 2rem; text-align: center;"><h2 id="sw-h">Koneksi Terputus</h2><p id="sw-p">Perangkat Anda sedang offline. Silakan periksa koneksi internet Anda.</p><p><a id="sw-a" href="/relawan/home" style="color: #0F766E;">Coba Lagi</a></p><script>try{if(localStorage.getItem("rapid_mind_locale")==="en"){document.documentElement.lang="en";document.getElementById("sw-h").textContent="Connection Disconnected";document.getElementById("sw-p").textContent="Your device is currently offline. Please check your internet connection.";document.getElementById("sw-a").textContent="Try Again";}}catch(e){}</script></body></html>',
                {
                    status: 200,
                    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
                },
            );
        }
    },
);
