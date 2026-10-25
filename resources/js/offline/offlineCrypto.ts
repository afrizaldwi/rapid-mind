import type {
    ClinicalStore,
    EncryptedStagingRecord,
    WrappedOfflineKey,
} from "./db";

const VERSION = 1 as const;
const ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function requireOwner(owner: number): number {
    if (!Number.isInteger(owner) || owner <= 0)
        throw new Error("Valid Relawan owner is required");
    return owner;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
    return crypto.getRandomValues(new Uint8Array(length));
}

function encoded(bytes: Uint8Array): string {
    let binary = "";
    for (let start = 0; start < bytes.length; start += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function decoded(value: string): Uint8Array<ArrayBuffer> {
    if (!/^[A-Za-z0-9_-]+$/.test(value))
        throw new Error("Invalid encrypted data");
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function associatedData(
    owner: number,
    type: string,
    id: string,
): Uint8Array<ArrayBuffer> {
    return encoder.encode(
        JSON.stringify(["rapid-mind-offline", VERSION, owner, type, id]),
    );
}

async function derive(
    secret: string,
    salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
    const source = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        "PBKDF2",
        false,
        ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
        source,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

async function wrap(
    rawKey: Uint8Array<ArrayBuffer>,
    owner: number,
    secret: string,
    purpose: string,
) {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const kek = await derive(secret, salt);
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
            additionalData: associatedData(owner, purpose, "dek"),
        },
        kek,
        rawKey,
    );
    return {
        salt: encoded(salt),
        iv: encoded(iv),
        ciphertext: encoded(new Uint8Array(ciphertext)),
        iterations: ITERATIONS,
    };
}

async function unwrap(
    record: WrappedOfflineKey,
    secret: string,
    purpose: "passphrase" | "recovery",
): Promise<CryptoKey> {
    if (record.version !== VERSION || record[purpose].iterations !== ITERATIONS)
        throw new Error("Unsupported offline key version");
    const envelope = record[purpose];
    const salt = decoded(envelope.salt);
    const iv = decoded(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12)
        throw new Error("Invalid offline key metadata");
    const kek = await derive(secret, salt);
    let raw: Uint8Array<ArrayBuffer> | null = null;
    try {
        raw = new Uint8Array(
            await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv,
                    additionalData: associatedData(
                        record.owner_user_id,
                        purpose,
                        "dek",
                    ),
                },
                kek,
                decoded(envelope.ciphertext),
            ),
        );
        if (raw.length !== 32) throw new Error("Invalid offline key length");
        return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
            "encrypt",
            "decrypt",
        ]);
    } catch {
        throw new Error("Offline unlock failed");
    } finally {
        raw?.fill(0);
    }
}

export function validateOfflinePassphrase(passphrase: string): void {
    if (
        passphrase.length < 20 ||
        passphrase.length > 1024 ||
        new Set(passphrase).size < 4
    )
        throw new Error(
            "Frasa sandi offline harus 20–1024 karakter dan tidak berulang.",
        );
}

export class OfflineKeySession {
    readonly owner: number;
    private key: CryptoKey | null;
    private generation = 0;
    private persistedKey: string | null = null;

    constructor(owner: number, key: CryptoKey) {
        requireOwner(owner);
        this.owner = owner;
        this.key = key;
    }

    get unlocked(): boolean {
        return this.key !== null;
    }

    lock(): void {
        this.key = null;
        this.persistedKey = null;
        this.generation++;
    }

    bindPersistedKey(record: WrappedOfflineKey): void {
        this.available(record.owner_user_id);
        this.persistedKey = JSON.stringify(record);
    }

    assertPersistedKey(record: WrappedOfflineKey): void {
        this.available(record.owner_user_id);
        if (!this.persistedKey || this.persistedKey !== JSON.stringify(record))
            throw new Error("Offline key metadata changed; unlock again");
    }

    private available(owner: number): CryptoKey {
        if (requireOwner(owner) !== this.owner || !this.key)
            throw new Error("Offline data is locked for this owner");
        return this.key;
    }

