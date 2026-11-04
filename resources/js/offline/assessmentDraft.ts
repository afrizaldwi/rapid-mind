import { type LocalAssessment, requireOwner } from "./db";
import { assessmentRepository } from "./assessmentRepository";
import { localPersistenceHealth } from "./localPersistenceHealth";
import {
    normalizeDraftAnswers as validAnswers,
    type DraftField,
    type DraftValue,
} from "./assessmentDraftValues";
export { mergeAssessmentDraft } from "./assessmentDraftValues";
import { queueAssessmentSnapshot } from "./assessmentSync";
import {
    normalizeObservations,
    type NonVerbalObservations,
} from "../domain/assessment/nonVerbalObservations.ts";
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

export async function readAssessmentDraft<K extends DraftField>(
    owner: number,
    id: string,
    field: K,
): Promise<DraftValue<K>> {
    await pending.get(`${owner}:${id}`)?.catch(() => {});
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
    return enqueue(`${owner}:${assessment.id}`, async () => {
        const existing = await assessmentRepository.get(owner, assessment.id);
        await localPersistenceHealth.recordWrite(owner, async () => {
            if (existing)
                await assessmentRepository.update(owner, assessment.id, {
                    [field]: cleaned,
                    sync_state: "LOCAL_SAVED",
                });
            else
                await assessmentRepository.save(owner, {
                    id: assessment.id,
                    patient_id: assessment.patient_id,
                    status: "IN_PROGRESS",
                    mode: assessment.mode ?? "VERBAL",
                    local_draft_only: true,
                    [field]: cleaned,
                    sync_state: "LOCAL_SAVED",
                });
        });
        await queueAssessmentSnapshot(owner, assessment.id);
    });
}

// Explicit clearing only: SRQ emits UNANSWERED. Never use as save/sync cleanup.
export function clearSavedAssessmentDraft<K extends DraftField>(
    owner: number,
    id: string,
    field: K,
    savedAnswers: DraftValue<K>,
): Promise<void> {
    const saved = validAnswers(field, savedAnswers);
    return enqueue(`${owner}:${id}`, async () => {
        const existing = await assessmentRepository.get(
            requireOwner(owner),
            id,
        );
        if (!existing) return;
        const current = validAnswers(field, existing[field]);
        const keys = Object.keys(current);
        const currentValues = current as Record<string, unknown>;
        const savedValues = saved as Record<string, unknown>;
        if (
            keys.length !== Object.keys(saved).length ||
            keys.some((key) => currentValues[key] !== savedValues[key])
        )
            return;
        if (field === "srq_answers") {
            // Clearing is a durable patch, never deletion followed by server fallback.
            await assessmentRepository.update(owner, id, (latest) => {
                if (
                    JSON.stringify(validAnswers(field, latest[field])) !==
                    JSON.stringify(saved)
                )
                    return {};
                return {
                    srq_answers: Object.fromEntries(
                        keys.map((key) => [key, "UNANSWERED" as const]),
                    ),
                    sync_state: "LOCAL_SAVED",
                };
            });
            await queueAssessmentSnapshot(owner, id);
            return;
        }
        const updated = { ...existing };
        delete updated[field];
        if (
            updated.local_draft_only &&
            !updated.srq_answers &&
            !updated.risk_indicators &&
            !updated.function_domains &&
            !updated.non_verbal_reasons?.length &&
            !updated.non_verbal_other_note
        ) {
            await assessmentRepository.remove(owner, id);
        } else {
            await assessmentRepository.replace(owner, updated);
        }
    });
}

export function saveObservationDraft(
    owner: number,
    id: string,
    observations: NonVerbalObservations,
): Promise<void> {
    const patch = normalizeObservations(observations);
    return enqueue(`${owner}:${id}`, async () => {
        await assessmentRepository.update(requireOwner(owner), id, {
            ...patch,
            sync_state: "LOCAL_SAVED",
        });
        await queueAssessmentSnapshot(owner, id);
    });
}
