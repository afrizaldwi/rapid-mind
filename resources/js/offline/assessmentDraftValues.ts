import type { LocalAssessment } from "./db";
import { normalizeSrqAnswers } from "../domain/srq/srqAnswer.ts";
export type DraftField = "srq_answers" | "risk_indicators" | "function_domains";
export type DraftValue<K extends DraftField> = NonNullable<LocalAssessment[K]>;

export function normalizeDraftAnswers<K extends DraftField>(
    field: K,
    answers: unknown,
): DraftValue<K> {
    if (field === "srq_answers")
        return normalizeSrqAnswers(answers) as DraftValue<K>;
    const cleaned: Record<string, boolean | number> = {};
    if (
        answers === null ||
        typeof answers !== "object" ||
        Array.isArray(answers)
    ) {
        return cleaned as DraftValue<K>;
    }

    for (const [key, value] of Object.entries(answers)) {
        if (field === "risk_indicators") {
            if (
                ["R1", "R2", "R3", "R4", "R5"].includes(key) &&
                typeof value === "boolean"
            )
                cleaned[key] = value;
        } else if (
            ["F1", "F2", "F3"].includes(key) &&
            (value === 0 || value === 1 || value === 3)
        ) {
            cleaned[key] = value;
        }
    }
    return cleaned as DraftValue<K>;
}

export function mergeAssessmentDraft<K extends DraftField>(
    field: K,
    serverAnswers: unknown,
    localAnswers: unknown,
): DraftValue<K> {
    return {
        ...normalizeDraftAnswers(field, serverAnswers),
        ...normalizeDraftAnswers(field, localAnswers),
    } as DraftValue<K>;
}
