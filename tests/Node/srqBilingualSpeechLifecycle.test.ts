import assert from "node:assert/strict";
import test from "node:test";
import { ref, defineComponent, h } from "vue";
import { vueModuleUrl, moduleStub, mountFixture } from "./helpers/mountedVueFixture.ts";
import { srqEnglishSpeechCases } from "./helpers/srqEnglishSpeechCases.ts";
import { srqEnglishQuestions } from "../../resources/js/domain/srq/srqEnglishSpeechContext.ts";

const vue = import.meta.resolve("vue");
const localeEn = ref(false);
const testState = { localeEn, clients: [] as any[], whisper: [] as any[] };
(globalThis as any).__srqBilingual = testState;
const i18n = moduleStub(`import {computed} from '${vue}'; export const useI18n=()=>({isEn:computed(()=>globalThis.__srqBilingual.localeEn.value)});`);
const speechModule = await import(await vueModuleUrl("resources/js/composables/useSrqSpeech.ts", {
    "@/i18n": i18n,
    "@/stt/audioCapture": moduleStub(`export class LocalAudioCapture {start(){return Promise.resolve();} stop(){return Promise.resolve(new Float32Array(1600));} cancel(){}}`),
    "@/stt/whisperClient": moduleStub(`export class WhisperClient {constructor(callback){this.callback=callback;globalThis.__srqBilingual.whisper.push(this);} prepare(){} transcribe(){} cancel(){} dispose(){this.disposed=true;}}`),
    "@/stt/webSpeechClient": moduleStub(`export function isWebSpeechSupported(){return true;} export class WebSpeechClient {
        constructor(callback,language){this.callback=callback;this.language=language;globalThis.__srqBilingual.clients.push(this);}
        start(){this.callback({type:'START'});} stop(){} abort(){this.aborted=true;} dispose(){this.disposed=true;}
    }`),
}));
const responseModule = await import(await vueModuleUrl("resources/js/composables/useSrqResponses.ts", { "@/i18n": i18n }));
function fixture(english = false) {
    localeEn.value = english;
    testState.clients.length = 0;
    testState.whisper.length = 0;
    (globalThis as any).navigator ??= { onLine: true };
    const answers = ref<any>({});
    let speech: any;
    let saves = 0;
    const seen: Array<[string, string]> = [];
    const responses = responseModule.useSrqResponses(answers, () => true, async () => { saves++; }, () => speech.cleanupStt());
    const mounted = mountFixture(defineComponent({ setup() {
        speech = speechModule.useSrqSpeech(() => true, (text: string, language: string) => {
            seen.push([text, language]);
            speech.sttInterpretationNotice.value = responses.applySpeechTranscript(text, language);
        });
        return () => h("div");
    } }));
    return { speech, responses, answers, seen, mounted, saves: () => saves };
}
function online(state: ReturnType<typeof fixture>) {
    state.speech.selectSttMode("online");
    state.speech.grantOnlineConsent();
    state.speech.handleSttAction();
    return testState.clients.at(-1);
}

test("UI locale defaults online language while offline remains Indonesian; manual spoken-language override is independent", async () => {
    const state = fixture(true);
    try {
        assert.equal(state.speech.spokenLanguage.value, "id-ID");
        assert.equal(state.speech.onlineLanguage.value, "en-US");
        state.speech.selectSttMode("online");
        assert.equal(state.speech.spokenLanguage.value, "en-US");
        assert.equal(state.speech.onlineConsentRequired.value, true);
        state.speech.handleSttAction();
        assert.equal(testState.clients.length, 0);
        localeEn.value = false;
        await state.mounted.flush();
        assert.equal(state.speech.spokenLanguage.value, "id-ID");
        state.speech.selectSpeechLanguage("en-US");
        assert.equal(localeEn.value, false);
        state.speech.grantOnlineConsent();
        state.speech.handleSttAction();
        assert.equal(testState.clients[0].language, "en-US");
        assert.match(state.speech.sttMessage.value, /en-US/);
        assert.match(state.speech.sttMessage.value, /Mikrofon aktif/);
        state.speech.cancelRecording();
        localeEn.value = true;
        localeEn.value = false;
        await state.mounted.flush();
        assert.equal(state.speech.spokenLanguage.value, "en-US", "explicit override survives locale changes");
        state.speech.selectSttMode("offline");
        assert.equal(state.speech.spokenLanguage.value, "id-ID");
        state.speech.selectSpeechLanguage("en-US");
        assert.equal(state.speech.spokenLanguage.value, "id-ID");
        state.speech.selectSttMode("online");
        assert.equal(state.speech.spokenLanguage.value, "en-US");
        assert.equal(state.speech.onlineConsentGranted.value, true);
    } finally { state.mounted.app.unmount(); }
});

