import {
    db,
    localUuid,
    requireOwner,
    type LocalAssessment,
    type SyncState,
} from "./db";
import {
    assertStorageMode,
    encryptedDelete,
    encryptedGet,
    encryptedList,
    encryptedMode,
    encryptedMutate,
} from "./encryptedClinicalStorage";
import { assessmentMutation, normalizeAssessment } from "./assessmentContract";
import { hydrateCompletedAssessment } from "./assessmentHydration";
export const assessmentRepository = {
    async get(owner: number, id: string) {
        requireOwner(owner);
        if (await encryptedMode(owner)) {
            const record = await encryptedGet<LocalAssessment>(
                owner,
                "assessments",
                id,
            );
            return record ? normalizeAssessment(record) : undefined;
        }
        return db.transaction(
            "r",
            db.assessments,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const record = await db.assessments.get(id);
                return record?.owner_user_id === owner
                    ? normalizeAssessment(record)
                    : undefined;
            },
        );
    },
    async list(owner: number) {
        if (await encryptedMode(owner))
            return (
                await encryptedList<LocalAssessment>(owner, "assessments")
            ).map(normalizeAssessment);
        return db.transaction(
            "r",
            db.assessments,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                return db.assessments
                    .where("owner_user_id")
                    .equals(requireOwner(owner))
                    .toArray()
                    .then((records) => records.map(normalizeAssessment));
            },
        );
    },
    async save(
        owner: number,
        input: Partial<LocalAssessment> &
            Pick<LocalAssessment, "patient_id" | "mode" | "status">,
        onlyIfMissing = false,
    ) {
        requireOwner(owner);
        const id = input.id ?? localUuid();
        if (await encryptedMode(owner)) {
            await encryptedMutate<LocalAssessment>(
                owner,
                "assessments",
                id,
                (existing) => {
                    if (existing && existing.owner_user_id !== owner)
                        throw new Error("Assessment owner mismatch");
                    return existing && onlyIfMissing
                        ? existing
                        : assessmentMutation(existing, input, owner, id);
                },
            );
            return id;
        }
        await db.transaction(
            "rw",
            db.assessments,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const existing = await db.assessments.get(id);
                if (existing && existing.owner_user_id !== owner)
                    throw new Error("Assessment owner mismatch");
                if (existing && onlyIfMissing) return;
                await db.assessments.put(
                    assessmentMutation(existing, input, owner, id),
                );
            },
        );
        return id;
    },
    async update(
        owner: number,
        id: string,
        patch:
            | Partial<LocalAssessment>
            | ((current: LocalAssessment) => Partial<LocalAssessment>),
    ) {
        if (await encryptedMode(owner)) {
            await encryptedMutate<LocalAssessment>(
                owner,
                "assessments",
                id,
                (existing) => {
                    if (!existing)
                        throw new Error("Assessment unavailable for owner");
                    return assessmentMutation(
                        existing,
                        typeof patch === "function"
                            ? patch(normalizeAssessment(existing))
                            : patch,
                        owner,
                        id,
                    );
                },
            );
            return;
        }
        requireOwner(owner);
        await db.transaction(
            "rw",
            db.assessments,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const existing = await db.assessments.get(id);
                if (!existing || existing.owner_user_id !== owner)
                    throw new Error("Assessment unavailable for owner");
                await db.assessments.put(
                    assessmentMutation(
                        existing,
                        typeof patch === "function"
                            ? patch(normalizeAssessment(existing))
                            : patch,
                        owner,
                        id,
                    ),
                );
            },
        );
    },
    async hydrateCompleted(
        owner: number,
        id: string,
        server: Partial<LocalAssessment>,
        expectedRevision: number,
    ) {
        requireOwner(owner);
        const hydrate = (current: LocalAssessment | undefined) => {
            if (!current || current.owner_user_id !== owner)
                throw new Error("Assessment unavailable for owner");
            return hydrateCompletedAssessment(
                current,
                server,
                expectedRevision,
            );
        };
        if (await encryptedMode(owner)) {
            await encryptedMutate<LocalAssessment>(
                owner,
                "assessments",
                id,
                hydrate,
            );
            return;
        }
        await db.transaction(
            "rw",
            db.assessments,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                await db.assessments.put(hydrate(await db.assessments.get(id)));
            },
        );
    },
    async replace(owner: number, record: LocalAssessment) {
        const existing = await this.get(owner, record.id);
        if (!existing) throw new Error("Assessment unavailable for owner");
        if (await encryptedMode(owner)) {
            await encryptedMutate<LocalAssessment>(
                owner,
                "assessments",
                record.id,
                (current) => {
                    if (JSON.stringify(current) !== JSON.stringify(existing))
                        throw new Error(
                            "Assessment changed while replacing draft",
                        );
                    return assessmentMutation(
                        current,
                        record,
                        owner,
                        record.id,
                    );
                },
            );
            return;
        }
        await db.transaction(
            "rw",
            db.assessments,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                const current = await db.assessments.get(record.id);
                if (
                    JSON.stringify(
                        current ? normalizeAssessment(current) : current,
                    ) !== JSON.stringify(existing)
                )
                    throw new Error("Assessment changed while replacing draft");
                await db.assessments.put({
                    ...assessmentMutation(existing, record, owner, record.id),
                });
            },
        );
    },
    async remove(owner: number, id: string) {
        const existing = await this.get(owner, id);
        if (!existing) return;
        if (await encryptedMode(owner))
            return encryptedDelete(owner, "assessments", id, existing);
        await db.transaction(
            "rw",
            db.assessments,
            db.ownerEncryptionModes,
            async () => {
                await assertStorageMode(owner, "LEGACY");
                await db.assessments.delete(id);
            },
        );
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
        expectedLocalRevision: number,
    ) {
        await this.update(owner, canonical.id, (current) => {
            if ((current.local_revision ?? 0) !== expectedLocalRevision)
                throw new Error("Respons asesmen sudah usang.");
            return {
                ...canonical,
                sync_state: "SYNCED",
                last_error: undefined,
            };
        });
    },
};
