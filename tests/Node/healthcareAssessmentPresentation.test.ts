import assert from "node:assert/strict";
import test from "node:test";
import { healthcareAssessmentPresentation as present } from "../../resources/js/lib/healthcareAssessmentPresentation.ts";
import {
    normalizeQueueItem,
    getSrqAnswer,
    getDetectedRedFlags,
} from "../../resources/js/lib/healthcareEmergency.ts";
import { nonVerbalReasonCodes } from "../../resources/js/domain/assessment/nonVerbalObservations.ts";
import { observationLabels } from "../../resources/js/domain/assessment/observationPresentation.ts";

export function completeAssessment(): any {
    return {
        id: "assessment-synthetic",
        status: "COMPLETED",
        mode: "NON_VERBAL",
        srq_responses: Array.from({ length: 20 }, (_, i) => ({
            question_number: i + 1,
            answer: false,
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
            srq_score: 0,
            risk_score: 0,
            function_score: 0,
            total_score: 0,
            system_recommendation: "T3",
            is_red_flag_override: false,
            red_flag_source: null,
        },
    };
}

test("seven persisted observational codes have Indonesian labels and never change scores", () => {
    for (const code of nonVerbalReasonCodes) {
        const a = {
            ...completeAssessment(),
            non_verbal_reasons: [code],
            non_verbal_other_note:
                code === "OTHER"
                    ? "  Catatan sintetis\nbaris kedua <teks>  "
                    : null,
        };
        const p = present(a);
        assert.deepEqual(p.observations.non_verbal_reasons, [code]);
        assert.ok(observationLabels[code]);
        assert.notEqual(observationLabels[code], code);
        assert.equal(p.srqScore, 0);
        assert.equal(p.totalScore, 0);
        assert.equal(
            p.observations.non_verbal_other_note,
            a.non_verbal_other_note,
        );
    }
});

test("UNKNOWN exclusivity and invalid OTHER notes fail presentation safely without blocking the emergency", () => {
    for (const metadata of [
        { non_verbal_reasons: ["UNKNOWN", "OTHER"] },
        {
            non_verbal_reasons: ["NOT_SPEAKING"],
            non_verbal_other_note: "orphan",
        },
        {
            non_verbal_reasons: ["OTHER"],
            non_verbal_other_note: "a".repeat(501),
        },
        { non_verbal_reasons: ["NOT_SPEAKING", "NOT_SPEAKING"] },
    ]) {
        const item = normalizeQueueItem(
            {
                id: "emergency-synthetic",
                status: "PENDING",
                assessment: { ...completeAssessment(), ...metadata },
            },
            true,
        );
        assert.match(item.assessmentContext.observationError, /tidak valid/);
        assert.equal(item.emergencyId, "emergency-synthetic");
        assert.equal(item.statusLabel, "Perlu Diakui");
    }
});

test("YES, NO, UNCLEAR, UNANSWERED, absent and malformed SRQ stay distinct", () => {
    const item = normalizeQueueItem(
        {
            id: "synthetic",
            status: "PENDING",
            assessment: {
                status: "IN_PROGRESS",
                srq_responses: [
                    { question_number: 1, answer: true },
                    { question_number: 2, answer: false },
                    {
                        question_number: 3,
                        answer: null,
                        answer_state: "UNCLEAR",
                    },
                    {
                        question_number: 4,
                        answer: null,
                        answer_state: "UNANSWERED",
                    },
                    { question_number: 6, answer: "invalid" },
                ],
            },
        },
        true,
    );
    assert.deepEqual(
        [1, 2, 3, 4, 5, 6].map((n) => getSrqAnswer(item, n)),
        [true, false, "UNCLEAR", "UNANSWERED", null, null],
    );
    assert.deepEqual(
        item.assessmentContext.responses.slice(0, 6).map((r) => r.label),
        [
            "Ya",
            "Tidak",
            "Respons Tidak Jelas",
            "Belum dijawab",
            "Tidak tercatat",
            "Data jawaban tidak valid",
        ],
    );
    assert.equal(item.srqScore, null);
    assert.equal(item.assessmentContext.definitiveCount, 2);
    assert.deepEqual(getDetectedRedFlags(item), []);
});

test("scores require valid complete persisted evidence; zero remains a valid score", () => {
    assert.equal(present(completeAssessment()).srqScore, 0);
    for (const mutate of [
        (a: any) => a.srq_responses.pop(),
        (a: any) => a.srq_responses.push(a.srq_responses[0]),
        (a: any) => (a.srq_responses[0].answer = "UNCLEAR"),
        (a: any) => (a.srq_responses[0].answer = null),
        (a: any) => (a.status = "IN_PROGRESS"),
        (a: any) =>
            (a.srq_responses[0] = {
                question_number: 1,
                answer: true,
                answer_state: "UNCLEAR",
            }),
    ]) {
        const a = completeAssessment();
        mutate(a);
        assert.equal(present(a).srqScore, null);
        assert.equal(present(a).totalScore, null);
        assert.equal(present(a).finalized, false);
    }
    for (const value of [null, undefined, "0", NaN, -1, 21]) {
        const a = completeAssessment();
        a.triage_result.srq_score = value;
        assert.equal(present(a).srqScore, null);
    }
    const a = completeAssessment();
    a.risk_assessment = [];
    assert.equal(present(a).totalScore, null);
    assert.equal(present(a).finalized, false);
});

test("an actual emergency is independent of assessment availability and triage recommendation", () => {
    const emergency = normalizeQueueItem(
        { id: "emergency-synthetic", status: "PENDING", assessment: null },
        true,
    );
    assert.equal(emergency.emergencyId, "emergency-synthetic");
    assert.equal(emergency.assessmentContext.hasAssessment, false);
    assert.equal(emergency.srqScore, null);
    assert.equal(emergency.statusLabel, "Perlu Diakui");
    const a = completeAssessment();
    a.srq_responses[16].answer = true;
    a.triage_result.system_recommendation = "T0_SUSPECT";
    Object.assign(a.triage_result, {
        srq_score: 1,
        total_score: 1,
        is_red_flag_override: true,
        red_flag_source: "SRQ_Q17",
    });
    const recommendation = normalizeQueueItem(a, false);
    assert.equal(recommendation.emergencyId, null);
    assert.equal(
        recommendation.semanticPriorityLabel,
        "Rekomendasi T0-Suspect",
    );
    assert.notEqual(recommendation.statusLabel, "Sudah Diakui");
    const partial = normalizeQueueItem({ ...a, status: "IN_PROGRESS" }, false);
    assert.equal(partial.semanticPriority, "UNCLASSIFIED");
});

test("complete answers never substitute for missing or invalid persisted scoring evidence", () => {
    for (const value of [undefined, null, {}, [], "invalid"]) {
        const a = completeAssessment();
        a.triage_result = value;
        const p = present(a);
        assert.equal(p.answersComplete, true);
        assert.equal(p.scoringEvidenceValid, false);
        assert.equal(p.finalized, false);
        assert.equal(p.validationReady, false);
        assert.equal(p.systemRecommendation, null);
        assert.equal(p.srqScore, null);
        assert.match(p.statusLabel, /bukti skor/);
        assert.equal(p.responses.length, 20);
    }
    for (const patch of [
        { total_score: 1 },
        { srq_score: 1, total_score: 1 },
        { risk_score: 2, total_score: 2 },
        { function_score: 1, total_score: 1 },
        { risk_score: 9 },
        { total_score: 38 },
        { srq_score: "0" },
        { function_score: 0.5 },
        { total_score: NaN },
        { system_recommendation: undefined },
        { system_recommendation: "T1" },
        { system_recommendation: "T0_CONFIRMED" },
        { is_red_flag_override: true },
        { red_flag_source: "SRQ_Q17" },
    ]) {
        const a = completeAssessment();
        Object.assign(a.triage_result, patch);
        const p = present(a);
        assert.equal(p.scoringEvidenceValid, false, JSON.stringify(patch));
        assert.equal(p.validationReady, false);
        assert.equal(p.totalScore, null);
        assert.equal(p.systemRecommendation, null);
    }
});

test("valid persisted zero scores stay definitive; validation eligibility matches Laravel T1/T2", () => {
    const zero = present(completeAssessment());
    assert.equal(zero.answersComplete, true);
    assert.equal(zero.scoringEvidenceValid, true);
    assert.equal(zero.finalized, true);
    assert.equal(zero.srqScore, 0);
    assert.equal(zero.totalScore, 0);
    assert.equal(zero.systemRecommendation, "T3");
    assert.equal(zero.validationReady, false);
    const a = completeAssessment();
    for (let n = 0; n < 7; n++) a.srq_responses[n].answer = true;
    Object.assign(a.triage_result, {
        srq_score: 7,
        total_score: 7,
        system_recommendation: "T2",
    });
    assert.equal(present(a).validationReady, true);
    a.srq_responses[16].answer = true;
    Object.assign(a.triage_result, {
        srq_score: 8,
        total_score: 8,
        system_recommendation: "T0_SUSPECT",
        is_red_flag_override: true,
        red_flag_source: "SRQ_Q17",
    });
    assert.equal(present(a).scoringEvidenceValid, true);
    assert.equal(present(a).validationReady, false);
});
