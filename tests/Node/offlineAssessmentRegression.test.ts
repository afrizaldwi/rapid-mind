import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

const base = () => ({
    id: "assessment-synthetic",
    patient_id: "patient-synthetic",
    mode: "VERBAL",
    status: "IN_PROGRESS",
    sync_state: "SYNCED",
});
const answers = () =>
    Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, false]));
const server = () => ({
    ...base(),
    user_id: 101,
    status: "COMPLETED",
    srq_responses: Object.entries(answers()).map(([question, answer]) => ({
        question_number: Number(question),
        answer,
    })),
    risk_assessment: [{ indicator: "R1", answer: false }],
    function_assessment: [{ domain: "F1", level: 0 }],
});

for (const encrypted of [false, true]) {
    const mode = encrypted ? "encrypted" : "legacy";
    test(`${mode}: completed server shell can hydrate missing relations without permitting edits`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        await f.assessments.save(101, {
            ...base(),
            status: "COMPLETED",
            srq_answers: {},
            risk_indicators: {},
            function_domains: {},
        });
        const result = await f.workflow.loadAssessmentContext(101, server());
        assert.deepEqual(result.assessment.srq_answers, answers());
        const hydratedRevision = result.assessment.local_revision;
        assert.equal(
            (await f.workflow.loadAssessmentContext(101, server())).assessment
                .local_revision,
            hydratedRevision,
        );
        assert.equal((await f.outbox.list(101)).length, 0);
        await assert.rejects(
            f.assessments.hydrateCompleted(
                101,
                base().id,
                server(),
                hydratedRevision - 1,
            ),
            /usang/,
        );
        await assert.rejects(
            f.assessments.hydrateCompleted(
                102,
                base().id,
                server(),
                hydratedRevision,
            ),
        );
        await assert.rejects(
            f.assessments.update(101, base().id, { srq_answers: { 1: true } }),
            /selesai/,
        );
        const conflict = server();
        conflict.srq_responses[0].answer = true;
        await assert.rejects(f.workflow.loadAssessmentContext(101, conflict));
        assert.equal(
            (await f.assessments.get(101, base().id)).srq_answers[1],
            false,
        );
    });
    test(`${mode}: canonical nested assessment reconciles; invalid patient identity is rejected atomically`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        await f.assessments.save(101, {
            ...base(),
            srq_answers: { 17: "UNCLEAR" },
        });
        await f.queue(101, base().id);
        const snapshot = (await f.outbox.list(101))[0];
        await assert.rejects(
            f.outbox.complete(
                101,
                snapshot,
                {
                    assessment: {
                        id: base().id,
                        patient: { id: "foreign-patient" },
                        srq_answers: { 17: false },
                    },
                },
                () => true,
            ),
        );
        assert.ok(await f.outbox.get(101, snapshot.id));
        assert.equal(
            (await f.assessments.get(101, base().id)).srq_answers[17],
            "UNCLEAR",
        );
        await assert.rejects(
            f.outbox.complete(
                101,
                snapshot,
                { assessment: { id: "wrong-id" } },
                () => true,
            ),
        );
        await assert.rejects(
            f.outbox.complete(
                101,
                snapshot,
                { id: base().id, srq_answers: { 17: false } },
                () => true,
            ),
        );
        await assert.rejects(
            f.outbox.complete(
                101,
                snapshot,
                {
                    assessment: {
                        id: base().id,
                        patient_id: "foreign-patient",
                    },
                },
                () => true,
            ),
        );
        await assert.rejects(
            f.outbox.complete(
                101,
                snapshot,
                { assessment: { id: base().id, status: "UNKNOWN" } },
                () => true,
            ),
        );
        await assert.rejects(
            f.outbox.complete(
                101,
                snapshot,
                { assessment: { id: base().id, mode: "UNKNOWN" } },
                () => true,
            ),
        );
        assert.equal(
            await f.outbox.complete(
                101,
                snapshot,
                {
                    assessment: {
                        id: base().id,
                        patient: {
                            id: "patient-synthetic",
                            name: "Kanonis Sintetis",
                        },
                        srq_answers: { 17: "UNANSWERED" },
                        non_verbal_reasons: [],
                    },
                },
                () => true,
            ),
            true,
        );
        const result = await f.assessments.get(101, base().id);
        assert.equal(result.srq_answers[17], "UNANSWERED");
        assert.equal(result.sync_state, "SYNCED");
        assert.equal(await f.outbox.get(101, snapshot.id), undefined);
        assert.equal("assessment" in result, false);
    });
    test(`${mode}: normal save and canonical sync preserve answers; stale response cannot clear clarification`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        await f.assessments.save(101, base());
        await f.drafts.saveAssessmentDraft(
            { id: base().id, patient_id: base().patient_id, user_id: 101 },
            "srq_answers",
            { 1: true, 17: "UNCLEAR", 20: "UNANSWERED" },
        );
        const snapshot = (await f.outbox.list(101))[0];
        await f.drafts.saveAssessmentDraft(
            { id: base().id, patient_id: base().patient_id, user_id: 101 },
            "srq_answers",
            { 17: false },
        );
        assert.equal(
            await f.outbox.complete(
                101,
                snapshot,
                {
                    assessment: {
                        id: base().id,
                        srq_answers: { 17: "UNCLEAR" },
                    },
                },
                () => true,
            ),
            false,
        );
        const current = (await f.outbox.list(101))[0];
        assert.equal(
            await f.outbox.complete(
                101,
                current,
                {
                    assessment: {
                        id: base().id,
                        srq_answers: { 1: true, 17: false, 20: "UNANSWERED" },
                    },
                },
                () => true,
            ),
            true,
        );
        assert.deepEqual(
            (await f.assessments.get(101, base().id)).srq_answers,
            { 1: true, 17: false, 20: "UNANSWERED" },
        );
    });
    test(`${mode}: abort-aware timeout retains the actual SyncManager outbox until valid retry`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        const originalDocument = Object.getOwnPropertyDescriptor(
            globalThis,
            "document",
        );
        Object.defineProperty(globalThis, "document", {
            configurable: true,
            value: { querySelector: () => ({ content: "synthetic-csrf" }) },
        });
        t.after(() => {
            if (originalDocument)
                Object.defineProperty(globalThis, "document", originalDocument);
            else delete (globalThis as any).document;
        });
        await f.assessments.save(101, {
            ...base(),
            srq_answers: { 17: "UNCLEAR" },
        });
        await f.queue(101, base().id);
        const before = (await f.outbox.list(101))[0];
        let aborted = false;
        const mock = t.mock.method(
            globalThis,
            "fetch",
            async (_url, options) =>
                new Promise<Response>((_resolve, reject) => {
                    const onAbort = () => {
                        aborted = true;
                        reject(
                            new DOMException("Synthetic abort", "AbortError"),
                        );
                    };
                    if (options?.signal?.aborted) onAbort();
                    else
                        options?.signal?.addEventListener("abort", onAbort, {
                            once: true,
                        });
                }),
        );
        const lease = f.syncManager.setOwner(101);
        try {
            await f.syncManager.sync(101);
            const pending = await f.outbox.get(101, before.id);
            assert.equal(aborted, true);
            assert.equal(pending.status, "FAILED");
            assert.match(
                pending.last_error,
                /Penerimaan server belum terkonfirmasi/,
            );
            assert.equal(pending.id, before.id);
            assert.equal(pending.revision, before.revision);
            assert.deepEqual(pending.payload, before.payload);
            assert.equal(
                (await f.assessments.get(101, base().id)).srq_answers[17],
                "UNCLEAR",
            );
            mock.mock.restore();
            const retry = t.mock.method(
                globalThis,
                "fetch",
                async () =>
                    new Response(
                        JSON.stringify({
                            assessment: {
                                id: base().id,
                                srq_answers: { 17: "UNCLEAR" },
                            },
                        }),
                    ),
            );
            try {
                await f.syncManager.sync(101);
            } finally {
                retry.mock.restore();
            }
            assert.equal(await f.outbox.get(101, before.id), undefined);
        } finally {
            f.syncManager.clearOwner(lease);
            mock.mock.restore();
        }
    });
}
