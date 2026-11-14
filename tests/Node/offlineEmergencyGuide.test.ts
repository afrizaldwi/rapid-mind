import assert from 'node:assert/strict';
import test from 'node:test';
import { ref } from 'vue';
import { moduleStub, mountFixture, vueModuleUrl } from './helpers/mountedVueFixture.ts';

test('locked offline shell opens and closes T0 guidance without unlock or clinical operations', async (t) => {
    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;
    (globalThis as any).window = new EventTarget();
    (globalThis as any).document = { activeElement: null };
    const state = ((globalThis as any).__offlineGuide = { view: ref({ status: 'LOCKED' }), writes: 0 });
    const vue = import.meta.resolve('vue');
    const component = (await import(await vueModuleUrl('resources/js/relawan/OfflineRelawanShell.vue', {
        '@/i18n': moduleStub(`import {ref} from '${vue}'; export const useI18n=()=>({isEn:ref(false)});`),
        '@/components/Relawan/OfflineEncryptionGate.vue': moduleStub(`import {defineComponent,h} from '${vue}'; export default defineComponent({setup:()=>()=>h('p','Unlock sintetis')});`),
        './runtime': moduleStub('export const relawanRuntimeKey=Symbol();'),
        './offlineNavigation': moduleStub('export const createOfflineNavigation=()=>({view:globalThis.__offlineGuide.view,runtime:{owner:101,mode:"OFFLINE_FIELD_MODE",navigate(path){globalThis.__offlineGuide.path=path}},start(){},stop(){}});'),
        '@/offline/relawanContinuity': moduleStub('export const lockRelawanContinuity=()=>{globalThis.__offlineGuide.writes++;};'),
        '@/offline/encryptedClinicalStorage': moduleStub('export const lockAllClinicalKeys=()=>{globalThis.__offlineGuide.writes++;};'),
        '@/offline/sessionRecovery': moduleStub('export const startRelawanSessionRecovery=()=>{};'),
    }))).default;
    const f = mountFixture(component, { owner: 101 });
    t.after(() => { f.app.unmount(); (globalThis as any).window = previousWindow; (globalThis as any).document = previousDocument; });
    const button = (label: string) => f.nodes(n => n.tag === 'button' && f.text(n).includes(label))[0];
    assert.doesNotMatch(f.text(), /Panduan bantuan darurat|Unlock sintetis/);
    button('T0 DARURAT').onClick(); await f.flush();
    button('Panduan bantuan darurat').onClick(); await f.flush();
    assert.match(f.text(), /Tidak ada permintaan yang dikirim/);
    assert.doesNotMatch(f.text(), /Unlock sintetis/);
    assert.equal(f.nodes(n => n.tag === 'input' || n.tag === 'form').length, 0);
    assert.equal(state.writes, 0);
    f.nodes(n => n.role === 'dialog')[0].onKeydown({ key: 'Escape', preventDefault() {} }); await f.flush();
    assert.equal(f.nodes(n => n.role === 'dialog').length, 0);
    button('Buka data offline').onClick(); await f.flush();
    assert.match(f.text(), /Unlock sintetis/);
    assert.doesNotMatch(f.text(), /Mode terbatas|lanjutkan pekerjaan/);
    button('T0 DARURAT').onClick(); await f.flush();
    assert.match(f.text(), /Panduan bantuan darurat/);
    button('Tutup').onClick(); await f.flush();
    button('Beranda').onClick(); await f.flush();
    assert.equal((state as { path?: string }).path, '/relawan/home');
    assert.equal(state.writes, 0);
});
