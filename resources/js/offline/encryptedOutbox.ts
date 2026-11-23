import { captureClinicalAccess, assertClinicalAccess } from "./clinicalAccessFence";
import { canonicalAssessmentResponse } from "./assessmentCanonical";
import { receiptVersionPatch } from "./assessmentReceiptVersion";
import {
    db,
    localUuid,
    nextOutboxId,
    requireOwner,
    type EncryptedStagingRecord,
    type LocalAssessment,
    type LocalEmergency,
    type LocalPatient,
    type OutboxItem,
} from "./db";
import {
    assertStorageMode,
    assertPreparedClinicalRecord,
    ciphertextDigest,
    encryptedGet,
    encryptedList,
    encryptedKey,
    prepareEncrypted,
} from "./encryptedClinicalStorage";
import {
    assessmentSnapshotCurrent,
    reconcileAssessment,
} from "./assessmentContract";

type Change = {
    key: string;
    before?: EncryptedStagingRecord;
    after?: EncryptedStagingRecord;
};

async function preparedChange<T>(
    owner: number,
    type:
        | "patients"
        | "patientSnapshots"
        | "assessments"
        | "emergencies"
        | "outbox",
    id: string,
    value: T | null,
    expected?: unknown,
): Promise<Change> {
    const key = encryptedKey(type, owner, id);
    const before = await db.encryptedStaging.get(key);
    if (expected !== undefined) {
        const current = before
            ? await encryptedGet<Record<string, unknown>>(owner, type, id)
            : undefined;
        const withoutNumericId = (row: unknown) => {
            if (type !== "outbox" || !row || typeof row !== "object")
                return row;
            const { id: _id, ...rest } = row as Record<string, unknown>;
            return rest;
        };
        if (
            JSON.stringify(withoutNumericId(current)) !==
            JSON.stringify(withoutNumericId(expected))
        )
            throw new Error("Data lokal berubah bersamaan. Ulangi tindakan.");
    }
    return {
        key,
        before,
        after:
            value === null
                ? undefined
                : await prepareEncrypted(owner, type, id, value),
    };
}

async function commit(
    owner: number,
    changes: Change[],
    action: () => Promise<void>,
): Promise<void> {
    await db.transaction(
        "rw",
        [
            db.ownerEncryptionModes,
            db.relawanContinuity,
            db.offlineKeys,
            db.encryptedStaging,
            db.encryptedOutboxIndex,
            db.outboxIdCounter,
            db.outbox,
            db.localSyncReceipts,
        ],
        async () => {
            await assertStorageMode(owner, "ENCRYPTED");
            for (const change of changes) {
                const latest = await db.encryptedStaging.get(change.key);
                if (JSON.stringify(latest) !== JSON.stringify(change.before))
                    throw new Error(
                        "Data lokal berubah bersamaan. Ulangi tindakan.",
                    );
            }
            for (const change of changes) if (change.after) assertPreparedClinicalRecord(change.after);
            await action();
            for (const change of changes) {
                if (change.after) await db.encryptedStaging.put(change.after);
                else await db.encryptedStaging.delete(change.key);
            }
            for (const change of changes) if (change.after) assertPreparedClinicalRecord(change.after);
            await assertStorageMode(owner, "ENCRYPTED");
        },
    );
}

// Reserve before Web Crypto, never inside an IndexedDB transaction held across
// crypto. Failed operations may leave gaps, but IDs are never reused.
async function reserveOutboxId(): Promise<number> {
    return db.transaction("rw", db.outbox, db.encryptedOutboxIndex, db.outboxIdCounter, db.localSyncReceipts, nextOutboxId);
}

export async function encryptedOutboxGet(
    owner: number,
    id: number,
): Promise<OutboxItem | undefined> {
    requireOwner(owner);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identitas antrean rusak.");
    await assertStorageMode(owner, "ENCRYPTED");
    const index = await db.encryptedOutboxIndex.get(id);
    if (!index || index.owner_user_id !== owner) return undefined;
    const item = await encryptedGet<OutboxItem>(owner, "outbox", index.ref);
    if (
        !item ||
        item.owner_user_id !== owner ||
        item.id !== id || !item.entity_id ||
        !["EMERGENCY", "ASSESSMENT"].includes(item.type) ||
        item.priority !== (item.type === "EMERGENCY" ? 1 : 2) ||
        !Number.isSafeInteger(item.revision) || item.revision < 1 ||
        !Number.isSafeInteger(item.retry_count) || item.retry_count < 0
    )
        throw new Error("Antrean terenkripsi rusak atau tidak sesuai pemilik.");
    const entity = await encryptedGet<{ id: string; owner_user_id: number }>(
        owner, item.type === "EMERGENCY" ? "emergencies" : "assessments", item.entity_id,
    );
    if (!entity || entity.id !== item.entity_id || entity.owner_user_id !== owner)
        throw new Error("Referensi catatan antrean hilang atau tidak sesuai.");
    return { ...item, id };
}