test("locale changes during capture cannot retarget the session or its final interpreter", async () => {
    const state = fixture(true);
    try {
        const client = online(state);
        client.callback({ type: "INTERIM", transcript: "I have a headache" });
        assert.deepEqual(state.answers.value, {});
        localeEn.value = false;
        await state.mounted.flush();
        assert.equal(state.speech.spokenLanguage.value, "en-US");
        client.callback({ type: "FINAL", transcript: "I have a headache" });
        assert.equal(state.answers.value[1], true);
        assert.deepEqual(state.seen, [["I have a headache", "en-US"]]);
        client.callback({ type: "END", hadFinal: true, hadInterim: true });
        assert.equal(state.speech.spokenLanguage.value, "id-ID", "next idle session follows new locale");
        assert.match(state.speech.sttInterpretationNotice.value, /Suara mengisi/);
        assert.equal(state.saves(), 1);
    } finally { state.mounted.app.unmount(); }
});

test("explicit language change aborts capture, clears previews and ignores late finals without resetting consent", () => {
    const state = fixture(true);
    try {
        const old = online(state);
        old.callback({ type: "INTERIM", transcript: "I want to die" });
        state.speech.selectSpeechLanguage("id-ID");
        assert.equal(old.aborted, true);
        assert.equal(old.disposed, true);
        assert.equal(state.speech.interimTranscript.value, "");
        assert.equal(state.speech.transcriptSnippet.value, "");
        assert.equal(state.speech.onlineConsentGranted.value, true);
        assert.equal(state.speech.sttStatus.value, "ready");
        old.callback({ type: "FINAL", transcript: "I want to die" });
        assert.deepEqual(state.seen, []);
        assert.equal(state.responses.safety.value, null);
        state.speech.handleSttAction();
        const current = testState.clients.at(-1);
        assert.equal(current.language, "id-ID");
        current.callback({ type: "FINAL", transcript: "Saya pusing" });
        assert.deepEqual(state.seen, [["Saya pusing", "id-ID"]]);
        assert.equal(state.answers.value[1], true);
    } finally { state.mounted.app.unmount(); }
});

test("English errors preserve the selected language, stop stale callbacks and never offer English offline fallback", () => {
    for (const code of ["language-not-supported", "network", "not-allowed"]) {
        const state = fixture(false);
        try {
            state.speech.selectSttMode("online");
            state.speech.selectSpeechLanguage("en-US");
            state.speech.grantOnlineConsent();
            state.speech.handleSttAction();
            const client = testState.clients.at(-1);
            client.callback({ type: "ERROR", code, message: "synthetic error", suggestOfflineFallback: true });
            assert.equal(state.speech.sttStatus.value, "error");
            assert.equal(state.speech.spokenLanguage.value, "en-US");
            assert.equal(state.speech.sttFallbackSuggested.value, false);
            if (code === "language-not-supported") assert.match(state.speech.sttMessage.value, /en-US/);
            client.callback({ type: "FINAL", transcript: "I want to die" });
            assert.deepEqual(state.seen, []);
            assert.equal(state.responses.safety.value, null);
        } finally { state.mounted.app.unmount(); }
    }
});

test("English UI still routes Whisper results as Indonesian and mode changes discard online results", () => {
    const state = fixture(true);
    try {
        const old = online(state);
        state.speech.selectSttMode("offline");
        old.callback({ type: "FINAL", transcript: "I want to die" });
        state.speech.handleSttAction();
        const whisper = testState.whisper[0];
        whisper.callback({ type: "READY", backend: "wasm" });
        whisper.callback({ type: "RESULT", backend: "wasm", transcript: "Saya males makan" });
        assert.deepEqual(state.seen, [["Saya males makan", "id-ID"]]);
        assert.equal(state.answers.value[2], true);
        assert.equal(state.responses.safety.value, null);
    } finally { state.mounted.app.unmount(); }
});

