import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

const timeout = 5 * 60 * 1000;

async function fixture(t: any) {
    const f = await offlineRepositoryFixture(true);
    t.after(() => f.cleanup());
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.now() });
    function visibility(state: string) {
        f.browser.document.visibilityState = state;
        f.browser.document.dispatchEvent(new Event("visibilitychange"));
    }
    return { ...f, visibility };
}

test("returning before five minutes retains the key and cancels the old timer", async (t) => {
    const f = await fixture(t);
    const ticket = f.fence.captureClinicalAccess();
    const snapshot = () => JSON.stringify(Object.entries(f.db).filter(([, table]: any) => table.rows).map(([name, table]: any) => [name, [...table.rows]]));
    const ciphertext = snapshot();
    f.visibility("hidden");
    t.mock.timers.tick(timeout - 1);
    assert.equal(f.storage.clinicalKeyReady(101), true);
    f.visibility("visible");
    t.mock.timers.tick(timeout);
    f.fence.assertClinicalAccess(ticket);
    assert.equal(f.storage.clinicalKeyReady(101), true);
    assert.equal(snapshot(), ciphertext);
});

test("exactly five minutes hidden locks the key and rejects a pending access ticket", async (t) => {
    const f = await fixture(t);
    const ticket = f.fence.captureClinicalAccess();
    f.visibility("hidden");
    t.mock.timers.tick(timeout);
    assert.equal(f.storage.clinicalKeyReady(101), false);
    assert.throws(() => f.fence.assertClinicalAccess(ticket), /Akses klinis berubah/);
});

for (const check of ["resume", "assert", "capture"]) {
    test(`suspended timers cannot bypass the deadline during ${check}`, async (t) => {
        const f = await fixture(t);
        const ticket = f.fence.captureClinicalAccess();
        f.visibility("hidden");
        t.mock.timers.setTime(Date.now() + timeout);
        if (check === "resume") f.visibility("visible");
        if (check === "capture") f.fence.captureClinicalAccess();
        assert.throws(() => f.fence.assertClinicalAccess(ticket), /Akses klinis berubah/);
        assert.equal(f.storage.clinicalKeyReady(101), false);
    });
}

test("duplicate hidden events do not extend the deadline and each new background interval starts fresh", async (t) => {
    const f = await fixture(t);
    f.visibility("hidden");
    t.mock.timers.tick(timeout - 1);
    f.visibility("visible");
    f.visibility("hidden");
    t.mock.timers.tick(timeout - 1);
    assert.equal(f.storage.clinicalKeyReady(101), true);
    f.visibility("hidden");
    t.mock.timers.tick(1);
    assert.equal(f.storage.clinicalKeyReady(101), false);
});

test("backward wall-clock changes fail closed on resume", async (t) => {
    const f = await fixture(t);
    f.visibility("hidden");
    t.mock.timers.setTime(Date.now() - 1);
    f.visibility("visible");
    assert.equal(f.storage.clinicalKeyReady(101), false);
});

for (const event of ["pagehide", "pageshow", "logout", "storage"]) {
    test(`${event} still invalidates immediately inside the background grace period`, async (t) => {
        const f = await fixture(t);
        f.visibility("hidden");
        if (event === "logout") f.storage.lockAllClinicalKeys();
        else if (event === "storage") {
            f.browser.dispatchEvent(Object.assign(new Event("storage"), { key: "rapid-mind:clinical-access-v2" }));
        } else f.browser.dispatchEvent(new Event(event));
        assert.equal(f.storage.clinicalKeyReady(101), false);
        f.visibility("visible");
    });
}
