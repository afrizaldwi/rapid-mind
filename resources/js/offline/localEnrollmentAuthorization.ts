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
        const response = await fetch(
            `/relawan/offline-enrollment-status?owner_user_id=${owner}`,
            {
                credentials: "same-origin",
                cache: "no-store",
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
            },
        );
        if (!response.ok) return false;
        const result = await response.json();
        assertClinicalAccess(ticket);
        if (
            result.state !== "LOCAL_ENROLLMENT_ALLOWED" ||
            result.origin !== LOCAL_ENROLLMENT_ORIGIN ||
            result.user?.id !== owner ||
            result.user?.role !== "RELAWAN"
        )
            return false;

        const context = await db.relawanContinuity.get("active");
        assertClinicalAccess(ticket);
        if (
            !context ||
            context.owner_user_id !== owner ||
            context.role !== "RELAWAN" ||
            context.logout_pending ||
            ![1, 2].includes(context.schema_version) ||
            !Number.isFinite(Date.parse(context.verified_at))
        ) return false;

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
