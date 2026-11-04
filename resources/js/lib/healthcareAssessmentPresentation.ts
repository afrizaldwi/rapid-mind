import { validHealthcareScoringEvidence } from "./healthcareScoringEvidence.ts";
import {
    srqAnswerFromRow,
    srqAnswerLabel,
    type SrqAnswer,
} from "../domain/srq/srqAnswer.ts";
import {
    normalizeObservations,
    type NonVerbalObservations,
} from "../domain/assessment/nonVerbalObservations.ts";

// Read-only presentation of persisted evidence. Never calculate or infer clinical scores.
export function healthcareAssessmentPresentation(assessment: any) {
    const rawRows = assessment?.srq_responses ?? assessment?.srqResponses ?? [];
    const sourceValid = Array.isArray(rawRows);
    const rows: any[] = sourceValid ? rawRows : [];
    let invalid =
        !sourceValid ||
        rows.some(
            (row) =>
                !row ||
                !Number.isInteger(row.question_number) ||
                row.question_number < 1 ||
                row.question_number > 20,
        );
    const responses = Array.from({ length: 20 }, (_, index) => {
        const number = index + 1;
        const matches = rows.filter((row) => row?.question_number === number);
        let answer: SrqAnswer | undefined;
        let error = matches.length > 1;
        if (matches.length === 1) {
            try {
                answer = srqAnswerFromRow(matches[0]);
            } catch {
                error = true;
            }
        }
        invalid ||= error;
        return {
            number,
            answer,
            label: error ? "Data jawaban tidak valid" : srqAnswerLabel(answer),
            invalid: error,
        };
    });
    const definitiveCount = responses.filter(
        (row) => !row.invalid && typeof row.answer === "boolean",
    ).length;
    const srqComplete = !invalid && definitiveCount === 20;
    const risk =
        assessment?.risk_assessment ??
        assessment?.riskResponses ??
        assessment?.riskAssessment ??
        [];
    const functions =
        assessment?.function_assessment ??
        assessment?.functionResponses ??
        assessment?.functionAssessment ??
        [];
    const riskComplete =
        Array.isArray(risk) &&
        risk.length === 5 &&
        ["R1", "R2", "R3", "R4", "R5"].every(
            (code) =>
                risk.filter(
                    (row) =>
                        row?.indicator === code &&
                        typeof row.answer === "boolean",
                ).length === 1,
        );
    const functionComplete =
        Array.isArray(functions) &&
        functions.length === 3 &&
        ["F1", "F2", "F3"].every(
            (code) =>
                functions.filter(
                    (row) =>
                        row?.domain === code && [0, 1, 3].includes(row.level),
                ).length === 1,
        );
    const answersComplete = srqComplete && riskComplete && functionComplete;
    const triage = assessment?.triage_result ?? assessment?.triageResult;
    const scoringEvidenceValid =
        answersComplete &&
        validHealthcareScoringEvidence(
            triage,
            Object.fromEntries(
                responses.map((row) => [row.number, row.answer!]),
            ),
            Object.fromEntries(
                risk.map((row: any) => [row.indicator, row.answer]),
            ),
            Object.fromEntries(
                functions.map((row: any) => [row.domain, row.level]),
            ),
        );
    const finalized =
        assessment?.status === "COMPLETED" &&
        answersComplete &&
        scoringEvidenceValid;
    const systemRecommendation: string | null = finalized
        ? triage.system_recommendation
        : null;
    // Match HealthcareController::validateAssessment eligibility; emergency actions are independent.
    const validationReady =
        finalized && ["T1", "T2"].includes(systemRecommendation!);
    let observations: NonVerbalObservations = {};
    let observationError = "";
    try {
        observations = normalizeObservations({
            ...(assessment?.non_verbal_reasons != null
                ? { non_verbal_reasons: assessment.non_verbal_reasons }
                : {}),
            ...(assessment?.non_verbal_other_note != null
                ? { non_verbal_other_note: assessment.non_verbal_other_note }
                : {}),
        });
    } catch {
        observationError =
            "Data observasi tidak valid. Muat ulang konteks asesmen; tindakan darurat tetap tersedia.";
    }
    return {
        hasAssessment: !!assessment,
        responses,
        definitiveCount,
        srqComplete,
        finalized,
        answersComplete,
        scoringEvidenceValid,
        systemRecommendation,
        validationReady,
        unresolvedCount: 20 - definitiveCount,
        invalid,
        srqScore: finalized ? (triage.srq_score as number) : null,
        riskScore: finalized ? (triage.risk_score as number) : null,
        functionScore: finalized ? (triage.function_score as number) : null,
        totalScore: finalized ? (triage.total_score as number) : null,
        modeLabel:
            assessment?.mode === "NON_VERBAL"
                ? "Non-Verbal"
                : assessment?.mode === "VERBAL"
                  ? "Verbal"
                  : "Mode tidak tercatat",
        statusLabel: !assessment
            ? "Asesmen belum tersedia"
            : answersComplete && !scoringEvidenceValid
              ? "Jawaban lengkap; bukti skor tersimpan belum dapat digunakan"
              : finalized
                ? "Asesmen selesai"
                : "Asesmen belum lengkap / perlu klarifikasi",
        observations,
        observationError,
    };
}
export type HealthcareAssessmentPresentation = ReturnType<
    typeof healthcareAssessmentPresentation
>;
