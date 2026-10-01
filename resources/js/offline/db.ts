import Dexie, { type Table } from "dexie";

export type SyncState =
    | "LOCAL_SAVED"
    | "PENDING_SYNC"
    | "SYNCING"
    | "SYNCED"
    | "SYNC_FAILED";
export interface LocalPatient {
    id: string;
    owner_user_id: number;
    nik?: string;
    name: string;
    age?: number;
    gender?: string;
    shelter_id?: number;
    created_at?: string;
    sync_state: SyncState;
    last_error?: string;
}
export interface LocalAssessment {
    id: string;
    owner_user_id: number;
    patient_id: string;
    status: "IN_PROGRESS" | "COMPLETED";
    mode: "VERBAL" | "NON_VERBAL";
    started_at?: string;
    completed_at?: string;
    srq_answers?: Record<number, boolean>;
    risk_indicators?: Record<string, boolean>;
    function_domains?: Record<string, number>;
    triage_result?: unknown;
    sync_state: SyncState;
    updated_at: string;
    local_draft_only?: boolean;
    last_error?: string;
}
export interface LocalEmergency {
    id: string;
    owner_user_id: number;
    patient_id?: string | null;
    patient_name?: string;
    assessment_id?: string | null;
    red_flag_type: string;
    status: string;
    latitude?: number | null;
    longitude?: number | null;
    shelter_id?: number | null;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    sync_state: SyncState;
    last_error?: string;
}
export interface OutboxItem {
    id?: number;
    owner_user_id: number;
    type: "EMERGENCY" | "ASSESSMENT";
    entity_id: string;
    payload: Record<string, unknown>;
    priority: 1 | 2;
    status: "PENDING" | "SYNCING" | "FAILED";
    retry_count: number;
    revision: number;
    last_error?: string;
    last_http_status?: number;
    created_at: string;
    updated_at: string;
}
export class RapidMindDB extends Dexie {
    patients!: Table<LocalPatient, string>;
    patientSnapshots!: Table<LocalPatient, [number, string]>;
    assessments!: Table<LocalAssessment, string>;
    emergencies!: Table<LocalEmergency, string>;
    outbox!: Table<OutboxItem, number>;
    constructor() {
        super("RapidMindOfflineDB");
        this.version(1).stores({
            patients: "id, nik, name, shelter_id",
            assessments: "id, patient_id, status, synced, updated_at",
            emergencies: "id, patient_id, status, synced, created_at",
            outbox: "++id, type, priority, status, created_at",
        });
        this.version(2)
            .stores({
                patients: "id, owner_user_id, nik, shelter_id",
                assessments:
                    "id, owner_user_id, patient_id, status, sync_state, updated_at",
                emergencies:
                    "id, owner_user_id, patient_id, sync_state, created_at",
                outbox: "++id, [owner_user_id+type+entity_id], owner_user_id, status, priority, created_at",
            })
            .upgrade(async (tx) => {
                const owners = new Map<string, Set<number>>();
                for (const assessment of await tx
                    .table("assessments")
                    .toArray()) {
                    if (
                        !Number.isInteger(assessment.user_id) ||
                        assessment.user_id <= 0
                    )
                        continue;
                    await tx.table("assessments").update(assessment.id, {
                        owner_user_id: assessment.user_id,
                        sync_state: assessment.synced
                            ? "SYNCED"
                            : "LOCAL_SAVED",
                    });
                    const set =
                        owners.get(assessment.patient_id) ?? new Set<number>();
                    set.add(assessment.user_id);
                    owners.set(assessment.patient_id, set);
                }
                for (const patient of await tx.table("patients").toArray()) {
                    const set = owners.get(patient.id);
                    if (set?.size === 1)
                        await tx.table("patients").update(patient.id, {
                            owner_user_id: [...set][0],
                            sync_state: "LOCAL_SAVED",
                        });
                }
                // Unattributable v1 records remain intact, without owner_user_id. Indexed owner queries exclude them.
                // v1 emergencies and outbox entries had no reliable owner; they are preserved but never replayed.
            });
        this.version(3).stores({
            patients: "id, owner_user_id, nik, shelter_id",
            patientSnapshots: "[owner_user_id+id], id, owner_user_id, nik, shelter_id",
            assessments: "id, owner_user_id, patient_id, status, sync_state, updated_at",
            emergencies: "id, owner_user_id, patient_id, sync_state, created_at",
            outbox: "++id, [owner_user_id+type+entity_id], owner_user_id, status, priority, created_at",
        });
    }
}
export const db = new RapidMindDB();
export function localUuid(): string {
    return crypto.randomUUID();
}
export function requireOwner(owner: number): number {
    if (!Number.isInteger(owner) || owner <= 0)
        throw new Error("Authenticated Relawan owner is required");
    return owner;
}
