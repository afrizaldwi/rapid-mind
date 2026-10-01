/// <reference lib="webworker" />
import {
    cleanupOutdatedCaches,
    precacheAndRoute,
    matchPrecache,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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
            return (
                (await matchPrecache("/build/offline.html")) ?? Response.error()
            );
        }
    },
);