    async createKeyProof(): Promise<{ iv: string; ciphertext: string }> {
        const key = this.available(this.owner);
        const generation = this.generation;
        const iv = randomBytes(12);
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData: associatedData(this.owner, "key-proof", "dek"),
            },
            key,
            encoder.encode("rapid-mind-offline-key-proof-v1"),
        );
        if (generation !== this.generation)
            throw new Error("Offline data was locked during key verification");
        return {
            iv: encoded(iv),
            ciphertext: encoded(new Uint8Array(ciphertext)),
        };
    }

    async assertMatches(record: WrappedOfflineKey): Promise<void> {
        const key = this.available(record.owner_user_id);
        if (record.version !== VERSION || !record.verification)
            throw new Error("Offline key proof unavailable");
        const iv = decoded(record.verification.iv);
        if (iv.length !== 12) throw new Error("Invalid offline key proof");
        const generation = this.generation;
        try {
            const plaintext = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv,
                    additionalData: associatedData(
                        this.owner,
                        "key-proof",
                        "dek",
                    ),
                },
                key,
                decoded(record.verification.ciphertext),
            );
            if (decoder.decode(plaintext) !== "rapid-mind-offline-key-proof-v1")
                throw new Error("Invalid offline key proof");
        } catch {
            throw new Error("Offline session does not match the stored key");
        }
        if (generation !== this.generation)
            throw new Error("Offline data was locked during key verification");
    }

    async encrypt(
        recordType: ClinicalStore,
        recordId: string,
        value: unknown,
    ): Promise<EncryptedStagingRecord> {
        const key = this.available(this.owner);
        const generation = this.generation;
        const serialized = JSON.stringify(value);
        if (serialized === undefined)
            throw new Error("Record cannot be encrypted");
        const iv = randomBytes(12);
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData: associatedData(
                    this.owner,
                    recordType,
                    recordId,
                ),
            },
            key,
            encoder.encode(serialized),
        );
        if (generation !== this.generation)
            throw new Error("Offline data was locked during encryption");
        return {
            key: `${recordType}:${this.owner}:${recordId}`,
            owner_user_id: this.owner,
            record_type: recordType,
            record_id: recordId,
            version: VERSION,
            iv: encoded(iv),
            ciphertext: encoded(new Uint8Array(ciphertext)),
        };
    }

    async decrypt<T>(
        envelope: EncryptedStagingRecord,
        owner: number,
        recordType: ClinicalStore,
        recordId: string,
    ): Promise<T> {
        const key = this.available(owner);
        if (
            envelope.version !== VERSION ||
            envelope.owner_user_id !== owner ||
            envelope.record_type !== recordType ||
            envelope.record_id !== recordId ||
            envelope.key !== `${recordType}:${owner}:${recordId}`
        )
            throw new Error("Encrypted record identity mismatch");
        const iv = decoded(envelope.iv);
        if (iv.length !== 12) throw new Error("Invalid encrypted record IV");
        const generation = this.generation;
        let plaintext: ArrayBuffer;
        try {
            plaintext = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv,
                    additionalData: associatedData(owner, recordType, recordId),
                },
                key,
                decoded(envelope.ciphertext),
            );
        } catch {
            throw new Error("Encrypted record authentication failed");
        }
        if (generation !== this.generation)
            throw new Error("Offline data was locked during decryption");
        return JSON.parse(decoder.decode(plaintext)) as T;
    }
}

export async function createOfflineKey(
    owner: number,
    passphrase: string,
): Promise<{
    record: WrappedOfflineKey;
    recoveryCode: string;
    session: OfflineKeySession;
}> {
    requireOwner(owner);
    validateOfflinePassphrase(passphrase);
    const raw = randomBytes(32);
    const recoveryCode = encoded(randomBytes(32));
    try {
        const [passphraseEnvelope, recoveryEnvelope, key] = await Promise.all([
            wrap(raw, owner, passphrase, "passphrase"),
            wrap(raw, owner, recoveryCode, "recovery"),
            crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
                "encrypt",
                "decrypt",
            ]),
        ]);
        const session = new OfflineKeySession(owner, key);
        return {
            record: {
                owner_user_id: owner,
                version: VERSION,
                passphrase: passphraseEnvelope,
                recovery: recoveryEnvelope,
                verification: await session.createKeyProof(),
                created_at: new Date().toISOString(),
            },
            recoveryCode,
            session,
        };
    } finally {
        raw.fill(0);
    }
}

export async function unlockOfflineKey(
    record: WrappedOfflineKey,
    secret: string,
    purpose: "passphrase" | "recovery",
): Promise<OfflineKeySession> {
    requireOwner(record.owner_user_id);
    if (purpose === "recovery" && decoded(secret).length !== 32)
        throw new Error("Invalid recovery code");
    return new OfflineKeySession(
        record.owner_user_id,
        await unwrap(record, secret, purpose),
    );
}
