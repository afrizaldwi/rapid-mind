import assert from "node:assert/strict";
import test from "node:test";
import { cachedWhisperRuntime, WHISPER_RUNTIME_REPAIR_HEADER } from "../../resources/js/stt/whisperRuntimeCache.ts";
import { vueModuleUrl, moduleStub } from "./helpers/mountedVueFixture.ts";

const mjs = "http://localhost:8080/build/assets/ort-wasm-simd-threaded.jsep-hash.mjs";
const wasm = "http://localhost:8080/build/assets/ort-wasm-simd-threaded.jsep-hash.wasm";
const runtime = (url: string) => new Response(url.endsWith(".mjs") ? "export {};" : new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]), { headers: { "Content-Type": url.endsWith(".mjs") ? "application/javascript" : "application/wasm" } });
function fixture() {
    const entries = new Map<string, Response>();
    const writes: string[] = [];
    const requests: Array<[string, RequestInit]> = [];
    const before = globalThis.fetch;
    const cache: any = {
        match: async (url: string) => entries.get(url)?.clone(),
        put: async (url: string, value: Response) => { writes.push(url); entries.set(url, value.clone()); },
    };
    globalThis.fetch = async (url: any, options?: RequestInit) => { requests.push([String(url), options!]); return runtime(String(url)); };
    return { entries, writes, requests, cache, close() { globalThis.fetch = before; } };
}

test("runtime first fetch is cached and new worker/page reads intact assets online and offline without fetching", async () => {
    const f = fixture();
    try {
        for (const url of [mjs, wasm]) await cachedWhisperRuntime(f.cache, url, true);
        assert.deepEqual(f.requests.map(([url]) => url), [mjs, wasm]);
        f.requests.length = f.writes.length = 0;
        for (const online of [true, false])
            for (const url of [mjs, wasm]) await cachedWhisperRuntime(f.cache, url, online);
        assert.deepEqual(f.requests, []);
        assert.deepEqual(f.writes, []);
    } finally { f.close(); }
});

test("only missing or proven-invalid runtime artifacts are fetched/replaced, without any cache deletion", async () => {
    const f = fixture();
    try {
        f.entries.set(mjs, runtime(mjs));
        await cachedWhisperRuntime(f.cache, mjs, true);
        await cachedWhisperRuntime(f.cache, wasm, true);
        assert.deepEqual(f.requests.map(([url]) => url), [wasm]);
        f.requests.length = f.writes.length = 0;
        f.entries.set(wasm, new Response("<html>wrong</html>", { headers: { "Content-Type": "application/wasm" } }));
        await cachedWhisperRuntime(f.cache, mjs, true);
        await cachedWhisperRuntime(f.cache, wasm, true);
        assert.deepEqual(f.requests.map(([url]) => url), [wasm]);
        assert.equal(f.requests[0][1].cache, "reload");
        assert.equal((f.requests[0][1].headers as any)[WHISPER_RUNTIME_REPAIR_HEADER], "1");
        assert.deepEqual(f.writes, [wasm]);
        assert.equal(f.entries.size, 2);
    } finally { f.close(); }
});

test("missing or corrupt runtime artifacts fail offline without a network request; a valid unrelated artifact survives", async () => {
    const f = fixture();
    try {
        f.entries.set(mjs, runtime(mjs));
        await assert.rejects(() => cachedWhisperRuntime(f.cache, wasm, false), /internet tersedia/);
        f.entries.set(wasm, new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "application/wasm" } }));
        await assert.rejects(() => cachedWhisperRuntime(f.cache, wasm, false), /internet tersedia/);
        assert.deepEqual(f.requests, []);
        assert.ok(await cachedWhisperRuntime(f.cache, mjs, false));
        assert.equal(f.entries.size, 2);
    } finally { f.close(); }
});

test("service worker bypasses the runtime bucket only for explicit repair, including during ordinary reloads", async () => {
    const routes: any[] = [];
    const calls: string[] = [];
    (globalThis as any).__runtimeCacheRoute = { routes, calls };
    const selfBefore = (globalThis as any).self;
    (globalThis as any).self = { __WB_MANIFEST: [], location: { origin: "http://localhost:8080" }, addEventListener() {} };
    try {
        await import(await vueModuleUrl("resources/js/pwa/serviceWorker.ts", {
            "workbox-precaching": moduleStub("export const cleanupOutdatedCaches=()=>{};export const precacheAndRoute=()=>{};export const addPlugins=()=>{};export const matchPrecache=()=>{};"),
            "workbox-routing": moduleStub("export const registerRoute=(match,handler)=>globalThis.__runtimeCacheRoute.routes.push({match,handler});"),
            "workbox-strategies": moduleStub("export class CacheFirst{handle(){globalThis.__runtimeCacheRoute.calls.push('cache-first');return new Response('synthetic');}} export class NetworkOnly{handle(){globalThis.__runtimeCacheRoute.calls.push('network-only');return new Response('synthetic');}}"),
        }));
        for (const request of [new Request(wasm), new Request(wasm, { cache: "reload" }), new Request(wasm, { headers: { [WHISPER_RUNTIME_REPAIR_HEADER]: "1" } })]) {
            const options = { url: new URL(wasm), request };
            const route = routes.find(route => route.match(options));
            await route.handler(options);
        }
        assert.deepEqual(calls, ["cache-first", "cache-first", "network-only"]);
    } finally { (globalThis as any).self = selfBefore; delete (globalThis as any).__runtimeCacheRoute; }
});
