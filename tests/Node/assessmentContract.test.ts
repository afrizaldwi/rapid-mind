import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import test from "node:test";
import {
    normalizeSrqAnswer,
    normalizeSrqAnswers,
    srqAnswerFromRow,
    hasDefinitiveSrqAnswers,
    srqAnswerLabel,
} from "../../resources/js/domain/srq/srqAnswer.ts";
import {
    normalizeObservations,
    mergeObservations,
    nonVerbalReasonCodes,
} from "../../resources/js/domain/assessment/nonVerbalObservations.ts";
import {
    assessmentMutation,
    assessmentSnapshotCurrent,
    assessmentSyncPayload,
    exactAssessmentAnswers,
    reconcileAssessment,
} from "../../resources/js/offline/assessmentContract.ts";
import { mergeAssessmentDraft } from "../../resources/js/offline/assessmentDraftValues.ts";
import { SrqCalculator } from "../../resources/js/domain/triage/srqCalculator.ts";
import { RedFlagDetector } from "../../resources/js/domain/triage/redFlagDetector.ts";
import {
    selectSrqSpeechAnswerUpdates,
    interpretSrqTranscript,
} from "../../resources/js/domain/srq/srqTranscriptInterpreter.ts";
import type {
    LocalAssessment,
    LocalPatient,
} from "../../resources/js/offline/db.ts";
import {
    createOfflineKey,
    unlockOfflineKey,
} from "../../resources/js/offline/offlineCrypto.ts";
import {
    getSrqAnswer,
    normalizeEmergencyQueue,
    getDetectedRedFlags,
} from "../../resources/js/lib/healthcareEmergency.ts";

const draft = (): LocalAssessment => ({
    id: "assessment-synthetic",
    patient_id: "patient-synthetic",
    owner_user_id: 101,
    mode: "NON_VERBAL",
    status: "IN_PROGRESS",
    sync_state: "LOCAL_SAVED",
    updated_at: "2026-11-03T00:00:00Z",
});
const patient: LocalPatient = {
    id: "patient-synthetic",
    name: "Sintetis",
    owner_user_id: 101,
    sync_state: "LOCAL_SAVED",
};
const booleanAnswers = () =>
    Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, false]));
const complete = (): LocalAssessment => ({
    ...draft(),
    srq_answers: booleanAnswers(),
    risk_indicators: { R1: false, R2: false, R3: false, R4: false, R5: false },
    function_domains: { F1: 0, F2: 1, F3: 3 },
});

test("four states and legacy booleans are explicit; malformed input is rejected", () => {
    for (const [input, output] of [
        [true, true],
        [false, false],
        ["YES", true],
        ["NO", false],
        ["UNCLEAR", "UNCLEAR"],
        ["UNANSWERED", "UNANSWERED"],
    ])
        assert.equal(normalizeSrqAnswer(input), output);
    for (const value of [
        null,
        undefined,
        0,
        1,
        "0",
        "1",
        "true",
        "false",
        "yes",
        "MAYBE",
        [],
        {},
        "",
    ])
        assert.throws(() => normalizeSrqAnswer(value));
    for (const map of [
        { 0: true },
        { 21: false },
        { "01": true },
        { 17: null },
        [],
        null,
    ])
        assert.throws(() => normalizeSrqAnswers(map));
    assert.deepEqual(normalizeSrqAnswers(undefined), {});
    assert.notDeepEqual(
        normalizeSrqAnswers({}),
        normalizeSrqAnswers({ 17: "UNANSWERED" }),
    );
});

test("Eloquent answer_state is authoritative and contradictions fail closed", () => {
    assert.equal(
        srqAnswerFromRow({ answer: null, answer_state: "UNCLEAR" }),
        "UNCLEAR",
    );
    assert.equal(
        srqAnswerFromRow({ answer: null, answer_state: "UNANSWERED" }),
        "UNANSWERED",
    );
    assert.equal(
        srqAnswerFromRow({ answer: false, answer_state: null }),
        false,
    );
    assert.throws(() =>
        srqAnswerFromRow({ answer: true, answer_state: "UNCLEAR" }),
    );
    assert.throws(() =>
        srqAnswerFromRow({ answer: null, answer_state: "YES" }),
    );
    assert.equal(srqAnswerLabel("UNCLEAR"), "Respons Tidak Jelas");
    assert.notEqual(srqAnswerLabel(undefined), srqAnswerLabel("UNANSWERED"));
});

