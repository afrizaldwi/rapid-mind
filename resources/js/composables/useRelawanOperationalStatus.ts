import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { liveQuery, type Subscription } from "dexie";
import { assessmentRepository } from "@/offline/assessmentRepository";
import { outboxRepository } from "@/offline/outboxRepository";
import { localPersistenceHealth } from "@/offline/localPersistenceHealth";
import { syncManager, type SyncExecutionState } from "@/offline/syncManager";
import type { OutboxItem } from "@/offline/db";

type LocalCounts = {
    items: OutboxItem[];
    unfinishedCount: number;
    unqueuedCompletedCount: number;
};
export type OperationalKind =
    | "local-failure"
    | "unavailable"
    | "syncing"
    | "offline"
    | "failed"
    | "pending"
    | "unqueued"
    | "local-only"
    | "synced";

export function useRelawanOperationalStatus(owner: Ref<number | null>) {
    const online = ref(
        typeof navigator === "undefined" ? true : navigator.onLine,
    );
    const localFailure = ref(false);
    const ready = ref(false);
    const counts = ref<LocalCounts>({
        items: [],
        unfinishedCount: 0,
        unqueuedCompletedCount: 0,
    });
    const execution = ref<SyncExecutionState>({
        owner: null,
        isSyncing: false,
    });
    const actionError = ref("");
    let localSubscription: Subscription | undefined;
    let stopFailure: (() => void) | undefined;
    let lease: number | undefined;
    let generation = 0;

    const stopSync = syncManager.subscribe((state) => {
        execution.value = state;
    });
    function release() {
        generation++;
        localSubscription?.unsubscribe();
        localSubscription = undefined;
        stopFailure?.();
        stopFailure = undefined;
        if (lease !== undefined) syncManager.clearOwner(lease);
        lease = undefined;
    }
    function activate(next: number | null) {
        release();
        ready.value = false;
        localFailure.value = false;
        counts.value = {
            items: [],
            unfinishedCount: 0,
            unqueuedCompletedCount: 0,
        };
        actionError.value = "";
        if (!next) return;
        const currentGeneration = generation;
        lease = syncManager.setOwner(next);
        stopFailure = localPersistenceHealth.subscribe(next, (failed) => {
            if (currentGeneration === generation) localFailure.value = failed;
        });
        localSubscription = liveQuery(async (): Promise<LocalCounts> => {
            const [items, assessments] = await Promise.all([
                outboxRepository.list(next),
                assessmentRepository.list(next),
            ]);
            const queued = new Set(
                items
                    .filter((item) => item.type === "ASSESSMENT")
                    .map((item) => item.entity_id),
            );
            return {
                items,
                unfinishedCount: assessments.filter(
                    (item) => item.status === "IN_PROGRESS",
                ).length,
                unqueuedCompletedCount: assessments.filter(
                    (item) =>
                        item.status === "COMPLETED" &&
                        item.sync_state !== "SYNCED" &&
                        !queued.has(item.id),
                ).length,
            };
        }).subscribe({
            next: (value) => {
                if (currentGeneration !== generation) return;
                counts.value = value;
                ready.value = true;
            },
            error: () => {
                if (currentGeneration !== generation) return;
                ready.value = false;
            },
        });
        if (online.value) void syncManager.sync(next).catch(() => {});
    }

    const pendingCount = computed(() => counts.value.items.length);
    const failedCount = computed(
        () =>
            counts.value.items.filter((item) => item.status === "FAILED")
                .length,
    );
    const retryableCount = computed(
        () =>
            counts.value.items.filter(
                (item) =>
                    item.status !== "FAILED" ||
                    item.last_http_status === undefined ||
                    [401, 408, 419, 429].includes(item.last_http_status) ||
                    item.last_http_status >= 500,
            ).length,
    );
    const isSyncing = computed(
        () =>
            execution.value.owner === owner.value && execution.value.isSyncing,
    );
    const kind = computed<OperationalKind>(() => {
        if (localFailure.value) return "local-failure";
        if (!ready.value) return "unavailable";
        if (isSyncing.value) return "syncing";
        if (!online.value) return "offline";
        if (failedCount.value > 0) return "failed";
        if (pendingCount.value > 0) return "pending";
        if (counts.value.unqueuedCompletedCount > 0) return "unqueued";
        if (counts.value.unfinishedCount > 0) return "local-only";
        return "synced";
    });
    const label = computed(() => {
        switch (kind.value) {
            case "local-failure":
                return "Data belum tersimpan di perangkat";
            case "unavailable":
                return "Status data belum tersedia";
            case "syncing":
                return pendingCount.value > 0
                    ? `Menyinkronkan ${pendingCount.value} data…`
                    : "Menyinkronkan…";
            case "offline":
                return pendingCount.value > 0
                    ? `Offline • ${pendingCount.value} data tersimpan`
                    : counts.value.unfinishedCount > 0
                      ? "Offline • pekerjaan tersimpan"
                      : "Offline";
            case "failed":
                return "Sinkronisasi belum berhasil";
            case "pending":
                return `${pendingCount.value} data menunggu sinkronisasi`;
            case "unqueued":
                return "Data belum siap disinkronkan";
            case "local-only":
                return "Pekerjaan tersimpan di perangkat";
            default:
                return "Tersinkron";
        }
    });
    const canRetry = computed(
        () =>
            !!owner.value &&
            ready.value &&
            online.value &&
            !isSyncing.value &&
            retryableCount.value > 0,
    );
    async function retry() {
        actionError.value = "";
        if (!owner.value || !canRetry.value) return;
        try {
            await syncManager.sync(owner.value);
        } catch {
            actionError.value =
                "Sinkronisasi belum dapat dijalankan. Data lokal tetap tersedia.";
        }
    }

    const stopOwner = watch(owner, activate, { immediate: true });
    const onOnline = () => {
        online.value = true;
    };
    const onOffline = () => {
        online.value = false;
    };
    onMounted(() => {
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
    });
    onUnmounted(() => {
        stopOwner();
        release();
        stopSync();
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
    });

    return {
        online,
        ready,
        localFailure,
        pendingCount,
        failedCount,
        unfinishedCount: computed(() => counts.value.unfinishedCount),
        unqueuedCompletedCount: computed(
            () => counts.value.unqueuedCompletedCount,
        ),
        isSyncing,
        kind,
        label,
        canRetry,
        actionError,
        retry,
    };
}
