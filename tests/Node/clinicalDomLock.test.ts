import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, reactive, ref } from "vue";
import {
    vueModuleUrl,
    moduleStub,
    mountFixture,
} from "./helpers/mountedVueFixture.ts";

const vue = import.meta.resolve("vue");
const state: any = {
    key: ref(0),
    unlocked: ref(true),
    ready: 0,
    lockCalls: 0,
    initialization: "ENCRYPTED_LOCKED",
    synthetic: false,
    encrypted: true,
    storageObserver: null,
};
(globalThis as any).__b42dom = state;
const placeholder = moduleStub(
    `import {defineComponent,h} from '${vue}'; export default defineComponent({setup:()=>()=>h('span')});`,
);
const overrides: Record<string, string> = {};
for (const name of [
    "StatusIndicator",
    "T0Button",
    "T0Verification",
    "LocalEmergencyActive",
    "RelawanStatusDataSheet",
])
    overrides[
        `@/components/${name === "StatusIndicator" ? "ui" : "Relawan"}/${name}.vue`
    ] = placeholder;
overrides["@/relawan/RelawanLink.vue"] = placeholder;
overrides["@/components/Relawan/OfflineEncryptionGate.vue"] = moduleStub(
    `import {defineComponent,h} from '${vue}'; export default defineComponent({setup:()=>()=>h('p',{},'Kunci data klinis offline')});`,
);
overrides["@/offline/encryptedClinicalStorage"] =
    moduleStub(`export const clinicalKeyVersion = () => globalThis.__b42dom.key.value;
export const clinicalKeyReady = () => globalThis.__b42dom.unlocked.value;
export const encryptedMode = async () => globalThis.__b42dom.encrypted;
export const lockAllClinicalKeys = () => {globalThis.__b42dom.lockCalls++; globalThis.__b42dom.unlocked.value = false; globalThis.__b42dom.key.value++;};`);
overrides["@/offline/clinicalStorageInitialization"] = moduleStub(
    "export const syntheticLegacyFixture = () => globalThis.__b42dom.synthetic; export const inspectClinicalInitialization = async () => globalThis.__b42dom.initialization;",
);
overrides["@/offline/offlineKeyWorkflow"] = moduleStub(
    "export const isolatedEncryptionFixture = () => false;",
);
overrides["@/offline/offlineOwnerProfile"] = moduleStub(
    "export const rememberUnlockedRelawan = async () => {};",
);
overrides["@/offline/syncManager"] = moduleStub(
    "export const syncManager = {sync:async()=>{}};",
);
overrides["@/pwa/register"] = moduleStub(
    "export const registerRelawanServiceWorker = () => {};",
);
overrides["@/offline/sessionRecovery"] = moduleStub(
    "export const openRelawanLogin = () => {}; export const relawanSessionRecovery = {};",
);
overrides["@inertiajs/vue3"] = moduleStub("export const router = {post(){}};");
overrides["dexie"] =
    moduleStub(`export const liveQuery = read => ({subscribe: observer => {
    let active = true;
    void read().then(value => { if (active) { if (typeof value === 'string') globalThis.__b42dom.storageObserver = observer; observer.next?.(value); } }, error => { if (active) observer.error?.(error); });
    return {unsubscribe(){active = false;}};
}});`);
overrides["@/offline/relawanContinuity"] = moduleStub(
    "export const recordVerifiedRelawan=async()=>true; export const lockRelawanContinuity=async()=>{}; export const resolveRelawanContinuity=async()=>({state:'ELIGIBLE',context:{owner_user_id:101}});",
);
for (const name of ["patient", "assessment", "emergency"])
    overrides[`@/offline/${name}Repository`] = moduleStub(
        `export const ${name}Repository={list:async()=>[],get:async()=>undefined};`,
    );
