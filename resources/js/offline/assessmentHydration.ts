import type { LocalAssessment } from "./db";
import {
    assessmentSnapshotCurrent,
    normalizeAssessment,
} from "./assessmentContract.ts";
import { normalizeSrqAnswers } from "../domain/srq/srqAnswer.ts";
import { normalizeObservations } from "../domain/assessment/nonVerbalObservations.ts";

/** Fill server relations that were not loaded; never edit a completed value. */
export function hydrateCompletedAssessment(
    current: LocalAssessment,
    server: Partial<LocalAssessment>,
    expectedRevision: number,
): LocalAssessment {
    if (
        current.status !== "COMPLETED" ||
        current.sync_state !== "SYNCED" ||
        server.status !== "COMPLETED"
    )
        throw new Error(
            "Hidrasi memerlukan asesmen selesai yang diterima server.",
        );
    if (!assessmentSnapshotCurrent(current, expectedRevision))
        throw new Error("Respons asesmen sudah usang.");
    if (
        server.id !== current.id ||
        server.patient_id !== current.patient_id ||
        (server.mode !== undefined && server.mode !== current.mode)
    )
        throw new Error("Identitas asesmen server bertentangan.");
    const next = { ...current };
    for (const field of [
        "srq_answers",
        "risk_indicators",
        "function_domains",
    ] as const) {
        if (server[field] === undefined) continue;
        const incoming =
            field === "srq_answers"
                ? normalizeSrqAnswers(server[field])
                : server[field]!;
        const existing = (current[field] ?? {}) as Record<string, unknown>;
        const merged: Record<string, unknown> = { ...existing };
        for (const [key, value] of Object.entries(incoming)) {
            const valid =
                field === "srq_answers"
                    ? typeof value === "boolean"
                    : field === "risk_indicators"
                      ? ["R1", "R2", "R3", "R4", "R5"].includes(key) &&
                        typeof value === "boolean"
                      : ["F1", "F2", "F3"].includes(key) &&
                        [0, 1, 3].includes(value as number);
            if (!valid) throw new Error("Relasi asesmen selesai tidak valid.");
            if (Object.hasOwn(existing, key) && existing[key] !== value)
                throw new Error(
                    "Isi asesmen selesai bertentangan dengan server.",
                );
            merged[key] = value;
        }
        Object.assign(next, { [field]: merged });
    }
    if (server.non_verbal_reasons !== undefined) {
        const observations = normalizeObservations(server);
        if (
            current.non_verbal_reasons !== undefined &&
            (JSON.stringify(
                normalizeObservations(current).non_verbal_reasons,
            ) !== JSON.stringify(observations.non_verbal_reasons) ||
                (current.non_verbal_other_note ?? null) !==
                    observations.non_verbal_other_note)
        )
            throw new Error(
                "Observasi asesmen selesai bertentangan dengan server.",
            );
        Object.assign(next, observations);
    }
    const changed = [
        "srq_answers",
        "risk_indicators",
        "function_domains",
        "non_verbal_reasons",
        "non_verbal_other_note",
    ].some(
        (field) =>
            JSON.stringify(current[field as keyof LocalAssessment]) !==
            JSON.stringify(next[field as keyof LocalAssessment]),
    );
    return {
        ...normalizeAssessment(next),
        local_revision: (current.local_revision ?? 0) + (changed ? 1 : 0),
    };
}
