import { ref, shallowRef, watch } from "vue";
import { liveQuery, type Subscription } from "dexie";
import { useClinicalTaskScope } from "./useClinicalTaskScope";
import { useRelawanRuntime } from "@/relawan/runtime";
import { clinicalKeyReady } from "@/offline/encryptedClinicalStorage";
import { emergencyRepository } from "@/offline/emergencyRepository";
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
        subscription = liveQuery(() => emergencyRepository.get(owner, emergencyId)).subscribe({
            next(value) {
                if (!current()) return;
                // Repository access is owner-bound; retain the same boundary at the UI.
                const owned = value?.owner_user_id === owner && value.id === emergencyId;
                record.value = owned ? value : undefined;
                state.value = owned ? "READY" : "MISSING";
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
