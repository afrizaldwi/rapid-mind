import assert from "node:assert/strict";
import test from "node:test";
import { offlineRepositoryFixture } from "./helpers/offlineRepositoryFixture.ts";

const origin = "http://localhost:8080";
const passphrase = "frasa panjang untuk aktivasi lokal sintetis B4.4";
async function localFixture(
    t: any,
    mode = "production",
    browserOrigin = origin,
) {
    const f = await offlineRepositoryFixture(false, {
        mode,
        origin: browserOrigin,
        initialize: false,
    });
    t.after(f.cleanup);
    await f.continuity.recordVerifiedRelawan(
        { id: 101, role: "RELAWAN", name: "Relawan Sintetis" },
        true,
    );
    return f;
}
const allowed = (id = 101, role = "RELAWAN", responseOrigin = origin) =>
    new Response(
        JSON.stringify({
            state: "LOCAL_ENROLLMENT_ALLOWED",
            origin: responseOrigin,
            user: { id, role },
        }),
    );

test("ordinary built assets require authenticated local policy; enrolled owner unlocks offline without fetch", async (t) => {
    const f = await localFixture(t);
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "ACTIVATION_DISABLED",
    );
    let requests = 0;
    t.mock.method(globalThis, "fetch", async (url, options) => {
        requests++;
        assert.match(
            String(url),
            /^\/relawan\/offline-enrollment-status\?owner_user_id=101$/,
        );
        assert.equal(options.credentials, "same-origin");
        assert.equal(options.cache, "no-store");
        return allowed();
    });
    await f.authorization.prepareLocalEnrollment(101);
    assert.equal(f.authorization.encryptedEnrollmentAllowed(101), true);
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "FRESH",
    );
    const recovery = await f.enrollment.beginClinicalEnrollment(
        101,
        passphrase,
        passphrase,
    );
    assert.equal(
        (await f.db.ownerEncryptionModes.get(101)).activation,
        "LOCAL_DEVELOPMENT_V1",
    );
    await f.enrollment.confirmClinicalRecovery(101);
    await f.patients.save(101, {
        id: "local-synthetic",
        name: "Penyintas Sintetis",
    });
    f.storage.lockAllClinicalKeys();
    f.browser.navigator.onLine = false;
    const before = requests;
    await f.authorization.prepareLocalEnrollment(101);
    assert.equal(requests, before);
    await f.enrollment.unlockClinicalOwner(101, passphrase, "passphrase");
    assert.equal(requests, before);
    assert.equal(
        (await f.patients.get(101, "local-synthetic")).name,
        "Penyintas Sintetis",
    );
    assert.equal(f.db.patients.rows.size, 0);
    f.storage.lockAllClinicalKeys();
    await f.enrollment.unlockClinicalOwner(101, recovery, "recovery");
    assert.equal(requests, before);
});

for (const reason of [
    "denied",
    "unauthenticated",
    "wrong-owner",
    "wrong-role",
    "wrong-origin",
    "stale-lock",
]) {
    test(`local enrollment rejects ${reason} without generating a key`, async (t) => {
        const f = await localFixture(t);
        t.mock.method(globalThis, "fetch", async () => {
            if (reason === "stale-lock") f.storage.lockAllClinicalKeys();
            if (reason === "denied" || reason === "unauthenticated")
                return new Response("{}", {
                    status: reason === "denied" ? 403 : 401,
                });
            return allowed(
                reason === "wrong-owner" ? 102 : 101,
                reason === "wrong-role" ? "HEALTHCARE" : "RELAWAN",
                reason === "wrong-origin" ? "https://remote.example" : origin,
            );
        });
        await assert.rejects(
            f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase),
        );
        assert.equal(f.db.offlineKeys.rows.size, 0);
        assert.equal(f.db.ownerEncryptionModes.rows.size, 0);
        assert.equal(f.authorization.encryptedEnrollmentAllowed(101), false);
    });
}

