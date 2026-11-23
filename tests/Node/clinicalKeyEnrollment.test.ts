import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

const passphrase = "frasa panjang pemilik sintetis khusus B4.2";
async function fresh(t: any) {
    const f = await offlineRepositoryFixture(false, {
        mode: "encrypted-acceptance",
        initialize: false,
    });
    t.after(f.cleanup);
    await f.continuity.recordVerifiedRelawan(
        {
            id: 101,
            role: "RELAWAN",
            name: "Nama rahasia",
            shelter_id: 99,
            shelter: { name: "Posko rahasia" },
        },
        true,
    );
    t.mock.method(
        globalThis,
        "fetch",
        async () =>
            new Response(
                JSON.stringify({
                    state: "AUTHENTICATED",
                    user: { id: 101, role: "RELAWAN" },
                }),
            ),
    );
    return f;
}

test("fresh enrollment persists pending state; confirmation alone enables ciphertext; bootstrap omits profile", async (t) => {
    const f = await fresh(t);
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "FRESH",
    );
    await assert.rejects(
        f.patients.save(101, { name: "Dilarang sebelum enrollment" }),
    );
    await assert.rejects(
        f.enrollment.beginClinicalEnrollment(101, passphrase, "beda"),
    );
    const recovery = await f.enrollment.beginClinicalEnrollment(
        101,
        passphrase,
        passphrase,
    );
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "ENROLLMENT_PENDING",
    );
    assert.equal(f.storage.clinicalKeyReady(101), false);
    assert.equal(f.db.patients.rows.size, 0);
    assert.doesNotMatch(
        JSON.stringify(await f.db.offlineKeys.get(101)),
        new RegExp(recovery),
    );
    await assert.rejects(f.patients.save(101, { name: "Masih dilarang" }));
    await f.enrollment.confirmClinicalRecovery(101);
    assert.equal(f.storage.clinicalKeyReady(101), true);
    await f.patients.save(101, { id: "sintetis", name: "Penyintas rahasia" });
    assert.equal(f.db.patients.rows.size, 0);
    assert.doesNotMatch(
        JSON.stringify(await f.db.encryptedStaging.toArray()),
        /Penyintas rahasia/,
    );
    assert.equal(
        (await f.patients.get(101, "sintetis")).name,
        "Penyintas rahasia",
    );
    assert.doesNotMatch(
        JSON.stringify(await f.db.relawanContinuity.get("active")),
        /Nama rahasia|Posko rahasia|99/,
    );
    f.storage.lockAllClinicalKeys();
    f.browser.navigator.onLine = false;
    await f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase");
    assert.equal(
        (await f.patients.get(101, "sintetis")).name,
        "Penyintas rahasia",
    );
    f.storage.lockAllClinicalKeys();
    await f.enrollment.unlockClinicalOwner(101, recovery, "recovery");
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(102, passphrase, "passphrase"),
    );
});

test("interrupted enrollment rewraps the same verified DEK explicitly and rejects previous confirmation", async (t) => {
    const f = await fresh(t);
    const oldCode = await f.enrollment.beginClinicalEnrollment(
        101,
        passphrase,
        passphrase,
    );
    const before = await f.db.offlineKeys.get(101);
    f.storage.lockAllClinicalKeys();
    await assert.rejects(f.enrollment.confirmClinicalRecovery(101));
    await assert.rejects(
        f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase),
    );
    const code = await f.enrollment.continueClinicalEnrollment(101, passphrase);
    const after = await f.db.offlineKeys.get(101);
    assert.deepEqual(after.passphrase, before.passphrase);
    assert.deepEqual(after.verification, before.verification);
    assert.equal(after.created_at, before.created_at);
    assert.notEqual(code, oldCode);
    await f.enrollment.confirmClinicalRecovery(101);
    f.storage.lockAllClinicalKeys();
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(101, oldCode, "recovery"),
    );
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(101, "salah", "passphrase"),
    );
    await f.enrollment.unlockClinicalOwner(101, code, "recovery");
    assert.equal(f.storage.clinicalKeyReady(101), true);
});

test("reload after wrapped-key persistence or final confirmation never creates a new DEK", async (t) => {
    const f = await fresh(t);
    await f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase);
    const key = await f.db.offlineKeys.get(101);
    f.enrollment.abandonPendingEnrollment(101);
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "ENROLLMENT_PENDING",
    );
    await assert.rejects(f.enrollment.confirmClinicalRecovery(101));
    await f.enrollment.continueClinicalEnrollment(101, passphrase);
    await f.enrollment.confirmClinicalRecovery(101);
    f.storage.lockAllClinicalKeys();
    await f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase");
    assert.equal((await f.db.offlineKeys.get(101)).created_at, key.created_at);
});

