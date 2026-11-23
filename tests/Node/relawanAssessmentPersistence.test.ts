import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";
import { toggleObservation } from "../../resources/js/domain/assessment/observationPresentation.ts";
import { mergeAssessmentDraft } from "../../resources/js/offline/assessmentDraftValues.ts";
import { createClinicalTaskScope } from "../../resources/js/lib/clinicalTaskScope.ts";

for (const encrypted of [false, true]) {
    test(`${encrypted ? "synthetic encrypted" : "legacy"}: four states reopen, clearing wins over old server values, mode-only change queues latest context`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        await f.assessments.save(101, {
            id: "assessment-synthetic",
            patient_id: "patient-synthetic",
            mode: "VERBAL",
            status: "IN_PROGRESS",
        });
        const assessment = {
            id: "assessment-synthetic",
            patient_id: "patient-synthetic",
            user_id: 101,
        };
        await f.drafts.saveAssessmentDraft(assessment, "srq_answers", {
            1: true,
            2: false,
            3: "UNCLEAR",
            17: "UNANSWERED",
        });
        assert.deepEqual(
            await f.drafts.readAssessmentDraft(
                101,
                assessment.id,
                "srq_answers",
            ),
            { 1: true, 2: false, 3: "UNCLEAR", 17: "UNANSWERED" },
        );
        await f.drafts.saveAssessmentDraft(assessment, "srq_answers", {
            1: "UNANSWERED",
        });
        const reopened = await f.assessments.get(101, assessment.id);
        assert.equal(
            mergeAssessmentDraft(
                "srq_answers",
                { 1: true },
                reopened.srq_answers,
            )[1],
            "UNANSWERED",
        );
        await f.drafts.saveObservationDraft(101, assessment.id, {
            non_verbal_reasons: ["OTHER"],
            non_verbal_other_note: "Catatan sintetis",
        });
        await f.drafts.saveAssessmentMode(101, assessment.id, "NON_VERBAL");
        let item = (await f.outbox.list(101)).find(
            (item) => item.entity_id === assessment.id,
        )!;
        assert.equal(item.payload.mode, "NON_VERBAL");
        assert.equal(item.payload.srq_answers[1], "UNANSWERED");
        assert.equal(item.payload.non_verbal_other_note, "Catatan sintetis");
        await Promise.all([
            f.drafts.saveAssessmentMode(101, assessment.id, "VERBAL"),
            f.drafts.saveAssessmentMode(101, assessment.id, "NON_VERBAL"),
            f.drafts.saveObservationDraft(101, assessment.id, {
                non_verbal_reasons: [],
                non_verbal_other_note: null,
            }),
            f.drafts.saveAssessmentMode(101, assessment.id, "VERBAL"),
        ]);
        item = (await f.outbox.list(101)).find(
            (item) => item.entity_id === assessment.id,
        )!;
        assert.equal(item.payload.mode, "VERBAL");
        assert.deepEqual(item.payload.non_verbal_reasons, []);
        assert.equal(item.payload.non_verbal_other_note, null);
        assert.equal(item.payload.srq_answers[3], "UNCLEAR");
        assert.equal(item.payload.srq_answers[17], "UNANSWERED");
        assert.equal(
            (await f.outbox.list(101)).some(
                (item) => item.type === "EMERGENCY",
            ),
            false,
        );
        assert.equal(
            f.workflow.resumeStage(await f.assessments.get(101, assessment.id)),
            "srq",
        );
        await assert.rejects(
            f.workflow.completeLocalAssessment(101, assessment.id),
            /belum lengkap/,
        );
    });
}

test("queued clinical edits are rejected after continuity invalidation", async (t) => {
    const f = await offlineRepositoryFixture(false);
    t.after(f.cleanup);
    await f.assessments.save(101, {
        id: "assessment-synthetic",
        patient_id: "patient-synthetic",
        mode: "VERBAL",
        status: "IN_PROGRESS",
        srq_answers: { 17: false },
    });
    const scope = createClinicalTaskScope(() => 101);
    const current = scope.capture();
    const writes = [
        f.drafts.saveAssessmentMode(
            101,
            "assessment-synthetic",
            "NON_VERBAL",
            current,
        ),
        f.drafts.saveObservationDraft(
            101,
            "assessment-synthetic",
            { non_verbal_reasons: ["UNKNOWN"] },
            current,
        ),
        f.drafts.saveAssessmentDraft(
            {
                id: "assessment-synthetic",
                patient_id: "patient-synthetic",
                user_id: 101,
            },
            "srq_answers",
            { 17: true },
            current,
        ),
    ];
    scope.invalidate();
    await Promise.all(writes);
    const record = await f.assessments.get(101, "assessment-synthetic");
    assert.equal(record.mode, "VERBAL");
    assert.equal(record.srq_answers[17], false);
    assert.equal(record.non_verbal_reasons, undefined);
    assert.equal((await f.outbox.list(101)).length, 0);
});

