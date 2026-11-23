import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h } from "vue";
import { vueModuleUrl, moduleStub, mountFixture } from "./helpers/mountedVueFixture.ts";

const fixtureState = { clients: [] as any[], captures: [] as any[], online: [] as any[], failConstructor: false };
(globalThis as any).__whisperUi = fixtureState;
const speechModule = await import(await vueModuleUrl("resources/js/composables/useSrqSpeech.ts", {
    "@/stt/whisperClient": moduleStub(`export class WhisperClient {
        constructor(callback){if(globalThis.__whisperUi.failConstructor)throw new Error('synthetic');this.callback=callback;this.prepares=0;globalThis.__whisperUi.clients.push(this);}
        prepare(){this.prepares++;} cancel(){} dispose(){this.disposed=true;}
    }`),
    "@/stt/audioCapture": moduleStub(`export class LocalAudioCapture { constructor(){globalThis.__whisperUi.captures.push(this);} start(){return Promise.resolve();} cancel(){this.canceled=true;} }`),
    "@/stt/webSpeechClient": moduleStub(`export function isWebSpeechSupported(){return true;} export class WebSpeechClient {
        constructor(callback){this.callback=callback;globalThis.__whisperUi.online.push(this);}start(){this.callback({type:'START'});}abort(){}dispose(){}
    }`),
}));
function fixture() {
    fixtureState.clients.length = fixtureState.captures.length = fixtureState.online.length = 0;
    fixtureState.failConstructor = false;
    const applied: string[] = [];
    let speech: any;
    const mounted = mountFixture(defineComponent({ setup() {
        speech = speechModule.useSrqSpeech(() => true, (text: string) => applied.push(text));
        return () => h("div", `${speech.sttStatus.value} ${speech.sttMessage.value}`);
    } }));
    return { speech, mounted, applied };
}

test("100% file progress stays preparing until genuine READY makes microphone controls usable", async () => {
    const state = fixture();
    try {
        state.speech.handleSttAction();
        const client = fixtureState.clients[0];
        state.speech.handleSttAction();
        assert.equal(client.prepares, 1);
        client.callback({ type: "MODEL_PROGRESS", backend: "wasm", progress: 100 });
        assert.equal(state.speech.sttProgress.value, 100);
        assert.equal(state.speech.sttStatus.value, "preparing");
        assert.equal(state.speech.sttButtonDisabled.value, true);
        for (const stage of ["runtime_assets", "pipeline", "warmup"]) {
            client.callback({ type: "PREPARATION_STAGE", stage, backend: "wasm", elapsedMs: 30000 });
            assert.equal(state.speech.sttPreparationStage.value, stage);
            assert.match(state.speech.sttMessage.value, /belum siap|not ready/);
        }
        client.callback({ type: "PREPARATION_SLOW", stage: "warmup", elapsedMs: 120000 });
        assert.match(state.speech.sttMessage.value, /lebih lama|taking longer/);
        assert.equal(state.speech.sttPreparationElapsed.value, 120000);
        assert.equal(fixtureState.captures.length, 0);
        client.callback({ type: "READY", backend: "wasm" });
        assert.equal(state.speech.sttStatus.value, "ready");
        assert.equal(state.speech.sttButtonDisabled.value, false);
        state.speech.handleSttAction();
        await state.mounted.flush();
        assert.equal(state.speech.sttStatus.value, "recording");
        assert.equal(fixtureState.captures.length, 1);
        assert.equal(client.prepares, 1);
    } finally { state.mounted.app.unmount(); }
});

test("failed WASM/warm-up workers are disposed and a single retry rejects old READY and ERROR", () => {
    const state = fixture();
    try {
        state.speech.handleSttAction();
        const old = fixtureState.clients[0];
        old.callback({ type: "ERROR", stage: "prepare", preparationStage: "warmup", fatal: true, code: "prepare_stalled", message: "synthetic" });
        assert.equal(old.disposed, true);
        assert.equal(state.speech.sttStatus.value, "error");
        assert.match(state.speech.sttMessage.value, /batas tunggu|wait limit/);
        state.speech.handleSttAction(); state.speech.handleSttAction();
        assert.equal(fixtureState.clients.length, 2);
        assert.equal(fixtureState.clients[1].prepares, 1);
        old.callback({ type: "READY", backend: "wasm" });
        old.callback({ type: "ERROR", stage: "prepare", message: "late" });
        assert.equal(state.speech.sttStatus.value, "preparing");
        fixtureState.clients[1].callback({ type: "READY", backend: "wasm" });
        assert.equal(state.speech.sttStatus.value, "ready");
    } finally { state.mounted.app.unmount(); }
});

test("canceling preparation and unmounting terminate ownership of all late initialization callbacks", () => {
    const state = fixture();
    state.speech.handleSttAction();
    const old = fixtureState.clients[0];
    state.speech.cancelRecording();
    assert.equal(old.disposed, true);
    assert.equal(state.speech.sttStatus.value, "idle");
    old.callback({ type: "READY", backend: "wasm" });
    assert.equal(state.speech.sttStatus.value, "idle");
    state.speech.handleSttAction();
    const current = fixtureState.clients[1];
    state.mounted.app.unmount();
    assert.equal(current.disposed, true);
    current.callback({ type: "READY", backend: "wasm" });
    assert.equal(state.speech.sttStatus.value, "idle");
    assert.deepEqual(state.applied, []);
});

