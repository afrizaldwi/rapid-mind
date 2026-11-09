import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h } from "vue";
import { mountFixture } from "./helpers/mountedVueFixture.ts";
import {
    offlineNavigationFixture,
    settle,
} from "./helpers/offlineNavigationFixture.ts";

async function seeded(t: any) {
    const f = await offlineNavigationFixture(t);
    await f.assessments.save(101, {
        id: "synthetic-assessment",
        patient_id: "patient-synthetic",
        mode: "VERBAL",
        status: "IN_PROGRESS",
        srq_answers: { 1: true, 2: "UNCLEAR" },
    });
    await f.queue(101, "synthetic-assessment");
    await f.emergencyWorkflow.createLocalEmergency(101, {
        redFlagType: "MEDICAL_CRISIS",
    });
    return f;
}
function snapshot(f: any) {
    return JSON.stringify(
        Object.entries(f.db)
            .filter(([, value]: any) => value.rows)
            .map(([name, table]: any) => [name, [...table.rows]]),
    );
}
function until(condition: () => boolean) {
    return (async () => {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (condition()) return;
            await settle();
        }
        assert.fail("Navigation did not settle into its expected state");
    })();
}
const stage = (name: string) =>
    `/relawan/assessment/synthetic-assessment/${name}`;

test("one explicit unlock covers all assessment stages with reactive props and no storage writes", async (t) => {
    const f = await seeded(t);
    f.storage.lockAllClinicalKeys();
    const n = f.state.navigation;
    await n.start();
    assert.equal(n.view.value.status, "LOCKED");
    await f.enrollment.unlockClinicalOwner(
        101,
        "frasa sandi panjang pengujian repository sintetis",
        "passphrase",
    );
    await until(() => n.view.value.status === "READY");
    const before = snapshot(f);
    const version = f.storage.clinicalKeyVersion();
    for (const name of ["identity", "srq", "risk", "function", "review"]) {
        n.runtime.navigate(stage(name));
        await until(
            () =>
                n.view.value.status === "READY" &&
                n.runtime.path === stage(name),
        );
        assert.equal(n.runtime.pageProps.patient.id, "patient-synthetic");
        assert.equal(n.runtime.pageProps.assessment.user_id, 101);
        assert.equal(
            f.storage.clinicalKeyVersion(),
            version,
            "Navigation cannot lock or reinstall a key",
        );
    }
    assert.equal(
        snapshot(f),
        before,
        "Drafts, emergency, outbox and all storage rows remain byte-for-byte unchanged",
    );
    assert.deepEqual(f.assignments, []);
    assert.deepEqual(f.historyStates, [null, null, null, null, null]);
});

test("query strings, question anchors and Back/Forward keep URLs and resolved props aligned", async (t) => {
    const f = await seeded(t);
    const n = f.state.navigation;
    await n.start();
    n.runtime.navigate(stage("srq") + "?review=1#srq-question-17");
    await until(
        () =>
            n.view.value.status === "READY" &&
            n.runtime.path.endsWith("?review=1"),
    );
    await settle();
    assert.equal(f.focused.at(-1), "srq-question-17");
    const revision = n.view.value.revision;
    n.runtime.navigate("#srq-question-20");
    await until(() => f.focused.at(-1) === "srq-question-20");
    assert.equal(
        n.view.value.revision,
        revision,
        "Same-page anchors preserve the mounted draft",
    );
    n.runtime.navigate(stage("risk"));
    await until(() => n.runtime.path === stage("risk"));
    (f.browser as any).history.back();
    await until(() => n.runtime.path.endsWith("?review=1"));
    assert.equal(f.browser.location.hash, "#srq-question-20");
    (f.browser as any).history.forward();
    await until(() => n.runtime.path === stage("risk"));
    assert.equal(
        f.historyStates.length,
        3,
        "Popstate/hashchange must not push duplicate history entries",
    );
});