test("English Q17 CONFIRM and REVIEW share the existing persistence guard; manual answers remain protected for all items", () => {
    for (const text of ["I want to die", "I am thinking about ending my life", "I don't want to live anymore"]) {
        const state = fixture(true);
        try {
            const client = online(state);
            client.callback({ type: "FINAL", transcript: text });
            assert.equal(state.responses.safety.value, "CONFIRM", text);
            assert.equal(state.answers.value[17], undefined);
            assert.equal(state.saves(), 0);
            assert.equal(client.disposed, true);
            state.responses.confirmQ17();
            assert.equal(state.answers.value[17], true);
            assert.equal(state.saves(), 1);
        } finally { state.mounted.app.unmount(); }
    }
    for (const text of ["I might want to die", "I feel like giving up", "I am tired of living", `${srqEnglishQuestions[16].script} Yes`, "I want to die. I might not want to die.", "I do not want to die. I might want to die."]) {
        const state = fixture(true);
        try {
            online(state).callback({ type: "FINAL", transcript: text });
            assert.equal(state.responses.safety.value, "REVIEW", text);
            state.responses.confirmQ17();
            assert.equal(state.answers.value[17], undefined);
            assert.equal(state.saves(), 0);
        } finally { state.mounted.app.unmount(); }
    }
    for (const item of srqEnglishSpeechCases) {
        for (const answer of [true, false, "UNCLEAR", "UNANSWERED"] as const) {
            const answers = ref<any>({});
            const responses = responseModule.useSrqResponses(answers, () => true, async () => {}, () => {});
            responses.setManualAnswer(item.number, answer);
            if (item.number === 17 && answer === true) {
                responses.confirmQ17(); responses.dismissSafety();
            }
            responses.applySpeechTranscript(item.yes, "en-US");
            assert.equal(answers.value[item.number], answer, `Q${item.number} ${answer}`);
        }
    }
});

test("pending locale change does not silently retarget a failed English session", async () => {
    const state = fixture(true);
    try {
        const client = online(state);
        localeEn.value = false;
        await state.mounted.flush();
        client.callback({ type: "ERROR", code: "language-not-supported", message: "synthetic", suggestOfflineFallback: true });
        assert.equal(state.speech.spokenLanguage.value, "en-US");
        assert.equal(state.speech.sttStatus.value, "error");
        assert.match(state.speech.sttMessage.value, /en-US/);
        assert.match(state.speech.sttMessage.value, /tidak didukung/);
        assert.equal(state.speech.sttFallbackSuggested.value, false);
    } finally { state.mounted.app.unmount(); }
});

test("Q17 cancellation and shortened Indonesian REVIEW preserve answers without persisting ambiguous negatives", () => {
    for (const [language, text] of [
        ["en-US", "I don't want to die. I might want to die."],
        ["id-ID", "Saya tidak ingin mati. Saya mungkin ingin mati."],
        ["id-ID", "Pernah nggak kepikiran nyerah? Iya."],
    ]) {
        const state = fixture(false);
        try {
            state.answers.value[17] = "UNANSWERED";
            state.responses.applySpeechTranscript(text, language);
            assert.equal(state.responses.safety.value, "REVIEW", text);
            state.responses.confirmQ17();
            assert.equal(state.answers.value[17], "UNANSWERED");
            assert.equal(state.saves(), 0);
        } finally { state.mounted.app.unmount(); }
    }
    const state = fixture(true);
    try {
        online(state).callback({ type: "FINAL", transcript: "I want to die" });
        assert.equal(state.responses.safety.value, "CONFIRM");
        assert.match(state.speech.sttInterpretationNotice.value, /confirmation/);
        state.responses.dismissSafety();
        assert.deepEqual(state.answers.value, {});
        assert.equal(state.saves(), 0);
        assert.equal(state.speech.sttStatus.value, "idle");
    } finally { state.mounted.app.unmount(); }
});

test("English late qualifications and additional ideation concerns use REVIEW and preserve every existing Q17 answer", () => {
    for (const text of ["I want to die. Maybe not.", "I want to die. I am not sure.", "I want to die but maybe not.", "I have suicidal thoughts.", "I wish I were dead.", "I thought of suicide."]) {
        for (const previous of [undefined, true, false, "UNCLEAR", "UNANSWERED"]) {
            const state = fixture(true);
            try {
                if (previous !== undefined) state.answers.value[17] = previous;
                online(state).callback({ type: "FINAL", transcript: text });
                assert.equal(state.responses.safety.value, "REVIEW", text);
                state.responses.confirmQ17();
                assert.equal(state.answers.value[17], previous, text);
                assert.equal(state.saves(), 0, text);
            } finally { state.mounted.app.unmount(); }
        }
    }
    const state = fixture(true);
    try {
        online(state).callback({ type: "FINAL", transcript: "My appetite is poor and I feel anxious." });
        assert.deepEqual(state.answers.value, { 2: true, 6: true });
        assert.equal(state.saves(), 1);
    } finally { state.mounted.app.unmount(); }
});
