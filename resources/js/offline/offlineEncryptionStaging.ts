import {
    db,
    requireOwner,
    type ClinicalStore,
    type EncryptedStagingRecord,
} from "./db";
import {
    createOfflineKey,
    type OfflineKeySession,
    unlockOfflineKey,
} from "./offlineCrypto";
import { announceSyntheticModeActivation } from "./encryptedClinicalStorage";

const stores: ClinicalStore[] = [
    "patients",
    "patientSnapshots",
    "assessments",
    "emergencies",
    "outbox",
];

// Preparation only. Neither this module nor the Dexie upgrade changes the
// active plaintext repositories or removes any source row.
export async function prepareOwnerKey(owner: number, passphrase: string) {
    requireOwner(owner);
    if (await db.offlineKeys.get(owner))
        throw new Error("Offline key already exists for this owner");
    const created = await createOfflineKey(owner, passphrase);
    try {
        await db.offlineKeys.add(created.record);
        await created.session.bindPersistedKey(created.record);
    } catch (error) {
        created.session.lock();
        throw error;
    }
    return { recoveryCode: created.recoveryCode, session: created.session };
}

export async function unlockOwnerKey(
    owner: number,
    secret: string,
    purpose: "passphrase" | "recovery",
) {
    requireOwner(owner);
    const record = await db.offlineKeys.get(owner);
    if (!record) throw new Error("Offline key is not initialized");
    const session = await unlockOfflineKey(record, secret, purpose);
    try {
        let current = record;
        if (!record.verification) {
            const proof = await session.createKeyProof();
            current = await db.transaction("rw", db.offlineKeys, async () => {
                const latest = await db.offlineKeys.get(owner);
                if (JSON.stringify(latest) !== JSON.stringify(record))
                    throw new Error("Offline key changed during unlock");
                const updated = { ...record, verification: proof };
                await db.offlineKeys.put(updated);
                return updated;
            });
        }
        await session.assertMatches(current);
        await session.bindPersistedKey(current);
        return session;
    } catch (error) {
        session.lock();
        throw error;
    }
}

function rowId(store: ClinicalStore, row: Record<string, unknown>): string {
    const id = row.id;
    if (store === "outbox") {
        if (!Number.isInteger(id) || (id as number) <= 0)
            throw new Error("Invalid outbox identity");
        return String(id);
    }
    if (typeof id !== "string" || !id)
        throw new Error("Invalid clinical record identity");
    return id;
}

function sourceKey(
    store: ClinicalStore,
    owner: number,
    id: string,
): string | number | [number, string] {
    return store === "outbox"
        ? Number(id)
        : store === "patientSnapshots"
          ? [owner, id]
          : id;
}

async function stageOne(
    session: OfflineKeySession,
    wrapped: NonNullable<Awaited<ReturnType<typeof db.offlineKeys.get>>>,
    store: ClinicalStore,
    source: Record<string, unknown>,
): Promise<boolean> {
    const owner = session.owner;
    if (source.owner_user_id !== owner)
        throw new Error("Clinical record owner mismatch");
    const id = rowId(store, source);
    const serialized = JSON.stringify(source);
    const envelope = await session.encrypt(store, id, source);
    const decrypted = await session.decrypt<Record<string, unknown>>(
        envelope,
        owner,
        store,
        id,
    );
    if (JSON.stringify(decrypted) !== serialized)
        throw new Error("Encrypted copy verification failed");

    // Web Crypto has finished before this short IndexedDB transaction begins.
    return db.transaction(
        "rw",
        db.table(store),
        db.encryptedStaging,
        db.offlineKeys,
        db.ownerEncryptionModes,
        async () => {
            if (await db.ownerEncryptionModes.get(owner))
                throw new Error("Staging cannot overwrite active encrypted records");
            const persisted = await db.offlineKeys.get(owner);
            if (
                !persisted ||
                JSON.stringify(persisted) !== JSON.stringify(wrapped)
            )
                throw new Error("Offline key changed during staging");
            session.assertPersistedKey(persisted);
            const latest = await db
                .table(store)
                .get(sourceKey(store, owner, id));
            if (
                !latest ||
                latest.owner_user_id !== owner ||
                JSON.stringify(latest) !== serialized
            )
                return false;
            await db.encryptedStaging.put(envelope);
            return true;
        },
    );
}

