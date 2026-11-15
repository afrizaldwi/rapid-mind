import assert from "node:assert/strict";
import test from "node:test";
import { WebSpeechClient, type WebSpeechEvent } from "../../resources/js/stt/webSpeechClient.ts";

class Recognition {
    static runs: Recognition[] = [];
    continuous = false;
    onend?: () => void;
    onresult?: (e: unknown) => void;
    onerror?: (e: unknown) => void;
    start() { Recognition.runs.push(this); }
    stop() { this.onend?.(); }
    abort() {}
    say(text: string, isFinal = true) {
        this.onresult?.({ resultIndex: 0, results: [{ 0: { transcript: text }, isFinal }] });
    }
}

function setup() {
    Object.assign(globalThis, { window: { SpeechRecognition: Recognition }, document: { hidden: false } });
    Recognition.runs = [];
    const events: WebSpeechEvent[] = [];
    const client = new WebSpeechClient(e => events.push(e));
    client.start();
    return { client, events };
}

test("speech separated by a browser endpoint is submitted once on explicit stop", () => {
    const { client, events } = setup();
    const first = Recognition.runs[0];
    assert.equal(first.continuous, true);
    first.say("saya");
    first.say("saya");
    first.onend?.();
    const second = Recognition.runs[1];
    first.onend?.();
    assert.equal(Recognition.runs.length, 2);
    second.say("sulit tidur");
    assert.ok(!events.some(e => e.type === "FINAL" || e.type === "END"));
    client.stop();
    assert.deepEqual(events.filter(e => e.type === "FINAL"), [{ type: "FINAL", transcript: "saya sulit tidur" }]);
    assert.equal(events.at(-1)?.type, "END");
});

test("abort discards the preview and late endpoints cannot restart the microphone", () => {
    const { client, events } = setup();
    const rec = Recognition.runs[0];
    const lateEnd = rec.onend;
    rec.say("saya");
    client.abort();
    lateEnd?.();
    assert.equal(Recognition.runs.length, 1);
    assert.ok(!events.some(e => e.type === "FINAL"));
});

test("silence retries once while visible, and permission denial never retries", () => {
    const { events } = setup();
    for (let i = 0; i < 2; i++) {
        Recognition.runs[i].onerror?.({ error: "no-speech" });
        Recognition.runs[i].onend?.();
    }
    assert.equal(Recognition.runs.length, 2);
    assert.equal(events.at(-1)?.type, "ERROR");
    setup();
    Recognition.runs[0].onerror?.({ error: "not-allowed" });
    Recognition.runs[0].onend?.();
    assert.equal(Recognition.runs.length, 1);
});

test("hidden pages do not resume and interim-only speech cannot produce a final", () => {
    const { client, events } = setup();
    Recognition.runs[0].say("sementara", false);
    client.stop();
    assert.ok(!events.some(e => e.type === "FINAL"));
    setup();
    Object.assign(globalThis, { document: { hidden: true } });
    Recognition.runs[0].onend?.();
    assert.equal(Recognition.runs.length, 1);
});