test("unexpected legacy including ownerless rows is quarantined without deletion", async (t) => {
    const f = await fresh(t);
    await f.db.patients.put({ id: "ownerless", name: "Sintetis legacy" });
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "LEGACY_BLOCKED",
    );
    await assert.rejects(
        f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase),
    );
    await assert.rejects(f.patients.list(101));
    assert.equal(f.db.patients.rows.size, 1);
    assert.equal(f.db.offlineKeys.rows.size, 0);
});

test("missing marker, missing key, corrupt proof and changed key identity fail closed", async (t) => {
    const f = await fresh(t);
    await f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase);
    await f.enrollment.confirmClinicalRecovery(101);
    const mode = await f.db.ownerEncryptionModes.get(101);
    const key = await f.db.offlineKeys.get(101);
    f.storage.lockAllClinicalKeys();
    await f.db.ownerEncryptionModes.delete(101);
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "INCONSISTENT",
    );
    await assert.rejects(f.patients.list(101));
    await f.db.ownerEncryptionModes.put(mode);
    await f.db.offlineKeys.delete(101);
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase"),
    );
    await f.db.offlineKeys.put({
        ...key,
        verification: { ...key.verification, ciphertext: "AAAA" },
    });
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase"),
    );
    await f.db.offlineKeys.put({
        ...key,
        passphrase: { ...key.passphrase, iterations: 1 },
    });
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase"),
    );
});

test("lock during key derivation cannot install a stale key; logout and owner switch reject access", async (t) => {
    const f = await fresh(t);
    await f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase);
    await f.enrollment.confirmClinicalRecovery(101);
    f.storage.lockAllClinicalKeys();
    const original = crypto.subtle.deriveKey.bind(crypto.subtle);
    const mocked = t.mock.method(
        crypto.subtle,
        "deriveKey",
        async (...args: any[]) => {
            f.storage.lockAllClinicalKeys();
            return original(
                ...(args as Parameters<typeof crypto.subtle.deriveKey>),
            );
        },
    );
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase"),
    );
    mocked.mock.restore();
    assert.equal(f.storage.clinicalKeyReady(101), false);
    await f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase");
    await f.continuity.lockRelawanContinuity();
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase"),
    );
    await f.continuity.recordVerifiedRelawan(
        { id: 102, name: "Sintetis lain", role: "RELAWAN" },
        true,
    );
    await assert.rejects(
        f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase"),
    );
});

test("ordinary builds retain controlled activation boundary", async (t) => {
    const f = await offlineRepositoryFixture(false, {
        mode: "production",
        initialize: false,
    });
    t.after(f.cleanup);
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "ACTIVATION_DISABLED",
    );
    await assert.rejects(
        f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase),
    );
    await assert.rejects(f.patients.save(101, { name: "Sintetis" }));
});

test("failed wrapped-key persistence remains fresh; failed final marker remains pending and retryable", async t => {
    const f = await fresh(t);
    const add = t.mock.method(f.db.offlineKeys, "add", async () => { throw new Error("Synthetic quota"); });
    await assert.rejects(f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase));
    assert.equal(await f.initialization.inspectClinicalInitialization(101), "FRESH");
    assert.equal(f.db.offlineKeys.rows.size, 0);
    add.mock.restore();
    await f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase);
    const put = t.mock.method(f.db.ownerEncryptionModes, "put", async () => { throw new Error("Synthetic marker failure"); });
    await assert.rejects(f.enrollment.confirmClinicalRecovery(101));
    assert.equal(await f.initialization.inspectClinicalInitialization(101), "ENROLLMENT_PENDING");
    assert.equal(f.storage.clinicalKeyReady(101), false);
    put.mock.restore();
    await f.enrollment.continueClinicalEnrollment(101, passphrase);
    await f.enrollment.confirmClinicalRecovery(101);
    assert.equal(f.storage.clinicalKeyReady(101), true);
});

test("server owner or role mismatch and unavailable access storage reject initialization", async t => {
    const f = await fresh(t);
    const response = t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ state: "AUTHENTICATED", user: { id: 102, role: "HEALTHCARE" } })));
    await assert.rejects(f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase));
    assert.equal(f.db.offlineKeys.rows.size, 0);
    response.mock.restore();
    t.mock.method(f.browser.localStorage, "getItem", () => { throw new Error("Synthetic privacy mode"); });
    await assert.rejects(f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase));
});
