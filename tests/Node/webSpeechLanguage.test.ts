import assert from "node:assert/strict";
import test from "node:test";
import { WebSpeechClient, type WebSpeechEvent } from "../../resources/js/stt/webSpeechClient.ts";
import type { SpeechLanguage } from "../../resources/js/stt/speechLanguage.ts";

class Recognition {
    static runs: Recognition[] = [];
    lang = "";
    continuous = false;
    interimResults = false;
    maxAlternatives = 0;
    aborted = false;
    onstart?: () => void;
    onend?: () => void;
    onresult?: (event: unknown) => void;
    onerror?: (event: unknown) => void;
    start() { Recognition.runs.push(this); this.onstart?.(); }
    stop() { this.onend?.(); }
    abort() { this.aborted = true; }
    say(text: string, isFinal = true) {
        this.onresult?.({ resultIndex: 0, results: [{ 0: { transcript: text }, isFinal }] });
    }
}
function setup(language: SpeechLanguage) {
    Object.assign(globalThis, { window: { SpeechRecognition: Recognition }, document: { hidden: false } });
    Recognition.runs = [];
    const events: WebSpeechEvent[] = [];
    const client = new WebSpeechClient(event => events.push(event), language);
    client.start();
    return { client, events };
}

test("both explicit recognition languages are configured before start and retained through restarts", () => {
    for (const language of ["en-US", "id-ID"] as const) {
        const { client, events } = setup(language);
        const first = Recognition.runs[0];
        assert.equal(first.lang, language);
        assert.equal(first.continuous, true);
        assert.equal(first.interimResults, true);
        first.say(language === "en-US" ? "I" : "saya");
        first.onend?.();
        const second = Recognition.runs[1];
        assert.equal(second.lang, language);
        second.say(language === "en-US" ? "cannot sleep" : "susah tidur");
        assert.equal(events.some(event => event.type === "FINAL"), false);
        client.stop();
        assert.deepEqual(events.filter(event => event.type === "FINAL"), [{ type: "FINAL", transcript: language === "en-US" ? "I cannot sleep" : "saya susah tidur" }]);
    }
});

test("disposing the old language session drops late events and accumulated transcripts", () => {
    const { client, events } = setup("en-US");
    const first = Recognition.runs[0];
    const lateResult = first.onresult;
    const lateEnd = first.onend;
    first.say("I want to die");
    client.dispose();
    const idEvents: WebSpeechEvent[] = [];
    const indonesian = new WebSpeechClient(event => idEvents.push(event), "id-ID");
    indonesian.start();
    lateResult?.({ resultIndex: 0, results: [{ 0: { transcript: "late English" }, isFinal: true }] });
    lateEnd?.();
    Recognition.runs[1].say("Saya pusing");
    indonesian.stop();
    assert.equal(first.aborted, true);
    assert.equal(events.some(event => event.type === "FINAL"), false);
    assert.deepEqual(idEvents.filter(event => event.type === "FINAL"), [{ type: "FINAL", transcript: "Saya pusing" }]);
    assert.equal(Recognition.runs.length, 2);
});

test("language, permission, network and unsupported-browser failures never change recognition language or publish partial answers", () => {
    for (const code of ["language-not-supported", "not-allowed", "network", "service-not-allowed"]) {
        const { events, client } = setup("en-US");
        const rec = Recognition.runs[0];
        rec.say("I have a headache");
        rec.onerror?.({ error: code });
        rec.onend?.();
        assert.equal(Recognition.runs.length, 1, code);
        assert.equal(rec.lang, "en-US");
        const error = events.find(event => event.type === "ERROR");
        assert.ok(error?.type === "ERROR");
        assert.equal(error.code, code);
        assert.equal(error.suggestOfflineFallback, false);
        if (code === "language-not-supported") assert.match(error.message, /en-US/);
        assert.equal(events.some(event => event.type === "FINAL"), false);
        client.dispose();
    }
    const { client, events } = setup("en-US");
    client.dispose();
    Object.assign(globalThis, { window: {} });
    new WebSpeechClient(event => events.push(event), "en-US").start();
    assert.equal(events.at(-1)?.type, "ERROR");
    assert.ok(events.some(event => event.type === "ERROR" && event.code === "unsupported"));
    const invalid: WebSpeechEvent[] = [];
    new WebSpeechClient(event => invalid.push(event), "fr-FR" as SpeechLanguage).start();
    assert.equal(invalid[0]?.type, "ERROR");
    assert.ok(invalid.some(event => event.type === "ERROR" && event.code === "language-not-supported"));
});