test("UNKNOWN and OTHER UI transitions produce valid explicit clearing patches", () => {
    let value = toggleObservation({}, "OTHER");
    value.non_verbal_other_note = "Catatan sintetis";
    value = toggleObservation(value, "NOT_SPEAKING");
    assert.deepEqual(value.non_verbal_reasons, ["OTHER", "NOT_SPEAKING"]);
    value = toggleObservation(value, "UNKNOWN");
    assert.deepEqual(value, {
        non_verbal_reasons: ["UNKNOWN"],
        non_verbal_other_note: null,
    });
    value = toggleObservation(value, "OTHER");
    assert.deepEqual(value.non_verbal_reasons, ["OTHER"]);
    value = toggleObservation(value, "OTHER");
    assert.deepEqual(value, {
        non_verbal_reasons: [],
        non_verbal_other_note: null,
    });
});

test("manual T0 persists a priority-1 emergency with unresolved assessment and preserves priority-2 context", async (t) => {
    const f = await offlineRepositoryFixture(false);
    t.after(f.cleanup);
    await f.assessments.save(101, {
        id: "assessment-synthetic",
        patient_id: "patient-synthetic",
        mode: "NON_VERBAL",
        status: "IN_PROGRESS",
        srq_answers: { 17: "UNCLEAR" },
    });
    const repository = await f.load(
        "resources/js/offline/emergencyRepository.ts",
    );
    const { exports: emergency } = await f.load(
        "resources/js/offline/emergencyWorkflow.ts",
        {
            "./emergencyRepository": repository.url,
            "./syncManager":
                "data:text/javascript,export const syncManager = {sync: async () => {}}",
        },
    );
    const id = await emergency.createLocalEmergency(101, {
        patientId: "patient-synthetic",
        assessmentId: "assessment-synthetic",
        redFlagType: "MEDICAL_CRISIS",
    });
    assert.ok(await f.db.emergencies.get(id));
    for (let i = 0; i < 30; i++)
        await new Promise((resolve) => setImmediate(resolve));
    const items = await f.outbox.list(101);
    assert.equal(items.find((item) => item.entity_id === id)?.priority, 1);
    const context = items.find(
        (item) => item.entity_id === "assessment-synthetic",
    );
    assert.equal(context?.priority, 2);
    assert.equal(context?.payload.srq_answers[17], "UNCLEAR");
    assert.equal(
        (await f.assessments.get(101, "assessment-synthetic")).triage_result,
        null,
    );
});

test("finalization awaiting a repository read cannot complete after continuity lock", async (t) => {
    const f = await offlineRepositoryFixture(false);
    t.after(f.cleanup);
    await f.assessments.save(101, {
        id: "assessment-synthetic",
        patient_id: "patient-synthetic",
        mode: "VERBAL",
        status: "IN_PROGRESS",
        srq_answers: Object.fromEntries(
            Array.from({ length: 20 }, (_, i) => [i + 1, false]),
        ),
        risk_indicators: {
            R1: false,
            R2: false,
            R3: false,
            R4: false,
            R5: false,
        },
        function_domains: { F1: 0, F2: 0, F3: 0 },
    });
    const scope = createClinicalTaskScope(() => 101);
    const originalGet = f.assessments.get.bind(f.assessments);
    const record = await originalGet(101, "assessment-synthetic");
    let resolve!: (value: any) => void;
    f.assessments.get = () =>
        new Promise((done) => {
            resolve = done;
        });
    const completion = f.workflow.completeLocalAssessment(
        101,
        "assessment-synthetic",
        scope.capture(),
    );
    const rejected = assert.rejects(completion, /Akses asesmen berubah/);
    scope.invalidate();
    resolve(record);
    await rejected;
    f.assessments.get = originalGet;
    assert.equal(
        (await originalGet(101, "assessment-synthetic")).status,
        "IN_PROGRESS",
    );
    assert.equal((await f.outbox.list(101)).length, 0);
});
