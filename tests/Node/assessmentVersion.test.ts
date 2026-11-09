import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

for (const encrypted of [false, true]) {
    for (const requeued of [false, true]) {
        test(`${encrypted ? "encrypted" : "legacy"}: accepted older snapshot retains newer answers (requeued=${requeued})`, async (t) => {
            const f = await offlineRepositoryFixture(encrypted);
            t.after(f.cleanup);
            const base = "a".repeat(64),
                accepted = "b".repeat(64);
            await f.assessments.save(101, {
                id: "assessment",
                patient_id: "patient-synthetic",
                mode: "VERBAL",
                status: "IN_PROGRESS",
                srq_answers: { 1: false },
                server_version: base,
            });
            await f.queue(101, "assessment");
            const snapshot = (await f.outbox.list(101))[0];
            assert.equal(snapshot.payload.base_version, base);
            await f.assessments.update(101, "assessment", {
                srq_answers: { 1: true, 17: "UNCLEAR" },
            });
            if (requeued) await f.queue(101, "assessment");
            assert.equal(
                await f.outbox.complete(
                    101,
                    snapshot,
                    {
                        assessment: {
                            id: "assessment",
                            srq_answers: { 1: false },
                            server_version: accepted,
                        },
                    },
                    () => true,
                ),
                false,
            );
            const local = await f.assessments.get(101, "assessment");
            assert.deepEqual(local.srq_answers, { 1: true, 17: "UNCLEAR" });
            assert.equal(local.server_version, accepted);
            assert.notEqual(local.sync_state, "SYNCED");
            assert.equal((await f.db.localSyncReceipts.toArray()).length, 0);
            await f.queue(101, "assessment");
            const next = (await f.outbox.list(101))[0];
            assert.equal(next.payload.base_version, accepted);
            assert.deepEqual(next.payload.srq_answers, local.srq_answers);
        });
    }
    test(`${encrypted ? "encrypted" : "legacy"}: malformed versions and inactive receipts preserve local records and outbox`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        t.after(f.cleanup);
        await f.assessments.save(101, {
            id: "assessment",
            patient_id: "patient-synthetic",
            mode: "VERBAL",
            status: "IN_PROGRESS",
        });
        await f.queue(101, "assessment");
        const item = (await f.outbox.list(101))[0];
        await assert.rejects(
            f.outbox.complete(
                101,
                item,
                { assessment: { id: "assessment", server_version: "invalid" } },
                () => true,
            ),
        );
        assert.equal(
            await f.outbox.complete(
                101,
                item,
                {
                    assessment: {
                        id: "assessment",
                        server_version: "a".repeat(64),
                    },
                },
                () => false,
            ),
            false,
        );
        assert.equal((await f.outbox.list(101)).length, 1);
        assert.equal((await f.db.localSyncReceipts.toArray()).length, 0);
    });
}
