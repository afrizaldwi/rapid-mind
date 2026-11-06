import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

async function unlocked(t: any) {
    const f = await offlineRepositoryFixture(true, {
        mode: "encrypted-acceptance",
    });
    t.after(f.cleanup);
    return f;
}

test("patient snapshots, four SRQ states, observations and priority-1 manual T0 remain encrypted", async (t) => {
    const f = await unlocked(t);
    await f.assessments.save(101, {
        id: "assessment",
        patient_id: "patient-synthetic",
        mode: "NON_VERBAL",
        status: "IN_PROGRESS",
        srq_answers: { 1: true, 2: false, 3: "UNCLEAR", 17: "UNANSWERED" },
        non_verbal_reasons: ["OTHER"],
    });
    await f.queue(101, "assessment");
    const emergencyId = await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS",
        notes: "Catatan sintetis rahasia",
    });
    const items = await f.outbox.list(101);
    assert.deepEqual(
        items.map((item) => item.priority),
        [1, 2],
    );
    assert.equal(items[0].entity_id, emergencyId);
    for (const name of [
        "patients",
        "patientSnapshots",
        "assessments",
        "emergencies",
        "outbox",
    ])
        assert.equal(f.db.table(name).rows.size, 0);
    assert.doesNotMatch(
        JSON.stringify(await f.db.encryptedStaging.toArray()),
        /Catatan sintetis rahasia|Penyintas Sintetis|UNCLEAR|UNANSWERED/,
    );
    assert.deepEqual((await f.assessments.get(101, "assessment")).srq_answers, {
        1: true,
        2: false,
        3: "UNCLEAR",
        17: "UNANSWERED",
    });
    assert.equal((await f.storage.encryptedList(101, "emergencies")).length, 1);
    assert.equal(
        (await f.storage.encryptedList(101, "patientSnapshots")).length,
        1,
    );
    f.storage.lockAllClinicalKeys();
    assert.equal(
        (await f.db.encryptedStaging.toArray()).filter(
            (row) => row.record_type === "emergencies",
        ).length,
        1,
    );
    await assert.rejects(f.outbox.list(101));
});

test("emergency persistence rolls back with its outbox on an injected index-write failure", async (t) => {
    const f = await unlocked(t);
    const before = await f.db.encryptedStaging.toArray();
    t.mock.method(f.db.encryptedOutboxIndex, "add", async () => {
        throw new Error("Synthetic write failure");
    });
    await assert.rejects(
        f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "MEDICAL_CRISIS",
        }),
    );
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
    assert.equal(f.db.encryptedOutboxIndex.rows.size, 0);
    assert.equal((await f.db.outboxIdCounter.get("global")).last_id, 1);
});

test("lock during encryption rejects a stale write and during decryption rejects plaintext delivery", async (t) => {
    const f = await unlocked(t);
    const encrypt = crypto.subtle.encrypt.bind(crypto.subtle);
    const mockEncrypt = t.mock.method(
        crypto.subtle,
        "encrypt",
        async (...args: any[]) => {
            const result = await encrypt(
                ...(args as Parameters<typeof crypto.subtle.encrypt>),
            );
            f.storage.lockAllClinicalKeys();
            return result;
        },
    );
    await assert.rejects(
        f.patients.save(101, { id: "rejected", name: "Sintetis" }),
    );
    assert.equal(
        await f.db.encryptedStaging.get("patients:101:rejected"),
        undefined,
    );
    mockEncrypt.mock.restore();
});

test("durable cross-tab token change rejects pending decrypt even without BroadcastChannel delivery", async (t) => {
    const f = await unlocked(t);
    const decrypt = crypto.subtle.decrypt.bind(crypto.subtle);
    t.mock.method(crypto.subtle, "decrypt", async (...args: any[]) => {
        const result = await decrypt(
            ...(args as Parameters<typeof crypto.subtle.decrypt>),
        );
        f.browser.localStorage.setItem(
            "rapid-mind:clinical-access-v2",
            "another-tab-lock",
        );
        return result;
    });
    await assert.rejects(f.patients.get(101, "patient-synthetic"));
    assert.equal(f.storage.clinicalKeyReady(101), false);
});