for (const event of ["pagehide", "hidden", "storage", "protocol"]) {
    test(`${event} invalidation masks the shell synchronously, drops props and rejects pending navigation`, async (t) => {
        const f = await seeded(t);
        const mounted = mountFixture(
            defineComponent({
                setup: () => () => h(f.state.Shell, { owner: 101 }),
            }),
        );
        f.state.mounted = mounted;
        await until(() => mounted.text().includes("Assessment/Index.vue"));
        // Shell-created controller is separate from the direct API test controller.
        const n = f.state.shellNavigation;
        n.runtime.navigate(stage("identity"));
        await until(() => mounted.text().includes("Penyintas Sintetis"));
        const root = mounted.nodes((node) => node.tag === "div")[0];
        const invalidate = () => {
            if (event === "hidden") {
                f.browser.document.visibilityState = "hidden";
                f.browser.document.dispatchEvent(new Event("visibilitychange"));
            } else if (event === "storage") {
                f.browser.dispatchEvent(Object.assign(new Event("storage"), {
                    key: "rapid-mind:clinical-access-v2",
                }));
            } else if (event === "protocol") {
                // Same entrypoint as the unchanged service-worker listener;
                // this does not establish actual worker protocol reception.
                f.fence.invalidateClinicalAccess();
            } else f.browser.dispatchEvent(new Event("pagehide"));
        };
        assert.notEqual(root.style.display, "none");
        invalidate();
        assert.equal(root.style.display, "none", "Visible clinical DOM is masked in the event's synchronous call stack");
        assert.equal(root["aria-hidden"], "true");
        await mounted.flush();
        assert.doesNotMatch(mounted.text(), /Penyintas Sintetis/);
        f.browser.document.visibilityState = "visible";
        await f.enrollment.unlockClinicalOwner(101, "frasa sandi panjang pengujian repository sintetis", "passphrase");
        await until(() => mounted.text().includes("Penyintas Sintetis"));
        let finish!: (value: any) => void;
        f.state.resolve = () => new Promise(resolve => { finish = resolve; });
        n.runtime.navigate(stage("srq"));
        await until(() => !!finish);
        invalidate();
        assert.equal(root.style.display, "none");
        assert.equal(root["aria-hidden"], "true");
        assert.equal(f.storage.clinicalKeyReady(101), false);
        assert.deepEqual(n.runtime.pageProps, {});
        finish({
            component: defineComponent({
                setup: () => () => h("p", {}, "STALE CLINICAL CONTENT"),
            }),
            props: {},
        });
        await settle();
        await mounted.flush();
        assert.equal(n.view.value.status, "LOCKED");
        assert.match(mounted.text(), /OFFLINE LOCKED/);
        assert.doesNotMatch(mounted.text(), /STALE CLINICAL CONTENT/);
        if (event === "pagehide") {
            n.stop();
            const reopened = f.state.controller(101, () => {});
            f.state.extraNavigations = [reopened];
            await reopened.start();
            assert.equal(
                reopened.view.value.status,
                "LOCKED",
                "Fresh shell after pagehide still needs unlock",
            );
        }
    });
}

for (const scenario of [
    "logout",
    "owner-switch",
    "storage-failure",
    "key-replacement",
]) {
    test(`${scenario} fails closed without installing a clinical page`, async (t) => {
        const f = await seeded(t);
        const n = f.state.navigation;
        await n.start();
        if (scenario === "logout") await f.continuity.lockRelawanContinuity();
        if (scenario === "owner-switch")
            await f.continuity.recordVerifiedRelawan(
                { id: 102, role: "RELAWAN", name: "Relawan sintetis B" },
                true,
            );
        if (scenario === "storage-failure")
            t.mock.method(f.db.ownerEncryptionModes, "get", async () => {
                throw new Error("Synthetic storage outage");
            });
        if (scenario === "key-replacement") {
            const key = await f.db.offlineKeys.get(101);
            await f.db.offlineKeys.put({
                ...key,
                updated_at: "changed-key-metadata",
            });
        }
        n.runtime.navigate(stage("identity"));
        await until(() => !["READY", "LOADING"].includes(n.view.value.status));
        assert.deepEqual(n.runtime.pageProps, {});
        assert.equal(f.storage.clinicalKeyReady(101), false);
        assert.equal(f.assignments.length, 0);
    });
}

test("unavailable, missing and malformed routes show no clinical props; newer requests beat late promises", async (t) => {
    const f = await seeded(t);
    const n = f.state.navigation;
    await n.start();
    for (const href of [
        "/relawan/unsupported",
        "/relawan/assessment/missing/identity",
        "/relawan/assessment/%/identity",
    ]) {
        n.runtime.navigate(href);
        await until(() => !["READY", "LOADING"].includes(n.view.value.status));
        assert.deepEqual(n.runtime.pageProps, {});
    }
    // Errors revoke the key. Explicitly unlock before testing the next race.
    await f.enrollment.unlockClinicalOwner(
        101,
        "frasa sandi panjang pengujian repository sintetis",
        "passphrase",
    );
    await settle();
    let finish!: (value: any) => void;
    f.state.resolve = (_owner: number, path: string) =>
        path.endsWith("/identity")
            ? new Promise((resolve) => {
                  finish = resolve;
              })
            : f.actualResolve(101, path);
    n.runtime.navigate(stage("identity"));
    await until(() => !!finish);
    n.runtime.navigate("/relawan/pfa");
    await until(
        () =>
            n.view.value.status === "READY" &&
            n.runtime.path === "/relawan/pfa",
    );
    finish(await f.actualResolve(101, stage("identity")));
    await settle();
    assert.equal(n.runtime.path, "/relawan/pfa");
    assert.deepEqual(n.runtime.pageProps, {});
});
