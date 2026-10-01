/// <reference lib="webworker" />
import {
    cleanupOutdatedCaches,
    precacheAndRoute,
    matchPrecache,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope & {
    __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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
