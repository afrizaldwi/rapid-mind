import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

const local = {
    id: "assessment-synthetic",
    patient_id: "patient-synthetic",
    mode: "NON_VERBAL",
    status: "IN_PROGRESS",
    srq_answers: { 17: "UNCLEAR" },
};

for (const encrypted of [false, true]) {
    const mode = encrypted ? "ENCRYPTED" : "LEGACY";
    test(`${mode}: canonical assessment allowlist keeps patient separate and preserves valid fields`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        await f.assessments.save(101, local);
        await f.queue(101, local.id);
        const item = (await f.outbox.list(101))[0];
        const revision = (await f.assessments.get(101, local.id))
            .local_revision;
        const canonical = {
            id: local.id,
            patient_id: local.patient_id,
            patient: {
                id: local.patient_id,
                name: "Nama Kanonis Sintetis",
                age: 30,
            },
            mode: "NON_VERBAL",
            status: "COMPLETED",
            started_at: "2026-11-04T01:00:00Z",
            completed_at: "2026-11-04T01:10:00Z",
            updated_at: "2026-11-04T01:11:00Z",
            srq_answers: Object.fromEntries(
                Array.from({ length: 20 }, (_, i) => [i + 1, false]),
            ),
            risk_indicators: {
                R1: false,
                R2: false,
                R3: false,
                R4: false,
                R5: false,
            },
            function_domains: { F1: 0, F2: 0, F3: 0 },
            non_verbal_reasons: ["OTHER"],
            non_verbal_other_note: "Pengamatan sintetis",
            triage_result: { system_recommendation: "T3", srq_score: 0 },
            user_id: 999,
            owner_user_id: 999,
            local_revision: 999,
            local_draft_only: true,
            sync_state: "FAILED",
            last_error: "transport only",
            srq_responses: [{ question_number: 17, answer: true }],
            links: { self: "/transport-only" },
            unexpected_server_property: "must not persist",
        };
        assert.equal(
            await f.outbox.complete(
                101,
                item,
                { assessment: canonical },
                () => true,
            ),
            true,
        );
        const result = await f.assessments.get(101, local.id);
        for (const key of [
            "patient",
            "user_id",
            "srq_responses",
            "links",
            "unexpected_server_property",
            "local_draft_only",
        ])
            assert.equal(
                Object.hasOwn(result, key),
                false,
                `${key} must not be persisted`,
            );
        for (const key of [
            "id",
            "patient_id",
            "mode",
            "status",
            "started_at",
            "completed_at",
            "updated_at",
            "srq_answers",
            "risk_indicators",
            "function_domains",
            "non_verbal_reasons",
            "non_verbal_other_note",
            "triage_result",
        ] as const)
            assert.deepEqual(result[key], canonical[key], key);
        assert.equal(result.owner_user_id, 101);
        assert.equal(result.local_revision, revision);
        assert.equal(result.sync_state, "SYNCED");
        assert.equal(result.last_error, undefined);
        const patient = await f.patients.get(101, local.patient_id);
        assert.equal(patient.name, canonical.patient.name);
        assert.equal(patient.age, 30);
        assert.equal(patient.owner_user_id, 101);
        assert.equal(await f.outbox.get(101, item.id), undefined);
        await assert.rejects(
            f.assessments.update(101, local.id, { srq_answers: { 17: true } }),
            /selesai/,
        );
    });
    test(`${mode}: conflicting canonical patient IDs preserve outbox and both records`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        await f.assessments.save(101, local);
        await f.queue(101, local.id);
        const item = (await f.outbox.list(101))[0];
        const before = await f.assessments.get(101, local.id);
        const patientBefore = await f.patients.get(101, local.patient_id);
        for (const conflict of [
            { patient: { id: "foreign-patient" } },
            {
                patient_id: "foreign-patient",
                patient: { id: local.patient_id, name: "Must not update" },
            },
        ]) {
            await assert.rejects(
                f.outbox.complete(
                    101,
                    item,
                    { assessment: { id: local.id, ...conflict } },
                    () => true,
                ),
                /Penyintas/,
            );
            assert.deepEqual(await f.outbox.get(101, item.id), item);
            assert.deepEqual(await f.assessments.get(101, local.id), before);
            assert.deepEqual(
                await f.patients.get(101, local.patient_id),
                patientBefore,
            );
        }
    });
    test(`${mode}: stale local revision cannot overwrite newer answers or reconcile patient`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        await f.assessments.save(101, local);
        await f.queue(101, local.id);
        const item = (await f.outbox.list(101))[0];
        await f.assessments.update(101, local.id, {
            srq_answers: { 17: false },
        });
        const before = await f.assessments.get(101, local.id);
        const patientBefore = await f.patients.get(101, local.patient_id);
        assert.equal(
            await f.outbox.complete(
                101,
                item,
                {
                    assessment: {
                        id: local.id,
                        patient: {
                            id: local.patient_id,
                            name: "Stale synthetic name",
                        },
                        srq_answers: { 17: "UNCLEAR" },
                    },
                },
                () => true,
            ),
            false,
        );
        assert.deepEqual(await f.assessments.get(101, local.id), before);
        assert.deepEqual(
            await f.patients.get(101, local.patient_id),
            patientBefore,
        );
        assert.deepEqual(await f.outbox.get(101, item.id), item);
    });
}
