// Antigravity-only runner. Uses the existing isolated staging-fixture profile,
// never Laravel, real records, or the owner's browser profile.
import { db } from "../../resources/js/offline/db";
import { assessmentRepository } from "../../resources/js/offline/assessmentRepository";
import { loadAssessmentContext } from "../../resources/js/offline/assessmentWorkflow";
import { patientRepository } from "../../resources/js/offline/patientRepository";
import { outboxRepository } from "../../resources/js/offline/outboxRepository";
import {
    saveAssessmentDraft,
    saveObservationDraft,
} from "../../resources/js/offline/assessmentDraft";
import { queueAssessmentSnapshot } from "../../resources/js/offline/assessmentSync";
import { createLocalEmergency } from "../../resources/js/offline/emergencyWorkflow";
import { recordVerifiedRelawan } from "../../resources/js/offline/relawanContinuity";
import { syncManager } from "../../resources/js/offline/syncManager";
import { installClinicalKey } from "../../resources/js/offline/encryptedClinicalStorage";
import {
    prepareOwnerKey,
    stageOwnerPlaintext,
    activateSyntheticOwner,
} from "../../resources/js/offline/offlineEncryptionStaging";

function check(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

export async function runAssessmentContractFixture(): Promise<string[]> {
    const originalContinuity = await db.relawanContinuity.get("active");
    const originalFetch = window.fetch;
    const results: string[] = [];
    let lease: number | undefined;
    const csrf = document.createElement("meta");
    csrf.name = "csrf-token";
    csrf.content = "synthetic-b2b";
    document.head.append(csrf);
    try {
        for (const owner of [701, 702]) {
            await recordVerifiedRelawan(
                { id: owner, role: "RELAWAN", name: "Relawan Sintetis B2B" },
                true,
            );
            if (owner === 702) {
                const created = await prepareOwnerKey(
                    owner,
                    "frasa sandi panjang pengujian khusus b2b",
                );
                await stageOwnerPlaintext(created.session);
                await activateSyntheticOwner(created.session);
                await installClinicalKey(created.session);
            }
            const patientId = await patientRepository.save(owner, {
                name: "Penyintas Sintetis B2B",
            });
            const completedId = crypto.randomUUID();
            await assessmentRepository.save(owner, {
                id: completedId,
                patient_id: patientId,
                mode: "VERBAL",
                status: "COMPLETED",
                sync_state: "SYNCED",
                srq_answers: {},
                risk_indicators: {},
                function_domains: {},
            });
            const hydrated = await loadAssessmentContext(owner, {
                id: completedId,
                patient_id: patientId,
                user_id: owner,
                mode: "VERBAL",
                status: "COMPLETED",
                srq_responses: Array.from({ length: 20 }, (_, index) => ({
                    question_number: index + 1,
                    answer: false,
                })),
            });
            check(
                Object.keys(hydrated.assessment.srq_answers ?? {}).length ===
                    20,
                "completed server hydration failed",
            );
            let immutable = false;
            try {
                await assessmentRepository.update(owner, completedId, {
                    srq_answers: { 1: true },
                });
            } catch {
                immutable = true;
            }
            check(immutable, "completed assessment edit was permitted");
            const id = await assessmentRepository.save(owner, {
                patient_id: patientId,
                mode: "NON_VERBAL",
                status: "IN_PROGRESS",
                srq_answers: { 17: true },
            });
            await saveObservationDraft(owner, id, {
                non_verbal_reasons: ["OTHER", "NOT_SPEAKING"],
                non_verbal_other_note: "catatan observasi sintetis b2b",
            });
            await saveAssessmentDraft(
                { id, patient_id: patientId, user_id: owner },
                "srq_answers",
                { 1: "UNCLEAR", 17: "UNANSWERED" },
            );
            const snapshot = (await outboxRepository.list(owner)).find(
                (item) => item.entity_id === id,
            )!;
            let invalidCanonicalRejected = false;
            try {
                await outboxRepository.complete(
                    owner,
                    snapshot,
                    {
                        assessment: {
                            id,
                            patient: { id: "foreign-patient" },
                        } as any,
                    },
                    () => true,
                );
            } catch {
                invalidCanonicalRejected = true;
            }
            check(
                invalidCanonicalRejected &&
                    (await outboxRepository.get(owner, snapshot.id!)),
                "invalid canonical patient removed outbox",
            );
            check(
                snapshot.payload.status === "IN_PROGRESS" &&
                    snapshot.priority === 2,
                "partial assessment must use priority 2",
            );
            await assessmentRepository.update(owner, id, {
                mode: "VERBAL",
                srq_answers: { 17: false },
            });
            const acceptedOld = await outboxRepository.complete(
                owner,
                snapshot,
                { assessment: { id, srq_answers: { 17: true } } },
                () => true,
            );
            check(!acceptedOld, "stale canonical response was accepted");
            check(
                (await assessmentRepository.get(owner, id))
                    ?.srq_answers?.[17] === false,
                "clarification was overwritten",
            );
            check(
                await outboxRepository.get(owner, snapshot.id!),
                "stale response removed outbox",
            );
            await queueAssessmentSnapshot(owner, id);
            const revised = await outboxRepository.get(owner, snapshot.id!);
            check(
                revised && revised.revision > snapshot.revision,
                "outbox revision did not advance",
            );
            check(
                !(await outboxRepository.complete(
                    owner,
                    snapshot,
                    { assessment: { id } },
                    () => true,
                )),
                "old outbox revision was accepted",
            );
            check(
                await outboxRepository.complete(
                    owner,
                    revised,
                    {
                        assessment: {
                            id,
                            srq_answers: { 1: "UNCLEAR", 17: false },
                        },
                    },
                    () => true,
                ),
                "current canonical response rejected",
            );
            db.close();
            await db.open();
            const reopened = await assessmentRepository.get(owner, id);
            check(
                reopened?.srq_answers?.[1] === "UNCLEAR" &&
                    reopened.srq_answers[17] === false,
                "reopen lost answers",
            );
            check(
                reopened.mode === "VERBAL" &&
                    reopened.non_verbal_other_note ===
                        "catatan observasi sintetis b2b",
                "mode switch lost observations",
            );
            check(
                !(await assessmentRepository.get(
                    owner === 701 ? 702 : 701,
                    id,
                )),
                "cross-owner record exposed",
            );
            await saveObservationDraft(owner, id, { non_verbal_reasons: [] });
            check(
                (await assessmentRepository.get(owner, id))?.non_verbal_reasons
                    ?.length === 0,
                "explicit metadata clearing failed",
            );
            if (owner === 702) {
                check(
                    !(await db.assessments.get(id)),
                    "encrypted assessment leaked to plaintext store",
                );
                const copies = await db.encryptedStaging
                    .where("owner_user_id")
                    .equals(owner)
                    .toArray();
                check(
                    !JSON.stringify(copies).includes(
                        "catatan observasi sintetis b2b",
                    ),
                    "clinical metadata leaked outside ciphertext",
                );
                const indexes = await db.encryptedOutboxIndex
                    .where("owner_user_id")
                    .equals(owner)
                    .toArray();
                check(
                    indexes.every((index) =>
                        Object.keys(index).every((key) =>
                            ["id", "owner_user_id", "ref"].includes(key),
                        ),
                    ),
                    "clinical index fields changed",
                );
            }
            let aborted = false;
            window.fetch = async (_url, options) => {
                return await new Promise<Response>((_resolve, reject) => {
                    const onAbort = () => {
                        aborted = true;
                        reject(
                            new DOMException(
                                "Synthetic request aborted",
                                "AbortError",
                            ),
                        );
                    };
                    if (options?.signal?.aborted) onAbort();
                    else
                        options?.signal?.addEventListener("abort", onAbort, {
                            once: true,
                        });
                });
            };
            lease = syncManager.setOwner(owner);
            await syncManager.sync(owner); // Real 15-second production timeout.
            const pending = (await outboxRepository.list(owner)).find(
                (item) => item.entity_id === id,
            );
            check(
                aborted && pending?.status === "FAILED",
                "timeout lost pending assessment",
            );
            check(
                (await assessmentRepository.get(owner, id))
                    ?.srq_answers?.[1] === "UNCLEAR",
                "timeout changed clinical answers",
            );
            window.fetch = async (_url, options) =>
                new Response(
                    JSON.stringify({
                        assessment: JSON.parse(String(options?.body)),
                    }),
                );
            await syncManager.sync(owner);
            check(
                !(await outboxRepository.get(owner, pending.id!)),
                "canonical retry failed to reconcile",
            );
            syncManager.clearOwner(lease);
            lease = undefined;
            window.fetch = originalFetch;
            const emergency = await createLocalEmergency(owner, {
                patientId,
                assessmentId: id,
                redFlagType: "MEDICAL_CRISIS",
            });
            for (let n = 0; n < 100; n++) {
                if (
                    (await outboxRepository.list(owner)).some(
                        (item) => item.type === "ASSESSMENT",
                    )
                )
                    break;
                await new Promise((resolve) => setTimeout(resolve, 20));
            }
            const queue = await outboxRepository.list(owner);
            check(
                queue[0]?.entity_id === emergency && queue[0].priority === 1,
                "T0 is not first",
            );
            check(
                queue.some(
                    (item) =>
                        item.entity_id === id &&
                        item.type === "ASSESSMENT" &&
                        item.payload.status === "IN_PROGRESS",
                ),
                "T0 interruption lost partial context",
            );
            results.push(
                `owner ${owner}: reopen, mode, clearing, canonical revision, timeout, privacy, owner isolation, T0 priority`,
            );
        }
        return results;
    } finally {
        if (lease !== undefined) syncManager.clearOwner(lease);
        window.fetch = originalFetch;
        csrf.remove();
        if (originalContinuity)
            await db.relawanContinuity.put(originalContinuity);
    }
}
