import assert from "node:assert/strict";
import test from "node:test";
import { WhisperModelCache, WHISPER_MODEL_CACHE } from "../../resources/js/stt/whisperModelCache.ts";
// Exercise the installed loader, not a reimplementation of its caching rules.
import { env } from "../../node_modules/@huggingface/transformers/src/env.js";
import { getModelFile } from "../../node_modules/@huggingface/transformers/src/utils/hub.js";

const model = "cmaree/Bagus-whisper-small-id-onnx";
const host = "https://model-cache.test/";
const files = ["config.json", "tokenizer_config.json", "tokenizer.json", "preprocessor_config.json", "onnx/encoder_model_q4.onnx", "onnx/decoder_model_merged_q4.onnx"];
const key = (filename: string) => `${host}${model}/resolve/main/${filename}`;
const response = (filename: string) => {
    const bytes = filename.endsWith(".json") ? new TextEncoder().encode('{"synthetic":true}') : new Uint8Array([8, 9, 18, 4, 116, 101, 115, 116]);
    return new Response(bytes, { headers: { "Content-Type": filename.endsWith(".json") ? "application/json" : "application/octet-stream", "Content-Length": String(bytes.byteLength) } });
};
class MemoryCache {
    entries = new Map<string, Response>();
    writes: string[] = [];
    failWrites = false;
    async match(request: string) { return this.entries.get(request)?.clone(); }
    async put(request: string, value: Response) {
        if (this.failWrites) throw new Error("synthetic quota failure");
        this.writes.push(request); this.entries.set(request, value.clone());
    }
}
function fixture() {
    const original = { ...env };
    const fetchBefore = globalThis.fetch;
    const cache = new MemoryCache();
    const requests: string[] = [];
    const sources: string[] = [];
    let online = true;
    let adapter: WhisperModelCache;
    Object.assign(env, { useFS: false, useFSCache: false, useBrowserCache: true, useCustomCache: true, remoteHost: host, remotePathTemplate: "{model}/resolve/{revision}/", localModelPath: "/models/", allowRemoteModels: true });
    globalThis.fetch = async (request: any) => {
        const url = String(request); requests.push(url);
        if (!online) throw new TypeError("synthetic offline network");
        assert.ok(url.startsWith(host), "online misses must not probe same-origin model paths");
        return response(url.split("/resolve/main/")[1]);
    };
    const newWorker = (isOnline: boolean) => {
        online = isOnline; requests.length = sources.length = 0;
        adapter = new WhisperModelCache(cache as any, model);
        env.allowLocalModels = !online; // Same per-attempt setting as the worker.
        env.customCache = adapter;
        return adapter;
    };
    const load = async (filename: string) => getModelFile(model, filename, true, {
        local_files_only: !online,
        progress_callback: (event: any) => {
            if (event.status === "initiate") adapter.beginFile(filename);
            if (event.status === "download" || event.status === "progress") sources.push(adapter.source(filename, !online));
        },
    });
    return { cache, requests, sources, newWorker, load, close() { Object.assign(env, original); globalThis.fetch = fetchBefore; } };
}

test("installed browser-default local-only guard rejects even a cache hit; the worker-compatible setting allows it", async () => {
    const f = fixture();
    try {
        f.cache.entries.set(key("config.json"), response("config.json"));
        const adapter = f.newWorker(false);
        env.allowLocalModels = false;
        await assert.rejects(() => f.load("config.json"), /local models are disabled/);
        env.allowLocalModels = true;
        assert.ok((await f.load("config.json")).length > 0);
        assert.deepEqual(f.requests, []);
        assert.ok(f.sources.every(source => source === "cache"));
        adapter.assertPersisted();
    } finally { f.close(); }
});

test("first preparation fetches and caches each missing file; a fresh worker cache adapter reuses the same keys with zero fetches", async () => {
    const f = fixture();
    try {
        let adapter = f.newWorker(true);
        for (const file of files) await f.load(file);
        adapter.assertPersisted();
        assert.equal(WHISPER_MODEL_CACHE, "transformers-cache");
        assert.deepEqual(f.requests.sort(), files.map(key).sort());
        assert.deepEqual([...f.cache.entries.keys()].sort(), files.map(key).sort());
        assert.ok(f.sources.every(source => source === "browser_fetch"));
        const writes = f.cache.writes.length;
        adapter = f.newWorker(true);
        for (const file of files) await f.load(file);
        assert.deepEqual(f.requests, []);
        assert.equal(f.cache.writes.length, writes);
        assert.ok(f.sources.length > 0 && f.sources.every(source => source === "cache"));
        adapter.assertPersisted();
    } finally { f.close(); }
});

