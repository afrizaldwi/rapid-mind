import assert from "node:assert/strict";
import test from "node:test";
import { ref, reactive } from "vue";
import {
    vueModuleUrl,
    moduleStub,
    mountFixture,
} from "./helpers/mountedVueFixture.ts";
const vue = import.meta.resolve("vue");
(globalThis as any).document = {
    activeElement: null,
    querySelector: () => null,
};
(globalThis as any).window = { location: { hash: "" }, dispatchEvent() {} };
(globalThis as any).navigator ??= { onLine: true };
const state = ((globalThis as any).__b31ui = {
    runtime: reactive({
        owner: 101,
        path: "/relawan/assessment/synthetic/srq",
        mode: "OFFLINE_FIELD_MODE",
        shelterId: null,
        pageProps: {},
    }),
    key: ref(0),
    saved: [] as any[],
    interrupts: 0,
    layouts: [] as any[],
    calls: 0,
    assessment: {
        id: "synthetic",
        patient_id: "patient-synthetic",
        mode: "VERBAL",
        status: "IN_PROGRESS",
        srq_answers: { 17: false },
    },
    modes: [] as any[],
    observations: [] as any[],
    context: null as any,
    emergencyCalls: [] as any[],
    emergencyPending: null as any,
    events: 0,
    pending: null as any,
});
state.context = async () => ({
    assessment: state.assessment,
    patient: { id: "patient-synthetic", name: "Penyintas Sintetis" },
});
const overrides = {
    "@/relawan/runtime": moduleStub(
        "export const useRelawanRuntime = () => globalThis.__b31ui.runtime;",
    ),
    "@/offline/encryptedClinicalStorage": moduleStub(
        "export const clinicalKeyVersion = () => globalThis.__b31ui.key.value;",
    ),
    "@/offline/assessmentWorkflow":
        moduleStub(`export const relawanOwner = () => 101;
        export const loadAssessmentContext = (...args) => globalThis.__b31ui.context(...args);
        export { exactAssessmentAnswers } from '${await vueModuleUrl("resources/js/offline/assessmentContract.ts")}';
        export const completeLocalAssessment = async () => {globalThis.__b31ui.calls++;};`),
    "@/offline/assessmentDraft":
        moduleStub(`export const readAssessmentDraft = async () => globalThis.__b31ui.assessment.srq_answers;
        export const mergeAssessmentDraft = (_field, server, local) => ({...server,...local});
        export const saveAssessmentDraft = async (_a,_f,value) => {globalThis.__b31ui.saved.push({...value});};
        export const saveObservationDraft = async (_owner,_id,value) => {globalThis.__b31ui.observations.push(value);}; export const saveAssessmentMode = async (_owner,_id,mode) => {globalThis.__b31ui.modes.push(mode);};`),
    "@/layouts/RelawanLayout.vue":
        moduleStub(`import {defineComponent,h,onMounted} from '${vue}';
        export default defineComponent({emits:['clinical-ready','clinical-lock','emergency-interrupt'],setup(_p,{emit,slots}){
            globalThis.__b31ui.layouts.push(emit);onMounted(()=>emit('clinical-ready'));
            return ()=>h('main',{},slots.default?.());}});`),
    "@/relawan/RelawanLink.vue": moduleStub(
        `import {defineComponent,h} from '${vue}'; export default defineComponent({props:['href'],setup(p,{slots}){return ()=>h('a',{href:p.href},slots.default?.());}});`,
    ),
    "@/stt/audioCapture": moduleStub(
        "export class LocalAudioCapture {cancel(){globalThis.__b31ui.interrupts++;}}",
    ),
    "@/stt/whisperClient": moduleStub(
        "export class WhisperClient {dispose(){} prepare(){}}",
    ),
    "@/offline/patientRepository":
        moduleStub(`export const patientRepository = {
        list: async () => [], get: async () => {if(globalThis.__b31ui.pending) await globalThis.__b31ui.pending; return {id:'patient-synthetic'};},
        saveServerSnapshot: async () => {}};`),
    "@/offline/emergencyWorkflow": moduleStub(
        `export const createLocalEmergency = async (_owner,input) => {globalThis.__b31ui.emergencyCalls.push(input); if(globalThis.__b31ui.emergencyPending) await globalThis.__b31ui.emergencyPending; return 'emergency-synthetic';};`,
    ),
    "@/offline/syncManager": moduleStub(
        "export const syncManager = {sync: async () => {}};",
    ),
};
const Srq = (
    await import(
        await vueModuleUrl(
            "resources/js/Pages/Relawan/Assessment/Srq.vue",
            overrides,
        )
    )
).default;
const Review = (
    await import(
        await vueModuleUrl(
            "resources/js/Pages/Relawan/Assessment/Review.vue",
            overrides,
        )
    )
).default;
const T0 = (
    await import(
        await vueModuleUrl(
            "resources/js/components/Relawan/T0Verification.vue",
            overrides,
        )
    )
).default;

function button(f: any, label: string) {
    return f
        .nodes((node: any) => node.tag === "button")
        .find((node: any) => f.text(node).includes(label));
}