export async function encryptedOutboxList(
    owner: number,
): Promise<OutboxItem[]> {
    await assertStorageMode(owner, "ENCRYPTED");
    const indexes = await db.encryptedOutboxIndex
        .where("owner_user_id")
        .equals(requireOwner(owner))
        .toArray();
    const copies = await encryptedList<OutboxItem>(owner, "outbox");
    const refs = new Set(indexes.map(index => index.ref));
    if (refs.size !== indexes.length || copies.length !== indexes.length)
        throw new Error("Indeks antrean hilang atau duplikat. Data tetap tersimpan.");
    const items: OutboxItem[] = [];
    for (const index of indexes) {
        const item = await encryptedOutboxGet(owner, index.id);
        if (item) items.push(item);
    }
    return items
        .filter(
            (item) => item.type === "EMERGENCY" || item.type === "ASSESSMENT",
        )
        .sort(
            (a, b) =>
                a.priority - b.priority ||
                a.created_at.localeCompare(b.created_at) ||
                (a.id ?? 0) - (b.id ?? 0),
        );
}

export async function encryptedOutboxEnqueue(
    owner: number,
    type: OutboxItem["type"],
    entityId: string,
    payload: Record<string, unknown>,
    expectedAssessmentRevision?: number,
): Promise<void> {
    const access = captureClinicalAccess();
    const entityType = type === "ASSESSMENT" ? "assessments" : "emergencies";
    const entity = await encryptedGet<LocalAssessment | LocalEmergency>(
        owner,
        entityType,
        entityId,
    );
    if (!entity)
        throw new Error("Catatan lokal tidak tersedia untuk Relawan ini.");
    if (
        type === "ASSESSMENT" &&
        expectedAssessmentRevision !== undefined &&
        !assessmentSnapshotCurrent(
            entity as LocalAssessment,
            expectedAssessmentRevision,
        )
    )
        throw new Error("Asesmen berubah saat menyiapkan antrean. Coba lagi.");
    const existing = (await encryptedOutboxList(owner)).find(
        (item) =>
            item.type === type &&
            item.entity_id === entityId &&
            ["PENDING", "SYNCING", "FAILED"].includes(item.status),
    );
    const index = existing?.id
        ? await db.encryptedOutboxIndex.get(existing.id)
        : undefined;
    const ref = index?.ref ?? localUuid();
    const now = new Date().toISOString();
    const id = existing?.id ?? await reserveOutboxId();
    const item: OutboxItem = existing
        ? {
              ...existing,
              payload,
              status: "PENDING",
              last_error: undefined,
              last_http_status: undefined,
              revision: existing.revision + 1,
              updated_at: now,
          }
        : {
              id,
              owner_user_id: owner,
              type,
              entity_id: entityId,
              payload,
              priority: type === "EMERGENCY" ? 1 : 2,
              status: "PENDING",
              retry_count: 0,
              revision: 1,
              created_at: now,
              updated_at: now,
          };
    if (type === "ASSESSMENT")
        item.assessment_local_revision =
            (entity as LocalAssessment).local_revision ?? 0;
    const changes = [
        await preparedChange(owner, "outbox", ref, item, existing),
        await preparedChange(
            owner,
            entityType,
            entityId,
            {
                ...entity,
                sync_state: "PENDING_SYNC",
                last_error: undefined,
            },
            entity,
        ),
    ];
    assertClinicalAccess(access);
    if (!existing && changes[0].before)
        throw new Error("Identitas antrean sudah tersedia.");
    await commit(owner, changes, async () => {
        if (existing) {
            const latest = await db.encryptedOutboxIndex.get(existing.id!);
            if (JSON.stringify(latest) !== JSON.stringify(index))
                throw new Error("Antrean berubah bersamaan.");
        } else {
            await db.encryptedOutboxIndex.add({
                id,
                owner_user_id: owner,
                ref,
            });
        }
    });
}

