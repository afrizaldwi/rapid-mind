import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, reactive } from "vue";
import { mountFixture, moduleStub, vueModuleUrl } from "./helpers/mountedVueFixture.ts";

const state: any = {
    runtime: reactive({ owner: 101, path: "/relawan/assessment/synthetic/srq", mode: "ONLINE_SERVER" }),
    requests: [], localCalls: 0, status: 200, deferred: null,
};
(globalThis as any).__onlineAssessment = state;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
const contract = await vueModuleUrl("resources/js/offline/assessmentContract.ts");
const source = await import(await vueModuleUrl("resources/js/composables/useAssessmentPersistence.ts", {
    "@/relawan/runtime": moduleStub("export const useRelawanRuntime=()=>globalThis.__onlineAssessment.runtime;"),
    "@/offline/assessmentWorkflow": moduleStub(`
        export {exactAssessmentAnswers} from '${contract}';
        export const loadAssessmentContext=async()=>{globalThis.__onlineAssessment.localCalls++;throw new Error('LOCAL');};
        export const completeLocalAssessment=loadAssessmentContext;`),
    "@/offline/assessmentDraft": moduleStub(`
        export const readAssessmentDraft=async()=>{globalThis.__onlineAssessment.localCalls++;throw new Error('LOCAL');};
        export const saveAssessmentDraft=readAssessmentDraft;
        export const saveAssessmentMode=readAssessmentDraft;
        export const saveObservationDraft=readAssessmentDraft;`),
    "@/offline/jsonRequest": moduleStub(`
        export const jsonRequest=async(url,payload)=>{
            const s=globalThis.__onlineAssessment;
            s.requests.push({url,payload:structuredClone(payload)});
            if(s.deferred) await s.deferred;
            return new Response(JSON.stringify({server_version:'version-'+s.requests.length,result:{source:'canonical-server'}}),{status:s.status});
        };`),
}));

function fixture(t: any, offline = false) {
    state.runtime.owner = 101;
    state.runtime.path = "/relawan/assessment/synthetic/srq";
    state.runtime.mode = offline ? "OFFLINE_FIELD_MODE" : "ONLINE_SERVER";
    state.requests = []; state.localCalls = 0; state.status = 200; state.deferred = null;
    (navigator as any).onLine = true;
    let store: any;
    const assessment = { id: "synthetic", user_id: 101, patient_id: "synthetic-patient", status: "IN_PROGRESS", server_version: "version-0",
        srq_responses: [{ question_number: 1, answer_state: "UNCLEAR", answer: null }] };
    const f = mountFixture(defineComponent({ setup() {
        store = source.useAssessmentPersistence(assessment, { id: "synthetic-patient", name: "Penyintas Sintetis" });
        return () => h("p");
    } }));
    t.after(() => f.app.unmount());
    return { store, assessment, load: () => store.loadAssessmentContext(101, assessment), f };
}

test("online context and draft reads leave encrypted device records untouched", async (t) => {
    const f = fixture(t);
    const loaded = await f.load();
    assert.equal(loaded.patient.name, "Penyintas Sintetis");
    assert.equal((await f.store.readAssessmentDraft(101, "synthetic", "srq_answers"))[1], "UNCLEAR");
    assert.equal(state.localCalls, 0);
    await assert.rejects(f.store.readAssessmentDraft(102, "synthetic", "srq_answers"), /Akses asesmen berubah/);
});

test("online SRQ sends all four states without turning unresolved answers into No", async (t) => {
    const f = fixture(t); await f.load();
    await f.store.saveAssessmentDraft({ id: "synthetic", user_id: 101 }, "srq_answers", { 1: true, 2: false, 3: "UNCLEAR" });
    assert.deepEqual(state.requests[0].payload.responses.slice(0, 4).map((r: any) => r.answer), [true, false, "UNCLEAR", "UNANSWERED"]);
    assert.equal(state.requests[0].payload.responses.length, 20);
    assert.equal(state.requests[0].payload.base_version, "version-0");
    assert.equal(state.localCalls, 0);
});

