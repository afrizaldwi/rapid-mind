import Dexie from "dexie";

// Synthetic v4 database in a dedicated browser profile. Never import the
// current v5 db module before this fixture has closed its v4 connection.
export async function seedSyntheticV4(): Promise<void> {
    const legacy = new Dexie("RapidMindOfflineDB");
    legacy.version(4).stores({
        patients: "id, owner_user_id, nik, shelter_id",
        patientSnapshots:
            "[owner_user_id+id], id, owner_user_id, nik, shelter_id",
        assessments:
            "id, owner_user_id, patient_id, status, sync_state, updated_at",
        emergencies: "id, owner_user_id, patient_id, sync_state, created_at",
        outbox: "++id, [owner_user_id+type+entity_id], owner_user_id, status, priority, created_at",
        relawanContinuity: "key, owner_user_id",
    });
    await legacy.open();
    await legacy.table("patients").bulkPut([
        {
            id: "patient-101",
            owner_user_id: 101,
            name: "Penyintas Sintetis",
            nik: "0000000000000101",
            sync_state: "LOCAL_SAVED",
        },
        {
            id: "patient-102",
            owner_user_id: 102,
            name: "Pemilik Lain Sintetis",
            sync_state: "LOCAL_SAVED",
        },
        { id: "legacy-ownerless", name: "Rekaman Legacy Sintetis" },
    ]);
    await legacy.table("patientSnapshots").put({
        id: "snapshot-101",
        owner_user_id: 101,
        name: "Snapshot Sintetis",
        sync_state: "SYNCED",
    });
    await legacy.table("assessments").put({
        id: "assessment-101",
        owner_user_id: 101,
        patient_id: "patient-101",
        status: "IN_PROGRESS",
        mode: "VERBAL",
        srq_answers: { 1: true },
        sync_state: "LOCAL_SAVED",
        updated_at: "2026-10-26T00:00:00.000Z",
    });
    await legacy.table("emergencies").put({
        id: "emergency-101",
        owner_user_id: 101,
        patient_id: "patient-101",
        red_flag_type: "PSYCHOSIS",
        status: "PENDING",
        created_at: "2026-10-26T00:00:00.000Z",
        updated_at: "2026-10-26T00:00:00.000Z",
        sync_state: "PENDING_SYNC",
    });
    await legacy.table("outbox").put({
        id: 7,
        owner_user_id: 101,
        type: "EMERGENCY",
        entity_id: "emergency-101",
        priority: 1,
        status: "PENDING",
        retry_count: 2,
        revision: 3,
        payload: {
            id: "emergency-101",
            red_flag_type: "PSYCHOSIS",
            patient: { id: "patient-101", name: "Penyintas Sintetis" },
        },
        created_at: "2026-10-26T00:00:00.000Z",
        updated_at: "2026-10-26T00:00:00.000Z",
    });
    legacy.close();
}
