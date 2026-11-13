import assert from "node:assert/strict";
import test from "node:test";
import { ref } from "vue";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";
import { moduleStub, mountFixture, vueModuleUrl } from "./helpers/mountedVueFixture.ts";

// Vue input directives perform instanceof checks even with this in-memory renderer.
(globalThis as any).Document ??= class Document {};
(globalThis as any).ShadowRoot ??= class ShadowRoot {};

const passphrase = "passphrase pribadi sintetis checkpoint P0";
const owner = 101;
const origin = "http://localhost:8080";
const allowed = () => new Response(JSON.stringify({ state: "LOCAL_ENROLLMENT_ALLOWED", origin, user: { id: owner, role: "RELAWAN" } }));

async function setup(t: any) {
    const f = await offlineRepositoryFixture(false, { mode: "production", origin, initialize: false });
    await f.continuity.recordVerifiedRelawan({ id: owner, role: "RELAWAN", name: "Relawan Sintetis" }, true);
    t.mock.method(globalThis, "fetch", async () => allowed());
    await f.authorization.prepareLocalEnrollment(owner);
    return f;
}
function snapshot(f: any) {
    return Object.fromEntries(Object.entries(f.db).filter(([, table]: any) => table?.rows instanceof Map)
        .map(([name, table]: any) => [name, structuredClone(table.rows)]));
}
async function mountGate(f: any) {
    (globalThis as any).__p0Gate = f;
    const exports = (area: string, names: string[]) => moduleStub(names.map(name =>
        `export const ${name} = globalThis.__p0Gate.${area}.${name};`).join("\n") + `\n// fixture ${crypto.randomUUID()}`);
    const Gate = (await import(await vueModuleUrl("resources/js/components/Relawan/OfflineEncryptionGate.vue", {
        "./LockedEmergencyGuidance.vue": moduleStub(`import { h } from '${import.meta.resolve("vue")}'; export default { render: () => h('p', 'Panduan darurat') };`),
        "@/i18n": moduleStub(`import { ref } from '${import.meta.resolve("vue")}'; export const useI18n = () => ({ isEn: ref(false), locale: ref('id') });`),
        "@/i18n/localizeMessage": moduleStub(`export const localizeMessage = value => value;`),
        "@/offline/offlineKeyWorkflow": moduleStub(`
            export const isolatedEncryptionFixture = () => false;
            export const enrollmentState = async () => 'EXISTING';
            export const enrollIsolatedOwner = (...args) => globalThis.__p0Gate.enrollment.beginClinicalEnrollment(...args);
            export const unlockIsolatedOwner = (...args) => globalThis.__p0Gate.enrollment.unlockClinicalOwner(...args);
        `),
        "@/offline/clinicalStorageInitialization": exports("initialization", ["inspectClinicalInitialization"]),
        "@/offline/clinicalKeyEnrollment": exports("enrollment", ["continueClinicalEnrollment", "confirmClinicalRecovery", "abandonPendingEnrollment"]),
        "@/offline/encryptedClinicalStorage": exports("storage", ["clinicalKeyReady", "clinicalKeyVersion"]),
    }))).default;
    const unlocked = ref(0);
    const view = mountFixture(Gate, { owner, onUnlocked: () => unlocked.value++ });
    for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setImmediate(resolve));
        await view.flush();
    }
    return { ...view, unlocked };
}

