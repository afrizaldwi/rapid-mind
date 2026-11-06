import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSrqAnswers } from "../../resources/js/domain/srq/srqAnswer.ts";
import { mergeAssessmentDraft } from "../../resources/js/offline/assessmentDraftValues.ts";

test("SRQ JSON objects preserve empty and populated four-state response maps", () => {
    for (const json of ['{}', '{"1":true,"2":false,"17":"UNCLEAR","20":"UNANSWERED"}']) {
        const map = JSON.parse(json);
        assert.deepEqual(normalizeSrqAnswers(map), map);
        assert.deepEqual(mergeAssessmentDraft("srq_answers", map, {}), map);
    }
});

test("SRQ arrays cannot masquerade as question-keyed response maps", () => {
    const sparse = [];
    sparse[1] = true;
    for (const value of [[], [true], [{ question_number: 1, answer: true }], sparse]) {
        assert.throws(() => normalizeSrqAnswers(value), /Format jawaban SRQ/);
        assert.throws(() => mergeAssessmentDraft("srq_answers", value, {}), /Format jawaban SRQ/);
    }
});
