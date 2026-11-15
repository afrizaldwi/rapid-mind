import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

test("online answers become encrypted offline work with an idempotent outbox and survive retry", async t => {
    const f = await offlineRepositoryFixture(true, { mode: "encrypted-acceptance" });
    t.after(f.cleanup);
    await f.continuity.recordVerifiedRelawan({ id: 101, role: "RELAWAN", name: "Relawan Sintetis" }, true);
    const { preserveOfflineAssessment } = (await f.load("resources/js/offline/assessmentHandoff.ts")).exports;
    const patient = { id: "handoff-patient", owner_user_id: 101, name: "Pasien Handoff Sintetis", sync_state: "SYNCED" };
    const assessment = {
        id: "handoff-assessment", owner_user_id: 101, patient_id: patient.id,
        mode: "VERBAL", status: "IN_PROGRESS", server_version: "version-synthetic",
        srq_answers: { 1: true, 2: false, 17: "UNANSWERED" },
        non_verbal_reasons: ["OTHER"], non_verbal_other_note: "Catatan Handoff Sintetis",
    };
    await preserveOfflineAssessment(101, assessment, patient, () => true);
    assert.deepEqual((await f.assessments.get(101, assessment.id)).srq_answers, assessment.srq_answers);
    assert.equal((await f.outbox.list(101)).filter((row: any) => row.entity_id === assessment.id).length, 1);
    await preserveOfflineAssessment(101, assessment, patient, () => true);
    assert.equal((await f.outbox.list(101)).filter((row: any) => row.entity_id === assessment.id).length, 1);
    assert.doesNotMatch(JSON.stringify(await f.db.encryptedStaging.toArray()), /Pasien Handoff Sintetis|Catatan Handoff Sintetis|UNANSWERED/);
    await assert.rejects(preserveOfflineAssessment(101, { ...assessment, srq_answers: { 1: false } }, patient, () => true), /Draf offline berbeda/);
    assert.equal((await f.assessments.get(101, assessment.id)).srq_answers[1], true);
    f.storage.lockAllClinicalKeys();
    await assert.rejects(preserveOfflineAssessment(101, assessment, patient, () => true));
});

test("invalid ownership and stale screens cannot create an offline handoff", async t => {
    const f = await offlineRepositoryFixture(true, { mode: "encrypted-acceptance" });
    t.after(f.cleanup);
    const { preserveOfflineAssessment } = (await f.load("resources/js/offline/assessmentHandoff.ts")).exports;
    await assert.rejects(preserveOfflineAssessment(102, {}, {}, () => true));
    await assert.rejects(preserveOfflineAssessment(101, {}, {}, () => false));
});
