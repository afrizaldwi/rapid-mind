import {
    db,
    localUuid,
    requireOwner,
    type LocalAssessment,
    type SyncState,
} from "./db";
export const assessmentRepository = {
    async get(owner: number, id: string) {
        requireOwner(owner);
        const record = await db.assessments.get(id);
        return record?.owner_user_id === owner ? record : undefined;
    },
    async list(owner: number) {
        return db.assessments
            .where("owner_user_id")
            .equals(requireOwner(owner))
            .toArray();
    },
    async save(
        owner: number,
        input: Partial<LocalAssessment> &
            Pick<LocalAssessment, "patient_id" | "mode" | "status">,
    ) {
        requireOwner(owner);
        const id = input.id ?? localUuid();
        await db.transaction("rw", db.assessments, async () => {
            const existing = await db.assessments.get(id);
            if (existing && existing.owner_user_id !== owner)
                throw new Error("Assessment owner mismatch");
            await db.assessments.put({
                ...existing,
                ...input,
                id,
                owner_user_id: owner,
                sync_state:
                    input.sync_state ?? existing?.sync_state ?? "LOCAL_SAVED",
                updated_at: new Date().toISOString(),
            } as LocalAssessment);
        });
        return id;
    },
    async update(owner: number, id: string, patch: Partial<LocalAssessment>) {
        const existing = await this.get(owner, id);
        if (!existing) throw new Error("Assessment unavailable for owner");
        await db.assessments.put({
            ...existing,
            ...patch,
            id,
            owner_user_id: owner,
            updated_at: new Date().toISOString(),
        });
    },
    async replace(owner: number, record: LocalAssessment) {
        const existing = await this.get(owner, record.id);
        if (!existing) throw new Error("Assessment unavailable for owner");
        await db.assessments.put({
            ...record,
            owner_user_id: owner,
            updated_at: new Date().toISOString(),
        });
    },
    async remove(owner: number, id: string) {
        const existing = await this.get(owner, id);
        if (existing) await db.assessments.delete(id);
    },
    async setState(
        owner: number,
        id: string,
        state: SyncState,
        error?: string,
    ) {
        await this.update(owner, id, { sync_state: state, last_error: error });
    },
    async reconcile(
        owner: number,
        canonical: Partial<LocalAssessment> & { id: string },
    ) {
        await this.update(owner, canonical.id, {
            ...canonical,
            sync_state: "SYNCED",
            last_error: undefined,
        });
    },
};
