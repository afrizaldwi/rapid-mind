export const LOCAL_ENROLLMENT_ORIGIN = "http://localhost:8080";

export function localEnrollmentOrigin(): boolean {
    if (typeof window === "undefined" || !window.location) return false;
    if (window.location.origin === LOCAL_ENROLLMENT_ORIGIN) return true;
    const host = window.location.hostname ?? "";
    if (!host || /\.example$/i.test(host)) return false;
    if (window.location.protocol === "https:" && host !== "localhost") {
        return true;
    }
    if (
        /^(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) &&
        typeof crypto !== "undefined" &&
        Boolean(crypto.subtle)
    ) {
        return true;
    }
    return false;
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
