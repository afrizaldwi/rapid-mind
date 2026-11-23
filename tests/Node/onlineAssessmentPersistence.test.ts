import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, reactive } from "vue";
import { mountFixture, moduleStub, vueModuleUrl } from "./helpers/mountedVueFixture.ts";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

async function fixture(t: any, mode = "ONLINE_SERVER") {
    const f = await offlineRepositoryFixture(true, { mode: "encrypted-acceptance", initialize: false });
    t.after(f.cleanup);
    await f.continuity.recordVerifiedRelawan({ id: 101, role: "RELAWAN", name: "Sintetis" }, true);
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    const state: any = { f, runtime: reactive({ owner: 101, path: "/relawan/assessment/synthetic/srq", mode }), syncs: 0 };
    const id = crypto.randomUUID();
    const registry = ((globalThis as any).__localPersistenceFixtures ??= new Map());
    registry.set(id, state);
    const global = `globalThis.__localPersistenceFixtures.get(${JSON.stringify(id)})`;
    const bind = (area: string, names: string[]) => moduleStub(names.map(name => `export const ${name}=${global}.f.${area}.${name};`).join("\n"));
    const source = await import(await vueModuleUrl("resources/js/composables/useAssessmentPersistence.ts", {
        "@/relawan/runtime": moduleStub(`export const useRelawanRuntime=()=>${global}.runtime;`),
        "@/offline/deviceKeyWorkflow": bind("deviceKeys", ["ensureDeviceClinicalAccess"]),
        "@/offline/assessmentWorkflow": bind("workflow", ["loadAssessmentContext", "completeLocalAssessment"]),
        "@/offline/assessmentDraft": bind("drafts", ["readAssessmentDraft", "saveAssessmentDraft", "saveAssessmentMode", "saveObservationDraft"]),
        "@/offline/syncManager": moduleStub(`export const syncManager={sync:async()=>{${global}.syncs++;}};`),
    }));
    const server = { id: "synthetic", user_id: 101, patient_id: "patient", mode: "VERBAL", status: "IN_PROGRESS",
        server_version: "a".repeat(64), srq_responses: [{ question_number: 1, answer_state: "UNCLEAR", answer: null }] };
    if (mode === "OFFLINE_FIELD_MODE") {
        await f.patients.save(101, { id: "patient", name: "Penyintas Sintetis" });
        await f.assessments.save(101, { ...server, srq_answers: { 1: "UNCLEAR" } });
    }
    let store: any;
    const view = mountFixture(defineComponent({ setup() {
        store = source.useAssessmentPersistence(server, { id: "patient", name: "Penyintas Sintetis" });
        return () => h("p");
    } }));
    t.after(() => { view.app.unmount(); registry.delete(id); });
    await store.loadAssessmentContext(101, server);
    return { ...f, store, server, state, view, ref: { id: "synthetic", user_id: 101, patient_id: "patient" } };
}

for (const mode of ["ONLINE_SERVER", "OFFLINE_FIELD_MODE"]) test(`${mode} saves all four SRQ states to encrypted storage and queues delivery`, async t => {
    const f = await fixture(t, mode);
    f.browser.navigator.onLine = false;
    await f.store.saveAssessmentDraft(f.ref, "srq_answers", { 1: true, 2: false, 3: "UNCLEAR", 4: "UNANSWERED" });
    assert.deepEqual((await f.assessments.get(101, "synthetic")).srq_answers, { 1: true, 2: false, 3: "UNCLEAR", 4: "UNANSWERED" });
    assert.equal((await f.outbox.list(101)).length, 1);
    assert.equal(f.db.assessments.rows.size, 0);
    assert.doesNotMatch(JSON.stringify(await f.db.encryptedStaging.toArray()), /Penyintas Sintetis|UNCLEAR|UNANSWERED/);
    assert.equal(f.store.online, false);
});

test("partial risk, observations and mode persist locally without waiting for server completion", async t => {
    const f = await fixture(t);
    await f.store.saveAssessmentDraft(f.ref, "risk_indicators", { R1: false });
    await f.store.saveAssessmentMode(101, "synthetic", "NON_VERBAL");
    await f.store.saveObservationDraft(101, "synthetic", { non_verbal_reasons: ["OTHER"], non_verbal_other_note: "Pengamatan Sintetis" });
    const row = await f.assessments.get(101, "synthetic");
    assert.deepEqual(row.risk_indicators, { R1: false });
    assert.equal(row.mode, "NON_VERBAL");
    assert.equal(row.non_verbal_other_note, "Pengamatan Sintetis");
    assert.equal(row.triage_result, null);
    assert.equal((await f.outbox.list(101)).length, 1);
});

test("a delayed server page does not replace a newer local clarification", async t => {
    const f = await fixture(t);
    await f.store.saveAssessmentDraft(f.ref, "srq_answers", { 1: false });
    await f.store.loadAssessmentContext(101, f.server);
    assert.equal((await f.assessments.get(101, "synthetic")).srq_answers[1], false);
});

test("account changes, stale callbacks and disposed pages cannot write", async t => {
    const f = await fixture(t);
    const before = await f.db.encryptedStaging.toArray();
    await assert.rejects(f.store.saveAssessmentDraft(f.ref, "srq_answers", { 1: true }, () => false));
    f.state.runtime.owner = 202;
    assert.throws(() => f.store.saveAssessmentDraft(f.ref, "srq_answers", { 1: true }));
    f.state.runtime.owner = 101;
    f.view.app.unmount();
    assert.throws(() => f.store.readAssessmentDraft(101, "synthetic", "srq_answers"));
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
});