for (const mode of ["production", "encrypted-acceptance", "staging-fixture"]) {
    test(`${mode} deployed to a remote origin cannot authorize enrollment with a frontend mode alone`, async (t) => {
        const f = await localFixture(t, mode, "https://rapid-mind.example");
        const request = t.mock.method(globalThis, "fetch", async () => {
            throw new Error("Remote enrollment must not request local policy");
        });
        assert.equal(f.environment.stagingEncryptionFixture(), false);
        assert.equal(f.environment.acceptanceEncryptionFixture(), false);
        assert.equal(
            await f.initialization.inspectClinicalInitialization(101),
            "ACTIVATION_DISABLED",
        );
        await assert.rejects(
            f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase),
        );
        assert.equal(request.mock.callCount(), 0);
        await assert.rejects(f.patients.save(101, { name: "Sintetis" }));
    });
}

test("local authorization preserves legacy quarantine and interrupted same-DEK enrollment", async (t) => {
    const f = await localFixture(t);
    t.mock.method(globalThis, "fetch", async () => allowed());
    await f.db.patients.put({ id: "legacy", name: "Dummy legacy" });
    await assert.rejects(
        f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase),
    );
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "LEGACY_BLOCKED",
    );
    assert.equal(f.db.patients.rows.size, 1);
    // Explicit removal affects only this in-memory synthetic fixture.
    await f.db.patients.delete("legacy");
    await f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase);
    const before = await f.db.offlineKeys.get(101);
    f.storage.lockAllClinicalKeys();
    await f.enrollment.continueClinicalEnrollment(101, passphrase);
    assert.deepEqual(
        (await f.db.offlineKeys.get(101)).verification,
        before.verification,
    );
    await f.enrollment.confirmClinicalRecovery(101);
    assert.equal(f.storage.clinicalKeyReady(101), true);
});

for (const mode of ["encrypted-acceptance", "staging-fixture"]) {
    test(`${mode} at the actual localhost application origin still needs server authorization`, async (t) => {
        const f = await localFixture(t, mode);
        const request = t.mock.method(
            globalThis,
            "fetch",
            async () => new Response("{}", { status: 403 }),
        );
        assert.equal(f.environment.acceptanceEncryptionFixture(), false);
        assert.equal(f.environment.stagingEncryptionFixture(), false);
        await assert.rejects(
            f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase),
        );
        assert.equal(request.mock.callCount(), 1);
        assert.equal(f.db.offlineKeys.rows.size, 0);
    });
}

test("127.0.0.1:8080 is not the approved local enrollment origin or an isolated fixture", async (t) => {
    const f = await localFixture(
        t,
        "encrypted-acceptance",
        "http://127.0.0.1:8080",
    );
    t.mock.method(globalThis, "fetch", async () => {
        throw new Error("No local authorization request expected");
    });
    await assert.rejects(
        f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase),
    );
    assert.equal(
        await f.initialization.inspectClinicalInitialization(101),
        "ACTIVATION_DISABLED",
    );
});

test("server denial at recovery confirmation preserves the pending key and permits an authorized retry", async (t) => {
    const f = await localFixture(t);
    let enabled = true;
    t.mock.method(globalThis, "fetch", async () =>
        enabled ? allowed() : new Response("{}", { status: 403 }),
    );
    await f.enrollment.beginClinicalEnrollment(101, passphrase, passphrase);
    const key = await f.db.offlineKeys.get(101);
    enabled = false;
    await assert.rejects(f.enrollment.confirmClinicalRecovery(101));
    assert.equal(
        (await f.db.ownerEncryptionModes.get(101)).mode,
        "ENROLLMENT_PENDING",
    );
    assert.deepEqual(await f.db.offlineKeys.get(101), key);
    assert.equal(f.storage.clinicalKeyReady(101), false);
    enabled = true;
    await f.enrollment.confirmClinicalRecovery(101);
    assert.equal(f.storage.clinicalKeyReady(101), true);
});