test("storage event masks access synchronously; suspended-page restore cannot retain keys", async (t) => {
    const f = await unlocked(t);
    f.browser.dispatchEvent(
        Object.assign(new Event("storage"), {
            key: "rapid-mind:clinical-access-v2",
        }),
    );
    assert.equal(f.storage.clinicalKeyReady(101), false);
    await assert.rejects(f.patients.list(101));
});

test("lock after ciphertext put but before transaction completion rolls back stale emergency", async (t) => {
    const f = await unlocked(t);
    const original = f.db.encryptedStaging.put.bind(f.db.encryptedStaging);
    t.mock.method(f.db.encryptedStaging, "put", async (row: any) => {
        await original(row);
        if (row.record_type === "emergencies") f.storage.lockAllClinicalKeys();
    });
    await assert.rejects(
        f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "MEDICAL_CRISIS",
        }),
    );
    assert.equal(
        (await f.db.encryptedStaging.toArray()).filter(
            (row) => row.record_type === "emergencies",
        ).length,
        0,
    );
    assert.equal(f.db.encryptedOutboxIndex.rows.size, 0);
});

test("outbox indexes cannot alias, orphan or change authenticated numeric IDs; high-water survives acceptance", async (t) => {
    const f = await unlocked(t);
    const id = await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS",
    });
    const [item] = await f.outbox.list(101);
    const index = await f.db.encryptedOutboxIndex.get(item.id);
    await f.db.encryptedOutboxIndex.put({ ...index, id: index.id + 1 });
    await assert.rejects(f.outbox.list(101));
    await f.db.encryptedOutboxIndex.delete(index.id + 1);
    await f.db.encryptedOutboxIndex.delete(index.id);
    await assert.rejects(f.outbox.list(101));
    await f.db.encryptedOutboxIndex.put({
        ...index,
        ref: "missing-ciphertext",
    });
    await assert.rejects(f.outbox.list(101));
    await f.db.encryptedOutboxIndex.put(index);
    assert.equal(
        await f.outbox.complete(101, item, { emergency: { id } }, () => true),
        true,
    );
    assert.equal(
        await f.outbox.complete(101, item, { emergency: { id } }, () => true),
        false,
    );
    assert.equal(
        (await f.db.localSyncReceipts.get(`101:EMERGENCY:${id}`)).revision,
        item.revision,
    );
    await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS",
    });
    assert.ok((await f.outbox.list(101))[0].id > item.id);
});

test("owner profile is encrypted and durable continuity rejection does not depend on notifications", async (t) => {
    const f = await unlocked(t);
    const { exports: profile } = await f.load(
        "resources/js/offline/offlineOwnerProfile.ts",
    );
    await profile.rememberUnlockedRelawan({
        id: 101,
        role: "RELAWAN",
        name: "Nama privat sintetis",
        shelter_id: 77,
        shelter: { name: "Posko privat" },
    });
    assert.deepEqual(await profile.readUnlockedRelawan(101), {
        name: "Nama privat sintetis",
        shelterId: 77,
        shelterName: "Posko privat",
    });
    assert.doesNotMatch(
        JSON.stringify(await f.db.encryptedStaging.toArray()),
        /Nama privat sintetis|Posko privat/,
    );
    const context = await f.db.relawanContinuity.get("active");
    await f.db.relawanContinuity.put({ ...context, logout_pending: true });
    await assert.rejects(f.patients.get(101, "patient-synthetic"));
    assert.equal(f.storage.clinicalKeyReady(101), false);
});