export async function createEncryptedEmergencyWithOutbox(
    owner: number,
    emergency: LocalEmergency,
    payload: Record<string, unknown>,
): Promise<void> {
    const access = captureClinicalAccess();
    const ref = localUuid();
    const now = new Date().toISOString();
    const id = await reserveOutboxId();
    const item: OutboxItem = {
        id,
        owner_user_id: owner,
        type: "EMERGENCY",
        entity_id: emergency.id,
        payload,
        priority: 1,
        status: "PENDING",
        retry_count: 0,
        revision: 1,
        created_at: now,
        updated_at: now,
    };
    const changes = [
        await preparedChange(owner, "emergencies", emergency.id, {
            ...emergency,
            sync_state: "PENDING_SYNC",
            last_error: undefined,
        }),
        await preparedChange(owner, "outbox", ref, item),
    ];
    assertClinicalAccess(access);
    if (changes[0].before || changes[1].before)
        throw new Error("Identitas insiden atau antrean sudah tersedia.");
    await commit(owner, changes, async () => {
        await db.encryptedOutboxIndex.add({ id, owner_user_id: owner, ref });
    });
}

async function updateItem(
    owner: number,
    item: OutboxItem,
    next: OutboxItem,
    state: "PENDING_SYNC" | "SYNCING" | "SYNC_FAILED",
): Promise<void> {
    const index = item.id
        ? await db.encryptedOutboxIndex.get(item.id)
        : undefined;
    if (!index || index.owner_user_id !== owner) return;
    const entityType =
        item.type === "ASSESSMENT" ? "assessments" : "emergencies";
    const entity = await encryptedGet<LocalAssessment | LocalEmergency>(
        owner,
        entityType,
        item.entity_id,
    );
    if (!entity) throw new Error("Catatan lokal tidak tersedia.");
    const changes = [
        await preparedChange(owner, "outbox", index.ref, next, item),
        await preparedChange(
            owner,
            entityType,
            item.entity_id,
            { ...entity, sync_state: state, last_error: next.last_error },
            entity,
        ),
    ];
    await commit(owner, changes, async () => {
        const latest = await db.encryptedOutboxIndex.get(item.id!);
        if (JSON.stringify(latest) !== JSON.stringify(index))
            throw new Error("Antrean berubah bersamaan.");
    });
}

export async function encryptedOutboxRecover(
    owner: number,
    item: OutboxItem,
): Promise<void> {
    const current = item.id
        ? await encryptedOutboxGet(owner, item.id)
        : undefined;
    if (
        !current ||
        current.revision !== item.revision ||
        current.status !== "SYNCING"
    )
        return;
    await updateItem(
        owner,
        current,
        { ...current, status: "PENDING" },
        "PENDING_SYNC",
    );
}

export async function encryptedOutboxMark(
    owner: number,
    item: OutboxItem,
    status: OutboxItem["status"],
    error?: string,
    httpStatus?: number,
): Promise<void> {
    const current = item.id
        ? await encryptedOutboxGet(owner, item.id)
        : undefined;
    if (!current || current.revision !== item.revision) return;
    await updateItem(
        owner,
        current,
        {
            ...current,
            status,
            last_error: error,
            last_http_status: httpStatus,
            retry_count:
                status === "FAILED"
                    ? current.retry_count + 1
                    : current.retry_count,
            updated_at: new Date().toISOString(),
        },
        status === "SYNCING" ? "SYNCING" : "SYNC_FAILED",
    );
}

