import {
    requireOwner,
    type LocalAssessment,
    type LocalEmergency,
    type OutboxItem,
} from "./db";
import { outboxRepository } from "./outboxRepository";
import { jsonRequest, MissingCsrfTokenError } from "./jsonRequest";
import { resolveRelawanContinuity } from "./relawanContinuity";

export type SyncSessionState =
    | "READY"
    | "REAUTHENTICATION_REQUIRED"
    | "RECOVERING_SESSION";
export type SyncExecutionState = {
    owner: number | null;
    isSyncing: boolean;
    sessionState: SyncSessionState;
};

type BrowserLockManager = {
    request<T>(
        name: string,
        options: { mode: "exclusive" },
        callback: () => Promise<T>,
    ): Promise<T>;
};

class SyncManager {
    private isSyncing = false;
    private syncRequested = false;
    private owner: number | null = null;
    private activeRunOwner: number | null = null;
    private ownerLease = 0;
    private sessionState: SyncSessionState = "READY";
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
        if (previous !== this.owner) this.sessionState = "READY";
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
        return {
            owner: this.owner,
            isSyncing: this.isSyncing && this.activeRunOwner === this.owner,
            sessionState: this.sessionState,
        };
    }
    private notify() {
        for (const listener of this.listeners) listener(this.state());
    }
    private browserLockManager(): BrowserLockManager | null {
        if (typeof navigator === "undefined") return null;
        const locks = (
            navigator as Navigator & {
                locks?: BrowserLockManager;
            }
        ).locks;
        return locks && typeof locks.request === "function" ? locks : null;
    }
    private async withOwnerLock<T>(
        owner: number,
        callback: () => Promise<T>,
    ): Promise<T> {
        const locks = this.browserLockManager();
        if (!locks) return callback();
        return locks.request(
            `rapid-mind:relawan-sync:${owner}`,
            { mode: "exclusive" },
            callback,
        );
    }
    private async ownerCanSync(owner: number): Promise<boolean> {
        if (
            this.owner !== owner ||
            this.sessionState !== "READY" ||
            typeof navigator === "undefined" ||
            !navigator.onLine
        )
            return false;
        const continuity = await resolveRelawanContinuity();
        return (
            this.owner === owner &&
            this.sessionState === "READY" &&
            navigator.onLine &&
            continuity.state === "ELIGIBLE" &&
            continuity.context.owner_user_id === owner
        );
    }
    public async queueItem(
        owner: number,
        type: OutboxItem["type"],
        entityId: string,
        payload: Record<string, unknown>,
    ) {
        requireOwner(owner);
        if (this.owner !== null && this.owner !== owner)
            throw new Error(
                "Another Relawan owns the active synchronization session",
            );
        await outboxRepository.enqueue(owner, type, entityId, payload);
        if (this.owner === owner) void this.sync(owner).catch(() => {});
    }
    public async sync(owner?: number) {
        if (owner !== undefined && requireOwner(owner) !== this.owner) return;
        if (!this.owner) return;
        if (this.sessionState !== "READY") return;
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
        const requestedOwner = this.owner;
        this.activeRunOwner = requestedOwner;
        // A follow-up pass may see a newer revision, but never retry the same
        // failed revision immediately just because another trigger arrived.
        const attempted = new Set<string>();
        try {
            this.notify();
            await this.withOwnerLock(requestedOwner, async () => {
                if (!(await this.ownerCanSync(requestedOwner))) return;

                do {
                    this.syncRequested = false;
                    let stopCurrentPass = false;
                    const active = requestedOwner;
                    if (this.owner !== active || !navigator.onLine) break;
                    this.activeRunOwner = active;
                    this.notify();

                    for (const item of await outboxRepository.list(active)) {
                        if (this.owner !== active || !navigator.onLine) break;
                        if (!item.id) continue;
                        if (
                            item.status === "FAILED" &&
                            item.last_http_status !== undefined &&
                            !(
                                [401, 408, 419, 429].includes(
                                    item.last_http_status,
                                ) || item.last_http_status >= 500
                            )
                        )
                            continue;

                        if (item.status === "SYNCING")
                            await outboxRepository.recover(active, item);
                        const current = await outboxRepository.get(
                            active,
                            item.id,
                        );
                        if (!current || this.owner !== active) break;
                        const attemptKey = `${active}:${item.id}:${current.revision}`;
                        if (attempted.has(attemptKey)) continue;

                        await outboxRepository.mark(active, current, "SYNCING");
                        const snapshot = await outboxRepository.get(
                            active,
                            item.id,
                        );
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
                                const retryable =
                                    [401, 408, 419, 429].includes(
                                        response.status,
                                    ) || response.status >= 500;
                                if (
                                    response.status === 401 &&
                                    this.owner === active
                                ) {
                                    this.sessionState =
                                        "REAUTHENTICATION_REQUIRED";
                                    this.syncRequested = false;
                                    this.notify();
                                    stopCurrentPass = true;
                                } else if (
                                    response.status === 419 &&
                                    this.owner === active
                                ) {
                                    this.sessionState = "RECOVERING_SESSION";
                                    this.syncRequested = false;
                                    this.notify();
                                    stopCurrentPass = true;
                                    window.setTimeout(() => {
                                        if (this.owner === active)
                                            window.location.assign(
                                                "/relawan/data",
                                            );
                                    }, 0);
                                } else if (
                                    item.type === "EMERGENCY" &&
                                    retryable
                                ) {
                                    stopCurrentPass = true;
                                }
                            } else {
                                const canonical = (await response.json()) as {
                                    assessment?: Partial<LocalAssessment> & {
                                        id: string;
                                    };
                                    emergency?: Partial<LocalEmergency> & {
                                        id: string;
                                    };
                                };
                                const completed =
                                    await outboxRepository.complete(
                                        active,
                                        snapshot,
                                        canonical,
                                        () => this.owner === active,
                                    );
                                if (!completed && this.owner !== active)
                                    await outboxRepository.recover(
                                        active,
                                        snapshot,
                                    );
                            }
                        } catch (error) {
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : "Sync failed";
                            const latest = await outboxRepository.get(
                                active,
                                item.id,
                            );
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
                            if (
                                error instanceof MissingCsrfTokenError &&
                                this.owner === active
                            ) {
                                this.sessionState = "RECOVERING_SESSION";
                                this.syncRequested = false;
                                this.notify();
                                stopCurrentPass = true;
                                window.setTimeout(() => {
                                    if (this.owner === active)
                                        window.location.assign("/relawan/data");
                                }, 0);
                            } else if (item.type === "EMERGENCY") {
                                stopCurrentPass = true;
                            }
                        }
                        if (stopCurrentPass) break;
                    }
                    if (stopCurrentPass) {
                        this.syncRequested = false;
                        break;
                    }
                } while (this.syncRequested && this.owner === requestedOwner);
            });
        } finally {
            const nextOwner = this.owner;
            const followUpRequested = this.syncRequested;
            const ownerChanged =
                nextOwner !== null && nextOwner !== requestedOwner;
            this.isSyncing = false;
            this.activeRunOwner = null;
            this.syncRequested = false;
            this.notify();
            if (
                nextOwner !== null &&
                (ownerChanged || followUpRequested) &&
                this.sessionState === "READY" &&
                typeof navigator !== "undefined" &&
                navigator.onLine
            )
                void this.sync(nextOwner).catch(() => {});
        }
    }
}
export const syncManager = new SyncManager();