test("missing, negative or regressed high-water mark cannot silently reuse an outbox ID", async (t) => {
    const f = await unlocked(t);
    const first = await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS",
    });
    await f.db.outboxIdCounter.delete("global");
    await assert.rejects(
        f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "MEDICAL_CRISIS",
        }),
    );
    await f.db.outboxIdCounter.put({ key: "global", last_id: -1 });
    await assert.rejects(
        f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "MEDICAL_CRISIS",
        }),
    );
    await f.db.outboxIdCounter.put({ key: "global", last_id: 0 });
    await assert.rejects(
        f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "MEDICAL_CRISIS",
        }),
    );
    assert.equal(
        (await f.storage.encryptedList(101, "emergencies"))[0].id,
        first,
    );
});

test("privacy-storage or UI listener failures cannot preserve an active clinical key", async (t) => {
    const f = await unlocked(t);
    f.fence.onClinicalInvalidation(() => {
        throw new Error("Synthetic history failure");
    });
    assert.doesNotThrow(() => f.storage.lockAllClinicalKeys());
    assert.equal(f.storage.clinicalKeyReady(101), false);
    assert.ok(f.browser.localStorage.getItem("rapid-mind:clinical-access-v2"));
});

test("completed queue receipts prevent outbox ID reuse after the high-water counter is regressed", async (t) => {
    const f = await unlocked(t);
    const emergencyId = await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS",
    });
    const [first] = await f.outbox.list(101);
    assert.equal(first.id, 1);
    assert.equal(
        await f.outbox.complete(
            101,
            first,
            { emergency: { id: emergencyId } },
            () => true,
        ),
        true,
    );
    assert.equal(f.db.encryptedOutboxIndex.rows.size, 0);
    assert.equal((await f.outbox.list(101)).length, 0);
    const receiptKey = `101:EMERGENCY:${emergencyId}`;
    const receipt = await f.db.localSyncReceipts.get(receiptKey);
    assert.equal(receipt.outbox_id, 1);

    await f.db.outboxIdCounter.put({ key: "global", last_id: 0 });
    await assert.rejects(
        f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "MEDICAL_CRISIS",
        }),
        /Insiden darurat belum tersimpan/,
    );
    assert.equal(
        (await f.db.outboxIdCounter.get("global")).last_id,
        0,
        "corruption must not be repaired silently",
    );
    assert.equal(f.db.encryptedOutboxIndex.rows.size, 0);
    assert.deepEqual(await f.db.localSyncReceipts.get(receiptKey), receipt);

    // Restore only this synthetic fixture to check that the safeguard also
    // rejects a positive counter that regresses below a later completed ID.
    await f.db.outboxIdCounter.put({ key: "global", last_id: 1 });
    const secondEmergencyId = await f.emergencyWorkflow.createLocalEmergency(
        101,
        { redFlagType: "MEDICAL_CRISIS" },
    );
    const [second] = await f.outbox.list(101);
    assert.equal(second.id, 2);
    await f.outbox.complete(
        101,
        second,
        { emergency: { id: secondEmergencyId } },
        () => true,
    );
    await f.db.outboxIdCounter.put({ key: "global", last_id: 1 });
    await assert.rejects(
        f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "MEDICAL_CRISIS",
        }),
        /Insiden darurat belum tersimpan/,
    );
});

test("a receipt lacking numeric outbox identity blocks allocation without deleting its evidence", async (t) => {
    const f = await unlocked(t);
    await f.db.outboxIdCounter.put({ key: "global", last_id: 5 });
    const receipt = {
        key: "101:EMERGENCY:synthetic-legacy-receipt",
        owner_user_id: 101,
        type: "EMERGENCY",
        entity_id: "synthetic-legacy-receipt",
        canonical_id: "synthetic-legacy-receipt",
        revision: 1,
        accepted_at: new Date().toISOString(),
    };
    await f.db.localSyncReceipts.put(receipt);
    await assert.rejects(
        f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "MEDICAL_CRISIS",
        }),
        /Insiden darurat belum tersimpan/,
    );
    assert.deepEqual(await f.db.localSyncReceipts.get(receipt.key), receipt);
    assert.equal((await f.db.outboxIdCounter.get("global")).last_id, 5);
});
