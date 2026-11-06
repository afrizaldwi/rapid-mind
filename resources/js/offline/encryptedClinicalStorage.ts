import {
    db,
    requireOwner,
    type ClinicalStore,
    type EncryptedStagingRecord,
} from "./db";
import type { OfflineKeySession } from "./offlineCrypto";
import { shallowRef } from "vue";
import { captureClinicalAccess, assertClinicalAccess, invalidateClinicalAccess, onClinicalInvalidation } from "./clinicalAccessFence";
import { encryptedEnrollmentEnabled, syntheticLegacyFixture, keyIdentity } from "./clinicalStorageInitialization";

const activeSessions = new Map<number, OfflineKeySession>();
const preparedTickets = new WeakMap<EncryptedStagingRecord, ReturnType<typeof captureClinicalAccess>>();
const accessTickets = new Map<number, ReturnType<typeof captureClinicalAccess>>();
let accessEpoch = 0;
const keyGeneration = shallowRef(0);

// Reading this function inside a Vue computed/watch tracks every key change.
// The generation also lets asynchronous clinical reads reject stale results.
export function clinicalKeyVersion(): number {
    return keyGeneration.value;
}

function publishKeyChange(): void {
    keyGeneration.value++;
}
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
    const ticket = captureClinicalAccess();
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
    assertClinicalAccess(ticket);
    if (!syntheticLegacyFixture()) {
        const context = await db.relawanContinuity.get("active");
        const mode = await db.ownerEncryptionModes.get(session.owner);
        if (!encryptedEnrollmentEnabled(session.owner, mode) || context?.owner_user_id !== session.owner || context.logout_pending ||
            context.role !== "RELAWAN" || !mode?.confirmed_at || mode.mode !== "ENCRYPTED" ||
            mode.key_identity !== keyIdentity(latest)) throw new Error("Inisialisasi atau sesi klinis belum sesuai.");
        assertClinicalAccess(ticket);
        session.assertPersistedKey((await db.offlineKeys.get(session.owner))!);
        assertClinicalAccess(ticket);
    }
    activeSessions.set(session.owner, session);
    accessTickets.set(session.owner, ticket);
    publishKeyChange();
}

function clearKeys(): void {
    accessEpoch++;
    for (const session of activeSessions.values()) session.lock();
    activeSessions.clear();
    accessTickets.clear();
    publishKeyChange();
}
onClinicalInvalidation(clearKeys);
export function lockClinicalKey(_owner: number): void { lockAllClinicalKeys(); }
export function lockAllClinicalKeys(): void {
    invalidateClinicalAccess();
}

export function clinicalKeyReady(owner: number): boolean {
    void keyGeneration.value;
    return activeSessions.get(owner)?.unlocked === true;
}

export async function encryptedMode(owner: number): Promise<boolean> {
    const mode = await db.ownerEncryptionModes.get(requireOwner(owner));
    if (syntheticLegacyFixture()) return mode?.mode === "ENCRYPTED";
    if (!encryptedEnrollmentEnabled(owner, mode) || mode?.mode !== "ENCRYPTED" ||
        !Number.isFinite(Date.parse(mode.confirmed_at ?? "")) || !mode.key_identity || !mode.recovery_revision) {
        if (activeSessions.size) lockAllClinicalKeys();
        throw new Error("Penyimpanan klinis belum diinisialisasi atau diblokir. Data tetap tersimpan.");
    }
    return true;
}

