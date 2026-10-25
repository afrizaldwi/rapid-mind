import { db, localUuid, requireOwner, type LocalPatient } from "./db";
import {
    assertStorageMode,
    encryptedGet,
    encryptedList,
    encryptedMode,
    encryptedMutate,
    encryptedKey,
    prepareEncrypted,
} from "./encryptedClinicalStorage";

async function reconcileEncryptedPatient(
    owner: number,
    canonical: Partial<LocalPatient> & { id: string },
    requireExisting: boolean,
): Promise<void> {
    const localKey = encryptedKey("patients", owner, canonical.id);
    const snapshotKey = encryptedKey("patientSnapshots", owner, canonical.id);
    const [localBefore, snapshotBefore] = await Promise.all([
        db.encryptedStaging.get(localKey),
        db.encryptedStaging.get(snapshotKey),
    ]);
    const [local, snapshot] = await Promise.all([
        localBefore ? encryptedGet<LocalPatient>(owner, "patients", canonical.id) : undefined,
        snapshotBefore ? encryptedGet<LocalPatient>(owner, "patientSnapshots", canonical.id) : undefined,
    ]);
    if (requireExisting && !local && !snapshot)
        throw new Error("Local patient missing");
    const fields = Object.fromEntries(
        Object.entries(canonical).filter(([, value]) => value !== undefined),
    );
    const type = local ? "patients" : "patientSnapshots";
    const next = await prepareEncrypted(owner, type, canonical.id, {
        ...(local ?? snapshot),
        ...fields,
        id: canonical.id,
        owner_user_id: owner,
        sync_state: "SYNCED",
        last_error: undefined,
    } as LocalPatient);
    await db.transaction("rw", db.ownerEncryptionModes, db.offlineKeys, db.encryptedStaging, async () => {
        await assertStorageMode(owner, "ENCRYPTED");
        const [latestLocal, latestSnapshot] = await Promise.all([
            db.encryptedStaging.get(localKey),
            db.encryptedStaging.get(snapshotKey),
        ]);
        if (JSON.stringify(latestLocal) !== JSON.stringify(localBefore) ||
            JSON.stringify(latestSnapshot) !== JSON.stringify(snapshotBefore))
            throw new Error("Data lokal berubah bersamaan. Ulangi tindakan.");
        await db.encryptedStaging.put(next);
        if (local) await db.encryptedStaging.delete(snapshotKey);
    });
}
export const patientRepository = {
    async get(owner: number, id: string) {
        requireOwner(owner);
        if (await encryptedMode(owner))
            return (
                (await encryptedGet<LocalPatient>(owner, "patients", id)) ??
                encryptedGet<LocalPatient>(owner, "patientSnapshots", id)
            );
        return db.transaction(
            "r",
            [db.patients, db.patientSnapshots, db.ownerEncryptionModes],
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const patient = await db.patients.get(id);
                if (patient?.owner_user_id === owner) return patient;
                return db.patientSnapshots.get([owner, id]);
            },
        );
    },
    async list(owner: number) {
        const scopedOwner = requireOwner(owner);
        if (await encryptedMode(owner)) {
            const [local, snapshots] = await Promise.all([
                encryptedList<LocalPatient>(owner, "patients"),
                encryptedList<LocalPatient>(owner, "patientSnapshots"),
            ]);
            const byId = new Map(local.map((patient) => [patient.id, patient]));
            for (const snapshot of snapshots)
                if (!byId.has(snapshot.id)) byId.set(snapshot.id, snapshot);
            return [...byId.values()];
        }
        return db.transaction(
            "r",
            [db.patients, db.patientSnapshots, db.ownerEncryptionModes],
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const [local, snapshots] = await Promise.all([
                    db.patients
                        .where("owner_user_id")
                        .equals(scopedOwner)
                        .toArray(),
                    db.patientSnapshots
                        .where("owner_user_id")
                        .equals(scopedOwner)
                        .toArray(),
                ]);
                const byId = new Map(
                    local.map((patient) => [patient.id, patient]),
                );
                for (const snapshot of snapshots) {
                    if (!byId.has(snapshot.id)) byId.set(snapshot.id, snapshot);
                }
                return [...byId.values()];
            },
        );
    },
    async save(
        owner: number,
        input: Omit<LocalPatient, "id" | "owner_user_id" | "sync_state"> & {
            id?: string;
        },
    ) {
        requireOwner(owner);
        const id = input.id ?? localUuid();
        if (await encryptedMode(owner)) {
            await encryptedMutate<LocalPatient>(
                owner,
                "patients",
                id,
                (existing) => ({
                    ...input,
                    id,
                    owner_user_id: owner,
                    sync_state: existing?.sync_state ?? "LOCAL_SAVED",
                }),
            );
            return id;
        }
        await db.transaction(
            "rw",
            db.patients,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const existing = await db.patients.get(id);
                if (existing && existing.owner_user_id !== owner)
                    throw new Error("Patient owner mismatch");
                await db.patients.put({
                    ...input,
                    id,
                    owner_user_id: owner,
                    sync_state: existing?.sync_state ?? "LOCAL_SAVED",
                });
            },
        );
        return id;
    },
    async saveServerSnapshot(
        owner: number,
        patient: Pick<LocalPatient, "id" | "name"> & Partial<LocalPatient>,
    ) {
        requireOwner(owner);
        if (await encryptedMode(owner)) {
            await reconcileEncryptedPatient(owner, patient, false);
            return patient.id;
        }
        // A server snapshot updates the owner's existing local representation.
        // Another owner's row with the same UUID remains untouched.
        await db.transaction(
            "rw",
            db.patients,
            db.patientSnapshots,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const local = await db.patients.get(patient.id);
                const canonical = Object.fromEntries(
                    Object.entries(patient).filter(
                        ([, value]) => value !== undefined,
                    ),
                );
                if (local?.owner_user_id === owner) {
                    await db.patients.put({
                        ...local,
                        ...canonical,
                        owner_user_id: owner,
                        sync_state: "SYNCED",
                        last_error: undefined,
                    } as LocalPatient);
                    // Clean up only this owner's older duplicate, if one exists.
                    await db.patientSnapshots.delete([owner, patient.id]);
                } else {
                    const existing = await db.patientSnapshots.get([
                        owner,
                        patient.id,
                    ]);
                    await db.patientSnapshots.put({
                        ...existing,
                        ...canonical,
                        id: patient.id,
                        owner_user_id: owner,
                        sync_state: "SYNCED",
                        last_error: undefined,
                    } as LocalPatient);
                }
            },
        );
        return patient.id;
    },
    async reconcile(
        owner: number,
        canonical: Partial<LocalPatient> & { id: string },
    ) {
        requireOwner(owner);
        if (await encryptedMode(owner)) {
            await reconcileEncryptedPatient(owner, canonical, true);
            return;
        }
        await db.transaction(
            "rw",
            db.patients,
            db.patientSnapshots,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const patient = await db.patients.get(canonical.id);
                const canonicalFields = Object.fromEntries(
                    Object.entries(canonical).filter(
                        ([, value]) => value !== undefined,
                    ),
                );
                if (patient?.owner_user_id === owner) {
                    await db.patients.put({
                        ...patient,
                        ...canonicalFields,
                        owner_user_id: owner,
                        sync_state: "SYNCED",
                        last_error: undefined,
                    });
                    await db.patientSnapshots.delete([owner, canonical.id]);
                    return;
                }
                const snapshot = await db.patientSnapshots.get([
                    owner,
                    canonical.id,
                ]);
                if (!snapshot) throw new Error("Local patient missing");
                await db.patientSnapshots.put({
                    ...snapshot,
                    ...canonicalFields,
                    owner_user_id: owner,
                    sync_state: "SYNCED",
                    last_error: undefined,
                });
            },
        );
    },
};