test("mounted SRQ gates manual Q17 persistence, retains old answer on cancellation, hides dialog synchronously on lock", async () => {
    state.saved = [];
    state.emergencyCalls = [];
    const f = mountFixture(Srq, {
        assessment: { ...state.assessment, user_id: 101 },
        patient: { id: "patient-synthetic", name: "Penyintas Sintetis" },
    });
    try {
        await f.flush();
        const question = f.nodes((node) => node.id === "srq-question-17")[0];
        const yes = f.nodes(
            (node) => node.tag === "button" && f.text(node) === "Ya",
        );
        assert.equal(yes.length, 20);
        yes[16].onClick();
        await f.flush();
        assert.equal(state.saved.length, 0);
        assert.ok(button(f, "Batal"));
        button(f, "Batal").onClick();
        await f.flush();
        assert.equal(state.saved.length, 0);
        assert.match(f.text(question), /Tidak/);
        yes[16].onClick();
        await f.flush();
        button(f, "Konfirmasi Jawaban Ya").onClick();
        await f.flush();
        assert.equal(state.saved.at(-1)[17], true);
        assert.equal(state.emergencyCalls.length, 0);
        const panel = f.nodes((node) => node.role === "dialog")[0];
        state.layouts.at(-1)("clinical-lock");
        // Dialog prop updates follow Vue scheduling; layout masks the enclosing DOM synchronously.
        await f.flush();
        assert.equal(f.nodes((node) => node.role === "dialog").length, 0);
        assert.equal(panel.style.display, "none");
        state.layouts.at(-1)("clinical-ready");
        await f.flush();
        yes[16].onClick();
        await f.flush();
        state.layouts.at(-1)("emergency-interrupt");
        await f.flush();
        assert.equal(f.nodes((node) => node.role === "dialog").length, 0);
    } finally {
        f.app.unmount();
    }
});

test("patient name renders before delayed SRQ draft hydration; persisted false restores as Tidak", async () => {
    let resolve!: (value: any) => void;
    const previousContext = state.context;
    const previousAnswers = state.assessment.srq_answers;
    state.assessment.srq_answers = { 1: false } as any;
    state.saved = [];
    state.context = () => new Promise(done => { resolve = done; });
    const patient = { id: "patient-synthetic", name: "Penyintas Sintetis" };
    const f = mountFixture(Srq, {
        assessment: { ...state.assessment, user_id: 101 },
        patient,
    });
    const no = () => f.nodes(node => node.tag === "button" && f.text(node) === "Tidak")[0];
    try {
        await f.flush();
        assert.match(f.text(), /Penyintas Sintetis/);
        assert.equal(no()["aria-pressed"], false, "Patient visibility does not prove draft hydration");
        assert.equal(f.nodes(node => node.tag === "fieldset")[0].disabled, true);
        resolve({ assessment: state.assessment, patient });
        await f.flush();
        assert.equal(no()["aria-pressed"], true, "Stored boolean false must select Tidak after hydration");
        assert.equal(f.nodes(node => node.tag === "fieldset")[0].disabled, false);
        assert.deepEqual(state.saved, [], "Hydration must not write or replace the answer");
    } finally {
        f.app.unmount();
        state.context = previousContext;
        state.assessment.srq_answers = previousAnswers;
    }
});

test("delayed SRQ context cannot rehydrate after lock or owner switch", async () => {
    let resolve!: (value: any) => void;
    const previous = state.context;
    state.context = () =>
        new Promise((done) => {
            resolve = done;
        });
    const f = mountFixture(Srq, {
        assessment: { ...state.assessment, user_id: 101 },
        patient: null,
    });
    try {
        state.layouts.at(-1)("clinical-lock");
        state.runtime.owner = 202;
        resolve({
            assessment: state.assessment,
            patient: { name: "Contoh Rahasia Sintetis" },
        });
        await f.flush();
        assert.doesNotMatch(f.text(), /Contoh Rahasia Sintetis/);
        assert.equal(
            f.nodes(
                (node) => node.tag === "fieldset" && node.disabled === false,
            ).length,
            0,
        );
    } finally {
        f.app.unmount();
        state.context = previous;
        state.runtime.owner = 101;
    }
});

test("mounted review lists exact unresolved questions, hides definitive SRQ score and blocks finalize", async () => {
    state.assessment.srq_answers = { 1: "UNCLEAR", 2: "UNANSWERED", 17: false };
    const f = mountFixture(Review, {
        assessment: { ...state.assessment, user_id: 101 },
    });
    try {
        await f.flush();
        const links = f.nodes(
            (node) => node.tag === "a" && node.href?.includes("#srq-question-"),
        );
        assert.equal(links.length, 19);
        assert.ok(
            links.some(
                (node) =>
                    node.href.endsWith("#srq-question-1") &&
                    /Respons Tidak Jelas/.test(f.text(node)),
            ),
        );
        assert.ok(
            links.some(
                (node) =>
                    node.href.endsWith("#srq-question-2") &&
                    /Belum dijawab/.test(f.text(node)),
            ),
        );
        assert.ok(
            !links.some((node) => node.href.endsWith("#srq-question-17")),
        );
        const finalize = button(f, "SELESAIKAN");
        assert.equal(finalize.disabled, true);
        const before = state.calls;
        await finalize.onClick();
        assert.equal(state.calls, before);
        assert.doesNotMatch(f.text(), /Total skor estimasi/);
    } finally {
        f.app.unmount();
        state.assessment.srq_answers = { 17: false };
    }
});

