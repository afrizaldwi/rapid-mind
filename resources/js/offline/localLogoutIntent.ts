// Synchronous, non-sensitive barrier closes the gap before IndexedDB commits
// logout. Only a successful explicit online login may clear it.
const key = "rapid-mind:local-logout-v3";
export function localLogoutPending(): boolean {
    return window.localStorage.getItem(key) !== null;
}
export function recordLocalLogoutIntent(): void {
    window.localStorage.setItem(key, "1");
}
export function clearLocalLogoutIntent(): void {
    window.localStorage.removeItem(key);
}
