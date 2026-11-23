import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, ref } from "vue";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { nonVerbalReasonCodes } from "../../resources/js/domain/assessment/nonVerbalObservations.ts";
import { observationLabels } from "../../resources/js/domain/assessment/observationPresentation.ts";
import { normalizeQueueItem } from "../../resources/js/lib/healthcareEmergency.ts";
import { useEmergencyQueue } from "../../resources/js/composables/useEmergencyQueue.ts";
import {
    createHealthcareReconciler,
    healthcareDrafts,
    isEmergencyContextRoute,
} from "../../resources/js/lib/healthcareReconciliation.ts";
import {
    mountFixture,
    moduleStub,
    vueModuleUrl,
} from "./helpers/mountedVueFixture.ts";

const AssessmentTab = (
    await import(
        await vueModuleUrl(
            "resources/js/components/Healthcare/Emergencies/EmergencyAssessmentTab.vue",
        )
    )
).default;
const source = () => ({
    id: "assessment-synthetic",
    status: "IN_PROGRESS",
    mode: "NON_VERBAL",
    non_verbal_reasons: ["OTHER"],
    non_verbal_other_note: "  Catatan sintetis\nbaris kedua <teks>  ",
    srq_responses: [
        { question_number: 1, answer: true },
        { question_number: 2, answer: false },
        { question_number: 3, answer: null, answer_state: "UNCLEAR" },
        { question_number: 4, answer: null, answer_state: "UNANSWERED" },
    ],
    triage_result: { srq_score: 0, total_score: 0 },
});

test("mounted emergency assessment renders persisted labels/notes, all states and missing context without definitive scores", async () => {
    const item = ref(
        normalizeQueueItem(
            {
                id: "emergency-synthetic",
                status: "PENDING",
                assessment: source(),
            },
            true,
        ),
    );
    const f = mountFixture(
        defineComponent({
            setup: () => () => h(AssessmentTab, { item: item.value }),
        }),
    );
    try {
        const text = f.text();
        for (const label of [
            "Asesmen belum lengkap",
            "Non-Verbal",
            "Lainnya",
            "Respons Tidak Jelas",
            "Belum dijawab",
            "Tidak tercatat",
            "Skor SRQ-20: Belum tersedia",
            "bukan diagnosis",
        ])
            assert.ok(text.includes(label), label);
        assert.ok(text.includes(source().non_verbal_other_note));
        assert.equal(f.nodes((n) => n.tag === "li").length, 21);
        assert.ok(!text.includes("Skor SRQ-20: 0 / 20"));
        for (const code of nonVerbalReasonCodes) {
            item.value = normalizeQueueItem(
                {
                    id: "emergency-synthetic",
                    status: "PENDING",
                    assessment: {
                        ...source(),
                        non_verbal_reasons: [code],
                        non_verbal_other_note: null,
                    },
                },
                true,
            );
            await f.flush();
            assert.ok(f.text().includes(observationLabels[code]));
        }
        const completed = {
            ...source(),
            status: "COMPLETED",
            srq_responses: Array.from({ length: 20 }, (_, i) => ({
                question_number: i + 1,
                answer: false,
            })),
            risk_assessment: ["R1", "R2", "R3", "R4", "R5"].map(
                (indicator) => ({ indicator, answer: false }),
            ),
            function_assessment: ["F1", "F2", "F3"].map((domain) => ({
                domain,
                level: 0,
            })),
        };
        completed.triage_result = {
            srq_score: 0,
            risk_score: 0,
            function_score: 0,
            total_score: 0,
            system_recommendation: "T3",
            is_red_flag_override: false,
            red_flag_source: null,
        } as any;
        item.value = normalizeQueueItem(
            {
                id: "emergency-synthetic",
                status: "PENDING",
                assessment: completed,
            },
            true,
        );
        await f.flush();
        assert.match(f.text(), /Skor SRQ-20: 0 \/ 20/);
        assert.match(f.text(), /Asesmen selesai/);
        item.value = normalizeQueueItem(
            { id: "emergency-synthetic", status: "PENDING" },
            true,
        );
        await f.flush();
        assert.match(
            f.text(),
            /Pengakuan dan penanganan darurat tetap tersedia/,
        );
        assert.match(f.text(), /Asesmen belum tersedia/);
    } finally {
        f.app.unmount();
    }
});

