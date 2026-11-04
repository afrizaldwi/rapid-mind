import type { LocalAssessment } from "./db";
import { normalizeSrqAnswers } from "../domain/srq/srqAnswer.ts";
import { normalizeObservations } from "../domain/assessment/nonVerbalObservations.ts";

// Server-owned assessment contract only; local transport metadata stays local.
const canonicalAssessmentFields = [
    "id",
    "patient_id",
    "mode",
    "status",
    "started_at",
    "completed_at",
    "srq_answers",
    "risk_indicators",
    "function_domains",
    "non_verbal_reasons",
    "non_verbal_other_note",
    "triage_result",
    "updated_at",
] as const satisfies readonly (keyof LocalAssessment)[];

/** Both storage modes must accept the same nested canonical contract. */
export function canonicalAssessmentResponse(
    canonical: unknown,
    local: Pick<LocalAssessment, "id" | "patient_id">,
): {
    assessment: Partial<LocalAssessment> & { id: string };
    patient?: Record<string, unknown>;
} {
    const response =
        canonical && typeof canonical === "object" && !Array.isArray(canonical)
            ? (canonical as Record<string, unknown>).assessment
            : undefined;
    if (
        !response ||
        typeof response !== "object" ||
        Array.isArray(response) ||
        (response as Record<string, unknown>).id !== local.id
    )
        throw new Error("Respons asesmen server tidak sesuai catatan.");
    const value = response as Partial<LocalAssessment> & {
        id: string;
        patient?: Record<string, unknown>;
    };
    if (
        value.patient !== undefined &&
        (!value.patient ||
            typeof value.patient !== "object" ||
            Array.isArray(value.patient) ||
            value.patient.id !== local.patient_id)
    )
        throw new Error("Penyintas respons server tidak sesuai asesmen.");
    if (value.patient_id !== undefined && value.patient_id !== local.patient_id)
        throw new Error("Penyintas respons server tidak sesuai asesmen.");
    if (
        (value.status !== undefined &&
            !["IN_PROGRESS", "COMPLETED"].includes(value.status)) ||
        (value.mode !== undefined &&
            !["VERBAL", "NON_VERBAL"].includes(value.mode))
    )
        throw new Error("Keadaan asesmen server tidak valid.");
    const fields = Object.fromEntries(
        canonicalAssessmentFields
            .filter((key) => value[key] !== undefined)
            .map((key) => [key, value[key]]),
    );
    return {
        patient: value.patient,
        assessment: {
            ...fields,
            id: value.id,
            ...(value.srq_answers !== undefined
                ? { srq_answers: normalizeSrqAnswers(value.srq_answers) }
                : {}),
            ...normalizeObservations(value),
        },
    };
}
