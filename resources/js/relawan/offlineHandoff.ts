import type { InjectionKey } from "vue";

export const offlineHandoffKey: InjectionKey<(owner: number, path: string) => Promise<void>> =
    Symbol("offline-assessment-handoff");