test("fully offline initialization reads complete cached artifacts without any fetch or cache rewrite", async () => {
    const f = fixture();
    try {
        for (const file of files) f.cache.entries.set(key(file), response(file));
        f.newWorker(false);
        for (const file of files) await f.load(file);
        assert.deepEqual(f.requests, []);
        assert.deepEqual(f.cache.writes, []);
        assert.ok(f.sources.every(source => source === "cache"));
    } finally { f.close(); }
});

test("an offline cache miss fails without remote model download and preserves intact artifacts", async () => {
    const f = fixture();
    try {
        f.cache.entries.set(key("config.json"), response("config.json"));
        const adapter = f.newWorker(false);
        await f.load("config.json");
        await assert.rejects(() => f.load("onnx/encoder_model_q4.onnx"), /local_files_only/);
        assert.ok(adapter.hadMiss);
        assert.equal(f.requests.some(url => url.startsWith(host)), false);
        assert.equal(f.cache.entries.size, 1);
        assert.deepEqual(f.cache.writes, []);
    } finally { f.close(); }
});

test("partial online cache downloads only the missing file", async () => {
    const f = fixture();
    try {
        for (const file of files.slice(0, -1)) f.cache.entries.set(key(file), response(file));
        f.newWorker(true);
        for (const file of files) await f.load(file);
        assert.deepEqual(f.requests, [key(files.at(-1)!)]);
        assert.deepEqual(f.cache.writes, [key(files.at(-1)!)]);
    } finally { f.close(); }
});

test("invalid JSON, HTML or detectably truncated model entries are replaced individually without deleting valid files", async () => {
    for (const [file, bad] of [
        ["config.json", new Response('{broken', { headers: { "Content-Type": "application/json" } })],
        ["onnx/encoder_model_q4.onnx", new Response('<html>error</html>', { headers: { "Content-Type": "text/html" } })],
        ["onnx/encoder_model_q4.onnx", new Response(new Uint8Array([8, 9]), { headers: { "Content-Type": "application/octet-stream", "Content-Length": "100", "Content-Encoding": "identity" } })],
    ] as const) {
        const f = fixture();
        try {
            for (const name of files) f.cache.entries.set(key(name), response(name));
            f.cache.entries.set(key(file), bad);
            const adapter = f.newWorker(true);
            for (const name of files) await f.load(name);
            assert.equal(adapter.hasRejectedArtifacts, true);
            assert.deepEqual(f.requests, [key(file)]);
            assert.deepEqual(f.cache.writes, [key(file)]);
            assert.equal(f.cache.entries.size, files.length);
        } finally { f.close(); }
    }
});

test("corrupt offline cache fails safely and survives retry without any global reset", async () => {
    const f = fixture();
    try {
        for (const file of files) f.cache.entries.set(key(file), response(file));
        f.cache.entries.set(key("config.json"), new Response("<html>invalid</html>"));
        let adapter = f.newWorker(false);
        await assert.rejects(() => f.load("config.json"), /local_files_only/);
        assert.ok(adapter.hasRejectedArtifacts);
        assert.equal(f.cache.entries.size, files.length);
        adapter = f.newWorker(true);
        for (const file of files) await f.load(file);
        adapter.assertPersisted();
        assert.deepEqual(f.requests, [key("config.json")]);
    } finally { f.close(); }
});

test("cache write failure is detectable even though the installed loader suppresses the put rejection", async () => {
    const f = fixture();
    const warn = console.warn;
    console.warn = () => {};
    try {
        f.cache.failWrites = true;
        const adapter = f.newWorker(true);
        await f.load("config.json");
        assert.throws(() => adapter.assertPersisted(), /Cache model tidak dapat disimpan/);
        assert.equal(f.cache.entries.size, 0);
    } finally { console.warn = warn; f.close(); }
});

test("model cache validation does not reject intact ONNX bytes solely because of an imprecise MIME header", async () => {
    const f = fixture();
    try {
        const bytes = await response("onnx/encoder_model_q4.onnx").arrayBuffer();
        f.cache.entries.set(key("onnx/encoder_model_q4.onnx"), new Response(bytes, { headers: { "Content-Type": "text/plain", "Content-Length": String(bytes.byteLength) } }));
        f.newWorker(true);
        await f.load("onnx/encoder_model_q4.onnx");
        assert.deepEqual(f.requests, []);
        assert.deepEqual(f.cache.writes, []);
    } finally { f.close(); }
});

test("decoded cached JSON remains valid when cross-origin compression metadata does not expose the decoded length", async () => {
    const f = fixture();
    try {
        f.cache.entries.set(key("config.json"), new Response('{"synthetic":true}', { headers: { "Content-Type": "application/json", "Content-Length": "2" } }));
        f.newWorker(true);
        await f.load("config.json");
        assert.deepEqual(f.requests, []);
        assert.deepEqual(f.cache.writes, []);
    } finally { f.close(); }
});