export async function assertStorageMode(owner: number, expected: "LEGACY" | "ENCRYPTED"): Promise<void> {
    const encrypted = await encryptedMode(owner);
    if ((encrypted ? "ENCRYPTED" : "LEGACY") !== expected)
        throw new Error("Mode penyimpanan berubah. Muat ulang data lokal.");
    if (encrypted) {
        const session = activeSessions.get(owner);
        const ticket = accessTickets.get(owner);
        const wrapped = await db.offlineKeys.get(owner);
        if (!session || !wrapped || !session.unlocked || !ticket) {
            if (session) lockAllClinicalKeys();
            throw new Error("Buka kunci data offline Relawan ini.");
        }
        assertClinicalAccess(ticket);
        try { session.assertPersistedKey(wrapped); }
        catch (error) { lockAllClinicalKeys(); throw error; }
        if (!syntheticLegacyFixture()) {
            const mode = await db.ownerEncryptionModes.get(owner);
            const continuity = await db.relawanContinuity.get("active");
            if (mode?.key_identity !== keyIdentity(wrapped) || continuity?.owner_user_id !== owner ||
                continuity.logout_pending || continuity.role !== "RELAWAN") {
                lockAllClinicalKeys();
                throw new Error("Konteks Relawan berubah. Masuk kembali.");
            }
            assertClinicalAccess(ticket);
        }
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
    const ticket = captureClinicalAccess();
    const session = await sessionFor(owner);
    const copy = await db.encryptedStaging.get(encryptedKey(type, owner, id));
    if (!copy) { assertClinicalAccess(ticket); return undefined; }
    const value = await session.decrypt<T>(copy, owner, type, id);
    await assertStorageMode(owner, "ENCRYPTED");
    assertClinicalAccess(ticket);
    return value;
}

export async function encryptedList<T>(
    owner: number,
    type: ClinicalStore,
): Promise<T[]> {
    const ticket = captureClinicalAccess();
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
    assertClinicalAccess(ticket);
    return values;
}

export async function encryptedMutate<T>(
    owner: number,
    type: ClinicalStore,
    id: string,
    transform: (current: T | undefined) => T,
): Promise<void> {
    const ticket = captureClinicalAccess();
    const session = await sessionFor(owner);
    const key = encryptedKey(type, owner, id);
    const before = await db.encryptedStaging.get(key);
    const current = before
        ? await session.decrypt<T>(before, owner, type, id)
        : undefined;
    const next = await session.encrypt(type, id, transform(current));
    assertClinicalAccess(ticket);
    await db.transaction(
        "rw",
        db.ownerEncryptionModes,
        db.relawanContinuity,
        db.offlineKeys,
        db.encryptedStaging,
        async () => {
            await assertStorageMode(owner, "ENCRYPTED");
            const latest = await db.encryptedStaging.get(key);
            if (JSON.stringify(latest) !== JSON.stringify(before))
                throw new Error(
                    "Data lokal berubah bersamaan. Ulangi penyimpanan.",
                );
            assertClinicalAccess(ticket);
            await db.encryptedStaging.put(next);
            assertClinicalAccess(ticket);
        },
    );
}

export async function encryptedDelete(
    owner: number,
    type: ClinicalStore,
    id: string,
    expected?: unknown,
): Promise<void> {
    const ticket = captureClinicalAccess();
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
        db.relawanContinuity,
        db.offlineKeys,
        db.encryptedStaging,
        async () => {
            await assertStorageMode(owner, "ENCRYPTED");
            const latest = await db.encryptedStaging.get(key);
            if (JSON.stringify(latest) !== JSON.stringify(before))
                throw new Error(
                    "Data lokal berubah bersamaan. Ulangi tindakan.",
                );
            assertClinicalAccess(ticket);
            await db.encryptedStaging.delete(key);
            assertClinicalAccess(ticket);
        },
    );
}

export async function prepareEncrypted(
    owner: number,
    type: ClinicalStore,
    id: string,
    value: unknown,
): Promise<EncryptedStagingRecord> {
    const session = await sessionFor(owner);
    const ticket = accessTickets.get(owner)!;
    const envelope = await session.encrypt(type, id, value);
    assertClinicalAccess(ticket);
    preparedTickets.set(envelope, ticket);
    return envelope;
}
export function assertPreparedClinicalRecord(envelope: EncryptedStagingRecord): void {
    const ticket = preparedTickets.get(envelope);
    if (!ticket) throw new Error("Penyimpanan klinis belum dipersiapkan.");
    assertClinicalAccess(ticket);
}
