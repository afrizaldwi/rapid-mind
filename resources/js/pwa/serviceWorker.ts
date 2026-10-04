/// <reference lib="webworker" />
import {
    cleanupOutdatedCaches,
    precacheAndRoute,
    matchPrecache,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

// Immediate activation of updated service worker
self.addEventListener("install", () => {
    void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Never intercept or cache authentication, API, or non-relawan routes
registerRoute(
    ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname === "/login" ||
            url.pathname === "/logout" ||
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
    new CacheFirst({ cacheName: "rapid-mind-onnx-runtime-v1" }),
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
            const response = await fetch(request);
            if (response.status >= 500) throw new Error("Server unavailable");
            return response;
        } catch {
            const cachedOffline = await matchPrecache("/build/offline.html");
            if (cachedOffline) {
                return cachedOffline;
            }
            return new Response(
                '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Offline - RAPID-MIND</title></head><body style="font-family: sans-serif; padding: 2rem; text-align: center;"><h2>Koneksi Terputus</h2><p>Perangkat Anda sedang offline. Silakan periksa koneksi internet Anda.</p><p><a href="/relawan/home" style="color: #0F766E;">Coba Lagi</a></p></body></html>',
                {
                    status: 200,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                },
            );
        }
    },
);
