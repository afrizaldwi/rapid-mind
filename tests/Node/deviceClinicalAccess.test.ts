import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

async function setup(t: any) {
    const f = await offlineRepositoryFixture(true, { mode: "encrypted-acceptance", initialize: false });
    t.after(f.cleanup);
    await f.continuity.recordVerifiedRelawan({ id: 101, role: "RELAWAN", name: "Relawan Sintetis" }, true);
    return f;
}

test("automatic initialization persists a non-extractable device key and restores it offline", async t => {
    const f = await setup(t);
    await Promise.all([f.deviceKeys.ensureDeviceClinicalAccess(101), f.deviceKeys.ensureDeviceClinicalAccess(101)]);
    const record = await f.db.offlineKeys.get(101);
    assert.equal(record.version, 2);
    assert.equal(record.crypto_key.extractable, false);
    await assert.rejects(crypto.subtle.exportKey("raw", record.crypto_key));
    assert.equal("passphrase" in record, false);
    assert.equal("recovery" in record, false);
    await f.patients.save(101, { id: "offline-patient", name: "Penyintas Sintetis" });
    f.storage.lockAllClinicalKeys();
    f.browser.navigator.onLine = false;
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    assert.equal((await f.db.offlineKeys.get(101)).key_id, record.key_id);
    assert.equal((await f.patients.get(101, "offline-patient")).name, "Penyintas Sintetis");
    assert.doesNotMatch(JSON.stringify(await f.db.encryptedStaging.toArray()), /Penyintas Sintetis/);
});

test("offline T0 saves encrypted emergency and priority outbox together without identity or GPS", async t => {
    const f = await setup(t);
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    f.browser.navigator.onLine = false;
    const id = await f.emergencyWorkflow.createLocalEmergency(101, { redFlagType: "MEDICAL_CRISIS" });
    const queue = await f.outbox.list(101);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].entity_id, id);
    assert.equal(queue[0].priority, 1);
    assert.equal(f.db.emergencies.rows.size, 0);
    assert.equal(f.db.outbox.rows.size, 0);
    f.storage.lockAllClinicalKeys();
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    assert.equal((await f.outbox.list(101))[0].entity_id, id);
    assert.equal((await f.storage.encryptedGet(101, "emergencies", id)).sync_state, "PENDING_SYNC");
});

test("T0 restores an existing device key without an enrollment request", async t => {
    const f = await setup(t);
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    const original = await f.db.offlineKeys.get(101);
    f.storage.lockAllClinicalKeys();
    f.browser.navigator.onLine = false;
    const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("T0 must not request enrollment"); });
    await f.deviceKeys.waitForDeviceClinicalAccess(101);
    assert.equal(fetch.mock.callCount(), 0);
    assert.equal(f.storage.clinicalKeyReady(101), true);
    assert.equal((await f.db.offlineKeys.get(101)).key_id, original.key_id);
    const id = await f.emergencyWorkflow.createLocalEmergency(101, { redFlagType: "PSYCHOSIS" });
    assert.equal((await f.outbox.list(101))[0].entity_id, id);
    await f.continuity.lockRelawanContinuity();
    await assert.rejects(f.deviceKeys.waitForDeviceClinicalAccess(101));
});

test("T0 without a prepared key fails explicitly and does not enroll or write", async t => {
    const f = await setup(t);
    const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected enrollment"); });
    await assert.rejects(f.deviceKeys.waitForDeviceClinicalAccess(101), /Kunci perangkat belum siap/);
    assert.equal(fetch.mock.callCount(), 0);
    assert.equal(await f.db.offlineKeys.get(101), undefined);
    assert.equal((await f.db.encryptedStaging.toArray()).length, 0);
    assert.equal((await f.db.encryptedOutboxIndex.toArray()).length, 0);
});

test("T0 on a denied tunnel origin explains the restriction without network or storage writes", async t => {
    const f = await offlineRepositoryFixture(true, {mode: "development", initialize: false, origin: "https://synthetic.ngrok-free.dev"});
    t.after(f.cleanup);
    await f.continuity.recordVerifiedRelawan({id: 101, role: "RELAWAN", name: "Relawan Sintetis"}, true);
    const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected enrollment"); });
    await assert.rejects(f.deviceKeys.waitForDeviceClinicalAccess(101), /belum diizinkan/);
    assert.equal(fetch.mock.callCount(), 0);
    assert.equal((await f.db.offlineKeys.toArray()).length, 0);
    assert.equal((await f.db.encryptedStaging.toArray()).length, 0);
});

