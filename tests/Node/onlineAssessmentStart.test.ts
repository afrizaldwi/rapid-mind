import assert from 'node:assert/strict';
import test from 'node:test';
import { reactive, ref } from 'vue';
import { moduleStub, mountFixture, vueModuleUrl } from './helpers/mountedVueFixture.ts';
const vue = import.meta.resolve('vue');
(globalThis as any).Document = class {};
(globalThis as any).ShadowRoot = class {};
(globalThis as any).document = { activeElement: null };
Object.assign(navigator, { onLine: true });
const state = ((globalThis as any).__start = { runtime: reactive({owner:101,path:'/relawan/assessment',mode:'ONLINE_SERVER',shelterId:1}), key:ref(0), unlocked:false, sent:[] as any[], saved:[] as any[], nav:[] as string[], fail:false });
const component = (await import(await vueModuleUrl('resources/js/Pages/Relawan/Assessment/Index.vue', {
 '@/relawan/RelawanLink.vue':moduleStub(`import {h} from '${vue}';export default {setup(p,{slots}){return()=>h('a',null,slots.default?.())}};`),
 '@/relawan/runtime':moduleStub('export const useRelawanRuntime=()=>globalThis.__start.runtime;'),
 '@/layouts/RelawanLayout.vue':moduleStub(`import {h} from '${vue}';export default {props:['clinicalAccessRequested'],setup(p,{slots}){return()=>h('div',null,[p.clinicalAccessRequested?h('p','Unlock requested'):null,slots.default?.()])}};`),
 '@/offline/encryptedClinicalStorage':moduleStub('export const clinicalKeyReady=()=>globalThis.__start.unlocked;export const clinicalKeyVersion=()=>globalThis.__start.key.value;'),
 '@/offline/assessmentWorkflow':moduleStub('export const relawanOwner=()=>101;export const startLocalAssessment=async()=>{globalThis.__start.saved.push("offline");return "local"};'),
 '@/composables/relawanAssessmentDrafts':moduleStub('export const serverAssessmentDrafts=()=>[];export const loadRelawanAssessmentDrafts=async()=>({drafts:[],patients:[]});'),
 '@/offline/deviceKeyWorkflow':moduleStub('export const ensureDeviceClinicalAccess=async()=>{globalThis.__start.unlocked=true;};'),
 '@/offline/syncManager':moduleStub('export const syncManager={sync:async()=>{}};'),
 '@/offline/jsonRequest':moduleStub('export const jsonRequest=async(path,payload)=>{const s=globalThis.__start;s.sent.push({path,payload});if(s.fail)throw Error("network");return {ok:true,json:async()=>({assessment:{id:payload.id}})}};'),
 '@/offline/assessmentRepository':moduleStub('export const assessmentRepository={save:async(o,r)=>globalThis.__start.saved.push({type:"assessment",record:r})};'),
 '@/offline/patientRepository':moduleStub('export const patientRepository={saveServerSnapshot:async(o,r)=>globalThis.__start.saved.push({type:"patient",record:r})};'),
 '@/offline/assessmentSync':moduleStub('export const queueAssessmentSnapshot=async(o,id)=>globalThis.__start.saved.push({type:"queue",id});'),
}))).default;
function setup(){state.runtime.mode='ONLINE_SERVER';state.unlocked=false;state.fail=false;state.sent=[];state.saved=[];state.nav=[];(state.runtime as any).navigate=(url:string)=>state.nav.push(url);const f=mountFixture(component);f.nodes(n=>n.id==='assessment-patient-name')[0]['onUpdate:modelValue']('Penyintas sintetis');return f;}
for (const online of [true, false]) test(`assessment start saves and queues locally without unlock (online=${online})`,async()=>{
 const f=setup(); Object.assign(navigator,{onLine:online});
 try {
  await f.nodes(n=>n.tag==='form')[0].onSubmit({preventDefault(){}}); await f.flush();
  assert.equal(state.sent.length,0);
  assert.ok(state.saved.includes('offline'));
  assert.ok(state.saved.some(r=>r.type==='queue' && r.id==='local'));
  assert.equal(state.nav[0],'/relawan/assessment/local/identity');
  assert.doesNotMatch(f.text(),/Unlock requested|frasa sandi/i);
 }finally{f.app.unmount();}
});
