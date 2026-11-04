import type { LocalAssessment, LocalPatient } from "./db";
import {
    hasDefinitiveSrqAnswers,
    normalizeSrqAnswers,
} from "../domain/srq/srqAnswer.ts";
import { normalizeObservations } from "../domain/assessment/nonVerbalObservations.ts";

const clinicalFields = [
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
] as const;

export function exactAssessmentAnswers(
    a: Pick<
        LocalAssessment,
        "srq_answers" | "risk_indicators" | "function_domains"
    >,
): boolean {
    const risk = a.risk_indicators ?? {};
    const functions = a.function_domains ?? {};
    return (
        hasDefinitiveSrqAnswers(a.srq_answers) &&
        Object.keys(risk).length === 5 &&
        ["R1", "R2", "R3", "R4", "R5"].every(
            (k) => typeof risk[k] === "boolean",
        ) &&
        Object.keys(functions).length === 3 &&
        ["F1", "F2", "F3"].every((k) => [0, 1, 3].includes(functions[k]))
    );
}

export function normalizeAssessment<T extends Partial<LocalAssessment>>(
    input: T,
): T {
    const next = { ...input, ...normalizeObservations(input) };
    if (input.srq_answers !== undefined)
        next.srq_answers = normalizeSrqAnswers(input.srq_answers);
    if (input.status === "IN_PROGRESS" || !exactAssessmentAnswers(input))
        next.triage_result = null;
    return next;
}

export function assessmentMutation(
    existing: LocalAssessment | undefined,
    patch: Partial<LocalAssessment>,
    owner: number,
    id: string,
): LocalAssessment {
    if (existing && existing.owner_user_id !== owner)
        throw new Error("Assessment owner mismatch");
    const next = normalizeAssessment({
        ...existing,
        ...patch,
        ...(patch.srq_answers !== undefined
            ? {
                  srq_answers: {
                      ...existing?.srq_answers,
                      ...normalizeSrqAnswers(patch.srq_answers),
                  },
              }
            : {}),
        ...(patch.non_verbal_reasons !== undefined
            ? normalizeObservations(patch)
            : {}),
        id,
        owner_user_id: owner,
        sync_state: patch.sync_state ?? existing?.sync_state ?? "LOCAL_SAVED",
        updated_at: new Date().toISOString(),
    } as LocalAssessment);
    // Validate a note-only patch against the existing selected observations.
    if (
        patch.non_verbal_reasons === undefined &&
        patch.non_verbal_other_note !== undefined
    )
        Object.assign(
            next,
            normalizeObservations({
                non_verbal_reasons: existing?.non_verbal_reasons,
                non_verbal_other_note: patch.non_verbal_other_note,
            }),
        );
    const changed =
        !existing ||
        clinicalFields.some(
            (key) =>
                JSON.stringify(existing[key]) !== JSON.stringify(next[key]),
        );
    if (existing?.status === "COMPLETED" && changed)
        throw new Error("Asesmen selesai tidak dapat diubah.");
    next.local_revision = (existing?.local_revision ?? 0) + (changed ? 1 : 0);
    return next;
}

export function assessmentSyncPayload(
    local: LocalAssessment,
    patient: Pick<LocalPatient, "id" | "name" | "nik" | "age" | "gender">,
): Record<string, unknown> {
    if (patient.id !== local.patient_id)
        throw new Error("Penyintas tidak sesuai asesmen.");
    const normalized = normalizeAssessment(local);
    if (local.status === "COMPLETED" && !exactAssessmentAnswers(normalized))
        throw new Error("Asesmen belum lengkap.");
    return {
        id: local.id,
        patient: {
            id: patient.id,
            name: patient.name,
            nik: patient.nik ?? null,
            age: patient.age ?? null,
            gender: patient.gender ?? null,
        },
        mode: local.mode,
        status: local.status,
        started_at: local.started_at,
        completed_at: local.completed_at,
        ...(local.srq_answers !== undefined
            ? { srq_answers: normalized.srq_answers }
            : {}),
        ...(local.risk_indicators !== undefined
            ? { risk_indicators: local.risk_indicators }
            : {}),
        ...(local.function_domains !== undefined
            ? { function_domains: local.function_domains }
            : {}),
        ...normalizeObservations(local),
    };
}

export function assessmentSnapshotCurrent(
    local: LocalAssessment,
    capturedRevision?: number,
): boolean {
    return (local.local_revision ?? 0) === (capturedRevision ?? 0);
}

export function reconcileAssessment(
    local: LocalAssessment,
    canonical: Partial<LocalAssessment>,
): LocalAssessment {
    // Called only after both the outbox revision and local revision match.
    const defined = Object.fromEntries(
        Object.entries(canonical).filter(([, value]) => value !== undefined),
    );
    return normalizeAssessment({
        ...local,
        ...defined,
        ...(canonical.srq_answers !== undefined
            ? {
                  srq_answers: {
                      ...local.srq_answers,
                      ...normalizeSrqAnswers(canonical.srq_answers),
                  },
              }
            : {}),
        ...normalizeObservations(canonical),
        id: local.id,
        owner_user_id: local.owner_user_id,
        local_revision: local.local_revision,
        sync_state: "SYNCED",
        last_error: undefined,
    });
}
