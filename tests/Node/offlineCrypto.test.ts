import assert from "node:assert/strict";
import { test } from "node:test";
import {
    createOfflineKey,
    unlockOfflineKey,
    validateOfflinePassphrase,
} from "../../resources/js/offline/offlineCrypto.ts";

test("wrapped owner key survives a simulated reopen and rejects wrong secrets", async () => {
    const passphrase = "empat kata panjang aman sekali 2026";
    const { record, recoveryCode, session } = await createOfflineKey(
        17,
        passphrase,
    );
    const payload = {
        id: "stable-uuid",
        name: "Penyintas Sintetis",
        nik: "0000000000000000",
    };
    const encrypted = await session.encrypt("patients", payload.id, payload);
    assert.equal(encrypted.owner_user_id, 17);
    assert.ok(!JSON.stringify(encrypted).includes(payload.name));
    assert.ok(!JSON.stringify(record).includes(passphrase));
    assert.ok(!JSON.stringify(record).includes(recoveryCode));
    session.lock();
    await assert.rejects(
        session.decrypt(encrypted, 17, "patients", payload.id),
        /locked/,
    );

    const persisted = JSON.parse(JSON.stringify(record));
    await assert.rejects(
        unlockOfflineKey(persisted, "incorrect passphrase", "passphrase"),
        /unlock failed/,
    );
    const reopened = await unlockOfflineKey(
        persisted,
        passphrase,
        "passphrase",
    );
    assert.deepEqual(
        await reopened.decrypt(encrypted, 17, "patients", payload.id),
        payload,
    );
    reopened.lock();
    const recovered = await unlockOfflineKey(
        persisted,
        recoveryCode,
        "recovery",
    );
    assert.deepEqual(
        await recovered.decrypt(encrypted, 17, "patients", payload.id),
        payload,
    );
    recovered.lock();
});

test("record identity, owner, and ciphertext authentication reject alteration", async () => {
    const { session } = await createOfflineKey(
        23,
        "panjang sekali frasa sandi relawan ini",
    );
    const envelope = await session.encrypt("emergencies", "event-1", {
        id: "event-1",
        notes: "synthetic",
    });
    await assert.rejects(
        session.decrypt(envelope, 24, "emergencies", "event-1"),
        /locked/,
    );
    await assert.rejects(
        session.decrypt(envelope, 23, "assessments", "event-1"),
        /identity mismatch/,
    );
    await assert.rejects(
        session.decrypt(envelope, 23, "emergencies", "event-2"),
        /identity mismatch/,
    );
    const tampered = {
        ...envelope,
        ciphertext: envelope.ciphertext.replace(
            /^./,
            envelope.ciphertext[0] === "A" ? "B" : "A",
        ),
    };
    await assert.rejects(
        session.decrypt(tampered, 23, "emergencies", "event-1"),
        /authentication failed/,
    );
    session.lock();
});

test("weak offline passphrases are rejected before key creation", () => {
    assert.throws(() => validateOfflinePassphrase("short"), /20/);
    assert.throws(() => validateOfflinePassphrase("a".repeat(32)), /20/);
});

test("assessment and priority T0 outbox copies retain exact payloads and revision", async () => {
    const { session } = await createOfflineKey(
        31,
        "frasa sandi lapangan panjang dan unik",
    );
    const assessment = {
        id: "assessment-uuid",
        owner_user_id: 31,
        patient_id: "patient-uuid",
        status: "IN_PROGRESS",
        srq_answers: { 1: true, 17: false },
    };
    const outbox = {
        id: 5,
        owner_user_id: 31,
        type: "EMERGENCY",
        entity_id: "emergency-uuid",
        priority: 1,
        revision: 7,
        status: "FAILED",
        payload: {
            id: "emergency-uuid",
            patient: { name: "Penyintas Sintetis" },
            notes: "Catatan sintetis",
        },
    };
    const assessmentCopy = await session.encrypt(
        "assessments",
        assessment.id,
        assessment,
    );
    const outboxCopy = await session.encrypt(
        "outbox",
        String(outbox.id),
        outbox,
    );
    assert.ok(!JSON.stringify(assessmentCopy).includes("srq_answers"));
    assert.ok(!JSON.stringify(outboxCopy).includes("Penyintas Sintetis"));
    assert.deepEqual(
        await session.decrypt(assessmentCopy, 31, "assessments", assessment.id),
        assessment,
    );
    assert.deepEqual(
        await session.decrypt(outboxCopy, 31, "outbox", String(outbox.id)),
        outbox,
    );
    assert.notEqual(assessmentCopy.iv, outboxCopy.iv);
    session.lock();
});

test("stored key proof rejects a different DEK for the same owner", async () => {
    const first = await createOfflineKey(
        41,
        "frasa sandi pertama yang cukup panjang",
    );
    const second = await createOfflineKey(
        41,
        "frasa sandi kedua yang cukup panjang",
    );
    await first.session.assertMatches(first.record);
    await assert.rejects(
        second.session.assertMatches(first.record),
        /does not match/,
    );
    await assert.rejects(
        first.session.assertMatches({
            ...first.record,
            verification: undefined,
        }),
        /proof unavailable/,
    );
    first.session.lock();
    second.session.lock();
});
