import assert from "node:assert/strict";
import test from "node:test";
import { WhisperClient } from "../../resources/js/stt/whisperClient.ts";
import { WHISPER_PREPARE_SILENCE_MS, WHISPER_PREPARE_STALL_MS, WHISPER_PREPARE_SLOW_MS } from "../../resources/js/stt/whisperPreparationWatchdog.ts";
import type { WhisperWorkerEvent } from "../../resources/js/stt/types.ts";

class WorkerDouble {
    static instances: WorkerDouble[] = [];
    listeners: Record<string, (event: any) => void> = {};
    posted: any[] = [];
    terminated = false;
    constructor() { WorkerDouble.instances.push(this); }
    addEventListener(type: string, listener: any) { this.listeners[type] = listener; }
    postMessage(message: any) { this.posted.push(message); }
    terminate() { this.terminated = true; }
    emit(data: WhisperWorkerEvent) { this.listeners.message({ data }); }
}
function setup() {
    (globalThis as any).Worker = WorkerDouble;
    WorkerDouble.instances = [];
    const events: WhisperWorkerEvent[] = [];
    const client = new WhisperClient(event => events.push(event));
    client.prepare();
    return { client, worker: WorkerDouble.instances[0], events };
}

test("100% file transfer and repeated PREPARE cannot create readiness or duplicate initialization", () => {
    const { client, worker, events } = setup();
    try {
        client.prepare(); client.prepare();
        assert.equal(worker.posted.filter(item => item.type === "PREPARE").length, 1);
        worker.emit({ type: "MODEL_PROGRESS", backend: "wasm", file: "synthetic.onnx", progress: 100 });
        client.transcribe(new Float32Array(8000));
        assert.equal(worker.posted.some(item => item.type === "TRANSCRIBE"), false);
        assert.equal(events.some(item => item.type === "READY"), false);
        worker.emit({ type: "READY", backend: "wasm" });
        client.transcribe(new Float32Array(8000));
        assert.equal(worker.posted.filter(item => item.type === "TRANSCRIBE").length, 1);
        client.prepare();
        assert.equal(worker.posted.filter(item => item.type === "PREPARE").length, 1);
    } finally { client.dispose(); }
});

test("no worker response warns before conservative timeout and terminates the worker instance before retry", t => {
    t.mock.timers.enable({ apis: ["setInterval", "Date"] });
    const { client, worker, events } = setup();
    t.mock.timers.tick(WHISPER_PREPARE_SLOW_MS);
    assert.ok(events.some(item => item.type === "PREPARATION_SLOW"));
    assert.equal(worker.terminated, false);
    t.mock.timers.tick(WHISPER_PREPARE_SILENCE_MS - WHISPER_PREPARE_SLOW_MS);
    assert.equal(worker.terminated, true);
    assert.ok(events.some(item => item.type === "ERROR" && item.code === "prepare_unresponsive"));
    const late = events.length;
    worker.emit({ type: "READY", backend: "wasm" });
    client.prepare();
    assert.equal(events.length, late);
    assert.equal(WorkerDouble.instances.length, 1, "no automatic retry loop");
    const next = new WhisperClient(event => events.push(event));
    try {
        next.prepare(); next.prepare();
        assert.equal(WorkerDouble.instances.length, 2);
        assert.equal(WorkerDouble.instances[1].posted.length, 1);
    } finally { next.dispose(); }
});

test("responsive heartbeats without forward progress cannot hide a stalled warm-up indefinitely", t => {
    t.mock.timers.enable({ apis: ["setInterval", "Date"] });
    const { worker, events } = setup();
    worker.emit({ type: "PREPARATION_STAGE", stage: "warmup", backend: "wasm", elapsedMs: 0 });
    worker.emit({ type: "MODEL_PROGRESS", backend: "wasm", file: "synthetic.onnx", progress: 100 });
    for (let elapsed = 0; elapsed < WHISPER_PREPARE_STALL_MS; elapsed += 30_000) {
        t.mock.timers.tick(30_000);
        worker.emit({ type: "PREPARATION_HEARTBEAT", stage: "warmup", elapsedMs: elapsed });
        worker.emit({ type: "MODEL_PROGRESS", backend: "wasm", file: "synthetic.onnx", progress: 100 });
    }
    assert.equal(worker.terminated, true);
    assert.ok(events.some(item => item.type === "ERROR" && item.code === "prepare_stalled" && item.preparationStage === "warmup"));
});

test("real forward download progress permits long preparation and READY stops all watchdog timers", t => {
    t.mock.timers.enable({ apis: ["setInterval", "Date"] });
    const { client, worker, events } = setup();
    try {
        for (let minute = 0; minute < 25; minute++) {
            t.mock.timers.tick(60_000);
            worker.emit({ type: "MODEL_PROGRESS", backend: "wasm", file: "large-synthetic.onnx", progress: minute });
        }
        assert.equal(worker.terminated, false);
        assert.equal(events.some(item => item.type === "ERROR"), false);
        worker.emit({ type: "READY", backend: "wasm" });
        t.mock.timers.tick(WHISPER_PREPARE_STALL_MS * 2);
        assert.equal(events.some(item => item.type === "ERROR"), false);
    } finally { client.dispose(); }
});

test("worker errors, message errors, preparation failure and explicit disposal fence every late callback", () => {
    for (const failure of ["error", "messageerror", "prepare-error", "dispose"]) {
        const { client, worker, events } = setup();
        const lateMessage = worker.listeners.message;
        if (failure === "prepare-error") worker.emit({ type: "ERROR", stage: "prepare", preparationStage: "pipeline", message: "synthetic initialization failure" });
        else if (failure === "dispose") client.dispose();
        else worker.listeners[failure]({});
        assert.equal(worker.terminated, true, failure);
        const count = events.length;
        lateMessage({ data: { type: "READY", backend: "wasm" } });
        worker.listeners.error({});
        assert.equal(events.length, count, failure);
        if (failure !== "dispose") assert.ok(events.some(item => item.type === "ERROR" && item.fatal), failure);
    }
});

test("worker crash after readiness is fatal, not a usable transcription failure", () => {
    const { worker, events } = setup();
    worker.emit({ type: "READY", backend: "wasm" });
    worker.listeners.error({});
    assert.equal(worker.terminated, true);
    assert.ok(events.some(item => item.type === "ERROR" && item.stage === "transcribe" && item.fatal));
});

test("worker disposal keeps persisted model/runtime cache entries intact", () => {
    const previous = (globalThis as any).caches;
    const entries = new Map([["transformers-cache", "synthetic model"], ["rapid-mind-onnx-runtime-v1", "synthetic runtime"]]);
    (globalThis as any).caches = { delete: (name: string) => { entries.delete(name); return Promise.resolve(true); }, open: () => { throw new Error("client disposal must not mutate persistent caches"); } };
    const { client, worker } = setup();
    try {
        worker.emit({ type: "READY", backend: "wasm" });
        client.dispose();
        assert.equal(worker.terminated, true);
        assert.equal(entries.size, 2);
    } finally { client.dispose(); (globalThis as any).caches = previous; }
});