test("draft merge preserves ambiguity and clearing over stale server booleans", () => {
    const merged = mergeAssessmentDraft(
        "srq_answers",
        { 1: true, 17: true },
        { 1: "UNCLEAR", 17: "UNANSWERED" },
    );
    assert.deepEqual(merged, { 1: "UNCLEAR", 17: "UNANSWERED" });
    assert.deepEqual(
        mergeAssessmentDraft(
            "srq_answers",
            { 2: false },
            JSON.parse(JSON.stringify(merged)),
        ),
        { 1: "UNCLEAR", 2: false, 17: "UNANSWERED" },
    );
    assert.throws(() =>
        mergeAssessmentDraft("srq_answers", { 17: true }, { 17: "maybe" }),
    );
});

test("observations validate B2A codes, UNKNOWN, OTHER notes, omission and clearing", () => {
    for (const code of nonVerbalReasonCodes)
        assert.deepEqual(
            normalizeObservations({ non_verbal_reasons: [code] })
                .non_verbal_reasons,
            [code],
        );
    assert.throws(() =>
        normalizeObservations({ non_verbal_reasons: ["UNKNOWN", "OTHER"] }),
    );
    assert.throws(() =>
        normalizeObservations({ non_verbal_reasons: ["OTHER", "OTHER"] }),
    );
    assert.throws(() =>
        normalizeObservations({ non_verbal_reasons: ["DIAGNOSIS"] } as any),
    );
    assert.throws(() =>
        normalizeObservations({ non_verbal_other_note: "note" }),
    );
    assert.throws(() =>
        normalizeObservations({
            non_verbal_reasons: [],
            non_verbal_other_note: "note",
        }),
    );
    assert.throws(() =>
        normalizeObservations({
            non_verbal_reasons: ["OTHER"],
            non_verbal_other_note: "x".repeat(501),
        }),
    );
    assert.equal(
        normalizeObservations({
            non_verbal_reasons: ["OTHER"],
            non_verbal_other_note: "😀".repeat(500),
        }).non_verbal_other_note?.length,
        1000,
    );
    const server = {
        non_verbal_reasons: ["OTHER" as const],
        non_verbal_other_note: "sintetis",
    };
    assert.deepEqual(mergeObservations(server, {}), server);
    assert.deepEqual(mergeObservations(server, { non_verbal_reasons: [] }), {
        non_verbal_reasons: [],
        non_verbal_other_note: null,
    });
});

test("serialized reopen and mode changes preserve answers and observation metadata", () => {
    const local = assessmentMutation(
        undefined,
        {
            ...draft(),
            srq_answers: { 1: true, 2: false, 17: "UNCLEAR", 20: "UNANSWERED" },
            non_verbal_reasons: ["OTHER"],
            non_verbal_other_note: "sintetis",
        },
        101,
        draft().id,
    );
    const reopened = JSON.parse(JSON.stringify(local));
    const verbal = assessmentMutation(
        reopened,
        { mode: "VERBAL" },
        101,
        local.id,
    );
    assert.deepEqual(verbal.srq_answers, local.srq_answers);
    assert.deepEqual(verbal.non_verbal_reasons, ["OTHER"]);
    assert.equal(verbal.non_verbal_other_note, "sintetis");
    assert.throws(
        () => assessmentMutation(local, { mode: "VERBAL" }, 102, local.id),
        /owner/,
    );
});

