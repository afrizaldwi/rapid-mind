import assert from "node:assert/strict";
import test from "node:test";
import { defineComponent, h, reactive, ref } from "vue";
import { moduleStub, mountFixture, vueModuleUrl } from "./helpers/mountedVueFixture.ts";

const vue = import.meta.resolve("vue");
(globalThis as any).document = { activeElement: null, querySelector: () => null };
const state = (globalThis as any).__localT0Detail = {
    runtime: reactive({ owner: 101, path: "/relawan/emergencies/local-event", shelterId: null, shelterName: null, pageProps: {} }),
    key: ref(0), ready: true, value: undefined as any, pending: null as Promise<any> | null,
    reads: [] as any[], observers: [] as any[], layouts: [] as any[],
};
const overrides = {
    "@/relawan/runtime": moduleStub("export const useRelawanRuntime = () => globalThis.__localT0Detail.runtime;"),
    "@/offline/encryptedClinicalStorage": moduleStub("export const clinicalKeyVersion = () => globalThis.__localT0Detail.key.value; export const clinicalKeyReady = () => globalThis.__localT0Detail.ready;"),
    "@/offline/emergencyRepository": moduleStub(`export const emergencyRepository = { get: async (owner,id) => {
        const s=globalThis.__localT0Detail; s.reads.push({owner,id});
        return s.pending ? await s.pending : s.value;
    }};`),
    dexie: moduleStub(`export const liveQuery = read => ({subscribe(observer) {
        const entry={read,observer,unsubscribed:false}; globalThis.__localT0Detail.observers.push(entry);
        read().then(value=>observer.next(value),()=>observer.error());
        return {unsubscribe(){entry.unsubscribed=true;}};
    }});`),
    "@/layouts/RelawanLayout.vue": moduleStub(`import {defineComponent,h,onMounted} from '${vue}'; export default defineComponent({emits:['clinical-ready','clinical-lock'],setup(_p,{emit,slots}){
        globalThis.__localT0Detail.layouts.push(emit);onMounted(()=>emit('clinical-ready'));return ()=>h('main',{},slots.default?.());}});`),
};
const Page = (await import(await vueModuleUrl("resources/js/Pages/Relawan/Emergency.vue", overrides))).default;
const event = (sync = "PENDING_SYNC") => ({ id: "local-event", owner_user_id: 101, patient_name: "P0-SYNTHETIC-LOCAL", red_flag_type: "MEDICAL_CRISIS", sync_state: sync, created_at: "2026-11-13T00:00:00Z" });
function reset() {
    state.runtime.owner=101;state.runtime.path="/relawan/emergencies/local-event";
    state.value=undefined;state.pending=null;state.ready=true;
    state.reads=[];state.observers=[];state.layouts=[];
}

test("unknown local UUID never fabricates a T0 report or server acceptance", async () => {
    reset();const f=mountFixture(Page,{localEmergencyId:"local-event"});
    try {await f.flush();assert.deepEqual(state.reads,[{owner:101,id:"local-event"}]);assert.match(f.text(),/Laporan ini tidak tersedia/);assert.doesNotMatch(f.text(),/T0-Suspect|Diterima server/);assert.equal(f.nodes(n=>n.href?.startsWith("sms:")).length,0);}
    finally {f.app.unmount();}
});

test("owned local event stays pending until live repository reconciliation supplies a receipt", async () => {
    reset();state.value=event();const f=mountFixture(Page,{localEmergencyId:"local-event"});
    try {
        await f.flush();assert.match(f.text(),/P0-SYNTHETIC-LOCAL/);assert.doesNotMatch(f.text(),/Diterima server/);
        state.value=event("SYNCED");const subscription=state.observers.at(-1);subscription.observer.next(await subscription.read());await f.flush();
        assert.match(f.text(),/Diterima server/);assert.doesNotMatch(f.text(),/T0-Confirmed/);
        state.layouts.at(-1)("clinical-lock");assert.equal(state.observers.at(-1).unsubscribed,true);await f.flush();
        assert.doesNotMatch(f.text(),/P0-SYNTHETIC-LOCAL|Diterima server/);
        state.layouts.at(-1)("clinical-ready");await f.flush();assert.match(f.text(),/P0-SYNTHETIC-LOCAL/);
    } finally {f.app.unmount();}
});

for(const invalidation of ["lock","owner-switch","route-change","unmount"]) {
    test(`late local emergency read cannot cross ${invalidation}`,async()=>{
        reset();let resolve!: (value:any)=>void;state.pending=new Promise(done=>{resolve=done;});
        const f=mountFixture(Page,{localEmergencyId:"local-event"});let unmounted=false;
        try {
            await f.flush();
            if(invalidation==="lock") {state.ready=false;state.key.value++;}
            if(invalidation==="owner-switch")state.runtime.owner=102;
            if(invalidation==="route-change")state.runtime.path="/relawan/home";
            if(invalidation==="unmount"){f.app.unmount();unmounted=true;}
            resolve(event());await f.flush();
            assert.doesNotMatch(f.text(),/P0-SYNTHETIC-LOCAL|Diterima server/);
            assert.equal(state.observers[0].unsubscribed,true);
        } finally {if(!unmounted)f.app.unmount();}
    });
}

test("changed local UUID discards old callbacks and rejects foreign-owner records",async()=>{
    reset();state.value=event();const id=ref("local-event");
    const f=mountFixture(defineComponent({setup:()=>()=>h(Page,{localEmergencyId:id.value})}));
    try {
        await f.flush();const previous=state.observers.at(-1);
        state.value={...event(),id:"other-event",owner_user_id:102};id.value="other-event";await f.flush();
        previous.observer.next(event());await f.flush();
        assert.match(f.text(),/Laporan ini tidak tersedia/);assert.doesNotMatch(f.text(),/P0-SYNTHETIC-LOCAL|Diterima server/);
        assert.deepEqual(state.reads.at(-1),{owner:101,id:"other-event"});
    } finally {f.app.unmount();}
});

test("storage failure displays unavailable state without creating a local record",async()=>{
    reset();state.pending=Promise.reject(new Error("Synthetic storage failure"));
    const f=mountFixture(Page,{localEmergencyId:"local-event"});
    try {await f.flush();assert.match(f.text(),/Laporan lokal belum dapat dibaca/);assert.doesNotMatch(f.text(),/T0-Suspect|Diterima server/);}
    finally {f.app.unmount();}
});

test("existing authorized server report still uses server receipt without reading local storage",async()=>{
    reset();const f=mountFixture(Page,{emergency:{id:"persisted",red_flag_type:"MEDICAL_CRISIS",patient:{name:"P0-SYNTHETIC-SERVER"}}});
    try {await f.flush();assert.match(f.text(),/P0-SYNTHETIC-SERVER/);assert.match(f.text(),/Diterima server/);assert.deepEqual(state.reads,[]);}
    finally {f.app.unmount();}
});