export async function stageOwnerPlaintext(
    session: OfflineKeySession,
    options: { maxRecords?: number } = {},
): Promise<{ staged: number; changed: number; scanned: number }> {
    const owner = requireOwner(session.owner);
    if (await db.ownerEncryptionModes.get(owner))
        throw new Error("Staging is unavailable after activation");
    if (
        options.maxRecords !== undefined &&
        (!Number.isInteger(options.maxRecords) || options.maxRecords < 1)
    )
        throw new Error("Invalid staging batch size");
    const wrapped = await db.offlineKeys.get(owner);
    if (!wrapped) throw new Error("Offline key is unavailable");
    await session.assertMatches(wrapped);
    session.assertPersistedKey(wrapped);
    let staged = 0;
    let changed = 0;
    let scanned = 0;
    for (const store of stores) {
        // Each call starts at the beginning and skips already verified copies.
        // A new or changed source row is therefore found on the next pass,
        // including after a browser restart. Pages bound memory use.
        for (let offset = 0; ; offset += 64) {
            const source = (await db
                .table(store)
                .where("owner_user_id")
                .equals(owner)
                .offset(offset)
                .limit(64)
                .toArray()) as Record<string, unknown>[];
            if (!source.length) break;
            for (const row of source) {
                const id = rowId(store, row);
                const copy = await db.encryptedStaging.get(
                    `${store}:${owner}:${id}`,
                );
                let current = false;
                if (copy) {
                    try {
                        const plaintext = await session.decrypt<
                            Record<string, unknown>
                        >(copy, owner, store, id);
                        current =
                            JSON.stringify(plaintext) === JSON.stringify(row);
                    } catch {
                        // A damaged or foreign shadow is restaged; source is untouched.
                    }
                }
                scanned++;
                if (current) continue;
                if (await stageOne(session, wrapped, store, row)) staged++;
                else changed++;
                if (staged + changed === options.maxRecords)
                    return { staged, changed, scanned };
            }
            if (source.length < 64) break;
        }
    }
    const latest = await db.offlineKeys.get(owner);
    if (!latest) throw new Error("Offline key is unavailable");
    session.assertPersistedKey(latest);
    return { staged, changed, scanned };
}

type Snapshot = {
    source: Map<string, Record<string, unknown>>;
    staging: EncryptedStagingRecord[];
    invalidSource: number;
};

async function readSnapshot(owner: number): Promise<Snapshot> {
    return db.transaction(
        "r",
        [...stores.map((store) => db.table(store)), db.encryptedStaging],
        async () => {
            const source = new Map<string, Record<string, unknown>>();
            let invalidSource = 0;
            for (const store of stores) {
                const rows = (await db
                    .table(store)
                    .where("owner_user_id")
                    .equals(owner)
                    .toArray()) as Record<string, unknown>[];
                for (const row of rows) {
                    try {
                        if (row.owner_user_id !== owner)
                            throw new Error("Owner mismatch");
                        source.set(
                            `${store}:${owner}:${rowId(store, row)}`,
                            row,
                        );
                    } catch {
                        invalidSource++;
                    }
                }
            }
            // Scan metadata for both the indexed owner and rows whose key targets
            // this owner but whose owner index was altered. Other owners' payloads
            // are never decrypted or returned.
            const staging = (await db.encryptedStaging.toArray()).filter(
                (row) =>
                    row.owner_user_id === owner ||
                    (typeof row.key === "string" &&
                        stores.some((store) =>
                            row.key.startsWith(`${store}:${owner}:`),
                        )),
            );
            return { source, staging, invalidSource };
        },
    );
}

function changedRows<T>(before: Map<string, T>, after: Map<string, T>): number {
    let changed = 0;
    for (const [key, value] of before)
        if (
            !after.has(key) ||
            JSON.stringify(after.get(key)) !== JSON.stringify(value)
        )
            changed++;
    for (const key of after.keys()) if (!before.has(key)) changed++;
    return changed;
}

export interface StagingInspection {
    sourceCount: number;
    stagingCount: number;
    verified: number;
    missing: number;
    stale: number;
    orphan: number;
    ownerMismatch: number;
    unsupportedVersion: number;
    identityMismatch: number;
    unreadable: number;
    invalidSource: number;
    changedSource: number;
    changedStaging: number;
    countMismatch: boolean;
    consistentAtInspection: boolean;
}

