import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, ref } from "vue";
import {
    vueModuleUrl,
    moduleStub,
    mountFixture,
} from "./helpers/mountedVueFixture.ts";
import { createClinicalTaskScope } from "../../resources/js/lib/clinicalTaskScope.ts";

const responses = await import(
    await vueModuleUrl("resources/js/composables/useSrqResponses.ts")
);

test("manual Q17 candidate cancels without changing any previous state; confirmation alone saves YES", async () => {
    for (const previous of [undefined, false, true, "UNCLEAR", "UNANSWERED"]) {
        const answers = ref(previous === undefined ? {} : { 17: previous });
        const saved: any[] = [];
        let interruptions = 0;
        const state = responses.useSrqResponses(
            answers,
            () => true,
            async () => {
                saved.push({ ...answers.value });
            },
            () => interruptions++,
        );
        state.setManualAnswer(17, true);
        assert.equal(state.safety.value, "CONFIRM");
        assert.equal(interruptions, 1);
        assert.deepEqual(saved, []);
        state.dismissSafety();
        assert.deepEqual(
            answers.value,
            previous === undefined ? {} : { 17: previous },
        );
        state.setManualAnswer(17, true);
        state.confirmQ17();
        assert.equal(saved.length, 1);
        assert.equal(saved[0][17], true);
        assert.equal(state.safety.value, "CONFIRMED");
    }
});

test("STT Q17 requires confirmation; canceled candidate and protected manual states stay unchanged", () => {
    const answers = ref<any>({});
    const saved: any[] = [];
    let enabled = true;
    const state = responses.useSrqResponses(
        answers,
        () => enabled,
        async () => {
            saved.push({ ...answers.value });
        },
        () => {},
    );
    const speech = "Saya ingin mengakhiri hidup.";
    state.applySpeechTranscript(speech);
    assert.equal(state.safety.value, "CONFIRM");
    assert.equal(answers.value[17], undefined);
    assert.equal(saved.length, 0);
    state.dismissSafety();
    assert.deepEqual(answers.value, {});
    state.applySpeechTranscript(speech);
    state.confirmQ17();
    assert.equal(answers.value[17], true);
    assert.equal(saved.length, 1);
    state.dismissSafety();
    state.setManualAnswer(17, "UNANSWERED");
    state.applySpeechTranscript(speech);
    assert.equal(state.safety.value, "REVIEW");
    assert.equal(answers.value[17], "UNANSWERED");
    state.confirmQ17();
    assert.equal(answers.value[17], "UNANSWERED");
    enabled = false;
    state.reset();
    state.applySpeechTranscript(speech);
    state.setManualAnswer(1, true);
    assert.equal(answers.value[1], undefined);
});

test("ordinary manual states survive later STT results, including explicit clearing", () => {
    for (const value of [true, false, "UNCLEAR", "UNANSWERED"]) {
        const answers = ref<any>({});
        const state = responses.useSrqResponses(
            answers,
            () => true,
            async () => {},
            () => {},
        );
        state.setManualAnswer(1, value);
        state.applySpeechTranscript(
            "Apakah Anda sering merasa sakit kepala? Ya.",
        );
        assert.equal(answers.value[1], value);
    }
});

test("mounted response controls offer Yes and No while preserving and clearing legacy unclear answers", async () => {
    const component = (
        await import(
            await vueModuleUrl(
                "resources/js/components/Relawan/Assessment/SrqResponseControl.vue",
            )
        )
    ).default;
    const answer = ref<any>();
    const emitted: any[] = [];
    const fixture = mountFixture(
        defineComponent({
            setup: () => () =>
                h(component, {
                    number: 17,
                    answer: answer.value,
                    onSelect(value: any) {
                        answer.value = value;
                        emitted.push(value);
                    },
                }),
        }),
    );
    try {
        const primaryButtons = () =>
            fixture.nodes(
                (node) => node.tag === "button" && "data-srq-option" in node,
            );
        const clearButtons = () =>
            fixture.nodes(
                (node) => node.tag === "button" && "data-srq-clear" in node,
            );
        assert.equal(primaryButtons().length, 2);
        assert.equal(clearButtons().length, 0);
        for (const [index, value] of [
            true,
            false,
        ].entries()) {
            primaryButtons()[index].onClick();
            await fixture.flush();
            assert.equal(answer.value, value);
            assert.equal(primaryButtons()[index]["aria-pressed"], true);
            assert.equal(
                primaryButtons().filter((node) => node["aria-pressed"] === true)
                    .length,
                1,
            );
            assert.equal(clearButtons().length, 1);
        }
        answer.value = "UNCLEAR";
        await fixture.flush();
        assert.match(fixture.text(), /Respons Tidak Jelas/);
        assert.equal(primaryButtons().filter((node) => node["aria-pressed"] === true).length, 0);
        assert.equal(clearButtons().length, 1);
        clearButtons()[0].onClick();
        await fixture.flush();
        assert.equal(answer.value, "UNANSWERED");
        assert.equal(
            primaryButtons().filter((node) => node["aria-pressed"] === true)
                .length,
            0,
        );
        assert.equal(clearButtons().length, 0);
        assert.match(fixture.text(), /Belum dijawab/);
        assert.deepEqual(emitted, [true, false, "UNANSWERED"]);
    } finally {
        fixture.app.unmount();
    }
});

