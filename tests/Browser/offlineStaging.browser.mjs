import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const profile = await mkdtemp(join(tmpdir(), "rapid-mind-staging-isolated-"));
const chromeExecutable =
    process.env.RAPID_MIND_CHROME_BIN ?? "/usr/bin/google-chrome";
const vite = spawn(
    "./node_modules/.bin/vite",
    ["--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { stdio: "ignore" },
);
let context;
try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
        try {
            const response = await fetch(
                `${origin}/tests/Browser/stagingBlank.html`,
            );
            if (
                response.ok &&
                (await response.text()).includes("Isolated staging fixture")
            ) {
                ready = true;
                break;
            }
        } catch {
            /* Wait for isolated Vite server. */
        }
        await delay(250);
    }
    if (!ready) throw new Error("Isolated Vite server did not start");
    const open = async () => {
        context = await chromium.launchPersistentContext(profile, {
            executablePath: chromeExecutable,
            headless: true,
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
        });
        const page = context.pages()[0] ?? (await context.newPage());
        await page.goto(`${origin}/tests/Browser/stagingBlank.html`);
        return page;
    };
    let page = await open();
    const upgrade = await page.evaluate(async () => {
        const fixture = await import("/tests/Browser/offlineStagingFixture.ts");
        await fixture.seedSyntheticV4();
        const { db } = await import("/resources/js/offline/db.ts");
        await db.open();
        return {
            version: db.verno,
            patients: await db.patients.count(),
            emergency: await db.emergencies.get("emergency-101"),
            outbox: await db.outbox.get(7),
        };
    });
    assert.equal(upgrade.version, 5);
    assert.equal(upgrade.patients, 3);
    assert.equal(upgrade.emergency.id, "emergency-101");
    assert.equal(upgrade.outbox.priority, 1);
    console.log(
        "PASS: isolated Dexie v4 to v5 upgrade preserved plaintext fixtures",
    );

    const first = await page.evaluate(async () => {
        const { prepareOwnerKey, stageOwnerPlaintext, inspectStagedOwner } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const created = await prepareOwnerKey(
            101,
            "frasa sandi sintetik panjang untuk relawan",
        );
        window.stagingSession = created.session;
        const batch = await stageOwnerPlaintext(created.session, {
            maxRecords: 2,
        });
        return {
            recoveryCode: created.recoveryCode,
            batch,
            audit: await inspectStagedOwner(created.session),
        };
    });
    assert.equal(first.batch.scanned, 2);
    assert.equal(first.audit.sourceCount, 5);
    assert.equal(first.audit.missing, 3);
    await context.close();
    page = await open();
    const resumed = await page.evaluate(async (recoveryCode) => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { unlockOwnerKey, stageOwnerPlaintext, inspectStagedOwner } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        let rejected = false;
        try {
            await unlockOwnerKey(101, "incorrect passphrase", "passphrase");
        } catch {
            rejected = true;
        }
        const session = await unlockOwnerKey(
            101,
            "frasa sandi sintetik panjang untuk relawan",
            "passphrase",
        );
        window.stagingSession = session;
        const batches = [];
        for (let pass = 0; pass < 3; pass++)
            batches.push(await stageOwnerPlaintext(session, { maxRecords: 2 }));
        const audit = await inspectStagedOwner(session);
        const recovery = await unlockOwnerKey(101, recoveryCode, "recovery");
        const copy = await db.encryptedStaging.get("outbox:101:7");
        const decryptedOutbox = await recovery.decrypt(
            copy,
            101,
            "outbox",
            "7",
        );
        recovery.lock();
        const owner2Copies = await db.encryptedStaging
            .where("owner_user_id")
            .equals(102)
            .count();
        const ownerless = await db.patients.get("legacy-ownerless");
        return {
            rejected,
            batches,
            audit,
            decryptedOutbox,
            owner2Copies,
            ownerless,
        };
    }, first.recoveryCode);
    assert.equal(resumed.rejected, true);
    assert.deepEqual(
        resumed.batches.map((batch) => batch.staged),
        [2, 1, 0],
    );
    assert.equal(resumed.audit.consistentAtInspection, true);
    assert.equal(resumed.audit.verified, 5);
    assert.equal(resumed.owner2Copies, 0);
    assert.equal(resumed.ownerless.name, "Rekaman Legacy Sintetis");
    assert.equal(resumed.decryptedOutbox.id, 7);
    assert.equal(resumed.decryptedOutbox.revision, 3);
    assert.equal(resumed.decryptedOutbox.priority, 1);
    assert.equal(resumed.decryptedOutbox.payload.id, "emergency-101");
    console.log(
        "PASS: interrupted staging resumed after browser reopen; passphrase, recovery, and owner isolation",
    );

    const metadataRace = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { stageOwnerPlaintext, inspectStagedOwner, unlockOwnerKey } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const original = await db.offlineKeys.get(101);
        await db.offlineKeys.put({
            ...original,
            created_at: "changed-in-other-tab",
        });
        let stageRejected = false;
        let inspectionRejected = false;
        try {
            await stageOwnerPlaintext(window.stagingSession);
        } catch {
            stageRejected = true;
        }
        try {
            await inspectStagedOwner(window.stagingSession);
        } catch {
            inspectionRejected = true;
        }
        await db.offlineKeys.put(original);
        const renewed = await unlockOwnerKey(
            101,
            "frasa sandi sintetik panjang untuk relawan",
            "passphrase",
        );
        window.stagingSession.lock();
        window.stagingSession = renewed;
        return { stageRejected, inspectionRejected };
    });
    assert.deepEqual(metadataRace, {
        stageRejected: true,
        inspectionRejected: true,
    });
    console.log(
        "PASS: persisted key metadata change invalidates an existing session",
    );

    const keyWriteRace = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { stageOwnerPlaintext } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const session = window.stagingSession;
        await db.assessments.update("assessment-101", {
            srq_answers: { 1: false, 2: true },
        });
        const originalKey = await db.offlineKeys.get(101);
        const previousCopy = await db.encryptedStaging.get(
            "assessments:101:assessment-101",
        );
        const originalEncrypt = session.encrypt.bind(session);
        let changed = false;
        session.encrypt = async (...args) => {
            const result = await originalEncrypt(...args);
            if (!changed && args[0] === "assessments") {
                changed = true;
                await db.offlineKeys.put({
                    ...originalKey,
                    created_at: "changed-during-encryption",
                });
            }
            return result;
        };
        let rejected = false;
        try {
            await stageOwnerPlaintext(session);
        } catch {
            rejected = true;
        }
        session.encrypt = originalEncrypt;
        const afterCopy = await db.encryptedStaging.get(
            "assessments:101:assessment-101",
        );
        await db.offlineKeys.put(originalKey);
        return {
            rejected,
            unchanged:
                JSON.stringify(afterCopy) === JSON.stringify(previousCopy),
        };
    });
    assert.deepEqual(keyWriteRace, { rejected: true, unchanged: true });
    console.log(
        "PASS: key metadata change during encryption prevents shadow write",
    );

    const diagnostics = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { createOfflineKey } =
            await import("/resources/js/offline/offlineCrypto.ts");
        const { stageOwnerPlaintext, inspectStagedOwner } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const session = window.stagingSession;
        const wrongSession = (
            await createOfflineKey(
                101,
                "another synthetic passphrase long enough",
            )
        ).session;
        let wrongKeyRejected = false;
        try {
            await stageOwnerPlaintext(wrongSession);
        } catch {
            wrongKeyRejected = true;
        }
        wrongSession.lock();
        await db.assessments.update("assessment-101", {
            srq_answers: { 1: false },
        });
        const stale = await inspectStagedOwner(session);
        await stageOwnerPlaintext(session);
        const versioned = await db.encryptedStaging.get(
            "assessments:101:assessment-101",
        );
        await db.encryptedStaging.put({ ...versioned, version: 2 });
        const unsupported = await inspectStagedOwner(session);
        await stageOwnerPlaintext(session);
        const original = await db.encryptedStaging.get(
            "patients:101:patient-101",
        );
        await db.encryptedStaging.put({ ...original, owner_user_id: 102 });
        const mismatched = await inspectStagedOwner(session);
        await stageOwnerPlaintext(session);
        const damaged = await db.encryptedStaging.get("outbox:101:7");
        await db.encryptedStaging.put({ ...damaged, ciphertext: "corrupted" });
        const unreadable = await inspectStagedOwner(session);
        await stageOwnerPlaintext(session);
        const orphan = await session.encrypt("patients", "orphan-synthetic", {
            id: "orphan-synthetic",
            owner_user_id: 101,
            name: "Orphan Synthetic",
        });
        await db.encryptedStaging.put(orphan);
        const orphanAudit = await inspectStagedOwner(session);
        return {
            wrongKeyRejected,
            stale,
            unsupported,
            mismatched,
            unreadable,
            orphanAudit,
        };
    });
    assert.equal(diagnostics.wrongKeyRejected, true);
    assert.equal(diagnostics.stale.stale, 1);
    assert.equal(diagnostics.unsupported.unsupportedVersion, 1);
    assert.equal(diagnostics.mismatched.ownerMismatch, 1);
    assert.equal(diagnostics.unreadable.unreadable, 1);
    assert.equal(diagnostics.orphanAudit.orphan, 1);
    assert.equal(diagnostics.orphanAudit.countMismatch, true);
    console.log(
        "PASS: stale, unsupported version, owner mismatch, orphan, and count mismatch diagnostics",
    );

    const race = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { stageOwnerPlaintext, inspectStagedOwner } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const session = window.stagingSession;
        await db.patients.update("patient-101", {
            name: "Penyintas Sintetis Sebelum Balapan",
        });
        const original = session.encrypt.bind(session);
        let changed = false;
        session.encrypt = async (...args) => {
            const encrypted = await original(...args);
            if (
                !changed &&
                args[0] === "patients" &&
                args[1] === "patient-101"
            ) {
                changed = true;
                await db.patients.update("patient-101", {
                    name: "Penyintas Sintetis Diperbarui",
                });
            }
            return encrypted;
        };
        const attempt = await stageOwnerPlaintext(session);
        session.encrypt = original;
        const stale = await inspectStagedOwner(session);
        await stageOwnerPlaintext(session);
        const pending = {
            emergency: await db.emergencies.get("emergency-101"),
            outbox: await db.outbox.get(7),
        };
        return { attempt, stale, pending };
    });
    assert.ok(race.attempt.changed >= 1);
    assert.equal(race.stale.stale, 1);
    assert.equal(race.pending.emergency.id, "emergency-101");
    assert.equal(race.pending.outbox.revision, 3);
    assert.equal(race.pending.outbox.payload.id, "emergency-101");
    console.log(
        "PASS: concurrent source change skipped; pending T0 and outbox survived",
    );

    const inspectionRace = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { stageOwnerPlaintext, inspectStagedOwner } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const session = window.stagingSession;
        const original = session.decrypt.bind(session);
        let changed = false;
        session.decrypt = async (...args) => {
            const value = await original(...args);
            if (
                !changed &&
                args[2] === "patients" &&
                args[3] === "patient-101"
            ) {
                changed = true;
                await db.patients.update("patient-101", {
                    name: "Berubah Saat Audit Sintetis",
                });
            }
            return value;
        };
        const audit = await inspectStagedOwner(session);
        session.decrypt = original;
        await stageOwnerPlaintext(session);
        return audit;
    });
    assert.equal(inspectionRace.changedSource, 1);
    assert.equal(inspectionRace.consistentAtInspection, false);
    console.log(
        "PASS: source mutation during inspection blocks a clean diagnostic",
    );

    const atomic = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { createLocalEmergency } =
            await import("/resources/js/offline/emergencyWorkflow.ts");
        const id = await createLocalEmergency(101, {
            redFlagType: "PSYCHOSIS",
        });
        const saved = await db.emergencies.get(id);
        const queued = (await db.outbox.toArray()).find(
            (item) => item.entity_id === id,
        );
        const before = {
            emergencies: await db.emergencies.count(),
            outbox: await db.outbox.count(),
        };
        const veto = () => {
            throw new Error("Synthetic outbox failure");
        };
        db.outbox.hook("creating", veto);
        let failed = false;
        try {
            await createLocalEmergency(101, { redFlagType: "PSYCHOSIS" });
        } catch {
            failed = true;
        }
        db.outbox.hook("creating").unsubscribe(veto);
        return {
            id,
            saved,
            queued,
            before,
            after: {
                emergencies: await db.emergencies.count(),
                outbox: await db.outbox.count(),
            },
            failed,
        };
    });
    assert.equal(atomic.saved.id, atomic.id);
    assert.equal(atomic.queued.entity_id, atomic.id);
    assert.equal(atomic.queued.priority, 1);
    assert.equal(atomic.failed, true);
    assert.deepEqual(atomic.after, atomic.before);
    console.log(
        "PASS: active T0 and priority outbox remain atomic in isolated browser fixture",
    );
    console.log(`Synthetic isolated profile: ${profile}`);
} finally {
    await context?.close().catch(() => {});
    vite.kill("SIGTERM");
}