test("mounted validation view displays all 20 states and persisted observations on the same presentation contract", async () => {
    const vue = import.meta.resolve("vue");
    const component = (
        await import(
            await vueModuleUrl(
                "resources/js/Pages/Healthcare/Validations/Show.vue",
                {
                    "@/layouts/HealthcareLayout.vue": moduleStub(
                        `import {defineComponent,h} from '${vue}';export default defineComponent({setup(_p,{slots}){return()=>h('main',{},slots.default?.());}});`,
                    ),
                    "@inertiajs/vue3":
                        moduleStub(`import {defineComponent,h,reactive} from '${vue}';
            export const Link=defineComponent({props:['href'],setup(p,{slots}){return()=>h('a',{href:p.href},slots.default?.());}});
            export function useForm(initial){return reactive({...initial,errors:{},processing:false,data(){return initial;},post(){throw new Error('No request expected');}});}`),
                },
            )
        )
    ).default;
    const f = mountFixture(component, {
        assessment: {
            ...source(),
            clinical_validation: { clinical_result: "T2" },
        },
        previousAssessments: [],
        facilities: [],
    });
    try {
        assert.match(f.text(), /Respons Tidak Jelas/);
        assert.match(f.text(), /Belum dijawab/);
        assert.match(f.text(), /Tidak tercatat/);
        assert.match(f.text(), /Asesmen belum lengkap/);
        assert.ok(f.text().includes(source().non_verbal_other_note));
        assert.ok(!f.text().includes("0/20"));
    } finally {
        f.app.unmount();
    }
});

test("emergency-first assessment-later reconciliation preserves active clinical drafts and existing independent actions", async () => {
    const posts: any[] = [];
    (globalThis as any).__b32Posts = posts;
    const { useEmergencyActions } = await import(
        await vueModuleUrl("resources/js/composables/useEmergencyActions.ts", {
            "@inertiajs/vue3": moduleStub(
                "export const router={post:(...args)=>globalThis.__b32Posts.push(args)};",
            ),
            "./useHealthcareDraft.ts": pathToFileURL(
                resolve("resources/js/composables/useHealthcareDraft.ts"),
            ).href,
        })
    );
    let queue: any, actions: any;
    const records = ref<any[]>([
        { id: "emergency-synthetic", status: "ACKNOWLEDGED" },
    ]);
    const jobs: (() => void)[] = [];
    let nextRecords: any[] = [];
    let reloads = 0;
    const reconciliation = createHealthcareReconciler(
        (done) => {
            reloads++;
            records.value = nextRecords;
            done();
        },
        (job) => jobs.push(job),
    );
    const unsubscribe = healthcareDrafts.subscribe(reconciliation.editing);
    const f = mountFixture(
        defineComponent({
            setup() {
                actions = useEmergencyActions();
                queue = useEmergencyQueue(
                    () => records.value,
                    () => {},
                );
                return () => h("div");
            },
        }),
    );
    try {
        assert.equal(
            queue.selectedItem.value.assessmentContext.hasAssessment,
            false,
        );
        actions.verificationForm.value.notes =
            "Draf klinis sintetis yang belum tersimpan";
        nextRecords = [{ ...records.value[0], assessment: source() }];
        reconciliation.request();
        reconciliation.request();
        assert.equal(jobs.length, 0);
        assert.equal(reloads, 0);
        assert.equal(
            actions.verificationForm.value.notes,
            "Draf klinis sintetis yang belum tersimpan",
        );
        // A same-case props update that was already in flight must also preserve draft values.
        records.value = nextRecords;
        await f.flush();
        assert.equal(
            queue.selectedItem.value.assessmentContext.modeLabel,
            "Non-Verbal",
        );
        assert.equal(
            queue.selectedItem.value.assessmentContext.responses[2].label,
            "Respons Tidak Jelas",
        );
        assert.equal(
            actions.verificationForm.value.notes,
            "Draf klinis sintetis yang belum tersimpan",
        );
        actions.submitVerification(queue.selectedItem.value);
        assert.equal(
            posts.at(-1)[0],
            "/healthcare/emergencies/emergency-synthetic/verify",
        );
        posts.at(-1)[2].onSuccess();
        posts.at(-1)[2].onFinish();
        assert.equal(jobs.length, 1);
        jobs.shift()!();
        await f.flush();
        assert.equal(reloads, 1);
        actions.acknowledgeCase(queue.selectedItem.value);
        assert.ok(posts.at(-1)[0].endsWith("/acknowledge"));
        actions.submitClassification(queue.selectedItem.value);
        assert.ok(posts.at(-1)[0].endsWith("/classify"));
        actions.submitReferral(queue.selectedItem.value);
        assert.ok(posts.at(-1)[0].endsWith("/referrals"));
    } finally {
        unsubscribe();
        reconciliation.stop();
        f.app.unmount();
        delete (globalThis as any).__b32Posts;
    }
});

