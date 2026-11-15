import assert from "node:assert/strict";
import test from "node:test";
import { vueModuleUrl, moduleStub } from "./helpers/mountedVueFixture.ts";

let fixtureNumber = 0;
const flush = async () => { for (let n = 0; n < 40; n++) await Promise.resolve(); };
function deferred<T = any>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
    return { promise, resolve, reject };
}
async function workerFixture(pipeline: (...args: any[]) => any, gpu = false) {
    const messages: any[] = [];
    const listeners: Record<string, any> = {};
    const timers = new Set<any>();
    let fetches = 0;
    const env = { useBrowserCache: false, backends: { onnx: { wasm: {} as any } } };
    const previousSelf = (globalThis as any).self;
    const previousFetch = globalThis.fetch;
    (globalThis as any).__whisperWorker = { env, pipeline };
    (globalThis as any).self = {
        location: { origin: "http://synthetic.invalid" },
        navigator: { onLine: false, hardwareConcurrency: 8, ...(gpu ? { gpu: {} } : {}) },
        crossOriginIsolated: false,
        caches: { open: async () => ({ match: async (url: string) => new Response(url.endsWith(".mjs") ? "export {};" : new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]), { headers: { "Content-Type": url.endsWith(".mjs") ? "application/javascript" : "application/wasm" } }), put: async () => { throw new Error("offline cache must not be rewritten"); } }) },
        postMessage: (event: any) => messages.push(event),
        addEventListener: (name: string, listener: any) => { listeners[name] = listener; },
        setInterval: (callback: any, ms: number) => { const timer = setInterval(callback, ms); timers.add(timer); return timer; },
        clearInterval: (timer: any) => { clearInterval(timer); timers.delete(timer); },
    };
    globalThis.fetch = async () => { fetches++; throw new Error("no synthetic network access"); };
    await import(await vueModuleUrl("resources/js/stt/whisper.worker.ts", {
        "@huggingface/transformers": moduleStub(`export const env=globalThis.__whisperWorker.env;export const pipeline=(...args)=>globalThis.__whisperWorker.pipeline(...args); // ${fixtureNumber++}`),
        "../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url": moduleStub(`export default '/runtime.mjs';`),
        "../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url": moduleStub(`export default '/runtime.wasm';`),
    }));
    return {
        messages, env, timers, fetches: () => fetches,
        send: (data: any) => listeners.message({ data }),
        rejection: () => listeners.unhandledrejection({ preventDefault() {} }),
        close: async () => {
            listeners.message({ data: { type: "DISPOSE" } });
            await flush();
            for (const timer of timers) clearInterval(timer);
            (globalThis as any).self = previousSelf;
            globalThis.fetch = previousFetch;
        },
    };
}

test("real worker source with mocked pipeline distinguishes 100% assets, pipeline initialization, warm-up and READY", async () => {
    const loading = deferred();
    const warmup = deferred();
    const calls: any[] = [];
    const instance = Object.assign(async (_audio: any, options: any) => { calls.push(options); await warmup.promise; return { text: "" }; }, { dispose: async () => {} });
    let options: any;
    const fixture = await workerFixture(async (_task, _model, supplied) => { options = supplied; return loading.promise; });
    try {
        fixture.send({ type: "PREPARE" }); fixture.send({ type: "PREPARE" });
        await flush();
        options.progress_callback({ status: "progress", progress: 100, file: "synthetic.onnx" });
        assert.equal(fixture.messages.some(event => event.type === "READY"), false);
        loading.resolve(instance); await flush();
        assert.ok(fixture.messages.some(event => event.type === "PREPARATION_STAGE" && event.stage === "warmup"));
        assert.equal(fixture.messages.some(event => event.type === "READY"), false, "hanging probe cannot declare readiness");
        warmup.resolve(undefined); await flush();
        assert.deepEqual(calls, [{ language: "Indonesian", task: "transcribe", max_new_tokens: 2 }]);
        assert.equal(fixture.messages.filter(event => event.type === "READY").length, 1);
        assert.equal(fixture.timers.size, 0);
        assert.equal(options.local_files_only, true);
        assert.deepEqual(options.dtype, { encoder_model: "q4", decoder_model_merged: "q4" });
        assert.equal(fixture.env.backends.onnx.wasm.numThreads, 1);
        assert.equal(fixture.env.backends.onnx.wasm.wasmBinary.byteLength, 8);
        assert.match(fixture.env.backends.onnx.wasm.wasmPaths.mjs, /^blob:/);
        assert.equal(fixture.fetches(), 0, "cached runtime path never fetches while offline");
        fixture.send({ type: "PREPARE" }); await flush();
        assert.equal(calls.length, 1, "a ready pipeline is reused without a new probe");
    } finally { loading.resolve(instance); warmup.resolve(undefined); await fixture.close(); }
});