test("audio permission and worker callbacks arriving after interruption are discarded", async () => {
    let resolveStart!: () => void;
    const captures: any[] = [];
    const clients: any[] = [];
    (globalThis as any).__b31Speech = {
        captures,
        clients,
        start: () =>
            new Promise<void>((resolve) => {
                resolveStart = resolve;
            }),
    };
    const speechModule = await import(
        await vueModuleUrl("resources/js/composables/useSrqSpeech.ts", {
            "@/stt/audioCapture": moduleStub(`export class LocalAudioCapture {
            constructor(){globalThis.__b31Speech.captures.push(this);this.canceled=false;}
            start(){return globalThis.__b31Speech.start();} cancel(){this.canceled=true;}
        }`),
            "@/stt/whisperClient": moduleStub(`export class WhisperClient {
            constructor(callback){this.callback=callback;globalThis.__b31Speech.clients.push(this);}
            prepare(){} dispose(){this.disposed=true;}
        }`),
        })
    );
    (globalThis as any).navigator ??= { onLine: true };
    let state: any;
    const applied: string[] = [];
    const fixture = mountFixture(
        defineComponent({
            setup() {
                state = speechModule.useSrqSpeech(
                    () => true,
                    (text: string) => applied.push(text),
                );
                return () => h("div");
            },
        }),
    );
    try {
        state.handleSttAction();
        clients[0].callback({ type: "READY", backend: "wasm" });
        state.handleSttAction();
        state.cleanupStt();
        resolveStart();
        await fixture.flush();
        assert.equal(captures[0].canceled, true);
        assert.equal(state.sttStatus.value, "idle");
        clients[0].callback({
            type: "RESULT",
            backend: "wasm",
            transcript: "stale Q17",
        });
        assert.deepEqual(applied, []);
        assert.equal(state.sttStatus.value, "idle");
        state.handleSttAction();
        assert.equal(clients.length, 2);
        assert.equal(captures.length, 1, "no automatic microphone restart");
        fixture.app.unmount();
        clients[1].callback({
            type: "RESULT",
            backend: "wasm",
            transcript: "after unmount",
        });
        assert.deepEqual(applied, []);
    } finally {
        fixture.app.unmount();
        delete (globalThis as any).__b31Speech;
    }
});

test("clinical scope rejects old async work on lock, owner/path changes and disposal", () => {
    let identity = "101:srq:0";
    const scope = createClinicalTaskScope(() => identity);
    const beforeLock = scope.capture();
    scope.invalidate();
    assert.equal(beforeLock(), false);
    const beforeOwnerSwitch = scope.capture();
    identity = "202:srq:0";
    assert.equal(beforeOwnerSwitch(), false);
    const beforeNavigation = scope.capture();
    identity = "202:review:0";
    assert.equal(beforeNavigation(), false);
    const beforeUnmount = scope.capture();
    scope.dispose();
    assert.equal(beforeUnmount(), false);
});

