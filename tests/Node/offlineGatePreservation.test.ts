import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";
import { moduleStub, mountFixture, vueModuleUrl } from "./helpers/mountedVueFixture.ts";

async function setup(t: any) {
    const f = await offlineRepositoryFixture(true, { mode: "encrypted-acceptance", initialize: false });
    t.after(f.cleanup);
    await f.continuity.recordVerifiedRelawan({ id: 101, role: "RELAWAN", name: "Sintetis" }, true);
    return f;
}
async function mountGate(t: any, f: any) {
    (globalThis as any).__deviceGate = f;
    let ready = 0;
    const Gate = (await import(await vueModuleUrl("resources/js/components/Relawan/OfflineEncryptionGate.vue", {
        "@/offline/deviceKeyWorkflow": moduleStub(`export const ensureDeviceClinicalAccess=(...args)=>globalThis.__deviceGate.deviceKeys.ensureDeviceClinicalAccess(...args); // ${crypto.randomUUID()}`),
    }))).default;
    const view = mountFixture(Gate, { owner: 101, onUnlocked: () => ready++ });
    t.after(() => view.app.unmount());
    for (let i = 0; i < 100 && !ready && !view.nodes(n => n.role === "alert").length; i++) {
        await new Promise(resolve => setTimeout(resolve, 5)); await view.flush();
    }
    assert.equal(view.nodes(n => ["input", "form", "output"].includes(n.tag)).length, 0);
    return { ...view, ready: () => ready };
}

test("fresh gate initializes encryption automatically with no registration or recovery UI", async t => {
    const f = await setup(t);
    const view = await mountGate(t, f);
    assert.equal(view.ready(), 1);
    assert.equal((await f.db.offlineKeys.get(101)).version, 2);
    assert.equal((await f.db.ownerEncryptionModes.get(101)).mode, "ENCRYPTED");
    assert.doesNotMatch(view.text(), /frasa sandi|pemulihan|Daftarkan|Buka data/i);
});

test("automatic restoration preserves encrypted unsynchronized fieldwork", async t => {
    const f = await setup(t);
    await f.deviceKeys.ensureDeviceClinicalAccess(101);
    await f.patients.save(101, { id: "patient", name: "Penyintas Sintetis" });
    await f.emergencyWorkflow.createLocalEmergency(101, { redFlagType: "MEDICAL_CRISIS" });
    const before = await f.db.encryptedStaging.toArray();
    const key = await f.db.offlineKeys.get(101);
    f.storage.lockAllClinicalKeys();
    f.browser.navigator.onLine = false;
    const view = await mountGate(t, f);
    assert.equal(view.ready(), 1);
    assert.equal((await f.db.offlineKeys.get(101)).key_id, key.key_id);
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
});

for (const scenario of ["legacy", "missing-key", "logged-out"]) test(`${scenario} remains preserved without asking for a secret`, async t => {
    const f = await setup(t);
    if (scenario === "legacy") await f.db.patients.put({ id: "unknown", name: "Sintetis lama" });
    else {
        await f.deviceKeys.ensureDeviceClinicalAccess(101);
        await f.patients.save(101, { id: "patient", name: "Sintetis" });
        f.storage.lockAllClinicalKeys();
        if (scenario === "missing-key") await f.db.offlineKeys.delete(101);
        else await f.continuity.lockRelawanContinuity();
    }
    const before = await f.db.encryptedStaging.toArray();
    const keyBefore = await f.db.offlineKeys.get(101);
    const view = await mountGate(t, f);
    assert.equal(view.ready(), 0);
    assert.equal(view.nodes(n => n.role === "alert").length, 1);
    assert.deepEqual(await f.db.encryptedStaging.toArray(), before);
    assert.deepEqual(await f.db.offlineKeys.get(101), keyBefore);
});
