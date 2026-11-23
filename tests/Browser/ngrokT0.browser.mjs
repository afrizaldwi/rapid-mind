import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createOfflineKey} from '../../resources/js/offline/offlineCrypto.ts';
import {nativeChromeSession} from './helpers/nativeChromeSession.mjs';
const origin=process.env.RAPID_MIND_DEMO_ORIGIN;
const localhost = origin === 'http://localhost:8080';
assert.ok(localhost || /^https:\/\/[a-z0-9.-]+$/.test(origin ?? ''), 'Use localhost:8080 or an explicitly configured HTTPS demo origin');
const project=resolve(import.meta.dirname,'../..');
const run=await mkdtemp(join(tmpdir(),'rapid-ngrok-t0-'));
const tag=randomUUID().slice(0,12), marker='SINTETIS-NGROK-T0-'+tag;
const passwords={relawan:randomBytes(24).toString('base64url'),healthcare:randomBytes(24).toString('base64url')};
const report={status:'NOT TESTED',origin,scenarios:[],retainedSynthetic:{},limitations:['New isolated desktop Chrome profiles with a mobile viewport; physical phone not tested.','Server acceptance and Healthcare visibility are not clinical verification or actual dispatch.']};
let activeDatabase='RapidMindOfflineDB', legacyBefore;
const sessions=[];let current,phase='preflight',fixtures;
function php(code){return JSON.parse(execFileSync(process.platform==='win32'?'wsl':'docker',process.platform==='win32'?['-d','Ubuntu','docker','compose','exec','-T','app','php']:['compose','exec','-T','app','php'],{cwd:project,encoding:'utf8',input:`<?php require 'vendor/autoload.php';$app=require 'bootstrap/app.php';$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();if($app->environment()!=='local'||$app['db']->connection()->selectOne('select current_database() as name')->name!=='rapid_mind'||('${origin}'!=='http://localhost:8080'&&!in_array('${origin}',config('offline.demo_origins'),true)))throw new RuntimeException('Unsafe environment');${code}`,stdio:['pipe','pipe','pipe']}));}
async function navigate(s,path){await s.call('Page.navigate',{url:origin+path});await s.wait("document.readyState==='complete'");}
async function login(key, profileName=key){const s=await nativeChromeSession({executable:process.env.RAPID_MIND_CHROME_BIN??'C:/Program Files/Google/Chrome/Application/chrome.exe',profile:join(run,profileName)});sessions.push(s);current=s;await s.call('Emulation.setDeviceMetricsOverride',{width:421,height:915,deviceScaleFactor:1,mobile:true});await navigate(s,'/login');await s.wait("!!document.querySelector('#email') || [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Visit Site'))");if(await s.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Visit Site'))"))await s.click('Visit Site');await s.wait("!!document.querySelector('#email')");await s.fill('#email',fixtures[key].email);await s.fill('#password',passwords[key]);await s.evaluate("document.querySelector('form').requestSubmit()");await s.wait(`location.pathname.startsWith('/${key==='relawan'?'relawan':'healthcare'}/')&&!!document.querySelector('main')`);return s;}
function evidence(){return php(`echo json_encode(App\\Models\\EmergencyEvent::where('user_id',${fixtures.relawan.id})->orderBy('created_at')->get()->map(fn($e)=>['id'=>$e->id,'routing'=>$e->routing_status,'facility'=>$e->responsible_facility_id,'status'=>$e->status->value,'notes'=>$e->notes,'flags'=>$e->red_flag_types]));`);}
async function until(check){const end=Date.now()+45000;while(Date.now()<end){if(await check())return;await new Promise(r=>setTimeout(r,250));}throw Error('Scenario timeout');}
function pass(name){report.scenarios.push({name,status:'PASS'});console.log('PASS '+name);}
try{
 phase='append isolated synthetic accounts';const data=Buffer.from(JSON.stringify({marker,passwords,tag})).toString('base64');
 fixtures=php(`$d=json_decode(base64_decode('${data}'),true);echo json_encode(Illuminate\\Support\\Facades\\DB::transaction(function()use($d){$r=App\\Models\\Region::create(['name'=>$d['marker']]);$f=App\\Models\\HealthcareFacility::create(['name'=>$d['marker'],'type'=>'Puskesmas','is_active'=>true]);$s=App\\Models\\Shelter::create(['name'=>$d['marker'],'region_id'=>$r->id,'primary_facility_id'=>$f->id,'is_active'=>true]);$a=[];foreach(['relawan','healthcare']as$k){$u=App\\Models\\User::create(['name'=>$d['marker'].' '.$k,'email'=>'ngrok-'.$d['tag'].'-'.$k.'@example.invalid','password'=>$d['passwords'][$k],'role'=>$k==='relawan'?'RELAWAN':'HEALTHCARE','is_active'=>true,'token_version'=>1,'shelter_id'=>$k==='relawan'?$s->id:null,'facility_id'=>$k==='healthcare'?$f->id:null]);$a[$k]=$u->only(['id','email']);}return [...$a,'facility'=>$f->id,'shelter'=>$s->id,'region'=>$r->id];}));`);report.retainedSynthetic=fixtures;

 phase='login and device initialization';
 const R=await login('relawan');
 const legacyKind=process.env.RAPID_MIND_TEST_LEGACY;
 const oldSnapshot=`new Promise((resolve,reject)=>{
    const r=indexedDB.open('RapidMindOfflineDB');r.onerror=()=>reject(r.error);
    r.onsuccess=()=>{const d=r.result;
      const stores=['patients','patientSnapshots','assessments','emergencies','outbox','offlineKeys','ownerEncryptionModes','encryptedStaging','encryptedOutboxIndex'];
      const tx=d.transaction(stores);const result={};
      for(const name of stores){const q=tx.objectStore(name).getAll();q.onsuccess=()=>result[name]=q.result}
      tx.oncomplete=()=>{d.close();resolve(result)};
      tx.onabort=()=>{d.close();reject(tx.error)};
    };
 })`;
 if(legacyKind){
   phase='prepare retained legacy fixture in same profile';
   await R.wait(`new Promise(resolve=>{const r=indexedDB.open('RapidMindOfflineDB');r.onsuccess=()=>{const d=r.result;if(!d.objectStoreNames.contains('offlineKeys')){d.close();resolve(false);return;}const q=d.transaction('offlineKeys').objectStore('offlineKeys').get(${fixtures.relawan.id});q.onsuccess=()=>{resolve(q.result?.version===2);d.close();};};})`);
   await R.wait(`new Promise(resolve=>{const r=indexedDB.open('RapidMindOfflineDB');r.onsuccess=()=>{const d=r.result;const q=d.transaction('encryptedStaging').objectStore('encryptedStaging').get('ownerProfiles:${fixtures.relawan.id}:${fixtures.relawan.id}');q.onsuccess=()=>{resolve(!!q.result);d.close();};};})`);
   if(legacyKind==='passphrase'){
     const old=await createOfflineKey(fixtures.relawan.id,'synthetic old key kept intact 2026');
     const copy=await old.session.encrypt('assessments',marker+'-old',{id:marker+'-old',owner_user_id:fixtures.relawan.id,note:marker+' OLD ENCRYPTED'});
     const mode={owner_user_id:fixtures.relawan.id,mode:'ENCRYPTED',activation:'LOCAL_DEVELOPMENT_V1',key_identity:old.record.created_at+':'+old.record.verification.ciphertext,recovery_revision:'synthetic-kept',confirmed_at:new Date().toISOString()};
     await R.evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('RapidMindOfflineDB');r.onsuccess=()=>{const d=r.result;const tx=d.transaction(['offlineKeys','ownerEncryptionModes','encryptedStaging'],'readwrite');tx.objectStore('offlineKeys').put(${JSON.stringify(old.record)});tx.objectStore('ownerEncryptionModes').put(${JSON.stringify(mode)});tx.objectStore('encryptedStaging').put(${JSON.stringify(copy)});tx.oncomplete=()=>{d.close();resolve(true)};tx.onabort=()=>reject(tx.error);};})`);
     old.session.lock();
   }else if(legacyKind==='pending'){
     await R.evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('RapidMindOfflineDB');r.onsuccess=()=>{const d=r.result;const tx=d.transaction('ownerEncryptionModes','readwrite');const store=tx.objectStore('ownerEncryptionModes');const q=store.get(${fixtures.relawan.id});q.onsuccess=()=>store.put({...q.result,mode:'ENROLLMENT_PENDING'});tx.oncomplete=()=>{d.close();resolve(true)};tx.onabort=()=>reject(tx.error);};})`);
   }else{
     await R.evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('RapidMindOfflineDB');r.onsuccess=()=>{const d=r.result;const tx=d.transaction('patients','readwrite');tx.objectStore('patients').add({id:${JSON.stringify(marker+'-legacy')},name:${JSON.stringify(marker+' OLD PLAINTEXT')}});tx.oncomplete=()=>{d.close();resolve(true)};tx.onabort=()=>reject(tx.error);};})`);
   }
   legacyBefore=await R.evaluate(oldSnapshot);
   await navigate(R,'/relawan/home');
   await R.text('Data perangkat lama tetap disimpan');
   activeDatabase='RapidMindDeviceOfflineDB';
   assert.deepEqual(await R.evaluate(oldSnapshot),legacyBefore);
   assert.equal(evidence().length,0);
   pass('same-profile '+legacyKind+' isolation preserves all old clinical rows and keys without sending');
 }

 const policy=await R.evaluate(`(async()=>{const r=await fetch('/relawan/offline-enrollment-status?owner_user_id=${fixtures.relawan.id}',{headers:{Accept:'application/json'},cache:'no-store'});return {status:r.status,data:await r.json()};})()`);
 assert.equal(policy.status,200);assert.equal(policy.data.origin,origin);
 await R.wait(`new Promise(resolve=>{const r=indexedDB.open('${activeDatabase}');r.onsuccess=()=>{const d=r.result;if(!d.objectStoreNames.contains('offlineKeys')){d.close();resolve(false);return;}const q=d.transaction('offlineKeys').objectStore('offlineKeys').get(${fixtures.relawan.id});q.onsuccess=()=>{resolve(q.result?.version===2&&!q.result.crypto_key.extractable);d.close();};};r.onerror=()=>resolve(false);})`,45000);
 assert.equal(await R.evaluate("!!document.querySelector('input[type=password]')"),false);
 const deviceIdentity=()=>R.evaluate(`new Promise(resolve=>{const r=indexedDB.open('${activeDatabase}');r.onsuccess=()=>{const d=r.result;const q=d.transaction('offlineKeys').objectStore('offlineKeys').get(${fixtures.relawan.id});q.onsuccess=()=>{resolve(q.result?.key_id);d.close();};};})`);
 const initialKey=await deviceIdentity();
 await navigate(R,'/relawan/home');
 await R.wait("!!document.querySelector('button[aria-label=\"Keluar akun\"]')");
 assert.equal(await deviceIdentity(),initialKey);
 pass('online reload retains the same device key');

 pass('configured origin grants and initializes a non-extractable device key without a passphrase');
 phase='online T0 verification';await R.click('T0 DARURAT');await R.click('Gejala Psikosis',{contains:true});await R.click('Amuk / Agitasi',{contains:true});
 await R.click('Gejala Psikosis',{contains:true});
 assert.equal(await R.evaluate("document.querySelectorAll('.t0-option[aria-pressed=true]').length"),1);
 await R.click('Gejala Psikosis',{contains:true});
 await R.evaluate("document.querySelector('fieldset').scrollIntoView()");
 for (const [width,height] of [[320,640],[1280,800],[421,915]]) {
   await R.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   assert.ok(await R.evaluate(`(()=>{const dialog=document.querySelector('.t0-page'),footer=dialog.querySelector('.t0-footer').getBoundingClientRect();return dialog.scrollWidth<=innerWidth && footer.top>=0 && footer.bottom<=innerHeight+1})()`));
 }
 await R.screenshot(join(run,'verification-multiple.png'));
 await R.fill('textarea',marker+' ONLINE');assert.equal(evidence().length,0);
 pass('opening and selecting T0 does not submit an emergency');
 await R.click('KIRIM T0-SUSPECT');await until(()=>evidence().length===1);
 let records=evidence();assert.equal(records[0].routing,'ROUTED');assert.equal(records[0].facility,fixtures.facility);await R.wait("!!document.querySelector('article .incident-primary[href]')");
 for (const width of [320, 1280, 421]) {
   await R.call('Emulation.setDeviceMetricsOverride', {width, height:800, deviceScaleFactor:1, mobile:true});
   await R.evaluate("document.querySelector('article .incident-primary').scrollIntoView({block:'center'})");
   assert.ok(await R.evaluate(`(()=>{
     const action = document.querySelector('article .incident-primary').getBoundingClientRect();
     const emergency = document.querySelector('.incident-emergency-action button').getBoundingClientRect();
     return action.bottom <= emergency.top && action.left >= 0 && action.right <= innerWidth &&
       document.documentElement.scrollWidth <= innerWidth;
   })()`));
 }
 await R.evaluate("document.querySelector('#relawan-main').scrollTop=0");
 await R.screenshot(join(run,'ngrok-online-t0.png'));pass('online T0 reaches real Laravel and the assigned facility');
 phase='close accepted online report';await R.click('Kembali ke halaman sebelumnya');await R.wait("!document.body.innerText.includes('INSIDEN T0-SUSPECT')");phase='offline T0 persistence';
 await R.wait("navigator.serviceWorker.getRegistration('/relawan/').then(r=>!!r?.active)",120000);if(!await R.evaluate('!!navigator.serviceWorker.controller'))await navigate(R,'/relawan/home');await R.wait('!!navigator.serviceWorker.controller',45000);phase='offline T0 verification';
 await R.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await R.evaluate("window.dispatchEvent(new Event('offline'))");assert.equal(await R.evaluate('navigator.onLine'),false);
 await R.click('T0 DARURAT');await R.click('Kegawatdaruratan Medis',{contains:true});await R.click('Gejala Psikosis',{contains:true});await R.fill('textarea',marker+' OFFLINE');await R.click('KIRIM T0-SUSPECT');
 await R.wait("!document.querySelector('#t0-verification-title')");assert.equal(evidence().length,1);
 await R.wait(`new Promise(resolve=>{const r=indexedDB.open('${activeDatabase}');r.onsuccess=()=>{const d=r.result;const q=d.transaction('encryptedOutboxIndex').objectStore('encryptedOutboxIndex').getAll();q.onsuccess=()=>{resolve(q.result.some(x=>x.owner_user_id===${fixtures.relawan.id}));d.close();};};})`);
 pass('network-offline T0 persists in encrypted outbox without reaching server');
 const rawStores=await R.evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('${activeDatabase}');r.onsuccess=()=>{const d=r.result;const names=['patients','patientSnapshots','assessments','emergencies','outbox','encryptedStaging'];const tx=d.transaction(names);const data={};for(const name of names){const q=tx.objectStore(name).getAll();q.onsuccess=()=>data[name]=q.result}tx.oncomplete=()=>{d.close();resolve(data)};tx.onabort=()=>reject(tx.error);};})`);
 for(const name of ['patients','patientSnapshots','assessments','emergencies','outbox'])assert.equal(rawStores[name].length,0);
 assert.ok(rawStores.encryptedStaging.some(row=>row.record_type==='emergencies'));
 assert.ok(rawStores.encryptedStaging.some(row=>row.record_type==='outbox'));
 assert.equal(JSON.stringify(rawStores).includes(marker+' OFFLINE'),false);
 pass('new clinical payload is ciphertext with no plaintext clinical rows');

 if(legacyKind){
   phase='offline reload in same profile';
   await navigate(R,'/relawan/home');
   await R.text('Data perangkat lama tetap disimpan');
   await R.text('LAPORAN T0-SUSPECT');
   assert.deepEqual(await R.evaluate(oldSnapshot),legacyBefore);
   pass('offline reload restores new encrypted queue and keeps original database unchanged');
 }

 phase='ngrok reconnect';await R.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await R.evaluate("window.dispatchEvent(new Event('online'))");await until(()=>evidence().length===2);records=evidence();for(const e of records){assert.equal(e.routing,'ROUTED');assert.equal(e.facility,fixtures.facility);}assert.equal(new Set(records.map(e=>e.id)).size,2);report.retainedSynthetic.emergencies=records.map(e=>e.id);pass('reconnect delivers the queued T0 once');
 phase='Nakes browser verification';const H=await login('healthcare');for(const e of records){await navigate(H,'/healthcare/emergencies/'+e.id);await H.text(e.notes);
 const second=e.notes.endsWith('OFFLINE')?'MEDICAL_CRISIS':'SEVERE_AGITATION';
 assert.deepEqual([...e.flags].sort(),['PSYCHOSIS',second].sort());
 await H.text('Psikosis Akut');await H.text(second==='MEDICAL_CRISIS'?'Medis':'Agitasi');}
 await H.screenshot(join(run,'ngrok-nakes.png'));pass('both reports are visible in the authorized Nakes browser');
 if(legacyKind){
   assert.deepEqual(await R.evaluate(oldSnapshot),legacyBefore);
   pass('accepted delivery leaves original clinical data and old keys unchanged');
 }
 phase='logout isolation';current=R;
 await R.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await R.evaluate("document.querySelector('button[aria-label=\"Keluar akun\"]').click()");
 await R.text('Akses lokal dikunci');
 await navigate(R,'/relawan/home');
 await R.text('Masuk kembali');
 assert.equal(await R.evaluate("!!document.querySelector('#t0-verification-title')"),false);
 if(legacyKind)assert.deepEqual(await R.evaluate(oldSnapshot),legacyBefore);
 pass('logout blocks offline reopening without removing either database');
 report.status='PASS';
}catch(e){report.status='FAIL';report.phase=phase;report.error=e.message;report.browserExceptions=current?.exceptionDescriptions;console.error('FAIL '+phase+': '+e.message);if(current){report.lastDOM=await current.evaluate('document.body.innerHTML.slice(0,8000)').catch(()=>null);report.lastPath=await current.evaluate('location.pathname').catch(()=>null);report.lastText=await current.evaluate('document.body.innerText.slice(-3000)').catch(()=>null);await current.screenshot(join(run,'failure.png')).catch(()=>{});}process.exitCode=1;}
finally{await writeFile(join(run,'report.json'),JSON.stringify(report,null,2));for(const s of sessions)await s.close();console.log('REPORT '+join(run,'report.json'));}
