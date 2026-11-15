import { db, type LocalAssessment, type LocalPatient } from "./db";
import { assertPreparedClinicalRecord, assertStorageMode, clinicalKeyReady, encryptedGet, encryptedKey, prepareEncrypted } from "./encryptedClinicalStorage";
import { captureClinicalAccess, assertClinicalAccess } from "./clinicalAccessFence";
import { assessmentMutation, assessmentSyncPayload } from "./assessmentContract";
import { queueAssessmentSnapshot } from "./assessmentSync";
import { resolveRelawanContinuity } from "./relawanContinuity";

export async function preserveOfflineAssessment(
    owner: number,
    assessment: LocalAssessment,
    patient: LocalPatient,
    isCurrent: () => boolean,
): Promise<void> {
    const access = captureClinicalAccess();
    const continuity = await resolveRelawanContinuity();
    if (continuity.state !== "ELIGIBLE" || continuity.context.owner_user_id !== owner ||
        !isCurrent() || !clinicalKeyReady(owner) || assessment.owner_user_id !== owner ||
        patient.owner_user_id !== owner || assessment.patient_id !== patient.id ||
        assessment.status !== "IN_PROGRESS")
        throw new Error("Akses penyimpanan offline belum tersedia.");
    const local = assessmentMutation(undefined, {
        ...assessment, sync_state: "LOCAL_SAVED",
    }, owner, assessment.id);
    const key = encryptedKey("assessments", owner, local.id);
    const before = await db.encryptedStaging.get(key);
    const existing = before ? await encryptedGet<LocalAssessment>(owner, "assessments", local.id) : undefined;
    if (existing && (
        existing.status !== "IN_PROGRESS" ||
        existing.server_version !== local.server_version ||
        JSON.stringify(assessmentSyncPayload(existing, patient)) !== JSON.stringify(assessmentSyncPayload(local, patient))
    )) throw new Error("Draf offline berbeda untuk asesmen ini sudah ada. Periksa draf perangkat sebelum melanjutkan.");
    const [assessmentEnvelope, patientEnvelope] = await Promise.all([
        prepareEncrypted(owner, "assessments", local.id, local),
        prepareEncrypted(owner, "patients", patient.id, patient),
    ]);
    await db.transaction("rw", [db.encryptedStaging, db.ownerEncryptionModes, db.offlineKeys, db.relawanContinuity], async () => {
        await assertStorageMode(owner, "ENCRYPTED");
        if (!isCurrent()) throw new Error("Akses asesmen berubah.");
        assertClinicalAccess(access);
        assertPreparedClinicalRecord(assessmentEnvelope);
        assertPreparedClinicalRecord(patientEnvelope);
        const latest = await db.encryptedStaging.get(key);
        if (JSON.stringify(latest) !== JSON.stringify(before))
            throw new Error("Draf perangkat berubah. Coba lanjutkan kembali.");
        if (!await db.encryptedStaging.get(patientEnvelope.key))
            await db.encryptedStaging.put(patientEnvelope);
        if (!before) await db.encryptedStaging.put(assessmentEnvelope);
        assertClinicalAccess(access);
    });
    await queueAssessmentSnapshot(owner, local.id);
}
