import type { LocalEmergency, LocalPatient } from "./db";
import { patientRepository } from "./patientRepository";
import { encryptedMutate } from "./encryptedClinicalStorage";
import { captureClinicalAccess, assertClinicalAccess } from "./clinicalAccessFence";

// Copy minimal, already-authorized Relawan projections; never whole Inertia
// props, authentication responses, or Healthcare lifecycle data.
export async function cacheRelawanPatients(owner: number, input: unknown): Promise<void> {
    if (!Array.isArray(input)) return;
    const access = captureClinicalAccess();
    for (const patient of input as Partial<LocalPatient>[]) {
        if (!patient || typeof patient.id !== "string" || typeof patient.name !== "string") continue;
        assertClinicalAccess(access);
        await patientRepository.saveServerSnapshot(owner, {
            id: patient.id, name: patient.name, nik: patient.nik, age: patient.age,
            gender: patient.gender, shelter_id: patient.shelter_id,
        });
    }
}

export async function cacheRelawanEmergency(owner: number, input: unknown): Promise<void> {
    const event = input as Partial<LocalEmergency> & { user_id?: number; patient?: { name?: string } } | null;
    if (!event || event.user_id !== owner || typeof event.id !== "string" ||
        typeof event.red_flag_type !== "string" || typeof event.created_at !== "string") return;
    await encryptedMutate<LocalEmergency>(owner, "emergencies", event.id, existing => existing ?? {
        id: event.id!, owner_user_id: owner, patient_name: event.patient?.name,
        red_flag_type: event.red_flag_type!, notes: event.notes, status: "PENDING",
        created_at: event.created_at!, updated_at: event.updated_at ?? event.created_at!,
        sync_state: "SYNCED", routing_status: event.routing_status,
    });
}