test("Online stays independent of pending Offline preparation and returning reuses only a ready worker", () => {
    const state = fixture();
    try {
        state.speech.handleSttAction();
        const offline = fixtureState.clients[0];
        state.speech.selectSttMode("online");
        state.speech.grantOnlineConsent();
        state.speech.handleSttAction();
        offline.callback({ type: "MODEL_PROGRESS", backend: "wasm", progress: 100 });
        assert.equal(state.speech.sttStatus.value, "recording");
        state.speech.selectSttMode("offline");
        assert.equal(state.speech.sttStatus.value, "preparing");
        assert.equal(state.speech.sttButtonDisabled.value, true);
        state.speech.selectSttMode("online");
        offline.callback({ type: "READY", backend: "wasm" });
        assert.notEqual(state.speech.sttStatus.value, "preparing");
        state.speech.selectSttMode("offline");
        assert.equal(state.speech.sttStatus.value, "ready");
        assert.equal(fixtureState.clients.length, 1);
        assert.equal(offline.prepares, 1);
    } finally { state.mounted.app.unmount(); }
});

test("background preparation failures do not overwrite Online state and remain actionable on returning Offline", () => {
    const state = fixture();
    try {
        state.speech.handleSttAction();
        state.speech.selectSttMode("online");
        state.speech.grantOnlineConsent(); state.speech.handleSttAction();
        fixtureState.clients[0].callback({ type: "ERROR", stage: "prepare", preparationStage: "pipeline", message: "synthetic runtime failure" });
        assert.equal(state.speech.sttStatus.value, "recording");
        state.speech.selectSttMode("offline");
        assert.equal(state.speech.sttStatus.value, "error");
        assert.match(state.speech.sttMessage.value, /pipeline/);
        state.speech.handleSttAction();
        assert.equal(fixtureState.clients.length, 2);
    } finally { state.mounted.app.unmount(); }
});

test("worker construction failure and a crash after READY allow fresh preparation", () => {
    const state = fixture();
    try {
        fixtureState.failConstructor = true;
        state.speech.handleSttAction();
        assert.equal(state.speech.sttStatus.value, "error");
        assert.equal(state.speech.sttButtonDisabled.value, false);
        fixtureState.failConstructor = false;
        state.speech.handleSttAction();
        const client = fixtureState.clients[0];
        client.callback({ type: "READY", backend: "wasm" });
        client.callback({ type: "ERROR", stage: "transcribe", fatal: true, code: "worker_error", message: "synthetic crash" });
        assert.equal(client.disposed, true);
        assert.equal(state.speech.sttStatus.value, "error");
        assert.match(state.speech.sttMessage.value, /terhenti|stopped/);
        state.speech.handleSttAction();
        assert.equal(fixtureState.clients.length, 2);
    } finally { state.mounted.app.unmount(); }
});

test("repeated Online/Offline switches reuse one genuinely ready worker without another preparation", () => {
    const state = fixture();
    try {
        state.speech.handleSttAction();
        const client = fixtureState.clients[0];
        client.callback({ type: "READY", backend: "wasm" });
        for (let n = 0; n < 10; n++) {
            state.speech.selectSttMode("online");
            state.speech.selectSttMode("offline");
            assert.equal(state.speech.sttStatus.value, "ready");
            assert.equal(client.disposed, undefined);
        }
        assert.equal(client.prepares, 1);
        assert.equal(fixtureState.clients.length, 1);
    } finally { state.mounted.app.unmount(); }
});

test("cache source messages distinguish direct cache reads from browser fetch without claiming a network download", () => {
    const state = fixture();
    try {
        state.speech.handleSttAction();
        const client = fixtureState.clients[0];
        client.callback({ type: "PREPARATION_STAGE", stage: "model_assets", backend: "wasm", elapsedMs: 10 });
        client.callback({ type: "MODEL_PROGRESS", backend: "wasm", source: "cache", progress: 100 });
        assert.match(state.speech.sttMessage.value, /cache/);
        assert.doesNotMatch(state.speech.sttMessage.value, /download|mengunduh|diunduh/i);
        assert.equal(state.speech.sttStatus.value, "preparing");
        client.callback({ type: "MODEL_PROGRESS", backend: "wasm", source: "browser_fetch", progress: 20 });
        assert.match(state.speech.sttMessage.value, /HTTP/);
        client.callback({ type: "ERROR", stage: "prepare", code: "model_cache_missing_offline", message: "synthetic" });
        assert.equal(state.speech.sttStatus.value, "error");
        assert.match(state.speech.sttMessage.value, /cache/i);
        state.speech.handleSttAction();
        const current = fixtureState.clients.at(-1);
        current.callback({ type: "ERROR", stage: "prepare", code: "model_cache_unavailable", message: "synthetic" });
        assert.match(state.speech.sttMessage.value, /izin|permission/i);
    } finally { state.mounted.app.unmount(); }
});
