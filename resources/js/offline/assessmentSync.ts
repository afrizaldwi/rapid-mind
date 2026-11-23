import { assessmentRepository } from "./assessmentRepository";
import { patientRepository } from "./patientRepository";
import { outboxRepository } from "./outboxRepository";
import { assessmentSyncPayload } from "./assessmentContract";

// Does not initiate transport. The ordinary sync manager preserves T0 priority.
export async function queueAssessmentSnapshot(
    owner: number,
    id: string,
): Promise<void> {
    const local = await assessmentRepository.get(owner, id);
    if (!local) throw new Error("Asesmen lokal tidak tersedia.");
    const patient = await patientRepository.get(owner, local.patient_id);
    if (!patient) throw new Error("Penyintas lokal tidak tersedia.");
    await outboxRepository.enqueue(
        owner,
        "ASSESSMENT",
        id,
        assessmentSyncPayload(local, patient),
        local.local_revision ?? 0,
    );
}
