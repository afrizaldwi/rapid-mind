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

test("mounted response controls emit all four explicit states and expose selection", async () => {
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
        const buttons = fixture.nodes((node) => node.tag === "button");
        assert.equal(buttons.length, 4);
        for (const [index, value] of [
            true,
            false,
            "UNCLEAR",
            "UNANSWERED",
        ].entries()) {
            buttons[index].onClick();
            await fixture.flush();
            assert.equal(answer.value, value);
            assert.equal(buttons[index]["aria-pressed"], true);
            assert.equal(
                fixture.nodes(
                    (node) =>
                        node.tag === "button" && node["aria-pressed"] === true,
                ).length,
                1,
            );
        }
        assert.deepEqual(emitted, [true, false, "UNCLEAR", "UNANSWERED"]);
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
