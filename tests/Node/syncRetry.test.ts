import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as pause } from "node:timers/promises";
import { retryAt } from "../../resources/js/offline/syncRetry.ts";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

const drain = async () => {
    for (let i = 0; i < 8; i++)
        await new Promise((resolve) => setImmediate(resolve));
};

test("only transient failures receive six bounded automatic retry times", () => {
    const item: any = {
        status: "FAILED",
        retry_count: 1,
        updated_at: "2026-11-07T00:00:00Z",
    };
    const start = Date.parse(item.updated_at);
    for (const status of [undefined, 408, 429, 500, 503])
        assert.equal(
            retryAt({ ...item, last_http_status: status }),
            start + 2000,
        );
    for (const status of [400, 401, 403, 409, 419, 422])
        assert.equal(retryAt({ ...item, last_http_status: status }), null);
    for (const retry_count of [0, -1, 7, 1.5, NaN])
        assert.equal(retryAt({ ...item, retry_count }), null);
    assert.equal(retryAt({ ...item, retry_count: 6 }), start + 60_000);
    assert.equal(retryAt({ ...item, updated_at: "bad" }), null);
});

for (const encrypted of [false, true]) {
    test(`${encrypted ? "encrypted" : "legacy"}: lost response retries the same emergency before assessment and records one receipt`, async (t) => {
        const f = await offlineRepositoryFixture(encrypted);
        const lease = f.syncManager.setOwner(101);
        t.after(() => {
            f.syncManager.clearOwner(lease);
            f.cleanup();
        });
        await f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "PSYCHOSIS",
            notes: "Sintetis",
        });
        await f.assessments.save(101, {
            id: "assessment",
            patient_id: "patient-synthetic",
            mode: "VERBAL",
            status: "IN_PROGRESS",
        });
        await f.queue(101, "assessment");
        const ids: string[] = [];
        f.setTransport(async (_url: string, payload: any) => {
            ids.push(payload.id);
            if (ids.length === 1) throw new Error("response lost after commit");
            return new Response(
                JSON.stringify(
                    payload.red_flag_type
                        ? { emergency: { id: payload.id } }
                        : { assessment: { id: payload.id } },
                ),
                { status: 200 },
            );
        });
        t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
        await f.syncManager.sync(101);
        assert.equal(ids.length, 1);
        assert.equal((await f.outbox.list(101)).length, 2);
        t.mock.timers.tick(1999);
        await drain();
        assert.equal(ids.length, 1);
        t.mock.timers.tick(1);
        for (let i = 0; i < 100 && (await f.outbox.list(101)).length; i++)
            await pause(5);
        assert.equal(ids.length, 3);
        assert.equal(ids[0], ids[1]);
        assert.equal(ids[2], "assessment");
        assert.equal((await f.outbox.list(101)).length, 0);
        assert.equal((await f.db.localSyncReceipts.toArray()).length, 2);
    });
}

for (const restriction of [
    "lock",
    "logout",
    "switch",
    "offline",
    "hidden",
    "401",
    "419",
    "409",
]) {
    test(`scheduled retry cannot bypass ${restriction}`, async (t) => {
        const f = await offlineRepositoryFixture(true);
        const lease = f.syncManager.setOwner(101);
        t.after(() => {
            f.syncManager.clearOwner(lease);
            f.cleanup();
        });
        await f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "PSYCHOSIS",
        });
        let calls = 0;
        f.setTransport(async () => {
            calls++;
            return new Response("{}", {
                status: ["401", "419", "409"].includes(restriction)
                    ? Number(restriction)
                    : 503,
            });
        });
        t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
        await f.syncManager.sync(101);
        if (restriction === "lock") f.storage.lockAllClinicalKeys();
        if (restriction === "logout") f.syncManager.clearOwner(lease);
        if (restriction === "switch") f.syncManager.setOwner(102);
        if (restriction === "offline") f.browser.navigator.onLine = false;
        if (restriction === "hidden")
            f.browser.document.visibilityState = "hidden";
        t.mock.timers.tick(120_000);
        await drain();
        assert.equal(calls, 1);
        assert.equal((await f.db.localSyncReceipts.toArray()).length, 0);
    });
}

