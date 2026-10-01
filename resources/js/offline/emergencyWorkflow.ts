import { assessmentRepository } from "./assessmentRepository";
import {
    db,
    localUuid,
    requireOwner,
    type LocalEmergency,
    type LocalPatient,
} from "./db";
import { emergencyRepository } from "./emergencyRepository";
import { outboxRepository } from "./outboxRepository";
import { patientRepository } from "./patientRepository";
import { syncManager } from "./syncManager";

const redFlags = new Set([
    "SUICIDAL_IDEATION",
    "PSYCHOSIS",
    "SEVERE_AGITATION",
    "MEDICAL_CRISIS",
]);

export type EmergencyInput = {
    patientId?: string | null;
    assessmentId?: string | null;
    redFlagType: string;
    latitude?: number | null;
    longitude?: number | null;
    shelterId?: number | null;
    notes?: string | null;
};

export async function buildEmergencySyncPayload(
    owner: number,
    emergency: LocalEmergency,
) {
    requireOwner(owner);
    if (emergency.owner_user_id !== owner)
        throw new Error("Insiden tidak tersedia untuk Relawan ini.");
    const patient = emergency.patient_id
        ? await patientRepository.get(owner, emergency.patient_id)
        : null;
    if (emergency.patient_id && !patient)
        throw new Error("Penyintas lokal tidak tersedia.");
    const assessment = emergency.assessment_id
        ? await assessmentRepository.get(owner, emergency.assessment_id)
        : null;
    if (emergency.assessment_id && !assessment)
        throw new Error("Asesmen lokal tidak tersedia.");
    if (assessment && assessment.patient_id !== patient?.id)
        throw new Error("Penyintas tidak sesuai dengan asesmen.");
    return {
        id: emergency.id,
        patient: patient ? patientPayload(patient) : null,
        assessment_id: emergency.assessment_id ?? null,
        ...(assessment ? { assessment_mode: assessment.mode } : {}),
        red_flag_type: emergency.red_flag_type,
        latitude: emergency.latitude ?? null,
        longitude: emergency.longitude ?? null,
        notes: emergency.notes ?? null,
        created_at: emergency.created_at,
    };
}

function patientPayload(patient: LocalPatient) {
    return {
        id: patient.id,
        nik: patient.nik ?? null,
        name: patient.name,
        age: patient.age ?? null,
        gender: patient.gender ?? null,
    };
}

export async function createLocalEmergency(
    owner: number,
    input: EmergencyInput,
) {
    requireOwner(owner);
    if (!redFlags.has(input.redFlagType))
        throw new Error("Pilih indikator Red Flag yang valid.");
    const notes = input.notes?.trim() || null;
    if (notes && notes.length > 1000)
        throw new Error("Catatan maksimal 1000 karakter.");
    for (const [value, limit] of [
        [input.latitude, 90],
        [input.longitude, 180],
    ] as const) {
        if (
            value != null &&
            (!Number.isFinite(value) || Math.abs(value) > limit)
        )
            throw new Error("Koordinat tidak valid.");
    }
    const patient = input.patientId
        ? await patientRepository.get(owner, input.patientId)
        : null;
    if (input.patientId && !patient)
        throw new Error("Penyintas lokal tidak tersedia.");
    const assessment = input.assessmentId
        ? await assessmentRepository.get(owner, input.assessmentId)
        : null;
    if (input.assessmentId && !assessment)
        throw new Error("Asesmen lokal tidak tersedia.");
    if (assessment && assessment.patient_id !== patient?.id)
        throw new Error("Penyintas tidak sesuai dengan asesmen.");
    const now = new Date().toISOString();
    const emergency: LocalEmergency = {
        id: localUuid(),
        owner_user_id: owner,
        patient_id: patient?.id ?? null,
        patient_name: patient?.name,
        assessment_id: assessment?.id ?? null,
        red_flag_type: input.redFlagType,
        status: "PENDING",
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        shelter_id: input.shelterId ?? patient?.shelter_id ?? null,
        notes,
        created_at: now,
        updated_at: now,
        sync_state: "LOCAL_SAVED",
    };
    const payload = await buildEmergencySyncPayload(owner, emergency);
    // One IndexedDB transaction makes the emergency and its priority-1 outbox item durable together.
    await db.transaction(
        "rw",
        db.emergencies,
        db.outbox,
        db.assessments,
        async () => {
            await emergencyRepository.save(owner, emergency);
            await outboxRepository.enqueue(
                owner,
                "EMERGENCY",
                emergency.id,
                payload,
            );
        },
    );
    return emergency.id;
}

export function loadLocalEmergency(owner: number, id: string) {
    return emergencyRepository.get(owner, id);
}

export async function retryEmergency(owner: number, id: string) {
    if (!(await emergencyRepository.get(owner, id)))
        throw new Error("Insiden tidak tersedia untuk Relawan ini.");
    if (
        !(await outboxRepository.list(owner)).some(
            (item) => item.type === "EMERGENCY" && item.entity_id === id,
        )
    ) {
        throw new Error("Antrean sinkronisasi insiden tidak tersedia.");
    }
    await syncManager.sync(owner);
}
