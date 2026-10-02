import { type LocalAssessment, requireOwner } from "./db";
import { assessmentRepository } from "./assessmentRepository";
import { localPersistenceHealth } from "./localPersistenceHealth";

type DraftField = "srq_answers" | "risk_indicators" | "function_domains";
type DraftValue<K extends DraftField> = NonNullable<LocalAssessment[K]>;
type AssessmentRef = Pick<LocalAssessment, "id" | "patient_id"> & {
    user_id: number;
    mode?: LocalAssessment["mode"];
};

const pending = new Map<string, Promise<void>>();

function enqueue(id: string, task: () => Promise<void>): Promise<void> {
    const previous = pending.get(id) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    pending.set(id, next);
    void next
        .finally(() => {
            if (pending.get(id) === next) pending.delete(id);
        })
        .catch(() => {});
    return next;
}

function validAnswers<K extends DraftField>(
    field: K,
    answers: unknown,
): DraftValue<K> {
    const cleaned: Record<string, boolean | number> = {};
    if (
        answers === null ||
        typeof answers !== "object" ||
        Array.isArray(answers)
    ) {
        return cleaned as DraftValue<K>;
    }

    for (const [key, value] of Object.entries(answers)) {
        if (field === "srq_answers") {
            const number = Number(key);
            if (
                Number.isInteger(number) &&
                number >= 1 &&
                number <= 20 &&
                String(number) === key &&
                typeof value === "boolean"
            ) {
                cleaned[key] = value;
            }
        } else if (field === "risk_indicators") {
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
        ...validAnswers(field, serverAnswers),
        ...validAnswers(field, localAnswers),
    } as DraftValue<K>;
}

export async function readAssessmentDraft<K extends DraftField>(
    owner: number,
    id: string,
    field: K,
): Promise<DraftValue<K>> {
    await pending.get(id)?.catch(() => {});
    const record = await assessmentRepository.get(requireOwner(owner), id);
    return validAnswers(field, record?.[field]);
}

export function saveAssessmentDraft<K extends DraftField>(
    assessment: AssessmentRef,
    field: K,
    answers: DraftValue<K>,
): Promise<void> {
    const owner = requireOwner(assessment.user_id);
    const cleaned = validAnswers(field, answers);
    return enqueue(assessment.id, async () => {
        const existing = await assessmentRepository.get(owner, assessment.id);
        await localPersistenceHealth.recordWrite(owner, () => assessmentRepository.save(owner, {
            ...(existing ?? {
                id: assessment.id,
                patient_id: assessment.patient_id,
                status: "IN_PROGRESS",
                mode: assessment.mode ?? "VERBAL",
                local_draft_only: true,
            }),
            [field]: cleaned,
            sync_state: "LOCAL_SAVED",
        }));
    });
}

export function clearSavedAssessmentDraft<K extends DraftField>(
    owner: number,
    id: string,
    field: K,
    savedAnswers: DraftValue<K>,
): Promise<void> {
    const saved = validAnswers(field, savedAnswers);
    return enqueue(id, async () => {
        const existing = await assessmentRepository.get(
            requireOwner(owner),
            id,
        );
        if (!existing) return;
        const current = validAnswers(field, existing[field]);
        const keys = Object.keys(current);
        const currentValues = current as Record<string, boolean | number>;
        const savedValues = saved as Record<string, boolean | number>;
        if (
            keys.length !== Object.keys(saved).length ||
            keys.some((key) => currentValues[key] !== savedValues[key])
        )
            return;
        const updated = { ...existing };
        delete updated[field];
        if (
            updated.local_draft_only &&
            !updated.srq_answers &&
            !updated.risk_indicators &&
            !updated.function_domains
        ) {
            await assessmentRepository.remove(owner, id);
        } else {
            await assessmentRepository.replace(owner, updated);
        }
    });
}
