import { db, localUuid, requireOwner, type LocalPatient } from "./db";
export const patientRepository = {
    async get(owner: number, id: string) {
        requireOwner(owner);
        const patient = await db.patients.get(id);
        return patient?.owner_user_id === owner ? patient : undefined;
    },
    async list(owner: number) {
        return db.patients
            .where("owner_user_id")
            .equals(requireOwner(owner))
            .toArray();
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
    async reconcile(
        owner: number,
        canonical: Partial<LocalPatient> & { id: string },
    ) {
        const existing = await this.get(owner, canonical.id);
        if (!existing) throw new Error("Local patient missing");
        await db.patients.put({
            ...existing,
            ...canonical,
            owner_user_id: owner,
            sync_state: "SYNCED",
            last_error: undefined,
        });
    },
};
