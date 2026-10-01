import {
    requireOwner,
    type LocalAssessment,
    type LocalEmergency,
    type OutboxItem,
} from "./db";
import { outboxRepository } from "./outboxRepository";
import { jsonRequest } from "./jsonRequest";

type State = { isSyncing: boolean; pendingCount: number };
class SyncManager {
    private isSyncing = false;
    private syncRequested = false;
    private owner: number | null = null;
    private listeners: Array<(state: State) => void> = [];

    constructor() {
        if (typeof window !== "undefined") {
            window.addEventListener("online", () => {
                void this.sync();
            });
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible") void this.sync();
            });
        }
    }
    public setOwner(owner: number | null) {
        const previous = this.owner;
        this.owner = owner === null ? null : requireOwner(owner);
        if (this.isSyncing && this.owner !== previous && this.owner !== null)
            this.syncRequested = true;
        void this.notify();
    }
    public subscribe(listener: (state: State) => void) {
        this.listeners.push(listener);
        void this.notify();
        return () => {
            this.listeners = this.listeners.filter((item) => item !== listener);
        };
    }
    private async notify() {
        const owner = this.owner;
        const pendingCount = owner ? await outboxRepository.count(owner) : 0;
        if (owner !== this.owner) return;
        for (const listener of this.listeners)
            listener({ isSyncing: this.isSyncing, pendingCount });
    }
    public async queueItem(
        owner: number,
        type: OutboxItem["type"],
        entityId: string,
        payload: Record<string, unknown>,
    ) {
        this.setOwner(owner);
        await outboxRepository.enqueue(owner, type, entityId, payload);
        await this.notify();
        void this.sync();
    }
    public async sync(owner?: number) {
        if (owner !== undefined) this.setOwner(owner);
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
        // A follow-up pass may see a newer revision, but never retry the same
        // failed revision immediately just because another trigger arrived.
        const attempted = new Set<string>();
        try {
            await this.notify();
            do {
                this.syncRequested = false;
                const active: number | null = this.owner;
                if (!active || !navigator.onLine) break;

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
                    await this.notify();
                }
            } while (this.syncRequested);
        } finally {
            this.isSyncing = false;
            await this.notify();
        }
    }
}
export const syncManager = new SyncManager();
