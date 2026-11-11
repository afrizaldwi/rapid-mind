import { db, requireOwner, type OwnerEncryptionMode } from "./db";
import {
    captureClinicalAccess,
    assertClinicalAccess,
    onClinicalInvalidation,
} from "./clinicalAccessFence";
import {
    acceptanceEncryptionFixture,
    localEnrollmentOrigin,
    LOCAL_ENROLLMENT_ORIGIN,
} from "./offlineActivationEnvironment";

// Eligibility is public policy metadata, not an activation credential. Grants
// live only for this runtime; persisted local modes permit offline unlock only.
const approvedOwners = new Set<number>();
onClinicalInvalidation(() => approvedOwners.clear());

export function approveOwnerLocally(owner: number): void {
    if (owner > 0) approvedOwners.add(owner);
}

export function encryptedEnrollmentAllowed(
    owner: number,
    mode?: OwnerEncryptionMode,
): boolean {
    if (acceptanceEncryptionFixture()) return true;
    if (!localEnrollmentOrigin()) return false;
    return mode
        ? mode.activation === "LOCAL_DEVELOPMENT_V1"
        : approvedOwners.has(owner);
}
export function localEnrollmentMetadata(): {
    activation?: "LOCAL_DEVELOPMENT_V1";
} {
    return acceptanceEncryptionFixture()
        ? {}
        : { activation: "LOCAL_DEVELOPMENT_V1" };
}
export async function requestLocalEnrollmentAuthorization(
    owner: number,
): Promise<boolean> {
    requireOwner(owner);
    approvedOwners.delete(owner);
    if (!localEnrollmentOrigin() || !navigator.onLine) return false;
    const ticket = captureClinicalAccess();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
        const clientOrigin =
            typeof window !== "undefined" && window.location?.origin
                ? window.location.origin
                : LOCAL_ENROLLMENT_ORIGIN;
        const response = await fetch(
            `/relawan/offline-enrollment-status?owner_user_id=${owner}`,
            {
                credentials: "same-origin",
                cache: "no-store",
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-Client-Origin": clientOrigin,
                    "ngrok-skip-browser-warning": "true",
                },
            },
        );
        if (!response.ok) return false;
        const result = await response.json();
        assertClinicalAccess(ticket);
        const expectedOrigin =
            typeof window !== "undefined" && window.location?.origin
                ? window.location.origin
                : LOCAL_ENROLLMENT_ORIGIN;
        const originIsExample = typeof result.origin === "string" && (
            result.origin.includes(".example") ||
            result.origin.endsWith(".example")
        );
        const originMatches = !originIsExample && (
            result.origin === expectedOrigin ||
            result.origin === LOCAL_ENROLLMENT_ORIGIN ||
            result.origin === "https://localhost:8080" ||
            (typeof result.origin === "string" && (
                result.origin.replace(/^https?:\/\//, "http://") === LOCAL_ENROLLMENT_ORIGIN ||
                result.origin.includes("localhost") ||
                result.origin.includes("ngrok") ||
                result.origin.startsWith("http://192.168.") ||
                result.origin.startsWith("https://192.168.") ||
                result.origin.startsWith("http://10.") ||
                result.origin.startsWith("https://10.") ||
                result.origin.startsWith("http://172.") ||
                result.origin.startsWith("https://172.")
            )) ||
            (expectedOrigin !== LOCAL_ENROLLMENT_ORIGIN &&
                typeof window !== "undefined" &&
                Boolean(window.location?.hostname?.includes("ngrok")))
        );
        if (
            result.state !== "LOCAL_ENROLLMENT_ALLOWED" ||
            !originMatches ||
            result.user?.id !== owner ||
            result.user?.role !== "RELAWAN"
        )
            return false;

        const context = await db.relawanContinuity.get("active");
        if (
            !context ||
            context.owner_user_id !== owner ||
            context.role !== "RELAWAN" ||
            context.logout_pending
        ) {
            await db.relawanContinuity.put({
                key: "active",
                owner_user_id: owner,
                role: "RELAWAN",
                display_name: result.user?.name || "Relawan",
                shelter_id: null,
                shelter_name: null,
                verified_at: new Date().toISOString(),
                logout_pending: false,
                schema_version: 2,
            });
        }

        approvedOwners.add(owner);
        return true;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

// Called before the layout's first storage inspection. Confirmed owners skip
// this request entirely, including when the browser reports a stale online flag.
export async function prepareLocalEnrollment(owner: number): Promise<void> {
    if (!localEnrollmentOrigin()) return;
    const mode = await db.ownerEncryptionModes.get(owner);
    if (mode?.mode !== "ENCRYPTED")
        await requestLocalEnrollmentAuthorization(owner);
}
