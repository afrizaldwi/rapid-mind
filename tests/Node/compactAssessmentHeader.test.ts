import assert from 'node:assert/strict';
import test from 'node:test';
import { reactive } from 'vue';
import { moduleStub, mountFixture, vueModuleUrl } from './helpers/mountedVueFixture.ts';
(globalThis as any).window = new EventTarget();
Object.assign(navigator, { onLine: true });
const vue = import.meta.resolve('vue');
const Header = (await import(await vueModuleUrl('resources/js/components/Relawan/Assessment/AssessmentAppHeader.vue', {
 '@/components/ui/LanguageSwitcher.vue':moduleStub(`import {h} from '${vue}';export default {setup:()=>()=>h('button','Bahasa')};`),
}))).default;
test('compact assessment keeps save failure visible and opens data details; offline warning reacts to connection',async()=>{
 let opens=0;
 const props=reactive({shelter:'Posko sintetis',kind:'failed',label:'Simpan gagal',onlineServer:true,onStatus:()=>opens++});
 const f=mountFixture(Header,props);
 try{
 assert.match(f.text(),/Simpan gagal/);
 assert.equal(f.nodes(n=>n.tag==='details'||n.tag==='summary').length,0);
 assert.ok(f.nodes(n=>n.tag==='button'&&n['aria-label']==='Keluar akun').length);
 assert.match(f.text(),/Bahasa/);
 f.nodes(n=>n.tag==='button'&&f.text(n).includes('Simpan gagal'))[0].onClick();assert.equal(opens,1);
 Object.assign(navigator,{onLine:false});window.dispatchEvent(new Event('offline'));await f.flush();assert.match(f.text(),/jangan tutup halaman/);
 props.kind='unavailable';await f.flush();assert.match(f.text(),/Offline/);assert.doesNotMatch(f.text(),/Tersimpan/);
 Object.assign(navigator,{onLine:true});window.dispatchEvent(new Event('online'));await f.flush();assert.doesNotMatch(f.text(),/jangan tutup halaman/);
 assert.equal(f.nodes(n=>n.tag==='button'&&String(n.class).includes('rm-status')).length,0);
 assert.doesNotMatch(f.text(),/Online|Offline/);
 }finally{f.app.unmount();}
});
test('compact PWA notice hides routine readiness but preserves update and offline-error details',async()=>{
 const readiness=((globalThis as any).__compactReadiness=reactive({state:'READY',updateWaiting:false}));
 let checks=0;(globalThis as any).__checkReadiness=()=>checks++;
 const Notice=(await import(await vueModuleUrl('resources/js/components/Relawan/OfflineReadinessNotice.vue',{
  '@/pwa/register':moduleStub('export const offlineReadiness=globalThis.__compactReadiness;export const registerRelawanServiceWorker=()=>globalThis.__checkReadiness();'),
 }))).default;
 const f=mountFixture(Notice,{compact:true});
 try{
 assert.equal(f.nodes(n=>n.tag==='aside').length,0);
 readiness.updateWaiting=true;await f.flush();assert.equal(f.nodes(n=>n.tag==='aside').length,0);
 readiness.state='ERROR';await f.flush();f.nodes(n=>n.tag==='button')[0].onClick();assert.equal(checks,1);
 }finally{f.app.unmount();}
});
