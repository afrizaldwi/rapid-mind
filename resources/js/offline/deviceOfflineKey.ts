import type { DeviceOfflineKey, OfflineKeyRecord } from "./db";
import { OfflineKeySession } from "./offlineCrypto.ts";
import { offlineKeyMetadata } from "./offlineKeyMetadata.ts";

export function validateDeviceKey(record: OfflineKeyRecord): asserts record is DeviceOfflineKey {
    if (record.version !== 2) throw new Error("Penyimpanan lama memerlukan persiapan perangkat yang disetujui.");
    offlineKeyMetadata(record);
    const key = record.crypto_key;
    if (!key || key.type !== "secret" || key.extractable || key.algorithm.name !== "AES-GCM" ||
        (key.algorithm as AesKeyAlgorithm).length !== 256 ||
        key.usages.length !== 2 || !key.usages.includes("encrypt") || !key.usages.includes("decrypt"))
        throw new Error("Kunci enkripsi perangkat tidak sesuai.");
}

export async function restoreDeviceKey(record: OfflineKeyRecord): Promise<OfflineKeySession> {
    validateDeviceKey(record);
    const session = new OfflineKeySession(record.owner_user_id, record.crypto_key);
    try {
        await session.bindPersistedKey(record);
        return session;
    } catch (error) {
        session.lock();
        throw error;
    }
}

export async function createDeviceKey(owner: number) {
    if (!Number.isInteger(owner) || owner <= 0) throw new Error("Pemilik perangkat tidak sesuai.");
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const session = new OfflineKeySession(owner, key);
    try {
        const record: DeviceOfflineKey = {
            version: 2, owner_user_id: owner, key_id: crypto.randomUUID(), crypto_key: key,
            created_at: new Date().toISOString(), verification: await session.createKeyProof(),
        };
        await session.bindPersistedKey(record);
        return { record, session };
    } catch (error) {
        session.lock();
        throw error;
    }
}
