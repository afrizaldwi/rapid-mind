import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

for (const duration of [5 * 60_000, 60 * 60_000]) test(`backgrounding for ${duration}ms preserves field access`, async t => {
    const f = await offlineRepositoryFixture(true);
    t.after(f.cleanup);
    const ticket = f.fence.captureClinicalAccess();
    const before = await f.db.encryptedStaging.toArray();
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.now() });
    f.browser.document.visibilityState = "hidden";
    f.browser.document.dispatchEvent(new Event("visibilitychange"));
    t.mock.timers.tick(duration);
    f.browser.document.visibilityState = "visible";
    f.browser.document.dispatchEvent(new Event("visibilitychange"));
    f.fence.assertClinicalAccess(ticket);
    assert.equal(f.storage.clinicalKeyReady(101), true);
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
});

for (const event of ["pagehide", "logout", "storage"]) test(`${event} still rejects stale operations`, async t => {
    const f = await offlineRepositoryFixture(true);
    t.after(f.cleanup);
    const ticket = f.fence.captureClinicalAccess();
    if (event === "logout") f.storage.lockAllClinicalKeys();
    else f.browser.dispatchEvent(Object.assign(new Event(event), { key: "rapid-mind:clinical-access-v2" }));
    assert.equal(f.storage.clinicalKeyReady(101), false);
    assert.throws(() => f.fence.assertClinicalAccess(ticket));
});
