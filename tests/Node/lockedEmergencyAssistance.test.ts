import assert from "node:assert/strict";
import test from "node:test";
import { nextTick } from "vue";
import { moduleStub, mountFixture, vueModuleUrl } from "./helpers/mountedVueFixture.ts";

test("locked assistance opens without clinical access and tracks network availability", async (t) => {
    const events = new EventTarget();
    const oldWindow = (globalThis as any).window;
    const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    (globalThis as any).window = events;
    const device = { onLine: true };
    Object.defineProperty(globalThis, 'navigator', {value: device, configurable: true});
    let view: ReturnType<typeof mountFixture>;
    t.after(() => {
        view?.app.unmount();
        (globalThis as any).window = oldWindow;
        if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
        else delete (globalThis as any).navigator;
    });
    const component = (await import(await vueModuleUrl('resources/js/components/Relawan/LockedEmergencyGuidance.vue', {
        '@/i18n': moduleStub(`import { ref } from '${import.meta.resolve('vue')}'; export const useI18n = () => ({isEn: ref(false)});`),
    }))).default;
    view = mountFixture(component);
    const button = view.nodes(n => n.tag === 'button')[0];
    assert.equal(button['aria-expanded'], false);
    button.onClick(); await nextTick();
    assert.equal(button['aria-expanded'], true);
    assert.match(view.text(), /Kontak bantuan terverifikasi belum tersedia/);
    assert.match(view.text(), /Koneksi server belum dipastikan/);
    assert.equal(view.nodes(n => n.tag === 'a').length, 0);
    assert.equal(view.nodes(n => n.tag === 'input' || n.tag === 'form').length, 0);
    device.onLine = false; events.dispatchEvent(new Event('offline')); await nextTick();
    assert.match(view.text(), /Perangkat offline/);
    assert.match(view.text(), /Tidak ada permintaan yang dikirim/);
    button.onClick(); await nextTick();
    assert.equal(button['aria-expanded'], false);
});
