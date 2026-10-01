import {
    db,
    requireOwner,
    type LocalAssessment,
    type LocalEmergency,
    type LocalPatient,
    type OutboxItem,
} from "./db";
import { assessmentRepository } from "./assessmentRepository";
import { emergencyRepository } from "./emergencyRepository";
import { patientRepository } from "./patientRepository";

export const outboxRepository = {
    async list(owner: number) {
        const items = await db.outbox
            .where("owner_user_id")
            .equals(requireOwner(owner))
            .toArray();
        return items
            .filter(
                (item) =>
                    item.type === "EMERGENCY" || item.type === "ASSESSMENT",
            )
            .sort(
                (a, b) =>
                    a.priority - b.priority ||
                    a.created_at.localeCompare(b.created_at) ||
                    (a.id ?? 0) - (b.id ?? 0),
            );
    },
    async count(owner: number) {
        return (await this.list(owner)).length;
    },
    async enqueue(
        owner: number,
        type: OutboxItem["type"],
        entityId: string,
        payload: Record<string, unknown>,
    ) {
        requireOwner(owner);
        const entity =
            type === "ASSESSMENT"
                ? await assessmentRepository.get(owner, entityId)
                : await emergencyRepository.get(owner, entityId);
        if (!entity) throw new Error("Local entity unavailable for owner");
        const now = new Date().toISOString();
        await db.transaction(
            "rw",
            db.outbox,
            db.assessments,
            db.emergencies,
            async () => {
                const existing = (
                    await db.outbox
                        .where("[owner_user_id+type+entity_id]")
                        .equals([owner, type, entityId])
                        .toArray()
                ).find(
                    (item) =>
                        item.status === "PENDING" ||
                        item.status === "SYNCING" ||
                        item.status === "FAILED",
                );
                if (existing) {
                    await db.outbox.update(existing.id!, {
                        payload,
                        status: "PENDING",
                        last_error: undefined,
                        last_http_status: undefined,
                        revision: (existing.revision ?? 0) + 1,
                        updated_at: now,
                    });
                } else {
                    await db.outbox.add({
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
                    });
                }
                if (type === "ASSESSMENT")
                    await db.assessments.update(entityId, {
                        sync_state: "PENDING_SYNC",
                        last_error: undefined,
                    });
                else
                    await db.emergencies.update(entityId, {
                        sync_state: "PENDING_SYNC",
                        last_error: undefined,
                    });
            },
        );
    },
    async recover(owner: number, item: OutboxItem) {
        requireOwner(owner);
        await db.transaction("rw", db.outbox, db.assessments, db.emergencies, async () => {
            const current = item.id ? await db.outbox.get(item.id) : undefined;
            if (
                current?.owner_user_id !== owner ||
                current?.revision !== item.revision ||
                current?.status !== "SYNCING"
            ) return;
            await db.outbox.update(item.id!, { status: "PENDING" });
            const table = item.type === "ASSESSMENT" ? db.assessments : db.emergencies;
            const entity = await table.get(item.entity_id);
            if (entity?.owner_user_id === owner)
                await table.update(item.entity_id, { sync_state: "PENDING_SYNC" });
        });
    },
    async get(owner: number, id: number) {
        requireOwner(owner);
        const item = await db.outbox.get(id);
        return item?.owner_user_id === owner ? item : undefined;
    },
    async complete(
        owner: number,
        item: OutboxItem,
        canonical: {
            assessment?: Partial<LocalAssessment> & { id: string };
            emergency?: Partial<LocalEmergency> & { id: string };
        },
        stillActive: () => boolean,
    ) {
        requireOwner(owner);
        return db.transaction(
            "rw",
            db.outbox,
            db.assessments,
            db.emergencies,
            db.patients,
            db.patientSnapshots,
            async () => {
                const latest = await this.get(owner, item.id!);
                if (!latest) throw new Error("Outbox owner changed");
                if (!stillActive() || latest.revision !== item.revision)
                    return false;
                if (item.type === "ASSESSMENT") {
                    if (
                        !canonical.assessment ||
                        canonical.assessment.id !== item.entity_id
                    )
                        throw new Error("Invalid assessment response");
                    const local = await assessmentRepository.get(
                        owner,
                        item.entity_id,
                    );
                    if (!local) throw new Error("Local assessment missing");
                    const server = canonical.assessment as Record<
                        string,
                        unknown
                    >;
                    const patient = server.patient as
                        | Record<string, unknown>
                        | undefined;
                    if (patient && typeof patient.id === "string") {
                        if (await patientRepository.get(owner, patient.id)) {
                            await patientRepository.reconcile(
                                owner,
                                patient as Partial<LocalPatient> & { id: string },
                            );
                        }
                    }
                    await db.assessments.put({
                        ...local,
                        ...server,
                        patient_id: patient?.id ?? local.patient_id,
                        owner_user_id: owner,
                        sync_state: "SYNCED",
                        last_error: undefined,
                    } as LocalAssessment);
                } else {
                    if (
                        !canonical.emergency ||
                        canonical.emergency.id !== item.entity_id
                    )
                        throw new Error("Invalid emergency response");
                    const local = await emergencyRepository.get(
                        owner,
                        item.entity_id,
                    );
                    if (!local) throw new Error("Local emergency missing");
                    await db.emergencies.put({
                        ...local,
                        ...canonical.emergency,
                        owner_user_id: owner,
                        sync_state: "SYNCED",
                        last_error: undefined,
                    });
                    const patient = (
                        canonical.emergency as Record<string, unknown>
                    ).patient as Record<string, unknown> | undefined;
                    if (patient && typeof patient.id === "string") {
                        if (await patientRepository.get(owner, patient.id)) {
                            await patientRepository.reconcile(
                                owner,
                                patient as Partial<LocalPatient> & { id: string },
                            );
                        }
                    }
                }
                await db.outbox.delete(item.id!);
                return true;
            },
        );
    },
    async mark(
        owner: number,
        item: OutboxItem,
        status: OutboxItem["status"],
        error?: string,
        httpStatus?: number,
    ) {
        requireOwner(owner);
        const current = item.id ? await db.outbox.get(item.id) : undefined;
        if (
            !current ||
            current.owner_user_id !== owner ||
            current.revision !== item.revision
        )
            return;
        await db.outbox.update(item.id!, {
            status,
            last_error: error,
            last_http_status: httpStatus,
            retry_count:
                status === "FAILED"
                    ? current.retry_count + 1
                    : current.retry_count,
            updated_at: new Date().toISOString(),
        });
        if (item.type === "ASSESSMENT")
            await assessmentRepository.setState(
                owner,
                item.entity_id,
                status === "SYNCING" ? "SYNCING" : "SYNC_FAILED",
                error,
            );
        else
            await emergencyRepository.setState(
                owner,
                item.entity_id,
                status === "SYNCING" ? "SYNCING" : "SYNC_FAILED",
                error,
            );
    },
};
