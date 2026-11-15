import { router } from "@inertiajs/vue3";
import { offlineRelawanUrl } from "./offlineLink";

export function navigateRelawan(owner: number, href: string,
    local: ((owner: number, path: string) => Promise<void>) | null): void {
    const url = offlineRelawanUrl(href, window.location.href);
    if (!url || !local) { router.visit(href); return; }
    const path = url.pathname + url.search + url.hash;
    const fallback = () => { void local(owner, path).catch(() => {}); return false; };
    const server = () => router.visit(href, {
        onNetworkError: fallback,
        onHttpException: response => response.status >= 500 ? fallback() : undefined,
    });
    // Active assessments already exist locally. Their stage navigation never
    // needs a successful server response, even with a stale online indicator.
    if (!navigator.onLine || /^\/relawan\/assessment\/[^/]+\//.test(url.pathname)) {
        void local(owner, path).catch(() => { if (navigator.onLine) server(); });
    } else server();
}