test("dual-mode STT enforces Online privacy consent, ignores interim transcripts for SRQ answers, and reuses warm Offline worker", async () => {
    const whisperClients: any[] = [];
    const webSpeechClients: any[] = [];
    (globalThis as any).__b31DualSpeech = {
        supported: true,
        whisperClients,
        webSpeechClients,
    };
    const speechModule = await import(
        await vueModuleUrl("resources/js/composables/useSrqSpeech.ts", {
            "@/stt/audioCapture": moduleStub(`export class LocalAudioCapture {
                start(){return Promise.resolve();}
                stop(){return Promise.resolve(new Float32Array(1600));}
                cancel(){}
            }`),
            "@/stt/whisperClient": moduleStub(`export class WhisperClient {
                constructor(cb){this.callback=cb;globalThis.__b31DualSpeech.whisperClients.push(this);}
                prepare(){}
                transcribe(){}
                cancel(){}
                dispose(){this.disposed=true;}
            }`),
            "@/stt/webSpeechClient": moduleStub(`export function isWebSpeechSupported(){return globalThis.__b31DualSpeech.supported;}
            export class WebSpeechClient {
                constructor(cb){this.callback=cb;globalThis.__b31DualSpeech.webSpeechClients.push(this);}
                start(){this.started=true;this.callback({type:'START'});}
                stop(){this.stopped=true;}
                abort(){this.aborted=true;}
                dispose(){this.disposed=true;}
            }`),
        })
    );
    (globalThis as any).navigator ??= { onLine: true };
    const answers = ref<any>({});
    let state: any;
    const responseState = responses.useSrqResponses(
        answers,
        () => true,
        async () => {},
        () => state?.cleanupStt(),
    );
    const fixture = mountFixture(
        defineComponent({
            setup() {
                state = speechModule.useSrqSpeech(
                    () => true,
                    (text: string) => {
                        const notice = responseState.applySpeechTranscript(text);
                        if (notice) state.sttInterpretationNotice.value = notice;
                    },
                );
                return () => h("div");
            },
        }),
    );
    try {
        // 1. Default mode is Offline
        assert.equal(state.sttMode.value, "offline");
        state.handleSttAction();
        assert.equal(whisperClients.length, 1);
        whisperClients[0].callback({ type: "READY", backend: "webgpu" });
        assert.equal(state.sttStatus.value, "ready");

        // 2. Manual answer on Q2 is protected
        responseState.setManualAnswer(2, false);
        assert.equal(answers.value[2], false);

        // 3. Switch to Online requires explicit privacy consent first
        state.selectSttMode("online");
        assert.equal(state.sttMode.value, "online");
        assert.equal(state.onlineConsentRequired.value, true);
        assert.equal(state.sttButtonDisabled.value, true);
        state.handleSttAction();
        assert.equal(
            webSpeechClients.length,
            0,
            "cannot record in Online mode before explicit consent",
        );

        // 4. Declining consent returns to Offline and keeps prepared Whisper worker warm
        state.declineOnlineConsent();
        assert.equal(state.sttMode.value, "offline");
        assert.equal(state.sttStatus.value, "ready");
        assert.equal(whisperClients.length, 1);

        // 5. Switch to Online and grant consent explicitly
        state.selectSttMode("online");
        state.grantOnlineConsent();
        assert.equal(state.onlineConsentRequired.value, false);
        assert.equal(state.onlineConsentGranted.value, true);
        assert.equal(state.sttStatus.value, "ready");
        assert.equal(
            webSpeechClients.length,
            0,
            "granting consent does not auto-start microphone",
        );

        // 6. Start Online recognition; interim transcript NEVER mutates SRQ answers
        state.handleSttAction();
        assert.equal(webSpeechClients.length, 1);
        assert.equal(state.sttStatus.value, "recording");
        webSpeechClients[0].callback({
            type: "INTERIM",
            transcript: "Saya sering sakit kepala dan ingin mengakhiri hidup.",
        });
        assert.equal(
            state.interimTranscript.value,
            "Saya sering sakit kepala dan ingin mengakhiri hidup.",
        );
        assert.equal(answers.value[1], undefined);
        assert.equal(responseState.safety.value, null);

        // 7. Final transcript applies safe answers, preserves manual Q2, and gates Q17
        webSpeechClients[0].callback({
            type: "FINAL",
            transcript:
                "Saya sering sakit kepala. Nafsu makan saya buruk. Saya ingin mengakhiri hidup.",
        });
        webSpeechClients[0].callback({
            type: "END",
            hadFinal: true,
            hadInterim: true,
        });
        assert.equal(state.interimTranscript.value, "");
        assert.equal(answers.value[1], true);
        assert.equal(
            answers.value[2],
            false,
            "manual answer on Q2 must not be overwritten by Online STT",
        );
        assert.equal(
            answers.value[17],
            undefined,
            "Q17 YES from Online STT must wait for human confirmation",
        );
        assert.equal(responseState.safety.value, "CONFIRM");
        // Q17 safety interrupt cleaned up STT state and reset consent
        assert.equal(state.sttMode.value, "offline");
        assert.equal(state.onlineConsentGranted.value, false);
    } finally {
        fixture.app.unmount();
        delete (globalThis as any).__b31DualSpeech;
    }
});

test("trimSilence removes long leading/trailing silence while preserving leading speech margin", async () => {
    const { trimSilence } = await import(
        await vueModuleUrl("resources/js/stt/audioCapture.ts")
    );
    // 2 seconds of silence + 1 second of speech + 2 seconds of silence at 16 kHz
    const totalSamples = 5 * 16_000;
    const raw = new Float32Array(totalSamples);
    for (let i = 2 * 16_000; i < 3 * 16_000; i++) {
        raw[i] = 0.1;
    }
    const trimmed = trimSilence(raw, 16_000);
    // Expected: 1.0s speech + 0.25s pre-margin + 0.25s post-margin = 1.5s (24,000 samples)
    assert.ok(trimmed.length >= 23_000 && trimmed.length <= 25_000);
    // Pure silence is capped at 0.5s (8,000 samples)
    const silent = trimSilence(new Float32Array(48_000), 16_000);
    assert.equal(silent.length, 8_000);
});
