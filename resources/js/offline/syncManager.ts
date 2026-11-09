import { captureClinicalAccess, assertClinicalAccess, onClinicalInvalidation } from "./clinicalAccessFence";
import {
    requireOwner,
    type LocalAssessment,
    type LocalEmergency,
    type OutboxItem,
} from "./db";
import { outboxRepository } from "./outboxRepository";
import { jsonRequest, MissingCsrfTokenError } from "./jsonRequest";
import { resolveRelawanContinuity } from "./relawanContinuity";
import { assessmentRepository } from "./assessmentRepository";
import { assessmentSnapshotCurrent } from "./assessmentContract";
import { queueAssessmentSnapshot } from "./assessmentSync";
import { retryAt } from "./syncRetry";

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
    private retryTimer: ReturnType<typeof setTimeout> | undefined;
    private retryGeneration = 0;

    constructor() {
        onClinicalInvalidation(() => this.cancelRetry());
        if (typeof window !== "undefined") {
            window.addEventListener("online", () => {
                void this.sync().catch(() => {});
            });
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible")
                    void this.sync().catch(() => {});
                else this.cancelRetry();
            });
        }
    }
    public setOwner(owner: number) {
        this.cancelRetry();
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
        this.cancelRetry();
        this.owner = null;
        this.syncRequested = false;
        this.notify();
    }
    private cancelRetry() {
        this.retryGeneration++;
        clearTimeout(this.retryTimer);
        this.retryTimer = undefined;
    }
    private async scheduleRetry(owner: number) {
        this.cancelRetry();
        const generation = this.retryGeneration;
        const lease = this.ownerLease;
        if (!(await this.ownerCanSync(owner)) || document.visibilityState !== "visible") return;
        const access = captureClinicalAccess();
        const items = await outboxRepository.list(owner);
        assertClinicalAccess(access);
        if (generation !== this.retryGeneration || this.owner !== owner || this.isSyncing) return;
        // Pending emergencies retain priority over assessment retries.
        const emergencies = items.filter(item => item.type === "EMERGENCY" && retryAt(item) !== null);
        const candidates = emergencies.length ? emergencies : items;
        const times = candidates.map(retryAt).filter((at): at is number => at !== null);
        if (!times.length) return;
        this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined;
            void (async () => {
                if (generation !== this.retryGeneration || lease !== this.ownerLease ||
                    document.visibilityState !== "visible" || !(await this.ownerCanSync(owner))) return;
                assertClinicalAccess(access);
                await this.sync(owner, true);
            })().catch(() => {});
        }, Math.max(0, Math.min(...times) - Date.now()));
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
    public async sync(owner?: number, automatic = false) {
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
        this.cancelRetry();
        const requestedOwner = this.owner;
        const requestedLease = this.ownerLease;
        this.activeRunOwner = requestedOwner;
        // A follow-up pass may see a newer revision, but never retry the same
        // failed revision immediately just because another trigger arrived.
        const attempted = new Set<string>();
        try {
            this.notify();
            await this.withOwnerLock(requestedOwner, async () => {
                if (!(await this.ownerCanSync(requestedOwner)) || this.ownerLease !== requestedLease) return;

                do {
                    this.syncRequested = false;
                    let stopCurrentPass = false;
                    const active = requestedOwner;
                    if (this.owner !== active || this.ownerLease !== requestedLease || !navigator.onLine) break;
                    this.activeRunOwner = active;
                    this.notify();

                    for (const item of await outboxRepository.list(active)) {
                        const access = captureClinicalAccess();
                        if (this.owner !== active || this.ownerLease !== requestedLease || !navigator.onLine) break;
                        if (!item.id) continue;
                        if (automatic && item.status === "FAILED") {
                            const due = retryAt(item);
                            if (due === null) continue;
                            if (due > Date.now()) {
                                if (item.type === "EMERGENCY") break;
                                continue;
                            }
                        }
                        if (item.type === "ASSESSMENT") {
                            const local = await assessmentRepository.get(
                                active,
                                item.entity_id,
                            );
                            if (
                                local &&
                                (!assessmentSnapshotCurrent(
                                    local,
                                    item.assessment_local_revision,
                                ) || (item.payload.base_version ?? null) !== (local.server_version ?? null))
                            ) {
                                await queueAssessmentSnapshot(
                                    active,
                                    item.entity_id,
                                );
                                this.syncRequested = true;
                                continue;
                            }
                        }
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
                        if (this.owner !== active || this.ownerLease !== requestedLease) {
                            await outboxRepository.recover(active, snapshot);
                            break;
                        }
                        const snapshotKey = `${active}:${item.id}:${snapshot.revision}`;
                        if (attempted.has(snapshotKey)) continue;
                        attempted.add(snapshotKey);

                        try {
                            assertClinicalAccess(access);
                            const response = await jsonRequest(
                                item.type === "EMERGENCY"
                                    ? "/relawan/sync/emergencies"
                                    : "/relawan/sync/assessments",
                                snapshot.payload,
                            );
                            assertClinicalAccess(access);
                            if (!response.ok) {
                                await outboxRepository.mark(
                                    active,
                                    snapshot,
                                    "FAILED",
                                    response.status === 409 && item.type === "ASSESSMENT"
                                        ? "Asesmen server telah berubah. Draf lokal tetap disimpan; tinjau konflik sebelum mengirim ulang."
                                        : `HTTP ${response.status}`,
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
                                    realtime_delivered?: boolean | null;
                                };
                                if (canonical.emergency) {
                                    // A successful broadcast call does not verify reception by a person.
                                    canonical.emergency.realtime_status =
                                        canonical.realtime_delivered === false
                                            ? "UNAVAILABLE"
                                            : "UNCONFIRMED";
                                }
                                const completed =
                                    await outboxRepository.complete(
                                        active,
                                        snapshot,
                                        canonical,
                                        () => this.owner === active && this.ownerLease === requestedLease,
                                    );
                                if (!completed && this.owner !== active)
                                    await outboxRepository.recover(
                                        active,
                                        snapshot,
                                    );
                                else if (!completed) this.syncRequested = true;
                            }
                        } catch (error) {
                            const message = "Penerimaan server belum terkonfirmasi. Coba lagi setelah koneksi dan sesi tersedia.";
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
                void this.sync(nextOwner, automatic && !ownerChanged).catch(() => {});
            else if (nextOwner === requestedOwner)
                await this.scheduleRetry(requestedOwner).catch(() => {});
        }
    }
}
export const syncManager = new SyncManager();
