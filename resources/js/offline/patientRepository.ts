import { db, localUuid, requireOwner, type LocalPatient } from "./db";
export const patientRepository = {
    async get(owner: number, id: string) {
        requireOwner(owner);
        const patient = await db.patients.get(id);
        if (patient?.owner_user_id === owner) return patient;
        return db.patientSnapshots.get([owner, id]);
    },
    async list(owner: number) {
        const scopedOwner = requireOwner(owner);
        const [local, snapshots] = await Promise.all([
            db.patients.where("owner_user_id").equals(scopedOwner).toArray(),
            db.patientSnapshots.where("owner_user_id").equals(scopedOwner).toArray(),
        ]);
        const byId = new Map(local.map((patient) => [patient.id, patient]));
        for (const snapshot of snapshots) {
            if (!byId.has(snapshot.id)) byId.set(snapshot.id, snapshot);
        }
        return [...byId.values()];
    },
    async save(
        owner: number,
        input: Omit<LocalPatient, "id" | "owner_user_id" | "sync_state"> & {
            id?: string;
        },
    ) {
        requireOwner(owner);
        const id = input.id ?? localUuid();
        await db.transaction("rw", db.patients, async () => {
            const existing = await db.patients.get(id);
            if (existing && existing.owner_user_id !== owner)
                throw new Error("Patient owner mismatch");
            await db.patients.put({
                ...input,
                id,
                owner_user_id: owner,
                sync_state: existing?.sync_state ?? "LOCAL_SAVED",
            });
        });
        return id;
    },
    async saveServerSnapshot(owner: number, patient: Pick<LocalPatient, "id" | "name"> & Partial<LocalPatient>) {
        requireOwner(owner);
        // A server snapshot updates the owner's existing local representation.
        // Another owner's row with the same UUID remains untouched.
        await db.transaction("rw", db.patients, db.patientSnapshots, async () => {
            const local = await db.patients.get(patient.id);
            const canonical = Object.fromEntries(
                Object.entries(patient).filter(([, value]) => value !== undefined),
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
                const existing = await db.patientSnapshots.get([owner, patient.id]);
                await db.patientSnapshots.put({
                    ...existing,
                    ...canonical,
                    id: patient.id,
                    owner_user_id: owner,
                    sync_state: "SYNCED",
                    last_error: undefined,
                } as LocalPatient);
            }
        });
        return patient.id;
    },
    async reconcile(owner: number, canonical: Partial<LocalPatient> & { id: string }) {
        requireOwner(owner);
        const patient = await db.patients.get(canonical.id);
        const canonicalFields = Object.fromEntries(
            Object.entries(canonical).filter(([, value]) => value !== undefined),
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
        const snapshot = await db.patientSnapshots.get([owner, canonical.id]);
        if (!snapshot) throw new Error("Local patient missing");
        await db.patientSnapshots.put({
            ...snapshot,
            ...canonicalFields,
            owner_user_id: owner,
            sync_state: "SYNCED",
            last_error: undefined,
        });
    },
};