export async function pruneDeliveredClinicalRecords(owner: number, stillActive: () => boolean): Promise<number> {
    requireOwner(owner);
    const access = captureClinicalAccess();
    await assertStorageMode(owner, "ENCRYPTED");
    const before = await db.encryptedStaging.where("owner_user_id").equals(owner).toArray();
    const indexes = await db.encryptedOutboxIndex.where("owner_user_id").equals(owner).toArray();
    const receipts = await db.localSyncReceipts.where("owner_user_id").equals(owner).toArray();
    const [assessments, emergencies, patients, snapshots, queue] = await Promise.all([
        encryptedList<LocalAssessment>(owner, "assessments"),
        encryptedList<LocalEmergency>(owner, "emergencies"),
        encryptedList<LocalPatient>(owner, "patients"),
        encryptedList<LocalPatient>(owner, "patientSnapshots"),
        encryptedOutboxList(owner),
    ]);
    const candidates = new Set<string>();
    for (const record of [...assessments, ...emergencies]) {
        const assessment = "mode" in record;
        if (record.sync_state !== "SYNCED" || record.routing_status !== "ROUTED" ||
            (assessment && record.status !== "COMPLETED")) continue;
        const type = assessment ? "ASSESSMENT" : "EMERGENCY";
        if (queue.some(item => item.type === type && item.entity_id === record.id)) continue;
        const key = encryptedKey(assessment ? "assessments" : "emergencies", owner, record.id);
        const envelope = before.find(row => row.key === key);
        const receipt = receipts.find(row => row.type === type && row.entity_id === record.id && row.canonical_id === record.id);
        if (envelope && receipt?.record_digest && receipt.key === `${owner}:${type}:${record.id}` &&
            typeof receipt.outbox_id === "number" && Number.isSafeInteger(receipt.outbox_id) && receipt.outbox_id > 0 &&
            Number.isSafeInteger(receipt.revision) && receipt.revision > 0 && Number.isFinite(Date.parse(receipt.accepted_at)) &&
            await ciphertextDigest(envelope) === receipt.record_digest) candidates.add(key);
    }
    // Pending T0 payloads still need the local assessment for safe retries.
    for (const assessment of assessments) {
        if (emergencies.some(e => e.assessment_id === assessment.id &&
            !candidates.has(encryptedKey("emergencies", owner, e.id))) ||
            queue.some(item => item.payload.assessment_id === assessment.id))
            candidates.delete(encryptedKey("assessments", owner, assessment.id));
    }
    const removedPatients = new Set<string>();
    for (const record of [...assessments, ...emergencies]) {
        const type = "mode" in record ? "assessments" : "emergencies";
        if (record.patient_id && candidates.has(encryptedKey(type, owner, record.id)))
            removedPatients.add(record.patient_id);
    }
    for (const patient of [...patients, ...snapshots]) {
        if (!removedPatients.has(patient.id) || [...patients, ...snapshots].some(p => p.id === patient.id && p.sync_state !== "SYNCED")) continue;
        const retained = assessments.some(a => a.patient_id === patient.id && !candidates.has(encryptedKey("assessments", owner, a.id))) ||
            emergencies.some(e => e.patient_id === patient.id && !candidates.has(encryptedKey("emergencies", owner, e.id))) ||
            queue.some(item => item.payload.patient_id === patient.id || (item.payload.patient as { id?: string } | undefined)?.id === patient.id);
        if (!retained) {
            for (const type of ["patients", "patientSnapshots"] as const) {
                const key = encryptedKey(type, owner, patient.id);
                if (before.some(row => row.key === key)) candidates.add(key);
            }
        }
    }
    if (!candidates.size) return 0;
    await db.transaction("rw", [db.encryptedStaging, db.encryptedOutboxIndex,
        db.localSyncReceipts, db.ownerEncryptionModes, db.relawanContinuity, db.offlineKeys], async () => {
            await assertStorageMode(owner, "ENCRYPTED");
            assertClinicalAccess(access);
            if (!stillActive()) throw new Error("Sesi pembersihan berubah.");
            const latest = await db.encryptedStaging.where("owner_user_id").equals(owner).toArray();
            const latestIndexes = await db.encryptedOutboxIndex.where("owner_user_id").equals(owner).toArray();
            const latestReceipts = await db.localSyncReceipts.where("owner_user_id").equals(owner).toArray();
            if (JSON.stringify(latest) !== JSON.stringify(before) || JSON.stringify(latestIndexes) !== JSON.stringify(indexes) ||
                JSON.stringify(latestReceipts) !== JSON.stringify(receipts))
                throw new Error("Data lokal berubah saat pembersihan.");
            for (const key of candidates) await db.encryptedStaging.delete(key);
            assertClinicalAccess(access);
        });
    return candidates.size;
}


