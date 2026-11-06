import assert from "node:assert/strict";
import test from "node:test";
import { fetchRelawanNavigation } from "../../resources/js/pwa/offlineNavigation.ts";
import { cacheableAsset } from "../../resources/js/pwa/assetCachePolicy.ts";

test("navigation preserves authentication failures and original response", async (t) => {
    for (const status of [200, 401, 403, 404]) {
        const response = new Response("synthetic", { status });
        const mock = t.mock.method(
            globalThis,
            "fetch",
            async (_request: Request, options: RequestInit) => {
                assert.equal(options.cache, "no-store");
                return response;
            },
        );
        assert.equal(
            await fetchRelawanNavigation(
                new Request("http://localhost:8080/relawan/home"),
            ),
            response,
        );
        assert.equal(await response.text(), "synthetic");
        mock.mock.restore();
    }
});

test("navigation fails over for server errors, transport failures and hanging bodies", async (t) => {
    for (const fetcher of [
        async () => new Response("server error", { status: 503 }),
        async () => {
            throw new Error("offline");
        },
        () => new Promise<Response>(() => {}),
        async () => new Response(new ReadableStream({ start() {} })),
    ]) {
        let signal: AbortSignal | undefined;
        const mock = t.mock.method(
            globalThis,
            "fetch",
            (_request: Request, options: RequestInit) => {
                signal = options.signal as AbortSignal;
                return fetcher();
            },
        );
        await assert.rejects(
            fetchRelawanNavigation(
                new Request("http://localhost:8080/relawan/home"),
                25,
            ),
        );
        assert.ok(signal);
        mock.mock.restore();
    }
});

test("asset caching rejects clinical JSON, redirected login HTML and mismatched asset content", () => {
    const cases: [string, string, boolean][] = [
        ["/build/offline.html", "text/html", true],
        ["/build/assets/app-hash.js", "application/javascript", true],
        ["/build/assets/app-hash.js", "text/html", false],
        ["/build/assets/app-hash.js", "application/json", false],
        ["/logo.png?v=3", "image/png", true],
        ["/build/manifest.webmanifest", "application/manifest+json", true],
        ["/build/assets/ort-hash.wasm", "application/wasm", true],
        ["/api/patients", "application/json", false],
        ["/login", "text/html", false],
        ["/relawan/home", "text/html", false],
    ];
    for (const [path, type, expected] of cases) {
        const request = new Request(`http://localhost:8080${path}`);
        const response = new Response("synthetic", {
            headers: { "Content-Type": type },
        });
        assert.equal(cacheableAsset(request, response), expected, path);
        Object.defineProperty(response, "redirected", { value: true });
        assert.equal(cacheableAsset(request, response), false);
        assert.equal(
            cacheableAsset(request, new Response(null, { status: 404 })),
            false,
        );
    }
});
