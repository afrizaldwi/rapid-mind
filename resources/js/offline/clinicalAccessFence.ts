// This token carries no identity or secret. Reads are synchronous so a queued
// IndexedDB write can reject a lock even before a storage event is delivered.
const tokenKey = "rapid-mind:clinical-access-v2";
let generation = 0;
let observed: string | null | undefined;
let storageFailed = false;
const listeners = new Set<() => void>();
const fixture = () => import.meta.env.MODE === "staging-fixture";

function token(): string | null {
    if (fixture()) return null;
    if (storageFailed) throw new Error("Penyimpanan akses tidak tersedia. Muat ulang setelah diperbaiki.");
    if (typeof window === "undefined")
        throw new Error("Penyimpanan akses tidak tersedia.");
    let value = window.localStorage.getItem(tokenKey);
    if (value === null) {
        value = crypto.randomUUID();
        window.localStorage.setItem(tokenKey, value);
    }
    return value;
}
function invalidate(): void {
    generation++;
    for (const listener of listeners) {
        try { listener(); } catch { /* A UI/history failure must not prevent key invalidation. */ }
    }
}
export function onClinicalInvalidation(listener: () => void): void {
    listeners.add(listener);
}
export function captureClinicalAccess(): {
    generation: number;
    token: string | null;
} {
    let current: string | null;
    try { current = token(); } catch (error) { invalidate(); throw error; }
    if (observed === undefined) observed = current;
    else if (current !== observed) {
        observed = current;
        invalidate();
    }
    return { generation, token: current };
}
export function assertClinicalAccess(
    ticket: ReturnType<typeof captureClinicalAccess>,
): void {
    let current: string | null;
    try { current = token(); } catch (error) { invalidate(); throw error; }
    if (ticket.generation !== generation || ticket.token !== current) {
        observed = current;
        invalidate();
        throw new Error("Akses klinis berubah. Buka kunci kembali.");
    }
}
export function invalidateClinicalAccess(): void {
    invalidate();
    if (fixture()) return;
    try {
        const next = crypto.randomUUID();
        window.localStorage.setItem(tokenKey, next);
        observed = next;
    } catch {
        storageFailed = true;
        // Local keys are already gone. Future operations fail on token access.
    }
}
if (typeof window !== "undefined") {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("controllerchange", invalidateClinicalAccess);
        navigator.serviceWorker.addEventListener("message", event => {
            if (event.data?.type === "RAPID_MIND_STORAGE_PROTOCOL") invalidateClinicalAccess();
        });
    }
    window.addEventListener("storage", (event) => {
        if (event.key === tokenKey || event.key === null) {
            observed = undefined;
            invalidate();
        }
    });
    // BFCache and suspended tabs must never briefly restore a clinical DOM.
    window.addEventListener("pagehide", invalidateClinicalAccess);
    window.addEventListener("pageshow", () => {
        invalidate();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") invalidateClinicalAccess();
    });
}
