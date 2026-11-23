// Static asset URLs must never persist a redirected login page or JSON error.
export function cacheableAsset(request: Request, response: Response): boolean {
    if (response.status !== 200 || response.redirected) return false;
    const path = new URL(request.url).pathname;
    const type =
        response.headers.get("Content-Type")?.split(";")[0].trim() ?? "";
    if (path === "/build/offline.html") return type === "text/html";
    if (path.endsWith(".webmanifest"))
        return type === "application/manifest+json";
    if (/\.(?:js|mjs)$/.test(path))
        return /^(?:application|text)\/(?:javascript|ecmascript)$/.test(type);
    if (path.endsWith(".css")) return type === "text/css";
    if (path.endsWith(".wasm")) return type === "application/wasm";
    if (path.endsWith(".png")) return type === "image/png";
    if (path.endsWith(".svg")) return type === "image/svg+xml";
    return false;
}