test("partial risk answers stay in memory and complete answers use the server", async (t) => {
    const f = fixture(t); await f.load();
    const ref = { id: "synthetic", user_id: 101 };
    await f.store.saveAssessmentDraft(ref, "risk_indicators", { R1: false });
    assert.equal(state.requests.length, 0);
    assert.deepEqual(await f.store.readAssessmentDraft(101, "synthetic", "risk_indicators"), { R1: false });
    await f.store.saveAssessmentDraft(ref, "risk_indicators", { R1: false, R2: false, R3: false, R4: false, R5: false });
    assert.ok(state.requests[0].url.endsWith("/risk"));
    assert.equal(state.localCalls, 0);
});

test("failed and offline saves retain current-page answers and never fall back to plaintext storage", async (t) => {
    const f = fixture(t); await f.load(); state.status = 503;
    const ref = { id: "synthetic", user_id: 101 };
    await assert.rejects(f.store.saveAssessmentDraft(ref, "srq_answers", { 1: false }), /server belum berhasil/);
    assert.equal((await f.store.readAssessmentDraft(101, "synthetic", "srq_answers"))[1], false);
    (navigator as any).onLine = false;
    await assert.rejects(f.store.saveAssessmentDraft(ref, "srq_answers", { 1: true }), /Koneksi terputus/);
    assert.equal((await f.store.readAssessmentDraft(101, "synthetic", "srq_answers"))[1], true);
    assert.equal(state.localCalls, 0);
});

test("metadata preserves observations and responses through the authorized SRQ endpoint", async (t) => {
    const f = fixture(t); await f.load();
    await f.store.saveAssessmentMode(101, "synthetic", "NON_VERBAL");
    await f.store.saveObservationDraft(101, "synthetic", { non_verbal_reasons: ["NOT_SPEAKING", "OTHER"], non_verbal_other_note: "Catatan sintetis" });
    assert.equal(state.requests[1].payload.mode, "NON_VERBAL");
    assert.equal(state.requests[1].payload.responses[0].answer, "UNCLEAR");
    assert.deepEqual(state.requests[1].payload.non_verbal_reasons, ["NOT_SPEAKING", "OTHER"]);
    assert.equal(state.requests[0].payload.base_version, "version-0");
    assert.equal(state.requests[1].payload.base_version, "version-1");
    assert.equal(state.localCalls, 0);
});

test("an uncertain online transport never claims that an offline outbox saved the answers", async (t) => {
    const f = fixture(t); await f.load();
    state.deferred = Promise.reject(new Error("old sync transport wording"));
    await assert.rejects(
        f.store.saveAssessmentDraft({ id: "synthetic", user_id: 101 }, "srq_answers", { 1: true }),
        /Penerimaan server belum terkonfirmasi.*masih ada di halaman ini/,
    );
    assert.equal(state.localCalls, 0);
});

test("queued writes cannot cross an account change or resurrect a disposed page", async (t) => {
    const f = fixture(t); await f.load();
    let finish!: () => void;
    state.deferred = new Promise<void>(resolve => { finish = resolve; });
    const ref = { id: "synthetic", user_id: 101 };
    const first = f.store.saveAssessmentDraft(ref, "srq_answers", { 1: true });
    const second = f.store.saveAssessmentDraft(ref, "srq_answers", { 1: false });
    const firstRejected = assert.rejects(first, /Akses asesmen berubah/);
    const secondRejected = assert.rejects(second, /Akses asesmen berubah/);
    await Promise.resolve(); await Promise.resolve();
    state.runtime.owner = 102; finish();
    await Promise.all([firstRejected, secondRejected]);
    assert.ok(state.requests.length <= 1);
    assert.equal(state.localCalls, 0);
    state.runtime.owner = 101;
    f.store.invalidate();
    await assert.rejects(f.store.readAssessmentDraft(101, "synthetic", "srq_answers"), /Akses asesmen berubah/);
});

test("offline workflow continues to use its existing protected repository path", async (t) => {
    const f = fixture(t, true);
    await assert.rejects(f.load(), /LOCAL/);
    assert.equal(state.localCalls, 1);
    assert.equal(state.requests.length, 0);
});