test("mounted manual T0 remains independent of incomplete SRQ; invalidated pre-write async cannot create T0", async () => {
    state.emergencyCalls = [];
    const show = ref(false);
    const { defineComponent, h } = await import("vue");
    const f = mountFixture(
        defineComponent({
            setup: () => () =>
                h(T0, {
                    show: show.value,
                    patientId: "patient-synthetic",
                    patientName: "Sintetis",
                    assessmentId: "synthetic",
                }),
        }),
    );
    try {
        show.value = true;
        await f.flush();
        button(f, "Kegawatdaruratan Medis").onClick();
        await f.flush();
        await button(f, "KIRIM T0-SUSPECT").onClick();
        await f.flush();
        assert.equal(state.emergencyCalls.length, 1);
        assert.equal(state.emergencyCalls[0].assessmentId, "synthetic");
        show.value = false;
        await f.flush();
        show.value = true;
        await f.flush();
        button(f, "Kegawatdaruratan Medis").onClick();
        await f.flush();
        let resolve!: () => void;
        state.pending = new Promise<void>((done) => {
            resolve = done;
        });
        const submission = button(f, "KIRIM T0-SUSPECT").onClick();
        const panel = f.nodes((node) => node.role === "dialog")[0];
        state.key.value++;
        assert.equal(
            panel.style.display,
            "none",
            "mask before next Vue render",
        );
        resolve();
        await submission;
        await f.flush();
        assert.equal(state.emergencyCalls.length, 1);
    } finally {
        state.pending = null;
        f.app.unmount();
    }
});

test("mounted rapid mode changes queue every mode and same-tick observations merge without losing selections", async () => {
    state.assessment.mode = "VERBAL";
    state.modes = [];
    state.observations = [];
    const f = mountFixture(Srq, {
        assessment: { ...state.assessment, user_id: 101 },
        patient: null,
    });
    try {
        await f.flush();
        const mode = button(f, "Verbal");
        const first = mode.onClick();
        const second = mode.onClick();
        await Promise.all([first, second]);
        await f.flush();
        assert.deepEqual(state.modes, ["NON_VERBAL", "VERBAL"]);
        await mode.onClick();
        await f.flush();
        const checkboxes = f.nodes(
            (node) => node.tag === "input" && node.type === "checkbox",
        );
        checkboxes[0].onChange();
        checkboxes[6].onChange();
        await f.flush();
        assert.deepEqual(state.observations.at(-1).non_verbal_reasons, [
            "NOT_SPEAKING",
            "OTHER",
        ]);
        const note = f.nodes((node) => node.tag === "textarea")[0];
        assert.equal(note.maxlength, "500");
        note.onInput({ target: { value: "Catatan sintetis" } });
        await f.flush();
        checkboxes[5].onChange();
        await f.flush();
        assert.deepEqual(state.observations.at(-1), {
            non_verbal_reasons: ["UNKNOWN"],
            non_verbal_other_note: null,
        });
        checkboxes[6].onChange();
        await f.flush();
        assert.deepEqual(state.observations.at(-1).non_verbal_reasons, [
            "OTHER",
        ]);
        button(f, "Kosongkan Observasi").onClick();
        await f.flush();
        assert.deepEqual(state.observations.at(-1), {
            non_verbal_reasons: [],
            non_verbal_other_note: null,
        });
    } finally {
        f.app.unmount();
        state.assessment.mode = "VERBAL";
    }
});

test("lock after starting a durable T0 write suppresses stale UI callbacks without undoing the emergency", async () => {
    let resolve!: () => void;
    state.emergencyPending = new Promise<void>((done) => {
        resolve = done;
    });
    state.emergencyCalls = [];
    state.events = 0;
    (globalThis as any).window.dispatchEvent = () => {
        state.events++;
    };
    const { defineComponent, h } = await import("vue");
    const show = ref(false);
    const f = mountFixture(
        defineComponent({
            setup: () => () =>
                h(T0, {
                    show: show.value,
                    patientId: "patient-synthetic",
                    assessmentId: "synthetic",
                }),
        }),
    );
    try {
        show.value = true;
        await f.flush();
        button(f, "Kegawatdaruratan Medis").onClick();
        await f.flush();
        const submission = button(f, "KIRIM T0-SUSPECT").onClick();
        await f.flush();
        assert.equal(state.emergencyCalls.length, 1);
        state.key.value++;
        resolve();
        await submission;
        await f.flush();
        assert.equal(state.emergencyCalls.length, 1);
        assert.equal(state.events, 0);
    } finally {
        state.emergencyPending = null;
        f.app.unmount();
    }
});