test("WASM pipeline initialization failure is staged and never emits READY", async () => {
    const fixture = await workerFixture(async () => { throw new Error("synthetic WASM initialization failure"); });
    try {
        fixture.send({ type: "PREPARE", backend: "wasm" }); await flush();
        assert.ok(fixture.messages.some(event => event.type === "ERROR" && event.stage === "prepare" && event.preparationStage === "pipeline"));
        assert.equal(fixture.messages.some(event => event.type === "READY"), false);
        assert.equal(fixture.timers.size, 0);
    } finally { await fixture.close(); }
});

test("failed warm-up disposes the loaded pipeline and cannot advertise usable readiness", async () => {
    let disposed = 0;
    const instance = Object.assign(async () => { throw new Error("synthetic probe failed"); }, { dispose: async () => { disposed++; } });
    const fixture = await workerFixture(async () => instance);
    try {
        fixture.send({ type: "PREPARE", backend: "wasm" }); await flush();
        assert.equal(disposed, 1);
        assert.ok(fixture.messages.some(event => event.type === "ERROR" && event.preparationStage === "warmup"));
        assert.equal(fixture.messages.some(event => event.type === "READY"), false);
    } finally { await fixture.close(); }
});

test("WebGPU probe failure releases its returned pipeline before WASM fallback", async () => {
    const order: string[] = [];
    const fixture = await workerFixture(async (_task, _model, options) => {
        order.push(`create ${options.device}`);
        return Object.assign(async () => {
            order.push(`probe ${options.device}`);
            if (options.device === "webgpu") throw new Error("synthetic GPU probe failure");
            return { text: "" };
        }, { dispose: async () => { order.push(`dispose ${options.device}`); } });
    }, true);
    try {
        fixture.send({ type: "PREPARE" }); await flush();
        assert.deepEqual(order, ["create webgpu", "probe webgpu", "dispose webgpu", "create wasm", "probe wasm"]);
        assert.ok(fixture.messages.some(event => event.type === "BACKEND_FALLBACK"));
        assert.ok(fixture.messages.some(event => event.type === "READY" && event.backend === "wasm"));
    } finally { await fixture.close(); }
});

test("disposal during delayed pipeline creation suppresses late READY and releases the late instance", async () => {
    const loading = deferred();
    let disposed = 0;
    const instance = Object.assign(async () => ({ text: "" }), { dispose: async () => { disposed++; } });
    const fixture = await workerFixture(async () => loading.promise);
    try {
        fixture.send({ type: "PREPARE" }); await flush();
        fixture.send({ type: "DISPOSE" });
        loading.resolve(instance); await flush();
        assert.equal(disposed, 1);
        assert.equal(fixture.messages.some(event => event.type === "READY"), false);
    } finally { loading.resolve(instance); await fixture.close(); }
});

test("failed WebGPU cleanup fails preparation instead of creating another pipeline with unreleased resources", async () => {
    const devices: string[] = [];
    const fixture = await workerFixture(async (_task, _model, options) => {
        devices.push(options.device);
        return Object.assign(async () => { throw new Error("synthetic probe failure"); }, {
            dispose: async () => { throw new Error("synthetic disposal failure"); },
        });
    }, true);
    try {
        fixture.send({ type: "PREPARE" }); await flush();
        assert.deepEqual(devices, ["webgpu"]);
        assert.ok(fixture.messages.some(event => event.type === "ERROR" && event.stage === "prepare"));
        assert.equal(fixture.messages.some(event => event.type === "READY"), false);
    } finally { await fixture.close(); }
});

test("offline worker enables local-only cache lookup using the installed browser-compatible configuration", async () => {
    const fixture = await workerFixture(async (_task, _model, options) => {
        assert.equal((globalThis as any).__whisperWorker.env.allowLocalModels, true);
        assert.equal(options.local_files_only, true);
        assert.equal((globalThis as any).__whisperWorker.env.useCustomCache, true);
        return Object.assign(async () => ({ text: "" }), { dispose: async () => {} });
    });
    try {
        fixture.send({ type: "PREPARE", backend: "wasm" }); await flush();
        assert.ok(fixture.messages.some(event => event.type === "READY"));
    } finally { await fixture.close(); }
});

test("model cache persistence failure blocks READY even when a pipeline can be constructed", async () => {
    let disposed = 0;
    const fixture = await workerFixture(async () => {
        try { await (globalThis as any).__whisperWorker.env.customCache.put("https://model-cache.test/cmaree/Bagus-whisper-small-id-onnx/resolve/main/config.json", new Response('{}')); }
        catch { /* Match installed loader's suppressed cache-write rejection. */ }
        return Object.assign(async () => ({ text: "" }), { dispose: async () => { disposed++; } });
    });
    try {
        fixture.send({ type: "PREPARE", backend: "wasm" }); await flush();
        assert.equal(fixture.messages.some(event => event.type === "READY"), false);
        assert.ok(fixture.messages.some(event => event.type === "ERROR" && event.code === "model_cache_unavailable"));
        assert.equal(disposed, 1);
    } finally { await fixture.close(); }
});