overrides["@/composables/useRelawanOperationalStatus"] = moduleStub(
    `import {ref} from '${vue}'; export const useRelawanOperationalStatus = () => ({kind:ref('unavailable'),label:ref('Status'),ready:ref(false),online:ref(false),pendingCount:ref(0),failedCount:ref(0),unfinishedCount:ref(0),unqueuedCompletedCount:ref(0),isSyncing:ref(false),canRetry:ref(false),actionError:ref(''),sessionState:ref('READY'),refresh(){},retry(){}});`,
);
state.runtime = reactive({
    owner: 101,
    name: "Relawan",
    shelterId: null,
    shelterName: null,
    mode: "OFFLINE_FIELD_MODE",
    path: "/relawan/home",
    pageProps: {},
});
overrides["@/relawan/runtime"] = moduleStub(
    "export const useRelawanRuntime=()=>globalThis.__b42dom.runtime;",
);

test("real Relawan layout synchronously masks clinical root and unmounts sensitive children on lock", async () => {
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const oldNavigator = Object.getOwnPropertyDescriptor(
        globalThis,
        "navigator",
    );
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: new EventTarget(),
    });
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { onLine: false },
    });
    const Layout = (
        await import(
            await vueModuleUrl(
                "resources/js/layouts/RelawanLayout.vue",
                overrides,
            )
        )
    ).default;
    let unmounted = 0;
    const { onUnmounted } = await import("vue");
    const Sensitive = defineComponent({
        setup() {
            onUnmounted(() => unmounted++);
            return () => h("p", {}, "Data klinis sintetis rahasia");
        },
    });
    const f = mountFixture(
        defineComponent({
            setup: () => () => h(Layout, {}, { default: () => h(Sensitive) }),
        }),
    );
    try {
        await f.flush();
        assert.match(f.text(), /Data klinis sintetis rahasia/);
        const root = f.nodes((node) => node.class?.includes("font-sans"))[0];
        state.unlocked.value = false;
        state.key.value++;
        assert.equal(root.style.display, "none");
        assert.equal(root["aria-hidden"], "true");
        await f.flush();
        assert.doesNotMatch(f.text(), /Data klinis sintetis rahasia/);
        assert.match(f.text(), /Kunci data klinis offline/);
        assert.equal(unmounted, 1);
    } finally {
        f.app.unmount();
        if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
        else delete (globalThis as any).window;
        if (oldNavigator)
            Object.defineProperty(globalThis, "navigator", oldNavigator);
        else delete (globalThis as any).navigator;
    }
});

for (const invalid of ["INCONSISTENT", "LEGACY_BLOCKED", "INACCESSIBLE", "ACTIVATION_DISABLED"]) {
    test(`unlocked → ${invalid} → restored metadata requires explicit unlock`, async () => {
        state.initialization = "ENCRYPTED_LOCKED";
        state.unlocked.value = true;
        state.lockCalls = 0;
        const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", {
            configurable: true,
            value: new EventTarget(),
        });
        const Layout = (
            await import(
                await vueModuleUrl(
                    "resources/js/layouts/RelawanLayout.vue",
                    overrides,
                )
            )
        ).default;
        const f = mountFixture(
            defineComponent({
                setup: () => () =>
                    h(
                        Layout,
                        {},
                        {
                            default: () =>
                                h("p", {}, "Data klinis sintetis rahasia"),
                        },
                    ),
            }),
        );
        try {
            await f.flush();
            assert.match(f.text(), /Data klinis sintetis rahasia/);
            const root = f.nodes((node) =>
                node.class?.includes("font-sans"),
            )[0];
            state.initialization = invalid;
            state.storageObserver.next(invalid);
            assert.equal(root.style.display, "none");
            assert.equal(root["aria-hidden"], "true");
            assert.equal(
                state.unlocked.value,
                false,
                "untrusted storage must revoke the installed key",
            );
            await f.flush();
            assert.doesNotMatch(f.text(), /Data klinis sintetis rahasia/);
            assert.match(f.text(), /Kunci data klinis offline/);
            assert.equal(state.lockCalls, 1, "invalid state must not cause an invalidation loop");
            state.storageObserver.next(invalid);
            await f.flush();
            assert.equal(state.lockCalls, 1);

            state.initialization = "ENCRYPTED_LOCKED";
            state.storageObserver.next("ENCRYPTED_LOCKED");
            await f.flush();
            assert.equal(state.unlocked.value, false);
            assert.doesNotMatch(f.text(), /Data klinis sintetis rahasia/);
            assert.match(f.text(), /Kunci data klinis offline/);

            // Successful explicit unlock installs a key and publishes its generation.
            // Real passphrase/recovery workflows are exercised in enrollment tests.
            state.unlocked.value = true;
            state.key.value++;
            await f.flush();
            assert.match(f.text(), /Data klinis sintetis rahasia/);
        } finally {
            f.app.unmount();
            if (oldWindow)
                Object.defineProperty(globalThis, "window", oldWindow);
            else delete (globalThis as any).window;
        }
    });
}