test("payloads retain partial patch semantics without leaking local revision or scores", () => {
    const local = {
        ...draft(),
        srq_answers: { 17: "UNANSWERED" as const },
        local_revision: 4,
    };
    const partial = assessmentSyncPayload(local, patient);
    assert.deepEqual(partial.srq_answers, { 17: "UNANSWERED" });
    assert.equal("non_verbal_reasons" in partial, false);
    assert.equal("local_revision" in partial, false);
    assert.equal("client_triage" in partial, false);
    assert.equal(partial.status, "IN_PROGRESS");
    assert.deepEqual(
        assessmentSyncPayload({ ...local, non_verbal_reasons: [] }, patient)
            .non_verbal_reasons,
        [],
    );
    assert.throws(() =>
        assessmentSyncPayload(local, { ...patient, id: "other" }),
    );
});

test("completion and scoring refuse every unresolved state but preserve boolean scores", () => {
    const old = complete();
    assert.equal(exactAssessmentAnswers(old), true);
    const answers = { ...old.srq_answers!, 1: true, 2: true };
    assert.equal(new SrqCalculator().calculate(answers), 2);
    for (const state of ["UNCLEAR", "UNANSWERED"] as const) {
        const incomplete = { ...old, srq_answers: { ...answers, 17: state } };
        assert.equal(exactAssessmentAnswers(incomplete), false);
        assert.equal(hasDefinitiveSrqAnswers(incomplete.srq_answers), false);
        assert.throws(() =>
            new SrqCalculator().calculate(incomplete.srq_answers),
        );
        assert.throws(() =>
            assessmentSyncPayload(
                { ...incomplete, status: "COMPLETED" },
                patient,
            ),
        );
        assert.deepEqual(new RedFlagDetector().detect(incomplete.srq_answers), {
            detected: false,
            source: null,
        });
        assert.equal(
            new RedFlagDetector().detect(incomplete.srq_answers, true).detected,
            true,
        );
    }
    assert.throws(() => new SrqCalculator().calculate({ 1: true }));
});

test("clinical edits advance local revision; transmission changes do not", () => {
    const local = assessmentMutation(undefined, draft(), 101, draft().id);
    const syncing = assessmentMutation(
        local,
        { sync_state: "SYNCING" },
        101,
        local.id,
    );
    assert.equal(syncing.local_revision, local.local_revision);
    const clarification = assessmentMutation(
        syncing,
        { srq_answers: { 17: "UNANSWERED" } },
        101,
        local.id,
    );
    assert.equal(
        assessmentSnapshotCurrent(clarification, local.local_revision),
        false,
    );
    assert.equal(
        assessmentSnapshotCurrent(clarification, clarification.local_revision),
        true,
    );
    const canonical = reconcileAssessment(clarification, {
        srq_answers: { 17: "UNANSWERED" },
    });
    assert.equal(canonical.srq_answers?.[17], "UNANSWERED");
    assert.equal(canonical.sync_state, "SYNCED");
});

test("canonical metadata omission preserves local context; explicit [] clears it", () => {
    const local = {
        ...draft(),
        non_verbal_reasons: ["OTHER" as const],
        non_verbal_other_note: "sintetis",
        srq_answers: { 17: "UNCLEAR" as const },
    };
    assert.equal(
        reconcileAssessment(local, {}).non_verbal_other_note,
        "sintetis",
    );
    assert.deepEqual(
        reconcileAssessment(local, { non_verbal_reasons: [] })
            .non_verbal_reasons,
        [],
    );
    assert.equal(
        reconcileAssessment(local, { non_verbal_reasons: [] })
            .non_verbal_other_note,
        null,
    );
});

test("restored UNCLEAR and UNANSWERED remain protected from STT replacement", () => {
    const interpretation = interpretSrqTranscript("Saya merasa tidak bahagia.");
    for (const state of ["UNCLEAR", "UNANSWERED"] as const) {
        const q = interpretation.matches[0]?.questionNumber;
        assert.ok(q);
        const selected = selectSrqSpeechAnswerUpdates(
            interpretation,
            { [q]: state },
            new Set([q]),
            new Set(),
        );
        assert.equal(selected.accepted.length, 0);
        assert.deepEqual(selected.protectedQuestionNumbers, [q]);
    }
});

