import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

async function fixture(t: any) {
    const f = await offlineRepositoryFixture(true, { mode: "encrypted-acceptance" });
    t.after(f.cleanup);
    return f;
}
async function delivered(f: any, routing = "ROUTED", patientId?: string) {
    const id = await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS", patientId, notes: "Laporan sintetis",
    });
    const item = (await f.outbox.list(101)).find((row: any) => row.entity_id === id);
    assert.equal(await f.outbox.complete(101, item, { emergency: { id, routing_status: routing } }, () => true), true);
    return id;
}

test("routed receipt removes local report and orphan identity while retaining the receipt", async (t) => {
    const f = await fixture(t);
    const id = await delivered(f, "ROUTED", "patient-synthetic");
    assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, id));
    assert.ok(await f.outbox.pruneDelivered(101));
    assert.equal(await f.emergencyWorkflow.loadLocalEmergency(101, id), undefined);
    assert.equal(await f.patients.get(101, "patient-synthetic"), undefined);
    assert.equal((await f.db.localSyncReceipts.toArray()).length, 1);
    assert.equal(await f.outbox.pruneDelivered(101), 0);
});

for (const routing of ["UNRESOLVED", "UNKNOWN"]) {
    test(`server receipt without confirmed Healthcare routing retains report (${routing})`, async (t) => {
        const f = await fixture(t); const id = await delivered(f, routing);
        assert.equal(await f.outbox.pruneDelivered(101), 0);
        assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, id));
    });
}

test("pending report and shared patient remain when a different report was delivered", async (t) => {
    const f = await fixture(t);
    const sent = await delivered(f, "ROUTED", "patient-synthetic");
    const pending = await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS", patientId: "patient-synthetic",
    });
    await f.outbox.pruneDelivered(101);
    assert.equal(await f.emergencyWorkflow.loadLocalEmergency(101, sent), undefined);
    assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, pending));
    assert.ok(await f.patients.get(101, "patient-synthetic"));
    assert.equal((await f.outbox.list(101)).length, 1);
});

test("changed ciphertext, missing proof and stale owner scope cannot delete data", async (t) => {
    const f = await fixture(t); const id = await delivered(f);
    await assert.rejects(f.outbox.pruneDelivered(101, () => false));
    assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, id));
    await f.storage.encryptedMutate(101, "emergencies", id, (record: any) => ({ ...record, notes: "Catatan berubah" }));
    assert.equal(await f.outbox.pruneDelivered(101), 0);
    assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, id));
    f.storage.lockAllClinicalKeys();
    await assert.rejects(f.outbox.pruneDelivered(101));
});

test("a delivered assessment remains until its pending T0 dependency is delivered", async (t) => {
    const f = await fixture(t);
    await f.assessments.save(101, {
        id: "assessment", patient_id: "patient-synthetic", mode: "VERBAL", status: "COMPLETED",
        srq_answers: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, false])),
        risk_indicators: { R1: false, R2: false, R3: false, R4: false, R5: false },
        function_domains: { F1: 0, F2: 0, F3: 0 },
    });
    await f.queue(101, "assessment");
    const assessment = await f.assessments.get(101, "assessment");
    const a = (await f.outbox.list(101)).find((item: any) => item.type === "ASSESSMENT");
    await f.outbox.complete(101, a, { assessment: { ...assessment, routing_status: "ROUTED" } }, () => true);
    const id = await f.emergencyWorkflow.createLocalEmergency(101, {
        patientId: "patient-synthetic", assessmentId: "assessment", redFlagType: "MEDICAL_CRISIS",
        serverKnownAssessment: true,
    });
    assert.equal(await f.outbox.pruneDelivered(101), 0);
    assert.ok(await f.assessments.get(101, "assessment"));
    const e = (await f.outbox.list(101)).find((item: any) => item.entity_id === id);
    await f.outbox.complete(101, e, { emergency: { id, routing_status: "ROUTED" } }, () => true);
    await f.outbox.pruneDelivered(101);
    assert.equal(await f.assessments.get(101, "assessment"), undefined);
    assert.equal(await f.emergencyWorkflow.loadLocalEmergency(101, id), undefined);
    assert.equal(await f.patients.get(101, "patient-synthetic"), undefined);
});

test("a SYNCED label without a receipt never authorizes deletion", async (t) => {
    const f = await fixture(t); const id = await delivered(f);
    const receipt = (await f.db.localSyncReceipts.toArray())[0];
    await f.db.localSyncReceipts.delete(receipt.key);
    assert.equal(await f.outbox.pruneDelivered(101), 0);
    assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, id));
});

test("a concurrent ciphertext write aborts the entire cleanup", async (t) => {
    const f = await fixture(t); const id = await delivered(f);
    const original = f.db.transaction.bind(f.db);
    let changed = false;
    t.mock.method(f.db, "transaction", async (...args: any[]) => {
        if (!changed && args[0] === "rw" && Array.isArray(args[1]) && args[1][0] === f.db.encryptedStaging) {
            changed = true;
            await f.storage.encryptedMutate(101, "ownerProfiles", "101", () => ({ name: "Profil sintetis" }));
        }
        return original(...args);
    });
    await assert.rejects(f.outbox.pruneDelivered(101), /Data lokal berubah/);
    assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, id));
});

test("offline and failed delivery survive until a successful retry has a routed receipt", async (t) => {
    const f = await fixture(t);
    const id = await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS", patientId: "patient-synthetic",
    });
    const lease = f.syncManager.setOwner(101);
    t.after(() => f.syncManager.clearOwner(lease));
    f.browser.navigator.onLine = false;
    assert.equal(await f.outbox.pruneDelivered(101), 0);
    assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, id));
    await f.syncManager.sync(101);
    assert.equal((await f.outbox.list(101)).length, 1);
    f.browser.navigator.onLine = true;
    f.setTransport(async () => ({ ok: false, status: 503 }));
    await f.syncManager.sync(101);
    assert.equal((await f.outbox.list(101))[0].status, "FAILED");
    assert.equal(await f.outbox.pruneDelivered(101), 0);
    assert.ok(await f.emergencyWorkflow.loadLocalEmergency(101, id));
    f.setTransport(async () => ({ ok: true, status: 200, json: async () => ({
        emergency: { id, routing_status: "ROUTED" },
    }) }));
    await f.syncManager.sync(101);
    assert.equal((await f.outbox.list(101)).length, 0);
    assert.equal(await f.emergencyWorkflow.loadLocalEmergency(101, id), undefined);
    assert.equal((await f.db.localSyncReceipts.toArray()).length, 1);
});