export async function encryptedOutboxComplete(
    owner: number,
    item: OutboxItem,
    canonical: {
        assessment?: Partial<LocalAssessment> & { id: string };
        emergency?: Partial<LocalEmergency> & { id: string };
    },
    stillActive: () => boolean,
): Promise<boolean> {
    const current = item.id
        ? await encryptedOutboxGet(owner, item.id)
        : undefined;
    if (!current || !stillActive() || (item.type !== "ASSESSMENT" && current.revision !== item.revision))
        return false;
    const index = await db.encryptedOutboxIndex.get(item.id!);
    if (!index || index.owner_user_id !== owner)
        throw new Error("Antrean tidak tersedia.");
    const entityType =
        item.type === "ASSESSMENT" ? "assessments" : "emergencies";
    const entity = await encryptedGet<LocalAssessment | LocalEmergency>(
        owner,
        entityType,
        item.entity_id,
    );
    if (!entity) throw new Error("Catatan lokal hilang.");
    const assessmentResponse =
        item.type === "ASSESSMENT"
            ? canonicalAssessmentResponse(canonical, entity as LocalAssessment)
            : undefined;
    const response = assessmentResponse?.assessment ?? canonical.emergency;
    if (!response || response.id !== item.entity_id)
        throw new Error("Respons server tidak sesuai catatan.");
    if (
        item.type === "ASSESSMENT" &&
        (current.revision !== item.revision || !assessmentSnapshotCurrent(
            entity as LocalAssessment,
            item.assessment_local_revision,
        ))
    ) {
        const change = await preparedChange(owner, "assessments", item.entity_id, {
            ...entity,
            ...receiptVersionPatch(entity as LocalAssessment, item, assessmentResponse!.assessment),
        }, entity);
        await commit(owner, [change], async () => {
            if (!stillActive()) throw new Error("Sesi sinkronisasi berubah.");
            const latest = await encryptedOutboxGet(owner, item.id!);
            if (latest?.revision !== current.revision) throw new Error("Revisi antrean berubah.");
        });
        return false;
    }
    const patient = (
        assessmentResponse
            ? assessmentResponse.patient
            : (response as Record<string, unknown>).patient
    ) as Record<string, unknown> | undefined;
    const changes: Change[] = [
        await preparedChange(owner, "outbox", index.ref, null, current),
        await preparedChange(
            owner,
            entityType,
            item.entity_id,
            {
                ...(item.type === "ASSESSMENT"
                    ? reconcileAssessment(
                          entity as LocalAssessment,
                          response as Partial<LocalAssessment>,
                      )
                    : { ...entity, ...response }),
                ...(item.type === "ASSESSMENT" && patient?.id
                    ? { patient_id: patient.id }
                    : {}),
                owner_user_id: owner,
                sync_state: "SYNCED",
                last_error: undefined,
            },
            entity,
        ),
    ];
    if (patient && typeof patient.id === "string") {
        const local = await encryptedGet<LocalPatient>(
            owner,
            "patients",
            patient.id,
        );
        const snapshot = local
            ? undefined
            : await encryptedGet<LocalPatient>(
                  owner,
                  "patientSnapshots",
                  patient.id,
              );
        if (local || snapshot) {
            const type = local ? "patients" : "patientSnapshots";
            changes.push(
                await preparedChange(
                    owner,
                    type,
                    patient.id,
                    {
                        ...(local ?? snapshot),
                        ...Object.fromEntries(
                            Object.entries(patient).filter(
                                ([, value]) => value !== undefined,
                            ),
                        ),
                        owner_user_id: owner,
                        sync_state: "SYNCED",
                        last_error: undefined,
                    },
                    local ?? snapshot,
                ),
            );
        }
    }
    const recordDigest = await ciphertextDigest(changes[1].after!);
    try {
        await commit(owner, changes, async () => {
            if (!stillActive()) throw new Error("Sesi sinkronisasi berubah.");
            const latest = await db.encryptedOutboxIndex.get(item.id!);
            if (JSON.stringify(latest) !== JSON.stringify(index))
                throw new Error("Revisi antrean berubah.");
            await db.encryptedOutboxIndex.delete(item.id!);
            await db.localSyncReceipts.put({
                outbox_id: item.id!,
                key: `${owner}:${item.type}:${item.entity_id}`,
                owner_user_id: owner,
                type: item.type,
                entity_id: item.entity_id,
                canonical_id: response.id,
                revision: item.revision,
                accepted_at: new Date().toISOString(),
                record_digest: recordDigest,
            });
        });
    } catch (error) {
        if (
            error instanceof Error &&
            /Revisi antrean berubah|Sesi sinkronisasi berubah/.test(
                error.message,
            )
        )
            return false;
        throw error;
    }
    return true;
}
