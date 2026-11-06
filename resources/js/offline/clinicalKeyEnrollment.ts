import { acceptanceEncryptionFixture } from "./offlineActivationEnvironment";
import { requestLocalEnrollmentAuthorization, localEnrollmentMetadata } from "./localEnrollmentAuthorization";
import { db, requireOwner } from "./db";
import {
    createOfflineKey,
    unlockOfflineKey,
    replaceRecoveryWrapper,
    type OfflineKeySession,
} from "./offlineCrypto";
import {
    captureClinicalAccess,
    assertClinicalAccess,
    onClinicalInvalidation,
} from "./clinicalAccessFence";
import {
    inspectClinicalInitialization,
    encryptedEnrollmentEnabled,
    keyIdentity,
    legacyClinicalStores,
} from "./clinicalStorageInitialization";
import { installClinicalKey } from "./encryptedClinicalStorage";

// Pending sessions are never installed for clinical access. Nothing secret is
// persisted here; losing this memory requires explicit passphrase continuation.
const pending = new Map<
    number,
    {
        session: OfflineKeySession;
        revision: string;
        ticket: ReturnType<typeof captureClinicalAccess>;
    }
>();
onClinicalInvalidation(() => {
    for (const item of pending.values()) item.session.lock();
    pending.clear();
});
export async function verifyEnrollmentIdentity(owner: number): Promise<void> {
    requireOwner(owner);
    if (!acceptanceEncryptionFixture()) {
        if (!await requestLocalEnrollmentAuthorization(owner))
            throw new Error("Pendaftaran enkripsi belum diizinkan untuk sesi dan lingkungan ini.");
        return;
    }
    if (!navigator.onLine)
        throw new Error("Pendaftaran kunci memerlukan koneksi server.");
    const response = await fetch("/relawan/session-status", {
        credentials: "same-origin",
        cache: "no-store",
        headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
        },
    });
    if (!response.ok) throw new Error("Sesi Relawan belum terverifikasi.");
    const result = await response.json();
    if (
        result.state !== "AUTHENTICATED" ||
        result.user?.role !== "RELAWAN" ||
        result.user?.id !== owner
    )
        throw new Error("Sesi Relawan tidak sesuai pemilik data.");
}
async function continuity(owner: number): Promise<void> {
    const row = await db.relawanContinuity.get("active");
    if (
        !row ||
        row.owner_user_id !== owner ||
        row.role !== "RELAWAN" ||
        row.logout_pending ||
        ![1, 2].includes(row.schema_version) ||
        !Number.isFinite(Date.parse(row.verified_at))
    )
        throw new Error("Akses Relawan lokal belum tersedia untuk akun ini.");
}
function enabled(owner: number): void {
    if (!encryptedEnrollmentEnabled(owner))
        throw new Error(
            "Pendaftaran enkripsi perangkat belum diizinkan pada lingkungan ini.",
        );
}
const enrollmentTables = () => [
    ...legacyClinicalStores.map((name) => db.table(name)),
    db.offlineKeys,
    db.ownerEncryptionModes,
    db.relawanContinuity,
    db.encryptedStaging,
    db.encryptedOutboxIndex,
];
export async function beginClinicalEnrollment(
    owner: number,
    passphrase: string,
    confirmation: string,
): Promise<string> {
    requireOwner(owner);
    const ticket = captureClinicalAccess();
    if (passphrase !== confirmation)
        throw new Error("Konfirmasi frasa sandi tidak sama.");
    await verifyEnrollmentIdentity(owner);
    enabled(owner);
    await continuity(owner);
    assertClinicalAccess(ticket);
    if ((await inspectClinicalInitialization(owner)) !== "FRESH")
        throw new Error(
            "Penyimpanan bukan perangkat baru. Periksa pemulihan atau reset yang disetujui.",
        );
    const created = await createOfflineKey(owner, passphrase);
    const revision = crypto.randomUUID();
    try {
        assertClinicalAccess(ticket);
        await created.session.bindPersistedKey(created.record);
        await db.transaction("rw", enrollmentTables(), async () => {
            await continuity(owner);
            if ((await inspectClinicalInitialization(owner)) !== "FRESH")
                throw new Error("Inisialisasi berubah di tab lain.");
            assertClinicalAccess(ticket);
            await db.offlineKeys.add(created.record);
            await db.ownerEncryptionModes.add({
                owner_user_id: owner,
                mode: "ENROLLMENT_PENDING",
                ...localEnrollmentMetadata(),
                key_identity: keyIdentity(created.record),
                recovery_revision: revision,
            });
            assertClinicalAccess(ticket);
        });
        assertClinicalAccess(ticket);
        pending.get(owner)?.session.lock();
        pending.set(owner, { session: created.session, revision, ticket });
        return created.recoveryCode;
    } catch (error) {
        created.session.lock();
        throw error;
    }
}
// Explicit action, online identity verification and passphrase are required.
// Only an unconfirmed enrollment may replace its recovery wrapper here.
export async function continueClinicalEnrollment(
    owner: number,
    passphrase: string,
): Promise<string> {
    requireOwner(owner);
    const ticket = captureClinicalAccess();
    await verifyEnrollmentIdentity(owner);
    enabled(owner);
    await continuity(owner);
    if ((await inspectClinicalInitialization(owner)) !== "ENROLLMENT_PENDING")
        throw new Error("Pendaftaran tertunda tidak tersedia.");
    const before = await db.offlineKeys.get(owner);
    if (!before) throw new Error("Kunci perangkat tidak tersedia.");
    const replacement = await replaceRecoveryWrapper(before, passphrase);
    const revision = crypto.randomUUID();
    try {
        assertClinicalAccess(ticket);
        await db.transaction("rw", enrollmentTables(), async () => {
            await continuity(owner);
            const latest = await db.offlineKeys.get(owner);
            if (
                JSON.stringify(latest) !== JSON.stringify(before) ||
                (await inspectClinicalInitialization(owner)) !==
                    "ENROLLMENT_PENDING"
            )
                throw new Error("Kunci perangkat berubah.");
            assertClinicalAccess(ticket);
            await db.offlineKeys.put(replacement.record);
            await db.ownerEncryptionModes.put({
                owner_user_id: owner,
                mode: "ENROLLMENT_PENDING",
                ...localEnrollmentMetadata(),
                key_identity: keyIdentity(replacement.record),
                recovery_revision: revision,
            });
            assertClinicalAccess(ticket);
        });
        assertClinicalAccess(ticket);
        pending.get(owner)?.session.lock();
        pending.set(owner, { session: replacement.session, revision, ticket });
        return replacement.recoveryCode;
    } catch (error) {
        replacement.session.lock();
        throw error;
    }
}
export async function confirmClinicalRecovery(owner: number): Promise<void> {
    if (!acceptanceEncryptionFixture()) await verifyEnrollmentIdentity(owner);
    enabled(owner);
    const enrollment = pending.get(owner);
    if (!enrollment)
        throw new Error("Buka kembali pendaftaran dengan frasa sandi.");
    try {
        await db.transaction("rw", enrollmentTables(), async () => {
            await continuity(owner);
            const mode = await db.ownerEncryptionModes.get(owner);
            const key = await db.offlineKeys.get(owner);
            if (
                !key ||
                mode?.recovery_revision !== enrollment.revision ||
                (await inspectClinicalInitialization(owner)) !==
                    "ENROLLMENT_PENDING"
            )
                throw new Error("Pendaftaran berubah.");
            enrollment.session.assertPersistedKey(key);
            assertClinicalAccess(enrollment.ticket);
            await db.ownerEncryptionModes.put({
                ...mode,
                mode: "ENCRYPTED",
                confirmed_at: new Date().toISOString(),
            });
            assertClinicalAccess(enrollment.ticket);
        });
        assertClinicalAccess(enrollment.ticket);
        pending.delete(owner);
        await installClinicalKey(enrollment.session);
    } catch (error) {
        enrollment.session.lock();
        throw error;
    } finally {
        pending.delete(owner);
    }
}
export async function unlockClinicalOwner(
    owner: number,
    secret: string,
    purpose: "passphrase" | "recovery",
): Promise<void> {
    requireOwner(owner);
    const ticket = captureClinicalAccess();
    await continuity(owner);
    if ((await inspectClinicalInitialization(owner)) !== "ENCRYPTED_LOCKED")
        throw new Error(
            "Inisialisasi perangkat tidak sesuai. Data tetap tersimpan.",
        );
    const before = await db.offlineKeys.get(owner);
    if (!before) throw new Error("Kunci perangkat tidak tersedia.");
    const session = await unlockOfflineKey(before, secret, purpose);
    try {
        await session.bindPersistedKey(before);
        await continuity(owner);
        const latest = await db.offlineKeys.get(owner);
        if (JSON.stringify(before) !== JSON.stringify(latest))
            throw new Error("Metadata kunci berubah.");
        assertClinicalAccess(ticket);
        await installClinicalKey(session);
        assertClinicalAccess(ticket);
    } catch (error) {
        session.lock();
        throw error;
    }
}

export function abandonPendingEnrollment(owner: number): void {
    pending.get(owner)?.session.lock();
    pending.delete(owner);
}
