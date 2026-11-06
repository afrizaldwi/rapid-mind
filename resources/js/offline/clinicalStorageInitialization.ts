import { db, requireOwner, type WrappedOfflineKey } from "./db";

// Ordinary deployments cannot enroll until isolated Chromium acceptance and
// an owner-reviewed activation change. This is compiled into both entrypoints.
export function encryptedEnrollmentEnabled(): boolean {
    return import.meta.env.MODE === "encrypted-acceptance";
}
export function syntheticLegacyFixture(): boolean {
    return import.meta.env.MODE === "staging-fixture";
}
export const legacyClinicalStores = [
    "patients",
    "patientSnapshots",
    "assessments",
    "emergencies",
    "outbox",
] as const;
export type InitializationState =
    | "FRESH"
    | "ENROLLMENT_PENDING"
    | "ENCRYPTED_LOCKED"
    | "LEGACY_BLOCKED"
    | "INCONSISTENT"
    | "INACCESSIBLE"
    | "ACTIVATION_DISABLED";
export function keyIdentity(key: WrappedOfflineKey): string {
    if (
        key.version !== 1 ||
        !key.verification ||
        !key.created_at ||
        !key.passphrase ||
        !key.recovery
    )
        throw new Error("Metadata kunci rusak.");
    return `${key.created_at}:${key.verification.ciphertext}`;
}
// Always inspect all plaintext stores, including ownerless rows. Unknown data
// is quarantined, never assigned to the logged-in owner or removed.
export async function inspectClinicalInitialization(
    owner: number,
): Promise<InitializationState> {
    requireOwner(owner);
    try {
        return await db.transaction(
            "r",
            [
                ...legacyClinicalStores.map((name) => db.table(name)),
                db.offlineKeys,
                db.ownerEncryptionModes,
                db.encryptedStaging,
                db.encryptedOutboxIndex,
            ],
            async () => {
                for (const name of legacyClinicalStores)
                    if (await db.table(name).count()) return "LEGACY_BLOCKED";
                const key = await db.offlineKeys.get(owner);
                const mode = await db.ownerEncryptionModes.get(owner);
                const copies = await db.encryptedStaging
                    .where("owner_user_id")
                    .equals(owner)
                    .count();
                const indexes = await db.encryptedOutboxIndex
                    .where("owner_user_id")
                    .equals(owner)
                    .count();
                if (!key && !mode) {
                    if (copies || indexes) return "INCONSISTENT";
                    return encryptedEnrollmentEnabled()
                        ? "FRESH"
                        : "ACTIVATION_DISABLED";
                }
                if (!key || !mode) return "INCONSISTENT";
                try {
                    if (mode.key_identity !== keyIdentity(key))
                        return "INCONSISTENT";
                } catch {
                    return "INCONSISTENT";
                }
                if (
                    typeof mode.recovery_revision !== "string" ||
                    !mode.recovery_revision
                )
                    return "INCONSISTENT";
                if (mode.mode === "ENROLLMENT_PENDING")
                    return copies || indexes || mode.confirmed_at
                        ? "INCONSISTENT"
                        : "ENROLLMENT_PENDING";
                if (
                    mode.mode !== "ENCRYPTED" ||
                    !Number.isFinite(Date.parse(mode.confirmed_at ?? "")) ||
                    !mode.recovery_revision
                )
                    return "INCONSISTENT";
                return encryptedEnrollmentEnabled()
                    ? "ENCRYPTED_LOCKED"
                    : "ACTIVATION_DISABLED";
            },
        );
    } catch {
        return "INACCESSIBLE";
    }
}