test("healthy periodic context refresh is limited to emergency routes and retains dirty-form deferral", () => {
    for (const url of [
        "/healthcare/emergencies",
        "/healthcare/emergencies/",
        "/healthcare/emergencies/synthetic?tab=assessment",
    ])
        assert.equal(isEmergencyContextRoute(url), true);
    for (const url of [
        "/healthcare/validations/synthetic",
        "/healthcare/patients",
        "/admin/summary",
    ])
        assert.equal(isEmergencyContextRoute(url), false);
});

test("validation form has no T1 fallback and cannot submit without verified persisted scoring", async () => {
    const vue = import.meta.resolve("vue");
    const forms: any[] = [];
    const requests: string[] = [];
    (globalThis as any).__scoringCorrection = { forms, requests };
    const component = (
        await import(
            await vueModuleUrl(
                "resources/js/Pages/Healthcare/Validations/Show.vue",
                {
                    vue: moduleStub(
                        `export * from '${vue}'; export const vModelSelect = {}; export const vModelText = {}; export const vModelCheckbox = {};`,
                    ),
                    "@/layouts/HealthcareLayout.vue": moduleStub(
                        `import {defineComponent,h} from '${vue}'; export default defineComponent({setup(_p,{slots}){return()=>h('main',{},slots.default?.());}});`,
                    ),
                    "@inertiajs/vue3":
                        moduleStub(`import {defineComponent,h,reactive} from '${vue}';
            export const Link=defineComponent({props:['href'],setup(p,{slots}){return()=>h('a',{href:p.href},slots.default?.());}});
            export function useForm(initial){
                const form=reactive({...initial,errors:{},processing:false,
                    data(){return Object.fromEntries(Object.keys(initial).map(key=>[key,form[key]]));},
                    post(url){globalThis.__scoringCorrection.requests.push(url);}
                });globalThis.__scoringCorrection.forms.push(form);return form;
            }`),
                },
            )
        )
    ).default;
    const assessment = () => ({
        ...source(),
        status: "COMPLETED",
        srq_responses: Array.from({ length: 20 }, (_, i) => ({
            question_number: i + 1,
            answer: i < 7,
        })),
        risk_assessment: ["R1", "R2", "R3", "R4", "R5"].map((indicator) => ({
            indicator,
            answer: false,
        })),
        function_assessment: ["F1", "F2", "F3"].map((domain) => ({
            domain,
            level: 0,
        })),
        triage_result: {
            srq_score: 7,
            risk_score: 0,
            function_score: 0,
            total_score: 7,
            system_recommendation: "T2",
            is_red_flag_override: false,
            red_flag_source: null,
        },
    });
    try {
        for (const mode of [
            "missing",
            "no-recommendation",
            "contradictory",
            "valid",
        ]) {
            const a: any = assessment();
            if (mode === "missing") a.triage_result = null;
            if (mode === "no-recommendation")
                delete a.triage_result.system_recommendation;
            if (mode === "contradictory") a.triage_result.total_score = 8;
            const f = mountFixture(component, {
                assessment: a,
                previousAssessments: [],
                facilities: [],
            });
            try {
                const form = forms.at(-1);
                const submit = f.nodes(
                    (n) => n.tag === "button" && n.type === "submit",
                )[0];
                assert.equal(
                    form.clinical_result,
                    mode === "valid" ? "T2" : "",
                );
                assert.equal(submit.disabled, mode !== "valid");
                const before = requests.length;
                // Even a deliberately selected clinical value cannot bypass missing scoring readiness.
                form.clinical_result = "T3";
                f.nodes((n) => n.tag === "form")[0].onSubmit({
                    preventDefault() {},
                });
                assert.equal(
                    requests.length,
                    before + (mode === "valid" ? 1 : 0),
                );
                if (mode !== "valid") {
                    assert.match(
                        f.text(),
                        /bukti skor tersimpan belum dapat digunakan/,
                    );
                    assert.ok(
                        f.nodes((n) => n.tag === "li").length >= 20,
                        "raw responses remain inspectable",
                    );
                }
            } finally {
                f.app.unmount();
            }
        }
    } finally {
        delete (globalThis as any).__scoringCorrection;
    }
});
