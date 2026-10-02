import {
    db,
    localUuid,
    requireOwner,
    type LocalEmergency,
    type SyncState,
} from "./db";
export const emergencyRepository = {
    async get(owner: number, id: string) {
        requireOwner(owner);
        const record = await db.emergencies.get(id);
        return record?.owner_user_id === owner ? record : undefined;
    },
    async list(owner: number) {
        return db.emergencies
            .where("owner_user_id")
            .equals(requireOwner(owner))
            .toArray();
    },
    async save(
        owner: number,
        input: Partial<LocalEmergency> &
            Pick<LocalEmergency, "red_flag_type" | "status">,
    ) {
        requireOwner(owner);
        const id = input.id ?? localUuid();
        const now = new Date().toISOString();
        await db.transaction("rw", db.emergencies, async () => {
            const existing = await db.emergencies.get(id);
            if (existing && existing.owner_user_id !== owner)
                throw new Error("Emergency owner mismatch");
            await db.emergencies.put({
                ...existing,
                ...input,
                id,
                owner_user_id: owner,
                created_at: existing?.created_at ?? input.created_at ?? now,
                updated_at: now,
                sync_state:
                    input.sync_state ?? existing?.sync_state ?? "LOCAL_SAVED",
            } as LocalEmergency);
        });
        return id;
    },
    async setState(
        owner: number,
        id: string,
        state: SyncState,
        error?: string,
    ) {
        const existing = await this.get(owner, id);
        if (!existing) throw new Error("Emergency unavailable for owner");
        await db.emergencies.put({
            ...existing,
            sync_state: state,
            last_error: error,
            updated_at: new Date().toISOString(),
        });
    },
    async reconcile(
        owner: number,
        canonical: Partial<LocalEmergency> & { id: string },
    ) {
        const existing = await this.get(owner, canonical.id);
        if (!existing) throw new Error("Local emergency missing");
        await db.emergencies.put({
            ...existing,
            ...canonical,
            owner_user_id: owner,
            sync_state: "SYNCED",
            last_error: undefined,
            updated_at: new Date().toISOString(),
        });
    },
};
