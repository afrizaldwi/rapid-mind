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
export interface RelawanContinuity {
    key: "active";
    owner_user_id: number;
    role: "RELAWAN";
    display_name: string;
    shelter_id: number | null;
    shelter_name: string | null;
    verified_at: string;
    logout_pending: boolean;
    schema_version: 1;
}
export interface WrappedOfflineKey {
    owner_user_id: number;
    version: 1;
    verification?: { iv: string; ciphertext: string };
    passphrase: {
        salt: string;
        iv: string;
        ciphertext: string;
        iterations: number;
    };
    recovery: {
        salt: string;
        iv: string;
        ciphertext: string;
        iterations: number;
    };
    created_at: string;
}
export type ClinicalStore =
    | "patients"
    | "patientSnapshots"
    | "assessments"
    | "emergencies"
    | "outbox";
export interface EncryptedStagingRecord {
    key: string;
    owner_user_id: number;
    record_type: ClinicalStore;
    record_id: string;
    version: 1;
    iv: string;
    ciphertext: string;
}
export interface OwnerEncryptionMode {
    owner_user_id: number;
    mode: "ENCRYPTED";
}
export interface EncryptedOutboxIndex {
    id: number;
    owner_user_id: number;
    ref: string;
}
export interface LocalSyncReceipt {
    key: string;
    owner_user_id: number;
    type: "ASSESSMENT" | "EMERGENCY";
    entity_id: string;
    canonical_id: string;
    revision: number;
    accepted_at: string;
    record_digest?: string;
}
export interface OutboxIdCounter {
    key: "global";
    last_id: number;
}
export class RapidMindDB extends Dexie {
    patients!: Table<LocalPatient, string>;
    patientSnapshots!: Table<LocalPatient, [number, string]>;
    assessments!: Table<LocalAssessment, string>;
    emergencies!: Table<LocalEmergency, string>;
    outbox!: Table<OutboxItem, number>;
    relawanContinuity!: Table<RelawanContinuity, string>;
    offlineKeys!: Table<WrappedOfflineKey, number>;
    encryptedStaging!: Table<EncryptedStagingRecord, string>;
    ownerEncryptionModes!: Table<OwnerEncryptionMode, number>;
    encryptedOutboxIndex!: Table<EncryptedOutboxIndex, number>;
    localSyncReceipts!: Table<LocalSyncReceipt, string>;
    outboxIdCounter!: Table<OutboxIdCounter, string>;
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
            patientSnapshots:
                "[owner_user_id+id], id, owner_user_id, nik, shelter_id",
            assessments:
                "id, owner_user_id, patient_id, status, sync_state, updated_at",
            emergencies:
                "id, owner_user_id, patient_id, sync_state, created_at",
            outbox: "++id, [owner_user_id+type+entity_id], owner_user_id, status, priority, created_at",
        });
        this.version(4).stores({
            relawanContinuity: "key, owner_user_id",
        });
        // Additive only: existing plaintext rows remain untouched until a separately
        // verified activation. Indexed owner and record IDs contain no clinical payload.
        this.version(5).stores({
            offlineKeys: "owner_user_id",
            encryptedStaging: "key, owner_user_id, record_type",
        });
        this.version(6).stores({
            ownerEncryptionModes: "owner_user_id",
            encryptedOutboxIndex: "id, owner_user_id",
        });
        this.version(7).stores({
            localSyncReceipts: "key, owner_user_id, [owner_user_id+type+entity_id]",
            outboxIdCounter: "key",
        });
    }
}
export const db = new RapidMindDB();
// Call only inside a read-write transaction containing both ID tables and the counter.
export async function nextOutboxId(): Promise<number> {
    const [plain, encrypted, counter] = await Promise.all([
        db.outbox.orderBy("id").last(),
        db.encryptedOutboxIndex.orderBy("id").last(),
        db.outboxIdCounter.get("global"),
    ]);
    const id = Math.max(plain?.id ?? 0, encrypted?.id ?? 0, counter?.last_id ?? 0) + 1;
    if (!Number.isSafeInteger(id)) throw new Error("Identitas antrean habis.");
    await db.outboxIdCounter.put({ key: "global", last_id: id });
    return id;
}
export function localUuid(): string {
    return crypto.randomUUID();
}
export function requireOwner(owner: number): number {
    if (!Number.isInteger(owner) || owner <= 0)
        throw new Error("Authenticated Relawan owner is required");
    return owner;
}
