import { db, requireOwner } from "./db";
import {
    installClinicalKey,
    lockAllClinicalKeys,
} from "./encryptedClinicalStorage";
import { prepareOwnerKey, unlockOwnerKey } from "./offlineEncryptionStaging";
import { resolveRelawanContinuity } from "./relawanContinuity";

export function isolatedEncryptionFixture(): boolean {
    return import.meta.env.MODE === "staging-fixture";
}

export async function enrollmentState(
    owner: number,
): Promise<"NEW" | "EXISTING"> {
    requireOwner(owner);
    return (await db.offlineKeys.get(owner)) ? "EXISTING" : "NEW";
}

async function verifyOnlineRelawan(owner: number): Promise<void> {
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
    const result = (await response.json()) as {
        state?: string;
        user?: { id?: unknown; role?: unknown };
    };
    if (
        result.state !== "AUTHENTICATED" ||
        result.user?.role !== "RELAWAN" ||
        Number(result.user.id) !== owner
    )
        throw new Error("Sesi Relawan tidak sesuai pemilik data.");
}

export async function enrollIsolatedOwner(
    owner: number,
    passphrase: string,
    confirmation: string,
): Promise<string> {
    if (!isolatedEncryptionFixture())
        throw new Error("Pendaftaran enkripsi belum tersedia.");
    requireOwner(owner);
    if (passphrase !== confirmation)
        throw new Error("Konfirmasi frasa sandi tidak sama.");
    await verifyOnlineRelawan(owner);
    const created = await prepareOwnerKey(owner, passphrase);
    try {
        await installClinicalKey(created.session);
        return created.recoveryCode;
    } catch (error) {
        created.session.lock();
        throw error;
    }
}

export async function unlockIsolatedOwner(
    owner: number,
    secret: string,
    purpose: "passphrase" | "recovery",
): Promise<void> {
    if (!isolatedEncryptionFixture())
        throw new Error("Pembukaan kunci enkripsi belum tersedia.");
    const continuity = await resolveRelawanContinuity();
    if (
        continuity.state !== "ELIGIBLE" ||
        continuity.context.owner_user_id !== owner
    )
        throw new Error("Akses Relawan lokal belum tersedia untuk akun ini.");
    const session = await unlockOwnerKey(requireOwner(owner), secret, purpose);
    try {
        await installClinicalKey(session);
    } catch (error) {
        session.lock();
        throw error;
    }
}

export function lockIsolatedOwner(): void {
    lockAllClinicalKeys();
}
