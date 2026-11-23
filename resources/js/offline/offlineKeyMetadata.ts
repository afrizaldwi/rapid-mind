import type { OfflineKeyRecord } from "./db";

// CryptoKey has no JSON key material. Bind the immutable identity and proof instead.
export function offlineKeyMetadata(record: OfflineKeyRecord): string {
    if (record.version === 1) return JSON.stringify(record);
    if (!Number.isInteger(record.owner_user_id) || record.owner_user_id <= 0 ||
        record.version !== 2 || !record.key_id || !record.verification?.iv ||
        !record.verification.ciphertext || !Number.isFinite(Date.parse(record.created_at)))
        throw new Error("Metadata kunci perangkat tidak sesuai.");
    return JSON.stringify([record.version, record.owner_user_id, record.key_id,
        record.created_at, record.verification.iv, record.verification.ciphertext]);
}
