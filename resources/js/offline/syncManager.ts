import {
    requireOwner,
    type LocalAssessment,
    type LocalEmergency,
    type OutboxItem,
} from "./db";
import { outboxRepository } from "./outboxRepository";
import { jsonRequest } from "./jsonRequest";

export type SyncExecutionState = { owner: number | null; isSyncing: boolean };
class SyncManager {
    private isSyncing = false;
    private syncRequested = false;
    private owner: number | null = null;
    private activeRunOwner: number | null = null;
    private ownerLease = 0;
    private listeners = new Set<(state: SyncExecutionState) => void>();

    constructor() {
        if (typeof window !== "undefined") {
            window.addEventListener("online", () => {
                void this.sync().catch(() => {});
            });
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible")
                    void this.sync().catch(() => {});
            });
        }
    }
    public setOwner(owner: number) {
        const previous = this.owner;
        this.owner = requireOwner(owner);
        const lease = ++this.ownerLease;
        if (this.isSyncing && this.owner !== previous)
            this.syncRequested = true;
        this.notify();
        return lease;
    }
    public clearOwner(lease: number) {
        if (lease !== this.ownerLease) return;
        this.owner = null;
        this.syncRequested = false;
        this.notify();
    }
    public subscribe(listener: (state: SyncExecutionState) => void) {
        this.listeners.add(listener);
        listener(this.state());
        return () => this.listeners.delete(listener);
    }
    private state(): SyncExecutionState {
        return { owner: this.owner, isSyncing: this.isSyncing && this.activeRunOwner === this.owner };
    }
    private notify() {
        for (const listener of this.listeners) listener(this.state());
    }
    public async queueItem(
        owner: number,
        type: OutboxItem["type"],
        entityId: string,
        payload: Record<string, unknown>,
    ) {
        requireOwner(owner);
        if (this.owner !== null && this.owner !== owner)
            throw new Error("Another Relawan owns the active synchronization session");
        await outboxRepository.enqueue(owner, type, entityId, payload);
        if (this.owner === owner) void this.sync(owner).catch(() => {});
    }
    public async sync(owner?: number) {
        if (owner !== undefined && requireOwner(owner) !== this.owner) return;
        if (!this.owner) return;
        if (this.isSyncing) {
            this.syncRequested = true;
            return;
        }
        if (
            !this.owner ||
            typeof navigator === "undefined" ||
            !navigator.onLine
        )
            return;

        this.isSyncing = true;
        this.activeRunOwner = this.owner;
        // A follow-up pass may see a newer revision, but never retry the same
        // failed revision immediately just because another trigger arrived.
        const attempted = new Set<string>();
        try {
            this.notify();
            do {
                this.syncRequested = false;
                const active: number | null = this.owner;
                if (!active || !navigator.onLine) break;
                this.activeRunOwner = active;
                this.notify();

                for (const item of await outboxRepository.list(active)) {
                    if (this.owner !== active || !navigator.onLine) break;
                    if (!item.id) continue;
                    if (
                        item.status === "FAILED" &&
                        item.last_http_status !== undefined &&
                        !(
                            [401, 408, 419, 429].includes(item.last_http_status) ||
                            item.last_http_status >= 500
                        )
                    )
                        continue;

                    if (item.status === "SYNCING")
                        await outboxRepository.recover(active, item);
                    const current = await outboxRepository.get(active, item.id);
                    if (!current || this.owner !== active) break;
                    const attemptKey = `${active}:${item.id}:${current.revision}`;
                    if (attempted.has(attemptKey)) continue;

                    await outboxRepository.mark(active, current, "SYNCING");
                    const snapshot = await outboxRepository.get(active, item.id);
                    if (!snapshot) continue;
                    if (this.owner !== active) {
                        await outboxRepository.recover(active, snapshot);
                        break;
                    }
                    const snapshotKey = `${active}:${item.id}:${snapshot.revision}`;
                    if (attempted.has(snapshotKey)) continue;
                    attempted.add(snapshotKey);

                    try {
                        const response = await jsonRequest(
                            item.type === "EMERGENCY"
                                ? "/relawan/sync/emergencies"
                                : "/relawan/sync/assessments",
                            snapshot.payload,
                        );
                        if (!response.ok) {
                            await outboxRepository.mark(
                                active,
                                snapshot,
                                "FAILED",
                                `HTTP ${response.status}`,
                                response.status,
                            );
                        } else {
                            const canonical = (await response.json()) as {
                                assessment?: Partial<LocalAssessment> & { id: string };
                                emergency?: Partial<LocalEmergency> & { id: string };
                            };
                            const completed = await outboxRepository.complete(
                                active,
                                snapshot,
                                canonical,
                                () => this.owner === active,
                            );
                            if (!completed && this.owner !== active)
                                await outboxRepository.recover(active, snapshot);
                        }
                    } catch (error) {
                        const message =
                            error instanceof Error ? error.message : "Sync failed";
                        const latest = await outboxRepository.get(active, item.id);
                        if (
                            latest &&
                            latest.owner_user_id === active &&
                            latest.revision === snapshot.revision
                        ) {
                            await outboxRepository.mark(
                                active,
                                latest,
                                "FAILED",
                                message,
                            );
                        }
                    }
                }
            } while (this.syncRequested);
        } finally {
            this.isSyncing = false;
            this.activeRunOwner = null;
            this.notify();
        }
    }
}
export const syncManager = new SyncManager();
