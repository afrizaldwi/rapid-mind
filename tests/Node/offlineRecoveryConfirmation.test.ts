import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, ref } from "vue";
import { vueModuleUrl, moduleStub, mountFixture } from "./helpers/mountedVueFixture.ts";

for (const change of ["owner-switch", "owner-switch-rejection", "unmount", "none"]) {
    test(`automatic device preparation ignores stale completion: ${change}`, async () => {
        let complete!: () => void;
        let reject!: (error: Error) => void;
        const pending = new Promise<void>((resolve, fail) => { complete = resolve; reject = fail; });
        (globalThis as any).__automaticGate = { prepare: () => pending };
        const Gate = (await import(await vueModuleUrl("resources/js/components/Relawan/OfflineEncryptionGate.vue", {
            "@/offline/deviceKeyWorkflow": moduleStub("export const ensureDeviceClinicalAccess=owner=>globalThis.__automaticGate.prepare(owner);"),
        }))).default;
        const owner = ref(101);
        let ready = 0;
        const f = mountFixture(defineComponent({ setup: () => () => h(Gate, { owner: owner.value, onUnlocked: () => ready++ }) }));
        assert.equal(f.nodes(n => n.tag === "input" || n.tag === "form").length, 0);
        if (change.startsWith("owner-switch")) {
            (globalThis as any).__automaticGate.prepare = () => new Promise(() => {});
            owner.value = 202;
            await f.flush();
        }
        if (change === "unmount") f.app.unmount();
        if (change === "owner-switch-rejection") reject(new Error("Synthetic stale failure")); else complete();
        await f.flush();
        assert.equal(ready, change === "none" ? 1 : 0);
        assert.doesNotMatch(f.text(), /Synthetic stale failure|frasa sandi|pemulihan/i);
        if (change !== "unmount") f.app.unmount();
    });
}
