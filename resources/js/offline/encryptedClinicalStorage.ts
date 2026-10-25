import {
    db,
    requireOwner,
    type ClinicalStore,
    type EncryptedStagingRecord,
} from "./db";
import type { OfflineKeySession } from "./offlineCrypto";

const activeSessions = new Map<number, OfflineKeySession>();
let accessEpoch = 0;
const modeChannel =
    typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("rapid-mind:offline-mode-v1");
modeChannel?.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type === "MODE_ACTIVATED") lockAllClinicalKeys();
});

export function announceSyntheticModeActivation(owner: number): void {
    modeChannel?.postMessage({ type: "MODE_ACTIVATED", owner });
}

export async function installClinicalKey(
    session: OfflineKeySession,
): Promise<void> {
    if (!session.unlocked) throw new Error("Kunci data offline terkunci.");
    const epoch = accessEpoch;
    const persisted = await db.offlineKeys.get(session.owner);
    if (!persisted) throw new Error("Kunci data offline tidak tersedia.");
    await session.bindPersistedKey(persisted);
    const latest = await db.offlineKeys.get(session.owner);
    session.assertPersistedKey(latest ?? persisted);
    if (!latest) throw new Error("Kunci data offline berubah.");
    if (!session.unlocked || epoch !== accessEpoch)
        throw new Error("Akses data offline berubah saat membuka kunci.");
    for (const [owner, previous] of activeSessions) {
        if (owner !== session.owner || previous !== session) previous.lock();
        if (owner !== session.owner) activeSessions.delete(owner);
    }
    activeSessions.set(session.owner, session);
}

export function lockClinicalKey(owner: number): void {
    accessEpoch++;
    activeSessions.get(owner)?.lock();
    activeSessions.delete(owner);
}

export function lockAllClinicalKeys(): void {
    accessEpoch++;
    for (const owner of activeSessions.keys()) lockClinicalKey(owner);
}

export function clinicalKeyReady(owner: number): boolean {
    return activeSessions.get(owner)?.unlocked === true;
}

export async function encryptedMode(owner: number): Promise<boolean> {
    return (
        (await db.ownerEncryptionModes.get(requireOwner(owner)))?.mode ===
        "ENCRYPTED"
    );
}

export async function assertStorageMode(
    owner: number,
    expected: "LEGACY" | "ENCRYPTED",
): Promise<void> {
    const encrypted = await encryptedMode(owner);
    if ((encrypted ? "ENCRYPTED" : "LEGACY") !== expected)
        throw new Error("Mode penyimpanan berubah. Muat ulang data lokal.");
    if (encrypted) {
        const session = activeSessions.get(owner);
        const wrapped = await db.offlineKeys.get(owner);
        if (!session || !wrapped || !session.unlocked)
            throw new Error("Buka kunci data offline Relawan ini.");
        session.assertPersistedKey(wrapped);
    }
}

async function sessionFor(owner: number): Promise<OfflineKeySession> {
    await assertStorageMode(owner, "ENCRYPTED");
    return activeSessions.get(owner)!;
}

export function encryptedKey(
    type: ClinicalStore,
    owner: number,
    id: string,
): string {
    return `${type}:${owner}:${id}`;
}

export async function ciphertextDigest(
    envelope: EncryptedStagingRecord,
): Promise<string> {
    const bytes = new TextEncoder().encode(
        `${envelope.iv}:${envelope.ciphertext}`,
    );
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return Array.from(digest, (value) =>
        value.toString(16).padStart(2, "0"),
    ).join("");
}

export async function encryptedGet<T>(
    owner: number,
    type: ClinicalStore,
    id: string,
): Promise<T | undefined> {
    const session = await sessionFor(owner);
    const copy = await db.encryptedStaging.get(encryptedKey(type, owner, id));
    if (!copy) return undefined;
    const value = await session.decrypt<T>(copy, owner, type, id);
    await assertStorageMode(owner, "ENCRYPTED");
    return value;
}

export async function encryptedList<T>(
    owner: number,
    type: ClinicalStore,
): Promise<T[]> {
    const session = await sessionFor(owner);
    const copies = (
        await db.encryptedStaging.where("owner_user_id").equals(owner).toArray()
    ).filter((copy) => copy.record_type === type);
    const values: T[] = [];
    for (const copy of copies)
        values.push(
            await session.decrypt<T>(copy, owner, type, copy.record_id),
        );
    await assertStorageMode(owner, "ENCRYPTED");
    return values;
}

export async function encryptedMutate<T>(
    owner: number,
    type: ClinicalStore,
    id: string,
    transform: (current: T | undefined) => T,
): Promise<void> {
    const session = await sessionFor(owner);
    const key = encryptedKey(type, owner, id);
    const before = await db.encryptedStaging.get(key);
    const current = before
        ? await session.decrypt<T>(before, owner, type, id)
        : undefined;
    const next = await session.encrypt(type, id, transform(current));
    await db.transaction(
        "rw",
        db.ownerEncryptionModes,
        db.offlineKeys,
        db.encryptedStaging,
        async () => {
            await assertStorageMode(owner, "ENCRYPTED");
            const latest = await db.encryptedStaging.get(key);
            if (JSON.stringify(latest) !== JSON.stringify(before))
                throw new Error(
                    "Data lokal berubah bersamaan. Ulangi penyimpanan.",
                );
            await db.encryptedStaging.put(next);
        },
    );
}

export async function encryptedDelete(
    owner: number,
    type: ClinicalStore,
    id: string,
    expected?: unknown,
): Promise<void> {
    const session = await sessionFor(owner);
    const key = encryptedKey(type, owner, id);
    const before = await db.encryptedStaging.get(key);
    if (expected !== undefined) {
        const current = before
            ? await session.decrypt(before, owner, type, id)
            : undefined;
        if (JSON.stringify(current) !== JSON.stringify(expected))
            throw new Error("Data lokal berubah bersamaan. Ulangi tindakan.");
    }
    await db.transaction(
        "rw",
        db.ownerEncryptionModes,
        db.offlineKeys,
        db.encryptedStaging,
        async () => {
            await assertStorageMode(owner, "ENCRYPTED");
            const latest = await db.encryptedStaging.get(key);
            if (JSON.stringify(latest) !== JSON.stringify(before))
                throw new Error(
                    "Data lokal berubah bersamaan. Ulangi tindakan.",
                );
            await db.encryptedStaging.delete(key);
        },
    );
}

export async function prepareEncrypted(
    owner: number,
    type: ClinicalStore,
    id: string,
    value: unknown,
): Promise<EncryptedStagingRecord> {
    return (await sessionFor(owner)).encrypt(type, id, value);
}