test("device-key T0 still rolls back emergency and outbox on a transaction failure", async t => {
    const f = await setup(t);
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    const before = await f.db.encryptedStaging.toArray();
    t.mock.method(f.db.encryptedOutboxIndex, "add", async () => { throw new Error("Synthetic storage failure"); });
    await assert.rejects(f.emergencyWorkflow.createLocalEmergency(101, { redFlagType: "MEDICAL_CRISIS" }));
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
    assert.equal(f.db.encryptedOutboxIndex.rows.size, 0);
});

test("logout blocks automatic restoration until explicit same-owner online login", async t => {
    const f = await setup(t);
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    await f.continuity.lockRelawanContinuity();
    await assert.rejects(f.deviceKeys.ensureDeviceClinicalAccess(101));
    assert.equal(await f.continuity.recordVerifiedRelawan({ id: 101, role: "RELAWAN", name: "Sintetis" }), false);
    await assert.rejects(f.deviceKeys.ensureDeviceClinicalAccess(101));
    await f.continuity.recordVerifiedRelawan({ id: 202, role: "RELAWAN", name: "Akun Lain" }, true);
    await assert.rejects(f.deviceKeys.ensureDeviceClinicalAccess(101));
    await f.continuity.recordVerifiedRelawan({ id: 101, role: "RELAWAN", name: "Sintetis" }, true);
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    assert.equal(f.storage.clinicalKeyReady(101), true);
});

test("missing or substituted persisted keys never replace keys or delete ciphertext", async t => {
    const f = await setup(t);
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    await f.patients.save(101, { id: "patient", name: "Sintetis" });
    const original = await f.db.offlineKeys.get(101);
    const before = await f.db.encryptedStaging.toArray();
    const wrong = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await f.db.offlineKeys.put({ ...original, crypto_key: wrong });
    await assert.rejects(f.patients.get(101, "patient"));
    await assert.rejects(f.deviceKeys.ensureDeviceClinicalAccess(101));
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
    await f.db.offlineKeys.delete(101);
    await assert.rejects(f.deviceKeys.ensureDeviceClinicalAccess(101));
    assert.equal(await f.db.offlineKeys.get(101), undefined);
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
});

test("legacy passphrase storage is preserved and cannot auto-convert", async t => {
    const f = await offlineRepositoryFixture(true, { mode: "encrypted-acceptance" });
    t.after(f.cleanup);
    const original = await f.db.offlineKeys.get(101);
    const before = await f.db.encryptedStaging.toArray();
    f.storage.lockAllClinicalKeys();
    await assert.rejects(f.deviceKeys.ensureDeviceClinicalAccess(101), /lama/);
    assert.deepEqual(await f.db.offlineKeys.get(101), original);
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
});

test("storage isolation cannot bypass local logout or an invalid role", async t => {
    const f = await setup(t);
    await f.continuity.lockRelawanContinuity();
    const before = await f.db.relawanContinuity.get("active");
    f.databasePreparation.databaseSelections.length = 0;
    assert.equal(await f.continuity.recordVerifiedRelawan({ id: 101, role: "RELAWAN", name: "Sintetis" }), false);
    assert.equal(await f.continuity.recordVerifiedRelawan({ id: 101, role: "ADMIN", name: "Sintetis" }, true), false);
    assert.deepEqual(f.databasePreparation.databaseSelections, []);
    assert.deepEqual(await f.db.relawanContinuity.get("active"), before);
    await assert.rejects(f.deviceKeys.ensureDeviceClinicalAccess(101));
});

test("failed storage selection does not overwrite verified owner continuity", async t => {
    const f = await setup(t);
    const before = await f.db.relawanContinuity.get("active");
    f.databasePreparation.databasePreparationError = new Error("Synthetic storage unavailable");
    await assert.rejects(f.continuity.recordVerifiedRelawan({ id: 202, role: "RELAWAN", name: "Other synthetic owner" }, true));
    assert.deepEqual(await f.db.relawanContinuity.get("active"), before);
    assert.equal(await f.db.offlineKeys.get(202), undefined);
});