export async function inspectStagedOwner(
    session: OfflineKeySession,
): Promise<StagingInspection> {
    const owner = requireOwner(session.owner);
    if (await db.ownerEncryptionModes.get(owner))
        throw new Error("Staging inspection is unavailable after activation");
    const wrapped = await db.offlineKeys.get(owner);
    if (!wrapped) throw new Error("Offline key is unavailable");
    await session.assertMatches(wrapped);
    session.assertPersistedKey(wrapped);
    const first = await readSnapshot(owner);
    let verified = 0;
    let missing = 0;
    let stale = 0;
    let orphan = 0;
    let ownerMismatch = 0;
    let unsupportedVersion = 0;
    let identityMismatch = 0;
    let unreadable = 0;
    const copies = new Map(first.staging.map((row) => [row.key, row]));
    for (const key of first.source.keys()) if (!copies.has(key)) missing++;
    for (const copy of first.staging) {
        const source = first.source.get(copy.key);
        if (!source) orphan++;
        if (copy.owner_user_id !== owner) ownerMismatch++;
        if (copy.version !== 1) unsupportedVersion++;
        const store =
            typeof copy.key === "string"
                ? stores.find((item) =>
                      copy.key.startsWith(`${item}:${owner}:`),
                  )
                : undefined;
        const identityValid =
            !!store &&
            copy.record_type === store &&
            copy.record_id === copy.key.slice(`${store}:${owner}:`.length);
        if (!identityValid) identityMismatch++;
        if (
            !source ||
            copy.owner_user_id !== owner ||
            copy.version !== 1 ||
            !identityValid
        )
            continue;
        try {
            const decrypted = await session.decrypt<Record<string, unknown>>(
                copy,
                owner,
                store,
                copy.record_id,
            );
            if (JSON.stringify(decrypted) === JSON.stringify(source))
                verified++;
            else stale++;
        } catch {
            unreadable++;
        }
    }
    const last = await readSnapshot(owner);
    const latestKey = await db.offlineKeys.get(owner);
    if (!latestKey) throw new Error("Offline key is unavailable");
    session.assertPersistedKey(latestKey);
    const firstCopies = new Map(first.staging.map((row) => [row.key, row]));
    const lastCopies = new Map(last.staging.map((row) => [row.key, row]));
    const changedSource = changedRows(first.source, last.source);
    const changedStaging = changedRows(firstCopies, lastCopies);
    const sourceCount = first.source.size + first.invalidSource;
    const stagingCount = first.staging.length;
    const countMismatch = sourceCount !== stagingCount;
    return {
        sourceCount,
        stagingCount,
        verified,
        missing,
        stale,
        orphan,
        ownerMismatch,
        unsupportedVersion,
        identityMismatch,
        unreadable,
        invalidSource: first.invalidSource + last.invalidSource,
        changedSource,
        changedStaging,
        countMismatch,
        consistentAtInspection:
            verified === sourceCount &&
            !countMismatch &&
            !missing &&
            !stale &&
            !orphan &&
            !ownerMismatch &&
            !unsupportedVersion &&
            !identityMismatch &&
            !unreadable &&
            !first.invalidSource &&
            !last.invalidSource &&
            !changedSource &&
            !changedStaging,
    };
}

// This transition is reachable only from the isolated synthetic browser test.
// Production builds and the normal development server cannot activate an owner.
export async function activateSyntheticOwner(session: OfflineKeySession): Promise<void> {
    if (import.meta.env.MODE !== "staging-fixture")
        throw new Error("Aktivasi penyimpanan terenkripsi belum tersedia.");
    const owner = requireOwner(session.owner);
    const inspection = await inspectStagedOwner(session);
    if (!inspection.consistentAtInspection)
        throw new Error("Salinan terenkripsi belum lengkap atau berubah.");
    const wrapped = await db.offlineKeys.get(owner);
    if (!wrapped) throw new Error("Kunci offline tidak tersedia.");
    session.assertPersistedKey(wrapped);
    const verified = await readSnapshot(owner);
    if (verified.invalidSource || verified.source.size !== verified.staging.length)
        throw new Error("Jumlah catatan terenkripsi tidak sesuai.");
    const copies = new Map(verified.staging.map((copy) => [copy.key, copy]));
    for (const [key, source] of verified.source) {
        const copy = copies.get(key);
        if (!copy) throw new Error("Salinan terenkripsi hilang.");
        const type = stores.find((store) => key.startsWith(`${store}:${owner}:`));
        if (!type || copy.owner_user_id !== owner || copy.record_type !== type ||
            copy.record_id !== key.slice(`${type}:${owner}:`.length) || copy.version !== 1)
            throw new Error("Identitas catatan terenkripsi tidak sesuai.");
        const plain = await session.decrypt(copy, owner, type, copy.record_id);
        if (JSON.stringify(plain) !== JSON.stringify(source))
            throw new Error("Salinan terenkripsi usang.");
    }
    await db.transaction("rw", [
        ...stores.map((store) => db.table(store)),
        db.encryptedStaging, db.offlineKeys, db.ownerEncryptionModes,
        db.encryptedOutboxIndex,
    ], async () => {
            if (await db.ownerEncryptionModes.get(owner))
                throw new Error("Pemilik sudah menggunakan penyimpanan terenkripsi.");
            const keyNow = await db.offlineKeys.get(owner);
            if (!keyNow || JSON.stringify(keyNow) !== JSON.stringify(wrapped))
                throw new Error("Kunci offline berubah selama aktivasi.");
            session.assertPersistedKey(keyNow);
            const now = await readSnapshot(owner);
            if (now.invalidSource ||
                JSON.stringify([...now.source]) !== JSON.stringify([...verified.source]) ||
                JSON.stringify(now.staging) !== JSON.stringify(verified.staging))
                throw new Error("Data lokal berubah selama aktivasi.");
            for (const copy of verified.staging.filter((item) => item.record_type === "outbox")) {
                const id = Number(copy.record_id);
                if (!Number.isSafeInteger(id) || id <= 0 ||
                    await db.encryptedOutboxIndex.get(id))
                    throw new Error("Identitas antrean terenkripsi tidak sesuai.");
                await db.encryptedOutboxIndex.add({ id, owner_user_id: owner, ref: copy.record_id });
            }
            await db.ownerEncryptionModes.add({ owner_user_id: owner, mode: "ENCRYPTED" });
        });
    announceSyntheticModeActivation(owner);
}
