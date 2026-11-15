import { ref, shallowRef, watch } from "vue";
import { liveQuery, type Subscription } from "dexie";
import { useClinicalTaskScope } from "./useClinicalTaskScope";
import { useRelawanRuntime } from "@/relawan/runtime";
import { clinicalKeyReady } from "@/offline/encryptedClinicalStorage";
import { emergencyRepository } from "@/offline/emergencyRepository";
import { db } from "@/offline/db";
import type { LocalEmergency } from "@/offline/db";

export function useLocalEmergencyDetail(id: () => string | undefined) {
    const runtime = useRelawanRuntime();
    const record = shallowRef<LocalEmergency>();
    const state = ref<"CHECKING" | "READY" | "MISSING" | "ERROR">("CHECKING");
    let subscription: Subscription | undefined;
    function clear() {
        subscription?.unsubscribe();
        subscription = undefined;
        record.value = undefined;
        state.value = "CHECKING";
    }
    const scope = useClinicalTaskScope(clear);
    function lock() {
        scope.invalidate();
        clear();
    }
    function load() {
        lock();
        const emergencyId = id();
        if (!emergencyId) return;
        const owner = runtime.owner;
        if (!clinicalKeyReady(owner)) return;
        const current = scope.capture();
        // Register ciphertext/receipt dependencies before WebCrypto awaits so
        // Dexie observes synchronization and subsequent receipt-based cleanup.
        subscription = liveQuery(async () => {
            await db.encryptedStaging.get(`emergencies:${owner}:${emergencyId}`);
            await db.localSyncReceipts.get(`${owner}:EMERGENCY:${emergencyId}`);
            return emergencyRepository.get(owner, emergencyId);
        }).subscribe({
            async next(value) {
                if (!current()) return;
                // Repository access is owner-bound; retain the same boundary at the UI.
                const owned = value?.owner_user_id === owner && value.id === emergencyId;
                if (owned) { record.value = value; state.value = "READY"; return; }
                const previous = record.value;
                const receipt = previous ? await db.localSyncReceipts.get(`${owner}:EMERGENCY:${emergencyId}`).catch(() => undefined) : undefined;
                if (!current()) return;
                if (previous?.owner_user_id === owner && previous.id === emergencyId &&
                    receipt?.owner_user_id === owner && receipt.canonical_id === emergencyId) {
                    record.value = { ...previous, sync_state: "SYNCED", last_error: undefined };
                    state.value = "READY";
                } else { record.value = undefined; state.value = "MISSING"; }
            },
            error() {
                if (!current()) return;
                record.value = undefined;
                state.value = "ERROR";
            },
        });
    }
    watch(id, load, { flush: "sync" });
    return { record, state, load, lock };
}
