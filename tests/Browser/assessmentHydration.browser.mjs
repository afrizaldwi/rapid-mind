import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {nativeChromeSession} from './helpers/nativeChromeSession.mjs';
const origin=process.env.RAPID_MIND_DEMO_ORIGIN;
const localhost = origin === 'http://localhost:8080';
assert.ok(localhost || /^https:\/\/[a-z0-9.-]+$/.test(origin ?? ''), 'Use localhost:8080 or an explicitly configured HTTPS demo origin');
const project=resolve(import.meta.dirname,'../..');
const run=await mkdtemp(join(tmpdir(),'rapid-assessment-hydration-'));
const tag=randomUUID().slice(0,12), marker='SINTETIS-NGROK-T0-'+tag;
const passwords={relawan:randomBytes(24).toString('base64url'),healthcare:randomBytes(24).toString('base64url')};
const report={status:'NOT TESTED',origin,scenarios:[],retainedSynthetic:{},limitations:['New isolated desktop Chrome profiles with a mobile viewport; physical phone not tested.','Existing user browser profiles and physical phones are not tested by this isolated regression.']};
const sessions=[];let current,phase='preflight',fixtures;
function php(code){return JSON.parse(execFileSync(process.platform==='win32'?'wsl':'docker',process.platform==='win32'?['-d','Ubuntu','docker','compose','exec','-T','app','php']:['compose','exec','-T','app','php'],{cwd:project,encoding:'utf8',input:`<?php require 'vendor/autoload.php';$app=require 'bootstrap/app.php';$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();if($app->environment()!=='local'||$app['db']->connection()->selectOne('select current_database() as name')->name!=='rapid_mind'||('${origin}'!=='http://localhost:8080'&&!in_array('${origin}',config('offline.demo_origins'),true)))throw new RuntimeException('Unsafe environment');${code}`,stdio:['pipe','pipe','pipe']}));}
async function navigate(s,path){await s.call('Page.navigate',{url:origin+path});await s.wait("document.readyState==='complete'");}
async function login(key, profileName=key){const s=await nativeChromeSession({executable:process.env.RAPID_MIND_CHROME_BIN??'C:/Program Files/Google/Chrome/Application/chrome.exe',profile:join(run,profileName)});sessions.push(s);current=s;await s.call('Emulation.setDeviceMetricsOverride',{width:421,height:915,deviceScaleFactor:1,mobile:true});await navigate(s,'/login');await s.wait("!!document.querySelector('#email') || [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Visit Site'))");if(await s.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Visit Site'))"))await s.click('Visit Site');await s.wait("!!document.querySelector('#email')");await s.fill('#email',fixtures[key].email);await s.fill('#password',passwords[key]);await s.evaluate("document.querySelector('form').requestSubmit()");await s.wait(`location.pathname.startsWith('/${key==='relawan'?'relawan':'healthcare'}/')&&!!document.querySelector('main')`);return s;}
function pass(name){report.scenarios.push({name,status:'PASS'});console.log('PASS '+name);}
try{
 phase='append isolated synthetic accounts';const data=Buffer.from(JSON.stringify({marker,passwords,tag})).toString('base64');
 fixtures=php(`$d=json_decode(base64_decode('${data}'),true);echo json_encode(Illuminate\\Support\\Facades\\DB::transaction(function()use($d){$r=App\\Models\\Region::create(['name'=>$d['marker']]);$f=App\\Models\\HealthcareFacility::create(['name'=>$d['marker'],'type'=>'Puskesmas','is_active'=>true]);$s=App\\Models\\Shelter::create(['name'=>$d['marker'],'region_id'=>$r->id,'primary_facility_id'=>$f->id,'is_active'=>true]);$a=[];foreach(['relawan','healthcare']as$k){$u=App\\Models\\User::create(['name'=>$d['marker'].' '.$k,'email'=>'ngrok-'.$d['tag'].'-'.$k.'@example.invalid','password'=>$d['passwords'][$k],'role'=>$k==='relawan'?'RELAWAN':'HEALTHCARE','is_active'=>true,'token_version'=>1,'shelter_id'=>$k==='relawan'?$s->id:null,'facility_id'=>$k==='healthcare'?$f->id:null]);$a[$k]=$u->only(['id','email']);}return [...$a,'facility'=>$f->id,'shelter'=>$s->id,'region'=>$r->id];}));`);report.retainedSynthetic=fixtures;


 phase='create server assessment with saved answers';
 const draft=php(`$p=App\\Models\\Patient::create(['name'=>'Penyintas Uji Offline','age'=>30,'gender'=>'Perempuan','shelter_id'=>${fixtures.shelter},'created_by'=>${fixtures.relawan.id}]);$a=App\\Models\\Assessment::create(['patient_id'=>$p->id,'user_id'=>${fixtures.relawan.id},'status'=>'IN_PROGRESS','mode'=>'VERBAL','started_at'=>now()]);for($q=1;$q<=20;$q++)App\\Models\\SrqResponse::create(['assessment_id'=>$a->id,'question_number'=>$q,'answer'=>$q===1,'answer_state'=>null]);echo json_encode(['id'=>$a->id]);`);
 report.retainedSynthetic.assessment=draft.id;
 const R=await login('relawan');
 phase='hydrate assessment and patient concurrently';
 for(let attempt=0;attempt<3;attempt++){
   await navigate(R,'/relawan/assessment');
   await R.text('Lanjutkan Terakhir');
   assert.equal(await R.evaluate("document.body.innerText.includes('Sebagian asesmen server belum dapat disalin')"),false);
 }
 await R.screenshot(join(run,'assessment-hydrated.png'));
 pass('server drafts and concurrent patient cache load without hydration warnings');
 await R.wait("navigator.serviceWorker.getRegistration('/relawan/').then(r=>!!r?.active)",120000);
 if(!await R.evaluate('!!navigator.serviceWorker.controller'))await navigate(R,'/relawan/assessment');
 await R.wait('!!navigator.serviceWorker.controller',45000);
 phase='resume server assessment offline';
 await R.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await R.evaluate("window.dispatchEvent(new Event('offline'))");
 await navigate(R,`/relawan/assessment/${draft.id}/srq`);
 await R.text('Penyintas Uji Offline');
 await R.text('20/20');
 assert.equal(await R.evaluate("document.querySelector('#srq-question-1 button[aria-pressed=true]').textContent.trim()"),'Ya');
 assert.equal(await R.evaluate("document.querySelector('#srq-question-17 button[aria-pressed=true]').textContent.trim()"),'Tidak');
 await R.click('Lanjut: Faktor Risiko (20/20) →');
 await R.wait("location.pathname.endsWith('/risk')");
 await R.screenshot(join(run,'offline-risk.png'));
 pass('saved server answers survive offline reload and can proceed to risk factors');
 const stored=await R.evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('RapidMindOfflineDB');r.onsuccess=()=>{const d=r.result,names=['patients','patientSnapshots','assessments','outbox','encryptedStaging'];const tx=d.transaction(names);const rows={};for(const n of names){const q=tx.objectStore(n).getAll();q.onsuccess=()=>rows[n]=q.result;}tx.oncomplete=()=>{d.close();resolve(rows)};tx.onabort=()=>reject(tx.error)}})`);
 for(const name of ['patients','patientSnapshots','assessments','outbox'])assert.equal(stored[name].length,0);
 assert.equal(JSON.stringify(stored.encryptedStaging).includes('Penyintas Uji Offline'),false);
 pass('clinical copies remain encrypted without plaintext clinical rows');
 report.status='PASS';
}catch(e){report.status='FAIL';report.phase=phase;report.error=e.message;console.error('FAIL '+phase+': '+e.message);if(current){report.exceptions=current.exceptionDescriptions;report.lastText=await current.evaluate('document.body.innerText').catch(()=>null);await current.screenshot(join(run,'failure.png')).catch(()=>{});}process.exitCode=1;}
finally{await writeFile(join(run,'report.json'),JSON.stringify(report,null,2));for(const s of sessions)await s.close();console.log('REPORT '+join(run,'report.json'));}
