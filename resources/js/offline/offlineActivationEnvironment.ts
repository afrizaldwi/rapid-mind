export const LOCAL_ENROLLMENT_ORIGIN = "http://localhost:8080";

export function localEnrollmentOrigin(): boolean {
    if (typeof window === "undefined" || !window.location) return false;
    return window.location.origin === LOCAL_ENROLLMENT_ORIGIN;
}
function isolatedOrigin(): boolean {
    return (
        typeof window !== "undefined" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(
            window.location?.hostname,
        ) &&
        ["http:", "https:"].includes(window.location?.protocol) &&
        window.location.port !== "8080"
    );
}
export function acceptanceEncryptionFixture(): boolean {
    return import.meta.env.MODE === "encrypted-acceptance" && isolatedOrigin();
}
export function stagingEncryptionFixture(): boolean {
    return import.meta.env.MODE === "staging-fixture" && isolatedOrigin();
}
