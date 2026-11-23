import { db, requireOwner } from "./db";
import { assessmentRepository } from "./assessmentRepository";
import { emergencyRepository } from "./emergencyRepository";
import { outboxRepository } from "./outboxRepository";
import {
    ciphertextDigest,
    encryptedKey,
    encryptedMode,
} from "./encryptedClinicalStorage";

export type RetentionDecision = {
    eligible: boolean;
    reasons: string[];
};

// Decision only. No caller in this checkpoint deletes or minimizes a row.
export async function assessmentRetentionEligibility(
    owner: number,
    assessmentId: string,
): Promise<RetentionDecision> {
    requireOwner(owner);
    const assessment = await assessmentRepository.get(owner, assessmentId);
    if (!assessment) return { eligible: false, reasons: ["RECORD_MISSING"] };
    const receipt = await db.localSyncReceipts.get(
        `${owner}:ASSESSMENT:${assessmentId}`,
    );
    const ciphertext = await db.encryptedStaging.get(
        encryptedKey("assessments", owner, assessmentId),
    );
    const digest = ciphertext ? await ciphertextDigest(ciphertext) : null;
    const [queue, emergencies] = await Promise.all([
        outboxRepository.list(owner),
        emergencyRepository.list(owner),
    ]);
    const reasons: string[] = [];
    if (assessment.status !== "COMPLETED")
        reasons.push("ASSESSMENT_INCOMPLETE");
    if (
        assessment.sync_state !== "SYNCED" ||
        !receipt ||
        receipt.owner_user_id !== owner ||
        receipt.canonical_id !== assessmentId ||
        !Number.isInteger(receipt.revision) ||
        receipt.revision < 1
    )
        reasons.push("SERVER_ACCEPTANCE_UNVERIFIED");
    if (
        !(await encryptedMode(owner)) ||
        !receipt?.record_digest ||
        receipt.record_digest !== digest
    )
        reasons.push("RECORD_CHANGED_AFTER_ACCEPTANCE");
    if (
        queue.some(
            (item) =>
                item.entity_id === assessmentId ||
                item.payload?.assessment_id === assessmentId,
        )
    )
        reasons.push("RELATED_OUTBOX_PENDING");
    if (
        emergencies.some(
            (item) =>
                item.assessment_id === assessmentId &&
                item.status !== "RESOLVED",
        )
    )
        reasons.push("ACTIVE_T0_DEPENDENCY");
    return { eligible: reasons.length === 0, reasons };
}

export async function patientRetentionEligibility(
    owner: number,
    _patientId: string,
): Promise<RetentionDecision> {
    requireOwner(owner);
    // Patient records have no standalone canonical receipt yet. Keep them until
    // their own verified acceptance and all dependent workflows can be proven.
    return {
        eligible: false,
        reasons: ["PATIENT_CANONICAL_RECEIPT_UNAVAILABLE"],
    };
}

export async function emergencyRetentionEligibility(
    owner: number,
    _emergencyId: string,
): Promise<RetentionDecision> {
    requireOwner(owner);
    // A received T0 still serves field continuity and its audit trail.
    return { eligible: false, reasons: ["T0_OFFLINE_WORKFLOW_REQUIRED"] };
}
