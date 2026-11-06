import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, ref } from "vue";
import {
    vueModuleUrl,
    moduleStub,
    mountFixture,
} from "./helpers/mountedVueFixture.ts";

const state: any = {
    key: ref(0),
    confirmedOwners: [],
    inspectedOwners: [],
    pending: null,
};
(globalThis as any).__b42recovery = state;
const overrides = {
    "./LockedEmergencyGuidance.vue": moduleStub(
        `import { defineComponent, h } from '${import.meta.resolve("vue")}'; export default defineComponent({ setup: () => () => h('p', {}, 'Panduan darurat') });`,
    ),
    "@/offline/offlineKeyWorkflow": moduleStub(`
        export const isolatedEncryptionFixture = () => false;
        export const enrollmentState = async () => 'EXISTING';
        export const enrollIsolatedOwner = async () => 'unused';
        export const unlockIsolatedOwner = async () => {};
    `),
    "@/offline/clinicalStorageInitialization": moduleStub(`
        export const inspectClinicalInitialization = async owner => {
            globalThis.__b42recovery.inspectedOwners.push(owner);
            return 'ENROLLMENT_PENDING';
        };
    `),
    "@/offline/clinicalKeyEnrollment": moduleStub(`
        export const continueClinicalEnrollment = async () => 'SYNTHETIC-RECOVERY-SECRET';
        export const abandonPendingEnrollment = () => {};
        export const confirmClinicalRecovery = owner => {
            globalThis.__b42recovery.confirmedOwners.push(owner);
            return globalThis.__b42recovery.pending;
        };
    `),
    "@/offline/encryptedClinicalStorage": moduleStub(`
        export const clinicalKeyVersion = () => globalThis.__b42recovery.key.value;
        export const clinicalKeyReady = () => false;
    `),
};

for (const invalidation of [
    "owner-switch",
    "owner-switch-rejection",
    "lock",
    "unmount",
    "none",
]) {
    test(`pending recovery confirmation ${invalidation}: only the current operation may emit unlocked`, async () => {
        state.confirmedOwners = [];
        state.inspectedOwners = [];
        let complete!: () => void;
        let reject!: (error: Error) => void;
        state.pending = new Promise<void>((resolve, fail) => {
            complete = resolve;
            reject = fail;
        });
        const owner = ref(101);
        let unlocked = 0;
        const Gate = (
            await import(
                await vueModuleUrl(
                    "resources/js/components/Relawan/OfflineEncryptionGate.vue",
                    overrides,
                )
            )
        ).default;
        const f = mountFixture(
            defineComponent({
                setup: () => () =>
                    h(Gate, {
                        owner: owner.value,
                        onUnlocked: () => unlocked++,
                    }),
            }),
        );
        let unmounted = false;
        try {
            await f.flush();
            await f
                .nodes((node) => node.tag === "form")[0]
                .onSubmit({ preventDefault() {} });
            await f.flush();
            assert.match(f.text(), /SYNTHETIC-RECOVERY-SECRET/);
            const button = f.nodes(
                (node) =>
                    node.tag === "button" &&
                    f.text(node).includes("Saya sudah menyimpan kode"),
            )[0];
            const confirmation = button.onClick();
            assert.deepEqual(state.confirmedOwners, [101]);
            if (invalidation.startsWith("owner-switch")) owner.value = 202;
            else if (invalidation === "lock") state.key.value++;
            else if (invalidation === "unmount") {
                f.app.unmount();
                unmounted = true;
            }
            await f.flush();
            if (invalidation !== "none")
                assert.doesNotMatch(f.text(), /SYNTHETIC-RECOVERY-SECRET/);
            const inspections = [...state.inspectedOwners];
            if (invalidation === "owner-switch-rejection")
                reject(new Error("Synthetic interrupted confirmation"));
            else complete();
            await confirmation;
            await f.flush();
            assert.equal(unlocked, invalidation === "none" ? 1 : 0);
            assert.deepEqual(
                state.inspectedOwners,
                inspections,
                "stale completion must not reload state for either owner",
            );
            assert.doesNotMatch(f.text(), /SYNTHETIC-RECOVERY-SECRET/);
        } finally {
            if (!unmounted) f.app.unmount();
        }
    });
}