for (const state of ["FRESH", "ENROLLMENT_PENDING", "ENCRYPTED_LOCKED", "LEGACY_BLOCKED", "INCONSISTENT", "ACTIVATION_DISABLED", "INACCESSIBLE"]) {
    test(`normal gate mount and retry preserve all records: ${state}`, async (t) => {
        const f = await setup(t);
        let view: any;
        try {
            if (["ENROLLMENT_PENDING", "ENCRYPTED_LOCKED"].includes(state)) {
                await f.enrollment.beginClinicalEnrollment(owner, passphrase, passphrase);
                if (state === "ENCRYPTED_LOCKED") {
                    await f.enrollment.confirmClinicalRecovery(owner);
                    await f.patients.save(owner, { id: "unsynced", name: "Penyintas Sintetis" });
                    await f.emergencyWorkflow.createLocalEmergency(owner, { redFlagType: "MEDICAL_CRISIS", notes: "Darurat sintetis belum dikirim" });
                }
                f.storage.lockAllClinicalKeys();
            }
            if (state === "LEGACY_BLOCKED") {
                await f.db.patients.put({ id: "ownerless", name: "Sintetis tanpa pemilik" });
                await f.db.outbox.put({ id: 77, owner_user_id: 202, payload: { synthetic: true } });
            }
            if (state === "INCONSISTENT") await f.db.ownerEncryptionModes.put({ owner_user_id: owner, mode: "ENCRYPTED" });
            if (state === "ACTIVATION_DISABLED") {
                f.storage.lockAllClinicalKeys();
                t.mock.method(globalThis, "fetch", async () => new Response("{}", { status: 403 }));
            }
            if (state === "INACCESSIBLE") t.mock.method(f.db, "transaction", async () => { throw new Error("Synthetic storage failure"); });
            assert.equal(await f.initialization.inspectClinicalInitialization(owner), state);
            const before = snapshot(f);
            view = await mountGate(f);
            assert.equal(view.unlocked.value, 0);
            assert.deepEqual(snapshot(f), before);
            assert.match(view.text(), /Kunci data klinis offline/);
            assert.ok(view.text().includes("Panduan darurat"));
            view.app.unmount();
            view = await mountGate(f);
            assert.deepEqual(snapshot(f), before);
            assert.equal(view.unlocked.value, 0);
            if (state === "ENCRYPTED_LOCKED") {
                const input = view.nodes((n: any) => n.tag === "input")[0];
                input["onUpdate:modelValue"]("passphrase salah sintetis");
                await view.nodes((n: any) => n.tag === "form")[0].onSubmit({ preventDefault() {} });
                await view.flush();
                assert.equal(view.unlocked.value, 0);
                assert.deepEqual(snapshot(f), before);
                input["onUpdate:modelValue"](passphrase);
                await view.nodes((n: any) => n.tag === "form")[0].onSubmit({ preventDefault() {} });
                assert.equal(view.unlocked.value, 1);
                assert.deepEqual(snapshot(f), before);
                assert.equal((await f.patients.get(owner, "unsynced")).name, "Penyintas Sintetis");
                assert.equal((await f.outbox.list(owner)).length, 1);
            } else if (["FRESH", "ENROLLMENT_PENDING"].includes(state)) {
                assert.equal(view.nodes((n: any) => n.tag === "form").length, 1);
            } else assert.equal(view.nodes((n: any) => n.tag === "form").length, 0);
        } finally { view?.app.unmount(); f.cleanup(); delete (globalThis as any).__p0Gate; }
    });
}

test("normal gate requires recovery display and explicit confirmation before installing a new key", async (t) => {
    const f = await setup(t);
    let view: any;
    try {
        view = await mountGate(f);
        const inputs = view.nodes((n: any) => n.tag === "input");
        inputs[0]["onUpdate:modelValue"](passphrase);
        inputs[1]["onUpdate:modelValue"](passphrase);
        await view.nodes((n: any) => n.tag === "form")[0].onSubmit({ preventDefault() {} });
        await view.flush();
        assert.equal((await f.db.ownerEncryptionModes.get(owner)).mode, "ENROLLMENT_PENDING");
        assert.equal(f.storage.clinicalKeyReady(owner), false);
        assert.equal(view.unlocked.value, 0);
        const recovery = view.text(view.nodes((n: any) => n.tag === "output")[0]);
        assert.match(recovery, /^[A-Za-z0-9_-]{43}$/);
        const before = await f.db.offlineKeys.get(owner);
        await view.nodes((n: any) => n.tag === "button" && view.text(n).includes("Saya sudah menyimpan kode"))[0].onClick();
        assert.equal(view.unlocked.value, 1);
        assert.deepEqual(await f.db.offlineKeys.get(owner), before);
        f.storage.lockAllClinicalKeys();
        f.browser.navigator.onLine = false;
        await f.enrollment.unlockClinicalOwner(owner, recovery, "recovery");
        assert.equal(f.storage.clinicalKeyReady(owner), true);
    } finally { view?.app.unmount(); f.cleanup(); delete (globalThis as any).__p0Gate; }
});


test("normal gate preserves pending key when server denies recovery confirmation", async (t) => {
    const f = await setup(t);
    let view: any;
    try {
        view = await mountGate(f);
        const inputs = view.nodes((n: any) => n.tag === "input");
        inputs[0]["onUpdate:modelValue"](passphrase);
        inputs[1]["onUpdate:modelValue"](passphrase);
        await view.nodes((n: any) => n.tag === "form")[0].onSubmit({ preventDefault() {} });
        await view.flush();
        const before = snapshot(f);
        t.mock.method(globalThis, "fetch", async () => new Response("{}", { status: 403 }));
        await view.nodes((n: any) => n.tag === "button" && view.text(n).includes("Saya sudah menyimpan kode"))[0].onClick();
        await view.flush();
        assert.equal(view.unlocked.value, 0);
        assert.equal(f.storage.clinicalKeyReady(owner), false);
        assert.deepEqual(snapshot(f), before);
        assert.equal((await f.db.ownerEncryptionModes.get(owner)).mode, "ENROLLMENT_PENDING");
    } finally { view?.app.unmount(); f.cleanup(); delete (globalThis as any).__p0Gate; }
});
