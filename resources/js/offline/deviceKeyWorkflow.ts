import { db, requireOwner } from "./db";
import { captureClinicalAccess, assertClinicalAccess } from "./clinicalAccessFence";
import { inspectClinicalInitialization, keyIdentity, legacyClinicalStores } from "./clinicalStorageInitialization";
import { prepareLocalEnrollment } from "./localEnrollmentAuthorization";
import { acceptanceEncryptionFixture } from "./offlineActivationEnvironment";
import { createDeviceKey, restoreDeviceKey } from "./deviceOfflineKey";
import { clinicalKeyReady, installClinicalKey } from "./encryptedClinicalStorage";
import { localLogoutPending } from "./localLogoutIntent";

const preparing = new Map<number, Promise<void>>();

async function requireContinuity(owner: number): Promise<void> {
    if (localLogoutPending()) throw new Error("Akses lokal dihentikan. Masuk kembali saat terhubung.");
    const context = await db.relawanContinuity.get("active");
    if (!context || context.owner_user_id !== owner || context.role !== "RELAWAN" ||
        context.logout_pending || ![1, 2].includes(context.schema_version) ||
        !Number.isFinite(Date.parse(context.verified_at)))
        throw new Error("Akses lokal belum tersedia. Masuk kembali saat terhubung.");
}

async function prepare(owner: number): Promise<void> {
    const ticket = captureClinicalAccess();
    await requireContinuity(owner);
    assertClinicalAccess(ticket);
    if (clinicalKeyReady(owner)) return;
    await prepareLocalEnrollment(owner);
    assertClinicalAccess(ticket);
    const state = await inspectClinicalInitialization(owner);
    if (state === "FRESH") {
        const created = await createDeviceKey(owner);
        try {
            assertClinicalAccess(ticket);
            await db.transaction("rw", [
                ...legacyClinicalStores.map(name => db.table(name)), db.offlineKeys,
                db.ownerEncryptionModes, db.relawanContinuity, db.encryptedStaging,
                db.encryptedOutboxIndex,
            ], async () => {
                await requireContinuity(owner);
                const latest = await inspectClinicalInitialization(owner);
                assertClinicalAccess(ticket);
                // Another tab may have completed the same initialization. Never replace its key.
                if (latest === "ENCRYPTED_LOCKED") return;
                if (latest !== "FRESH") throw new Error("Penyimpanan perangkat berubah. Data tetap tersimpan.");
                await db.offlineKeys.add(created.record);
                await db.ownerEncryptionModes.add({
                    owner_user_id: owner, mode: "ENCRYPTED",
                    ...(acceptanceEncryptionFixture() ? {} : { activation: "LOCAL_DEVICE_V2" as const }),
                    key_identity: keyIdentity(created.record), confirmed_at: new Date().toISOString(),
                });
                assertClinicalAccess(ticket);
            });
        } finally {
            created.session.lock();
        }
    } else if (state !== "ENCRYPTED_LOCKED") {
        throw new Error(state === "LEGACY_BLOCKED" || state === "ENROLLMENT_PENDING"
            ? "Penyimpanan lama memerlukan persiapan perangkat yang disetujui. Data tidak dihapus otomatis."
            : "Penyimpanan terenkripsi belum tersedia. Data tetap tersimpan; periksa persiapan perangkat.");
    }
    await requireContinuity(owner);
    assertClinicalAccess(ticket);
    const record = await db.offlineKeys.get(owner);
    if (!record) throw new Error("Kunci perangkat tidak tersedia. Data tetap tersimpan.");
    const session = await restoreDeviceKey(record);
    try {
        await requireContinuity(owner);
        assertClinicalAccess(ticket);
        await installClinicalKey(session);
        assertClinicalAccess(ticket);
    } catch (error) {
        session.lock();
        throw error;
    }
}

// Shared by startup and persistence. There is no user secret or recovery step.
export function ensureDeviceClinicalAccess(owner: number): Promise<void> {
    requireOwner(owner);
    const existing = preparing.get(owner);
    if (existing) return existing;
    const operation = prepare(owner);
    preparing.set(owner, operation);
    void operation.finally(() => {
        if (preparing.get(owner) === operation) preparing.delete(owner);
    }).catch(() => {});
    return operation;
}

// Emergency actions may wait for startup, but never initiate server enrollment.
export function waitForDeviceClinicalAccess(owner: number): Promise<void> {
    if (clinicalKeyReady(owner)) return Promise.resolve();
    return preparing.get(owner) ?? Promise.reject(new Error("Penyimpanan terenkripsi belum tersedia. Laporan belum tersimpan."));
}
