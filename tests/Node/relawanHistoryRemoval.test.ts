import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { reactive, ref } from 'vue';
import { mountFixture, moduleStub, vueModuleUrl } from './helpers/mountedVueFixture.ts';

const state = ((globalThis as any).__historyRemoval = {
    unlocked: ref(false), generation: ref(0), retries: 0,
});
const vue = import.meta.resolve('vue');
const stubComponent = (text: string) => moduleStub(`import {defineComponent,h} from '${vue}'; export default defineComponent({setup:()=>()=>h('p',${JSON.stringify(text)})});`);
const Status = (await import(await vueModuleUrl('resources/js/components/Relawan/RelawanStatusDataSheet.vue', {
    './PendingClinicalQueue.vue': stubComponent('Antrean sintetis terenkripsi'),
    './OfflineEncryptionGate.vue': stubComponent('Unlock sintetis'),
    '@/offline/encryptedClinicalStorage': moduleStub('export const clinicalKeyReady=()=>globalThis.__historyRemoval.unlocked.value; export const clinicalKeyVersion=()=>globalThis.__historyRemoval.generation.value;'),
    '@/i18n': moduleStub(`import {ref} from '${vue}'; export const useI18n=()=>({isEn:ref(false)});`),
    '@/composables/useDialogFocus': moduleStub('export const useDialogFocus=()=>({keydown(){}});'),
}))).default;

test('pending delivery inspection requests unlock explicitly and clears on lock/owner change', async () => {
    state.unlocked.value = false;
    const props = reactive({ show: true, owner: 101 as number | null, kind: 'pending', label: 'Tertunda', ready: true,
        online: true, pendingCount: 1, failedCount: 1, unfinishedCount: 0, unqueuedCompletedCount: 0,
        isSyncing: false, canRetry: true, actionError: '', onRetry: () => state.retries++ });
    const f = mountFixture(Status, props);
    const button = (label: string) => f.nodes(n => n.tag === 'button' && f.text(n).includes(label))[0];
    try {
        assert.doesNotMatch(f.text(), /Unlock sintetis|Antrean sintetis/);
        button('Periksa pengiriman').onClick(); await f.flush();
        assert.match(f.text(), /Unlock sintetis/);
        state.unlocked.value = true; state.generation.value++; await f.flush();
        assert.match(f.text(), /Antrean sintetis/);
        button('Coba Sinkronkan').onClick(); assert.equal(state.retries, 1);
        state.unlocked.value = false; state.generation.value++; await f.flush();
        assert.doesNotMatch(f.text(), /Antrean sintetis/);
        props.owner = null; await f.flush();
        assert.doesNotMatch(f.text(), /Unlock sintetis|Antrean sintetis/);
    } finally { f.app.unmount(); }
});

test('Relawan navigation has three destinations and session recovery targets Home', () => {
    const layout = readFileSync('resources/js/layouts/RelawanLayout.vue', 'utf8');
    assert.doesNotMatch(layout, /href="\/relawan\/data"/);
    assert.match(layout, /grid-cols-3/);
    for (const file of ['resources/js/offline/sessionRecovery.ts', 'resources/js/offline/syncManager.ts']) {
        assert.doesNotMatch(readFileSync(file, 'utf8'), /\/relawan\/data/);
    }
});