for (const initialization of [
    "FRESH",
    "ENROLLMENT_PENDING",
    "LEGACY_BLOCKED",
    "INCONSISTENT",
    "INACCESSIBLE",
    "ACTIVATION_DISABLED",
]) {
    test(`${initialization} never mounts a clinical workspace even with a cached key`, async () => {
        state.initialization = initialization;
        state.unlocked.value = true;
        const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", {
            configurable: true,
            value: new EventTarget(),
        });
        const Layout = (
            await import(
                await vueModuleUrl(
                    "resources/js/layouts/RelawanLayout.vue",
                    overrides,
                )
            )
        ).default;
        const f = mountFixture(
            defineComponent({
                setup: () => () =>
                    h(
                        Layout,
                        {},
                        {
                            default: () =>
                                h("p", {}, "Data klinis sintetis rahasia"),
                        },
                    ),
            }),
        );
        try {
            await f.flush();
            assert.doesNotMatch(f.text(), /Data klinis sintetis rahasia/);
            assert.match(f.text(), /Kunci data klinis offline/);
        } finally {
            f.app.unmount();
            if (oldWindow)
                Object.defineProperty(globalThis, "window", oldWindow);
            else delete (globalThis as any).window;
        }
    });
}

test("synthetic staging fixture retains legacy workspace without an unlocked key", async () => {
    state.synthetic = true;
    state.encrypted = false;
    state.unlocked.value = false;
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: new EventTarget(),
    });
    const Layout = (
        await import(
            await vueModuleUrl(
                "resources/js/layouts/RelawanLayout.vue",
                overrides,
            )
        )
    ).default;
    const f = mountFixture(
        defineComponent({
            setup: () => () =>
                h(
                    Layout,
                    {},
                    { default: () => h("p", {}, "Workspace fixture legacy") },
                ),
        }),
    );
    try {
        await f.flush();
        assert.match(f.text(), /Workspace fixture legacy/);
    } finally {
        f.app.unmount();
        state.synthetic = false;
        state.encrypted = true;
        if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
        else delete (globalThis as any).window;
    }
});

for (const initialization of ["FRESH", "ENROLLMENT_PENDING"]) {
    test(`${initialization} without an installed clinical key remains recoverable without invalidation loops`, async () => {
        state.initialization = initialization;
        state.unlocked.value = false;
        state.lockCalls = 0;
        const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
        const Layout = (await import(await vueModuleUrl("resources/js/layouts/RelawanLayout.vue", overrides))).default;
        const f = mountFixture(defineComponent({ setup: () => () => h(Layout, {}, { default: () => h("p", {}, "Data klinis sintetis rahasia") }) }));
        try {
            await f.flush();
            state.storageObserver.next(initialization);
            state.storageObserver.next(initialization);
            await f.flush();
            assert.equal(state.lockCalls, 0);
            assert.match(f.text(), /Kunci data klinis offline/);
            state.initialization = "ENCRYPTED_LOCKED";
            state.storageObserver.next("ENCRYPTED_LOCKED");
            await f.flush();
            assert.doesNotMatch(f.text(), /Data klinis sintetis rahasia/);
            state.unlocked.value = true;
            state.key.value++;
            await f.flush();
            assert.equal(state.lockCalls, 0);
            assert.match(f.text(), /Data klinis sintetis rahasia/);
        } finally {
            f.app.unmount();
            if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow); else delete (globalThis as any).window;
        }
    });
}