test("encrypted assessment and outbox roundtrip preserve the new contract and owner binding", async () => {
    const { session, record, recoveryCode } = await createOfflineKey(
        101,
        "frasa sandi panjang khusus pengujian sintetis",
    );
    const local = {
        ...draft(),
        srq_answers: {
            1: true,
            2: false,
            17: "UNCLEAR" as const,
            20: "UNANSWERED" as const,
        },
        non_verbal_reasons: ["OTHER" as const],
        non_verbal_other_note: "pengamatan sintetis",
    };
    const encrypted = await session.encrypt("assessments", local.id, local);
    const queue = {
        payload: assessmentSyncPayload(local, patient),
        priority: 2,
        revision: 1,
    };
    const encryptedQueue = await session.encrypt(
        "outbox",
        "synthetic-outbox",
        queue,
    );
    assert.doesNotMatch(
        JSON.stringify(encrypted),
        /UNCLEAR|UNANSWERED|pengamatan sintetis/,
    );
    assert.doesNotMatch(
        JSON.stringify(encryptedQueue),
        /non_verbal_reasons|OTHER/,
    );
    session.lock();
    const reopened = await unlockOfflineKey(
        JSON.parse(JSON.stringify(record)),
        recoveryCode,
        "recovery",
    );
    assert.deepEqual(
        await reopened.decrypt(encrypted, 101, "assessments", local.id),
        local,
    );
    assert.deepEqual(
        await reopened.decrypt(
            encryptedQueue,
            101,
            "outbox",
            "synthetic-outbox",
        ),
        JSON.parse(JSON.stringify(queue)),
    );
    await assert.rejects(
        reopened.decrypt(encrypted, 102, "assessments", local.id),
    );
    reopened.lock();
});

test("Healthcare adapters preserve unresolved states without manufacturing affirmative red flags", () => {
    for (const state of ["UNCLEAR", "UNANSWERED"] as const) {
        const item = normalizeEmergencyQueue([
            {
                id: "synthetic-event",
                status: "PENDING",
                assessment: {
                    srq_responses: [
                        {
                            question_number: 17,
                            answer: null,
                            answer_state: state,
                        },
                    ],
                },
            },
        ])[0];
        assert.equal(getSrqAnswer(item, 17), state);
        assert.equal(getDetectedRedFlags(item).length, 0);
    }
});

test("integrated boolean scores stay unchanged; unresolved SRQ refuses classification", async () => {
    // Compile existing parameter properties for Node, as the mounted Vue tests do.
    const url = new URL(
        "../../resources/js/domain/triage/triageCalculator.ts",
        import.meta.url,
    );
    let code = ts.transpileModule(readFileSync(url, "utf8"), {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
        },
    }).outputText;
    code = code.replace(
        /from ['"](.+?)['"]/g,
        (_all, path) => `from '${new URL(path, url).href}'`,
    );
    const { TriageCalculator } = await import(
        `data:text/javascript,${encodeURIComponent(code)}`
    );
    const calculator = new TriageCalculator();
    const local = complete();
    const result = calculator.calculate(
        local.srq_answers,
        local.risk_indicators,
        local.function_domains,
    );
    assert.equal(result.srqScore, 0);
    assert.equal(result.totalScore, 4);
    assert.equal(result.recommendation, "T3");
    assert.equal(
        calculator.calculate(
            { ...booleanAnswers(), 1: true, 2: true, 3: true },
            local.risk_indicators,
            local.function_domains,
        ).recommendation,
        "T2",
    );
    assert.equal(
        calculator.calculate(local.srq_answers, local.risk_indicators, {
            F1: 3,
            F2: 3,
            F3: 0,
        }).recommendation,
        "T1",
    );
    assert.equal(
        calculator.calculate(
            { ...booleanAnswers(), 17: true },
            local.risk_indicators,
            local.function_domains,
        ).recommendation,
        "T0_SUSPECT",
    );
    for (const state of ["UNCLEAR", "UNANSWERED"])
        assert.throws(() =>
            calculator.calculate(
                { ...booleanAnswers(), 17: state },
                local.risk_indicators,
                local.function_domains,
            ),
        );
});
