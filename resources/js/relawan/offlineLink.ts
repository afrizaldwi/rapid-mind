import type { RelawanRuntime } from "./runtime";

export function offlineRelawanUrl(href: string, base: string): URL | null {
    try {
        const url = new URL(href, base);
        if (url.origin !== new URL(base).origin || url.username || url.password)
            return null;
        return /^\/relawan(?:\/|$)/.test(url.pathname) ? url : null;
    } catch {
        return null;
    }
}

export function followOfflineLink(event: MouseEvent, runtime: RelawanRuntime): void {
    const link = event.currentTarget as HTMLAnchorElement;
    if (
        event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.hasAttribute("download") ||
        (link.target && link.target.toLowerCase() !== "_self") ||
        !offlineRelawanUrl(link.href, window.location.href)
    ) return;
    event.preventDefault();
    runtime.navigate(link.href);
}