test("automatic retry exhaustion preserves the emergency and permits an explicit retry", async (t) => {
    const f = await offlineRepositoryFixture(true);
    const lease = f.syncManager.setOwner(101);
    let syncing = false;
    const unsubscribe = f.syncManager.subscribe((state: any) => {
        syncing = state.isSyncing;
    });
    t.after(() => {
        unsubscribe();
        f.syncManager.clearOwner(lease);
        f.cleanup();
    });
    await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "PSYCHOSIS",
    });
    let calls = 0;
    f.setTransport(async () => {
        calls++;
        return new Response("{}", { status: 503 });
    });
    t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
    await f.syncManager.sync(101);
    for (const [index, delay] of [
        2000, 5000, 10000, 20000, 40000, 60000,
    ].entries()) {
        t.mock.timers.tick(delay);
        for (let i = 0; i < 100 && (calls < index + 2 || syncing); i++)
            await pause(5);
        await pause(10); // Let the encrypted scheduling read finish as well.
        assert.equal(calls, index + 2);
    }
    t.mock.timers.tick(600_000);
    await drain();
    assert.equal(calls, 7);
    const item = (await f.outbox.list(101))[0];
    assert.equal(item.retry_count, 7);
    assert.equal((await f.db.localSyncReceipts.toArray()).length, 0);
    f.setTransport(
        async (_url: string, payload: any) =>
            new Response(JSON.stringify({ emergency: { id: payload.id } })),
    );
    await f.syncManager.sync(101);
    assert.equal((await f.outbox.list(101)).length, 0);
});

test("reconnection resumes a durable emergency without creating another identifier", async (t) => {
    const f = await offlineRepositoryFixture(true);
    const lease = f.syncManager.setOwner(101);
    t.after(() => {
        f.syncManager.clearOwner(lease);
        f.cleanup();
    });
    const id = await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "PSYCHOSIS",
    });
    f.browser.navigator.onLine = false;
    let calls = 0;
    f.setTransport(async (_url: string, payload: any) => {
        calls++;
        assert.equal(payload.id, id);
        return new Response(JSON.stringify({ emergency: { id } }));
    });
    await f.syncManager.sync(101);
    assert.equal(calls, 0);
    f.browser.navigator.onLine = true;
    f.browser.dispatchEvent(new Event("online"));
    for (let i = 0; i < 100 && (await f.outbox.list(101)).length; i++)
        await pause(5);
    assert.equal(calls, 1);
    assert.equal((await f.outbox.list(101)).length, 0);
});

for (const restriction of [
    "lock",
    "logout",
    "switch",
    "same-owner-new-session",
]) {
    test(`late server receipt cannot cross ${restriction}`, async (t) => {
        const f = await offlineRepositoryFixture(true);
        let lease = f.syncManager.setOwner(101);
        t.after(() => {
            f.syncManager.clearOwner(lease);
            f.cleanup();
        });
        const id = await f.emergencyWorkflow.createLocalEmergency(101, {
            redFlagType: "PSYCHOSIS",
        });
        let release: (response: Response) => void = () => {};
        let started = false;
        f.setTransport(
            () =>
                new Promise<Response>((resolve) => {
                    started = true;
                    release = resolve;
                }),
        );
        const pending = f.syncManager.sync(101).catch(() => {});
        for (let i = 0; i < 100 && !started; i++) await pause(5);
        assert.equal(started, true);
        if (restriction === "lock") f.storage.lockAllClinicalKeys();
        else if (restriction === "logout") f.syncManager.clearOwner(lease);
        else
            lease = f.syncManager.setOwner(
                restriction === "switch" ? 102 : 101,
            );
        release(new Response(JSON.stringify({ emergency: { id } })));
        await pending;
        assert.equal((await f.db.localSyncReceipts.toArray()).length, 0);
        assert.equal((await f.db.encryptedOutboxIndex.toArray()).length, 1);
    });
}
