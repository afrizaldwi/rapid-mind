import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const profile = await mkdtemp(join(tmpdir(), "rapid-mind-encrypted-isolated-"));
const vite = spawn(
    "./node_modules/.bin/vite",
    [
        "--mode",
        "staging-fixture",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
    ],
    { stdio: "ignore" },
);
let context;
const open = async () => {
    context = await chromium.launchPersistentContext(profile, {
        executablePath:
            process.env.RAPID_MIND_CHROME_BIN ?? "/usr/bin/google-chrome",
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${origin}/tests/Browser/stagingBlank.html`);
    return page;
};

try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
        try {
            const response = await fetch(
                `${origin}/tests/Browser/stagingBlank.html`,
            );
            if (response.ok) {
                ready = true;
                break;
            }
        } catch {
            /* wait for isolated server */
        }
        await delay(250);
    }
    if (!ready) throw new Error("Isolated Vite server did not start");
    let page = await open();
    const setup = await page.evaluate(async () => {
        const { seedSyntheticV4 } =
            await import("/tests/Browser/offlineStagingFixture.ts");
        await seedSyntheticV4();
        const { db } = await import("/resources/js/offline/db.ts");
        const {
            prepareOwnerKey,
            stageOwnerPlaintext,
            inspectStagedOwner,
            activateSyntheticOwner,
        } = await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const created = await prepareOwnerKey(
            101,
            "frasa sandi sintetik panjang untuk relawan",
        );
        window.syntheticSession = created.session;
        await stageOwnerPlaintext(created.session);
        const initial = await inspectStagedOwner(created.session);
        const missingCopy = await db.encryptedStaging.get(
            "patients:101:patient-101",
        );
        await db.encryptedStaging.delete(missingCopy.key);
        let missingRejected = false;
        try {
            await activateSyntheticOwner(created.session);
        } catch {
            missingRejected = true;
        }
        await db.encryptedStaging.put({
            ...missingCopy,
            ciphertext: "corrupted",
        });
        let corruptRejected = false;
        try {
            await activateSyntheticOwner(created.session);
        } catch {
            corruptRejected = true;
        }
        await stageOwnerPlaintext(created.session);
        await db.patients.update("patient-101", {
            name: "Berubah Setelah Audit Sintetis",
        });
        let staleRejected = false;
        try {
            await activateSyntheticOwner(created.session);
        } catch {
            staleRejected = true;
        }
        await stageOwnerPlaintext(created.session);
        const originalTransaction = db.transaction.bind(db);
        let raced = false;
        db.transaction = async (...args) => {
            if (
                !raced &&
                args[0] === "rw" &&
                Array.isArray(args[1]) &&
                args[1].some(
                    (table) => table.name === "ownerEncryptionModes",
                ) &&
                args[1].some((table) => table.name === "encryptedOutboxIndex")
            ) {
                raced = true;
                const { patientRepository } =
                    await import("/resources/js/offline/patientRepository.ts");
                await patientRepository.save(101, {
                    id: "patient-101",
                    name: "Penulis Legacy Bersamaan",
                });
            }
            return originalTransaction(...args);
        };
        let concurrentRejected = false;
        try {
            await activateSyntheticOwner(created.session);
        } catch {
            concurrentRejected = true;
        }
        db.transaction = originalTransaction;
        await stageOwnerPlaintext(created.session);
        await activateSyntheticOwner(created.session);
        const { installClinicalKey } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        await installClinicalKey(created.session);
        let restagingBlocked = false;
        try {
            await stageOwnerPlaintext(created.session);
        } catch {
            restagingBlocked = true;
        }
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        return {
            version: db.verno,
            initial,
            missingRejected,
            corruptRejected,
            staleRejected,
            concurrentRejected,
            raced,
            restagingBlocked,
            recoveryCode: created.recoveryCode,
            activated: await db.ownerEncryptionModes.get(101),
            preserved: await db.outbox.get(7),
            migratedOutbox: await outboxRepository.get(101, 7),
        };
    });
    assert.equal(setup.version, 7);
    assert.equal(setup.initial.verified, 5);
    assert.equal(setup.missingRejected, true);
    assert.equal(setup.corruptRejected, true);
    assert.equal(setup.staleRejected, true);
    assert.equal(setup.concurrentRejected, true);
    assert.equal(setup.raced, true);
    assert.equal(setup.restagingBlocked, true);
    assert.equal(setup.activated.mode, "ENCRYPTED");
    assert.equal(setup.preserved.id, 7);
    assert.equal(setup.migratedOutbox.id, 7);
    assert.equal(setup.migratedOutbox.priority, 1);
    assert.equal(setup.migratedOutbox.revision, 3);
    assert.deepEqual(setup.migratedOutbox.payload, setup.preserved.payload);
    console.log(
        "PASS: activation rejects missing, corrupt, stale, and concurrent legacy changes; old T0 remains",
    );

    const repositories = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        const { assessmentRepository } =
            await import("/resources/js/offline/assessmentRepository.ts");
        const { emergencyRepository } =
            await import("/resources/js/offline/emergencyRepository.ts");
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        const { saveAssessmentDraft, readAssessmentDraft } =
            await import("/resources/js/offline/assessmentDraft.ts");
        const { createLocalEmergency } =
            await import("/resources/js/offline/emergencyWorkflow.ts");
        const legacyId = await patientRepository.save(102, {
            name: "Pemilik Legacy Baru",
        });
        const patientId = await patientRepository.save(101, {
            name: "Penyintas Terenkripsi",
            nik: "0000000000000199",
        });
        await patientRepository.saveServerSnapshot(101, {
            id: "remote-101",
            name: "Snapshot Terenkripsi",
        });
        const assessmentId = await assessmentRepository.save(101, {
            patient_id: patientId,
            mode: "VERBAL",
            status: "IN_PROGRESS",
            srq_answers: { 1: true },
        });
        await saveAssessmentDraft(
            {
                id: assessmentId,
                patient_id: patientId,
                user_id: 101,
                mode: "VERBAL",
            },
            "srq_answers",
            { 1: true, 17: false },
        );
        const resumed = await readAssessmentDraft(
            101,
            assessmentId,
            "srq_answers",
        );
        const emergencyId = await createLocalEmergency(101, {
            patientId,
            redFlagType: "PSYCHOSIS",
            notes: "Sintetis",
        });
        const queued = (await outboxRepository.list(101)).find(
            (item) => item.entity_id === emergencyId,
        );
        await outboxRepository.enqueue(101, "ASSESSMENT", assessmentId, {
            id: assessmentId,
            patient: { id: patientId, name: "Penyintas Terenkripsi" },
        });
        const ordering = (await outboxRepository.list(101)).map(
            (item) => item.priority,
        );
        const before = {
            emergency: (await emergencyRepository.list(101)).length,
            queue: (await outboxRepository.list(101)).length,
        };
        const veto = () => {
            throw new Error("Synthetic encrypted outbox failure");
        };
        db.encryptedOutboxIndex.hook("creating", veto);
        let rolledBack = false;
        try {
            await createLocalEmergency(101, { redFlagType: "PSYCHOSIS" });
        } catch {
            rolledBack = true;
        }
        db.encryptedOutboxIndex.hook("creating").unsubscribe(veto);
        const after = {
            emergency: (await emergencyRepository.list(101)).length,
            queue: (await outboxRepository.list(101)).length,
        };
        let wrongOwner = await patientRepository.get(102, patientId);
        let rawLegacyBlocked = false;
        try {
            await db.transaction(
                "rw",
                db.patients,
                db.ownerEncryptionModes,
                async () => {
                    const { assertStorageMode } =
                        await import("/resources/js/offline/encryptedClinicalStorage.ts");
                    await assertStorageMode(101, "LEGACY");
                    await db.patients.put({
                        id: "unsafe-write",
                        owner_user_id: 101,
                        name: "Unsafe",
                        sync_state: "LOCAL_SAVED",
                    });
                },
            );
        } catch {
            rawLegacyBlocked = true;
        }
        return {
            legacyId,
            legacyPlain: await db.patients.get(legacyId),
            patient: await patientRepository.get(101, patientId),
            rawPatient: await db.patients.get(patientId),
            snapshot: await patientRepository.get(101, "remote-101"),
            rawSnapshot: await db.patientSnapshots.get([101, "remote-101"]),
            resumed,
            assessment: await assessmentRepository.get(101, assessmentId),
            rawAssessment: await db.assessments.get(assessmentId),
            emergencyId,
            emergency: await emergencyRepository.get(101, emergencyId),
            rawEmergency: await db.emergencies.get(emergencyId),
            queued,
            ordering,
            before,
            after,
            rolledBack,
            wrongOwner,
            rawLegacyBlocked,
            unsafe: await db.patients.get("unsafe-write"),
            rawOutbox: await db.outbox.get(queued.id),
        };
    });
    assert.equal(repositories.legacyPlain.name, "Pemilik Legacy Baru");
    assert.equal(repositories.patient.name, "Penyintas Terenkripsi");
    assert.equal(repositories.rawPatient, undefined);
    assert.equal(repositories.snapshot.name, "Snapshot Terenkripsi");
    assert.equal(repositories.rawSnapshot, undefined);
    assert.equal(repositories.resumed[17], false);
    assert.equal(repositories.assessment.srq_answers[17], false);
    assert.equal(repositories.rawAssessment, undefined);
    assert.equal(repositories.emergency.id, repositories.emergencyId);
    assert.equal(repositories.rawEmergency, undefined);
    assert.equal(repositories.queued.priority, 1);
    assert.equal(repositories.queued.revision, 1);
    assert.equal(repositories.queued.payload.id, repositories.emergencyId);
    assert.deepEqual(repositories.ordering, [1, 1, 2]);
    assert.equal(repositories.rawOutbox, undefined);
    assert.equal(repositories.rolledBack, true);
    assert.deepEqual(repositories.after, repositories.before);
    assert.equal(repositories.wrongOwner, undefined);
    assert.equal(repositories.rawLegacyBlocked, true);
    assert.equal(repositories.unsafe, undefined);
    console.log(
        "PASS: encrypted patient, snapshot, draft, T0, outbox and atomic rollback; legacy owner unchanged",
    );

    const patientAtomicity = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { prepareEncrypted } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        const id = "patient-101";
        const duplicate = await prepareEncrypted(101, "patientSnapshots", id, {
            id,
            owner_user_id: 101,
            name: "Salinan lama",
            sync_state: "SYNCED",
        });
        await db.encryptedStaging.put(duplicate);
        const localKey = `patients:101:${id}`;
        const before = await db.encryptedStaging.get(localKey);
        const veto = (key) => {
            if (key === `patientSnapshots:101:${id}`)
                throw new Error("Synthetic interruption");
        };
        db.encryptedStaging.hook("deleting", veto);
        let rollback = false;
        try {
            await patientRepository.saveServerSnapshot(101, {
                id,
                name: "Kanonis gagal",
            });
        } catch {
            rollback = true;
        }
        db.encryptedStaging.hook("deleting").unsubscribe(veto);
        const afterFailure = await db.encryptedStaging.get(localKey);
        const duplicateAfterFailure = await db.encryptedStaging.get(
            `patientSnapshots:101:${id}`,
        );
        await patientRepository.saveServerSnapshot(101, {
            id,
            name: "Kanonis benar",
        });
        const duplicateGone = await db.encryptedStaging.get(
            `patientSnapshots:101:${id}`,
        );
        const originalTransaction = db.transaction.bind(db);
        let raced = false;
        db.transaction = async (...args) => {
            if (
                !raced &&
                args[0] === "rw" &&
                args.some((arg) => arg?.name === "encryptedStaging") &&
                !args.some((arg) => arg?.name === "encryptedOutboxIndex")
            ) {
                raced = true;
                await patientRepository.save(101, {
                    id,
                    name: "Penulis bersamaan",
                });
            }
            return originalTransaction(...args);
        };
        let conflict = false;
        try {
            await patientRepository.saveServerSnapshot(101, {
                id,
                name: "Kanonis usang",
            });
        } catch {
            conflict = true;
        }
        db.transaction = originalTransaction;
        return {
            rollback,
            sameCiphertext:
                JSON.stringify(before) === JSON.stringify(afterFailure),
            duplicateAfterFailure: !!duplicateAfterFailure,
            duplicateGone: duplicateGone === undefined,
            current: (await patientRepository.get(101, id)).name,
            raced,
            conflict,
        };
    });
    assert.deepEqual(patientAtomicity, {
        rollback: true,
        sameCiphertext: true,
        duplicateAfterFailure: true,
        duplicateGone: true,
        current: "Penulis bersamaan",
        raced: true,
        conflict: true,
    });
    console.log(
        "PASS: patient update and superseded snapshot delete roll back together; concurrent update rejected",
    );

    const interleaved = await page.evaluate(async () => {
        const { createLocalEmergency } =
            await import("/resources/js/offline/emergencyWorkflow.ts");
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        const made = [];
        for (const owner of [102, 101, 102, 101]) {
            const entity = await createLocalEmergency(owner, {
                redFlagType: "PSYCHOSIS",
            });
            const item = (await outboxRepository.list(owner)).find(
                (row) => row.entity_id === entity,
            );
            made.push({ owner, entity, item });
        }
        const unique = new Set(made.map((row) => row.item.id)).size === 4;
        const isolated = await Promise.all(
            made.map(
                async (row) =>
                    (await outboxRepository.get(
                        row.owner === 101 ? 102 : 101,
                        row.item.id,
                    )) === undefined,
            ),
        );
        for (const row of made) {
            await outboxRepository.mark(row.owner, row.item, "SYNCING");
            const syncing = await outboxRepository.get(row.owner, row.item.id);
            await outboxRepository.recover(row.owner, syncing);
            const retry = await outboxRepository.get(row.owner, row.item.id);
            await outboxRepository.complete(
                row.owner,
                retry,
                { emergency: { id: row.entity } },
                () => true,
            );
        }
        const gone = await Promise.all(
            made.map(
                async (row) =>
                    (await outboxRepository.get(row.owner, row.item.id)) ===
                    undefined,
            ),
        );
        const laterEntity = await createLocalEmergency(102, {
            redFlagType: "PSYCHOSIS",
        });
        const later = (await outboxRepository.list(102)).find(
            (row) => row.entity_id === laterEntity,
        );
        const laterId = later.id;
        await outboxRepository.complete(
            102,
            later,
            { emergency: { id: laterEntity } },
            () => true,
        );
        return {
            ids: made.map((row) => row.item.id),
            unique,
            isolated,
            gone,
            laterId,
        };
    });
    assert.equal(interleaved.unique, true);
    assert.deepEqual(interleaved.isolated, [true, true, true, true]);
    assert.deepEqual(interleaved.gone, [true, true, true, true]);
    assert.deepEqual(
        interleaved.ids,
        [...interleaved.ids].sort((a, b) => a - b),
    );
    assert.ok(interleaved.laterId > Math.max(...interleaved.ids));
    console.log(
        "PASS: interleaved legacy/encrypted IDs, owner lookup, retry, and reconciliation",
    );

    const locked = await page.evaluate(async () => {
        const { installClinicalKey, lockClinicalKey } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        const { createOfflineKey } =
            await import("/resources/js/offline/offlineCrypto.ts");
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        const wrong = await createOfflineKey(
            101,
            "frasa sandi salah tetapi cukup panjang",
        );
        let mismatchRejected = false;
        let forgedBindRejected = false;
        const { db } = await import("/resources/js/offline/db.ts");
        try {
            await wrong.session.bindPersistedKey(await db.offlineKeys.get(101));
        } catch {
            forgedBindRejected = true;
        }
        try {
            await installClinicalKey(wrong.session);
        } catch {
            mismatchRejected = true;
        }
        lockClinicalKey(101);
        let lockedRejected = false;
        try {
            await patientRepository.get(101, "patient-101");
        } catch {
            lockedRejected = true;
        }
        let lockedOutboxRejected = false;
        try {
            await outboxRepository.list(101);
        } catch {
            lockedOutboxRejected = true;
        }
        return {
            forgedBindRejected,
            mismatchRejected,
            lockedRejected,
            lockedOutboxRejected,
        };
    });
    assert.deepEqual(locked, {
        forgedBindRejected: true,
        mismatchRejected: true,
        lockedRejected: true,
        lockedOutboxRejected: true,
    });
    await context.close();
    page = await open();
    const reopened = await page.evaluate(async (recoveryCode) => {
        const { unlockOwnerKey } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const { installClinicalKey } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        let wrongRejected = false;
        try {
            await unlockOwnerKey(101, "wrong secret", "passphrase");
        } catch {
            wrongRejected = true;
        }
        const session = await unlockOwnerKey(101, recoveryCode, "recovery");
        await installClinicalKey(session);
        return {
            wrongRejected,
            patient: await patientRepository.get(101, "patient-101"),
        };
    }, setup.recoveryCode);
    assert.equal(reopened.wrongRejected, true);
    assert.equal(reopened.patient.name, "Penulis bersamaan");
    console.log(
        "PASS: locked access rejected; recovery unlock after browser reopening",
    );

    const switched = await page.evaluate(async (recoveryCode) => {
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        const { unlockOwnerKey } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const { installClinicalKey } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Akun Satu" },
            true,
        );
        await recordVerifiedRelawan(
            { id: 102, role: "RELAWAN", name: "Akun Dua" },
            true,
        );
        let locked = false;
        try {
            await patientRepository.get(101, "patient-101");
        } catch {
            locked = true;
        }
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Akun Satu" },
            true,
        );
        const session = await unlockOwnerKey(101, recoveryCode, "recovery");
        await installClinicalKey(session);
        return {
            locked,
            retained: !!(await patientRepository.get(101, "patient-101")),
        };
    }, setup.recoveryCode);
    assert.deepEqual(switched, { locked: true, retained: true });
    console.log(
        "PASS: account switch locks prior DEK without deleting clinical data",
    );

    const loggedOut = await page.evaluate(async (recoveryCode) => {
        const { lockRelawanContinuity, recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        const { unlockIsolatedOwner } =
            await import("/resources/js/offline/offlineKeyWorkflow.ts");
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        await lockRelawanContinuity();
        let denied = false;
        try {
            await unlockIsolatedOwner(101, recoveryCode, "recovery");
        } catch {
            denied = true;
        }
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Akun Satu" },
            true,
        );
        await unlockIsolatedOwner(101, recoveryCode, "recovery");
        return {
            denied,
            retained: !!(await patientRepository.get(101, "patient-101")),
        };
    }, setup.recoveryCode);
    assert.deepEqual(loggedOut, { denied: true, retained: true });
    console.log(
        "PASS: logout locks access; correct secret alone cannot override logout intent",
    );

    const sibling = await context.newPage();
    await sibling.goto(`${origin}/tests/Browser/stagingBlank.html`);
    await sibling.evaluate(async (code) => {
        const { unlockOwnerKey } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const { installClinicalKey } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        await installClinicalKey(await unlockOwnerKey(101, code, "recovery"));
    }, setup.recoveryCode);
    await page.evaluate(async () => {
        const { announceSyntheticModeActivation } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        announceSyntheticModeActivation(101);
    });
    await sibling.waitForFunction(async () => {
        const { clinicalKeyReady } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        return !clinicalKeyReady(101);
    });
    const siblingLocked = await sibling.evaluate(async () => {
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        try {
            await patientRepository.get(101, "patient-101");
            return false;
        } catch {
            return true;
        }
    });
    assert.equal(siblingLocked, true);
    await sibling.close();
    console.log(
        "PASS: current-bundle mode broadcast locks a second synthetic tab",
    );

    const reconciliation = await page.evaluate(
        async ({ emergencyId, queueId, patientId }) => {
            const { outboxRepository } =
                await import("/resources/js/offline/outboxRepository.ts");
            const { emergencyRepository } =
                await import("/resources/js/offline/emergencyRepository.ts");
            const { patientRepository } =
                await import("/resources/js/offline/patientRepository.ts");
            const { db } = await import("/resources/js/offline/db.ts");
            const old = await outboxRepository.get(101, queueId);
            await outboxRepository.enqueue(101, "EMERGENCY", emergencyId, {
                ...old.payload,
                notes: "revisi sintetik",
            });
            const updated = await outboxRepository.get(101, queueId);
            const replayOld = await outboxRepository.complete(
                101,
                old,
                { emergency: { id: emergencyId } },
                () => true,
            );
            let wrongCanonicalRejected = false;
            try {
                await outboxRepository.complete(
                    101,
                    updated,
                    { emergency: { id: "wrong-synthetic-id" } },
                    () => true,
                );
            } catch {
                wrongCanonicalRejected = true;
            }
            await outboxRepository.mark(101, updated, "SYNCING");
            const syncing = await outboxRepository.get(101, queueId);
            await outboxRepository.recover(101, syncing);
            const recovered = await outboxRepository.get(101, queueId);
            const completed = await outboxRepository.complete(
                101,
                recovered,
                {
                    emergency: {
                        id: emergencyId,
                        patient: { id: patientId, name: "Kanonis Sintetis" },
                    },
                },
                () => true,
            );
            const replayAgain = await outboxRepository.complete(
                101,
                recovered,
                { emergency: { id: emergencyId } },
                () => true,
            );
            return {
                oldRevision: old.revision,
                updatedRevision: updated.revision,
                updatedPayload: updated.payload,
                replayOld,
                wrongCanonicalRejected,
                recoveredStatus: recovered.status,
                completed,
                replayAgain,
                queueGone: await outboxRepository.get(101, queueId),
                emergency: await emergencyRepository.get(101, emergencyId),
                patient: await patientRepository.get(101, patientId),
                retainedLegacy: await db.outbox.get(7),
            };
        },
        {
            emergencyId: repositories.emergencyId,
            queueId: repositories.queued.id,
            patientId: repositories.patient.id,
        },
    );
    assert.equal(
        reconciliation.updatedRevision,
        reconciliation.oldRevision + 1,
    );
    assert.equal(reconciliation.updatedPayload.notes, "revisi sintetik");
    assert.equal(reconciliation.replayOld, false);
    assert.equal(reconciliation.wrongCanonicalRejected, true);
    assert.equal(reconciliation.recoveredStatus, "PENDING");
    assert.equal(reconciliation.completed, true);
    assert.equal(reconciliation.replayAgain, false);
    assert.equal(reconciliation.queueGone, undefined);
    assert.equal(reconciliation.emergency.sync_state, "SYNCED");
    assert.equal(reconciliation.patient.name, "Kanonis Sintetis");
    assert.equal(reconciliation.retainedLegacy.id, 7);
    console.log(
        "PASS: encrypted revision, recovery, canonical reconciliation, and idempotent replay",
    );

    const sync = await page.evaluate(async () => {
        const { createLocalEmergency } =
            await import("/resources/js/offline/emergencyWorkflow.ts");
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        const { syncManager } =
            await import("/resources/js/offline/syncManager.ts");
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Relawan Sintetis" },
            true,
        );
        const meta = document.createElement("meta");
        meta.name = "csrf-token";
        meta.content = "synthetic-only";
        document.head.append(meta);
        const entity = await createLocalEmergency(101, {
            redFlagType: "PSYCHOSIS",
            notes: "Antrean uji",
        });
        const queued = (await outboxRepository.list(101)).find(
            (row) => row.entity_id === entity,
        );
        const expected = JSON.stringify(queued.payload);
        const originalFetch = window.fetch;
        const requests = [];
        let failOnce = true;
        window.fetch = async (url, options) => {
            if (String(url).startsWith("/relawan/sync/")) {
                const payload = JSON.parse(options.body);
                requests.push({
                    url: String(url),
                    body: options.body,
                    credentials: options.credentials,
                });
                if (failOnce) {
                    failOnce = false;
                    return new Response("{}", { status: 503 });
                }
                const type = String(url).endsWith("emergencies")
                    ? "emergency"
                    : "assessment";
                return new Response(
                    JSON.stringify({ [type]: { id: payload.id } }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }
            return originalFetch(url, options);
        };
        const lease = syncManager.setOwner(101);
        await syncManager.sync(101);
        const afterFailure = (await outboxRepository.list(101)).some(
            (row) => row.status === "FAILED",
        );
        await syncManager.sync(101);
        const afterSuccess = await outboxRepository.get(101, queued.id);
        const revisedEntity = await createLocalEmergency(101, {
            redFlagType: "PSYCHOSIS",
        });
        const revisedItem = (await outboxRepository.list(101)).find(
            (row) => row.entity_id === revisedEntity,
        );
        window.fetch = async (url, options) => {
            if (
                String(url).startsWith("/relawan/sync/") &&
                JSON.parse(options.body).id === revisedEntity
            ) {
                await outboxRepository.enqueue(
                    101,
                    "EMERGENCY",
                    revisedEntity,
                    {
                        ...JSON.parse(options.body),
                        notes: "revisi saat pengiriman",
                    },
                );
                return new Response(
                    JSON.stringify({ emergency: { id: revisedEntity } }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }
            return originalFetch(url, options);
        };
        await syncManager.sync(101);
        const revised = await outboxRepository.get(101, revisedItem.id);
        window.fetch = async (url, options) =>
            String(url).startsWith("/relawan/sync/")
                ? new Response("{}", { status: 401 })
                : originalFetch(url, options);
        await syncManager.sync(101);
        const retainedAfter401 = await outboxRepository.get(
            101,
            revisedItem.id,
        );
        let sessionState = "";
        const stop = syncManager.subscribe((state) => {
            sessionState = state.sessionState;
        });
        stop();
        syncManager.clearOwner(lease);
        window.fetch = originalFetch;
        return {
            afterFailure,
            afterSuccess,
            exactPayload: requests.some((row) => row.body === expected),
            sameOrigin: requests.every(
                (row) => row.credentials === "same-origin",
            ),
            emergencyFirst: requests[0]?.url.endsWith("emergencies"),
            revised: {
                status: revised?.status,
                revision: revised?.revision,
                notes: revised?.payload.notes,
            },
            retainedAfter401: !!retainedAfter401,
            sessionState,
        };
    });
    assert.equal(sync.afterFailure, true);
    assert.equal(sync.afterSuccess, undefined);
    assert.equal(sync.exactPayload, true);
    assert.equal(sync.sameOrigin, true);
    assert.equal(sync.emergencyFirst, true);
    assert.deepEqual(sync.revised, {
        status: "PENDING",
        revision: 2,
        notes: "revisi saat pengiriman",
    });
    assert.equal(sync.retainedAfter401, true);
    assert.equal(sync.sessionState, "REAUTHENTICATION_REQUIRED");
    console.log(
        "PASS: synthetic SyncManager 503 retry, exact payload, emergency priority, revision-safe response, and 401 retention",
    );

    const retention = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        const { assessmentRepository } =
            await import("/resources/js/offline/assessmentRepository.ts");
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        const {
            assessmentRetentionEligibility,
            patientRetentionEligibility,
            emergencyRetentionEligibility,
        } = await import("/resources/js/offline/retentionEligibility.ts");
        const assessmentId = await assessmentRepository.save(101, {
            patient_id: "patient-101",
            mode: "VERBAL",
            status: "IN_PROGRESS",
        });
        await outboxRepository.enqueue(101, "ASSESSMENT", assessmentId, {
            id: assessmentId,
            patient: { id: "patient-101", name: "Penyintas Sintetis" },
        });
        const before = await assessmentRetentionEligibility(101, assessmentId);
        await assessmentRepository.update(101, assessmentId, {
            status: "COMPLETED",
        });
        const queued = (await outboxRepository.list(101)).find(
            (row) => row.entity_id === assessmentId,
        );
        const stillPending = await assessmentRetentionEligibility(
            101,
            assessmentId,
        );
        await outboxRepository.complete(
            101,
            queued,
            { assessment: { id: assessmentId } },
            () => true,
        );
        const accepted = await assessmentRetentionEligibility(
            101,
            assessmentId,
        );
        await assessmentRepository.update(101, assessmentId, {
            srq_answers: { 1: true },
        });
        const changedAfterAcceptance = await assessmentRetentionEligibility(
            101,
            assessmentId,
        );
        const patient = await patientRetentionEligibility(101, "patient-101");
        const emergency = await emergencyRetentionEligibility(
            101,
            "emergency-101",
        );
        return {
            before,
            stillPending,
            accepted,
            changedAfterAcceptance,
            patient,
            emergency,
            receipt: await db.localSyncReceipts.get(
                `101:ASSESSMENT:${assessmentId}`,
            ),
            retained: await assessmentRepository.get(101, assessmentId),
        };
    });
    assert.equal(retention.before.eligible, false);
    assert.equal(retention.stillPending.eligible, false);
    assert.equal(retention.accepted.eligible, true);
    assert.equal(retention.changedAfterAcceptance.eligible, false);
    assert.ok(
        retention.changedAfterAcceptance.reasons.includes(
            "RECORD_CHANGED_AFTER_ACCEPTANCE",
        ),
    );
    assert.equal(retention.receipt.canonical_id, retention.retained.id);
    assert.equal(retention.patient.eligible, false);
    assert.equal(retention.emergency.eligible, false);
    console.log(
        "PASS: receipt-backed retention eligibility; clinical rows remain intact",
    );

    let authenticatedOwner = 999;
    await page.route("**/relawan/session-status", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                state: "AUTHENTICATED",
                user: { id: authenticatedOwner, role: "RELAWAN" },
            }),
        });
    });
    await page.evaluate(async () => {
        const { mountOfflineGate } =
            await import("/tests/Browser/offlineGateFixture.ts");
        mountOfflineGate(103);
    });
    await page
        .getByLabel("Frasa sandi offline")
        .fill("frasa sandi sintetik ketiga yang kuat");
    await page
        .getByLabel("Ulangi frasa sandi")
        .fill("frasa sandi sintetik ketiga yang kuat");
    await page.getByRole("button", { name: "Daftarkan kunci" }).click();
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /tidak sesuai/);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Daftarkan kunci" }).click();
    await page
        .getByRole("alert")
        .filter({ hasText: "memerlukan koneksi" })
        .waitFor();
    await context.setOffline(false);
    authenticatedOwner = 103;
    await page.evaluate(async () => {
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        await recordVerifiedRelawan(
            { id: 103, role: "RELAWAN", name: "Relawan Sintetis Tiga" },
            true,
        );
    });
    await page.getByRole("button", { name: "Daftarkan kunci" }).click();
    const recoveryCode = await page.locator("output").innerText();
    assert.ok(recoveryCode.length >= 40);
    await page
        .getByRole("button", { name: "Saya sudah menyimpan kode" })
        .click();
    assert.equal(await page.locator("[data-unlocked]").count(), 1);
    await context.close();
    page = await open();
    await page.evaluate(async () => {
        const { mountOfflineGate } =
            await import("/tests/Browser/offlineGateFixture.ts");
        mountOfflineGate(103);
    });
    await context.setOffline(true);
    await page
        .getByLabel("Frasa sandi offline")
        .fill("frasa yang salah sekali");
    await page.getByRole("button", { name: "Buka data" }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.locator("[data-unlocked]").count(), 0);
    await page
        .getByLabel("Frasa sandi offline")
        .fill("frasa sandi sintetik ketiga yang kuat");
    await page.getByRole("button", { name: "Buka data" }).click();
    await page.locator("[data-unlocked]").waitFor();
    assert.equal(await page.locator("[data-unlocked]").count(), 1);
    await page.evaluate(async () => {
        const { lockIsolatedOwner } =
            await import("/resources/js/offline/offlineKeyWorkflow.ts");
        lockIsolatedOwner();
        const { mountOfflineGate } =
            await import("/tests/Browser/offlineGateFixture.ts");
        mountOfflineGate(103);
    });
    await page.getByLabel("Metode pembukaan").selectOption("recovery");
    await page
        .getByRole("textbox", { name: "Kode pemulihan" })
        .fill(recoveryCode);
    await page.getByRole("button", { name: "Buka data" }).click();
    await page.locator("[data-unlocked]").waitFor();
    assert.equal(await page.locator("[data-unlocked]").count(), 1);
    console.log(
        "PASS: fixture UI enrollment auth boundary, one-time code, offline reopen, wrong secret, and recovery unlock",
    );

    await context.setOffline(false);
    await page.goto(`${origin}/tests/Browser/stagingBlank.html`);
    await page.evaluate(async (assessmentId) => {
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        const { lockAllClinicalKeys } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Relawan Sintetis" },
            true,
        );
        lockAllClinicalKeys();
        const target = document.createElement("div");
        target.id = "offline-state";
        document.body.replaceChildren(target);
        history.pushState({}, "", `/relawan/assessment/${assessmentId}/srq`);
        void import("/resources/js/offline/bootstrap.ts");
    }, repositories.assessment.id);
    await page
        .getByRole("heading", { name: "Kunci data klinis offline" })
        .waitFor();
    assert.equal(
        await page.getByText("Data perangkat belum tersedia").count(),
        0,
    );
    await page
        .getByLabel("Frasa sandi offline")
        .fill("frasa sandi sintetik panjang untuk relawan");
    await page.getByRole("button", { name: "Buka data" }).click();
    await page.locator("#offline-state").waitFor({ state: "detached" });
    console.log(
        "PASS: static offline assessment route waits for correct-owner unlock before loading clinical props",
    );
    console.log(`Synthetic isolated profile: ${profile}`);
} finally {
    await context?.close().catch(() => {});
    vite.kill("SIGTERM");
}
