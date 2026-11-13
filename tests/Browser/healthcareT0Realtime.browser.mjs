import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { project, ownerAssetDigest } from "./helpers/localPwaBuild.mjs";
import { liveLaravelProxy } from "./helpers/liveLaravelProxy.mjs";
import { nativeChromeSession } from "./helpers/nativeChromeSession.mjs";

const executable=process.env.RAPID_MIND_CHROME_BIN;
assert.ok(executable,"An existing Chrome executable is required");
const run=await mkdtemp(join(tmpdir(),"rapid-mind-healthcare-t0-"));
const tag=randomUUID().slice(0,12);
const marker=`P0-HC-SYNTHETIC-${tag}`;
const passwords=Object.fromEntries(['relawan','healthcareA','healthcareB'].map(key=>[key,randomBytes(32).toString('base64url')]));
const passphrase=randomBytes(40).toString('base64url');
const before=await ownerAssetDigest();
const output=join(project,'public/build');
const manifest=JSON.parse(await readFile(join(output,'manifest.json'),'utf8'));
const server=await liveLaravelProxy({output,manifest},{published:true,healthcare:true});
const report={status:'NOT TESTED',tag,scenarios:[],profiles:[],retainedSynthetic:{},limitations:[
    'New synthetic organizations/users/case only; no actual field contact, medical care, referral or dispatch.',
    'Actual Nginx/Laravel/PostgreSQL/Reverb/Echo, published assets and new Chrome profiles. No auth, event or receipt mocks.',
    'No reset, manual data purge, old-key migration, dependency change or forced activation in existing profiles.'
]};
const sessions=[];
let phase='preflight', current, fixtures, emergencyId;
function php(code) {
    const script=`<?php
require 'vendor/autoload.php';$app=require 'bootstrap/app.php';$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
try {if($app->environment()!=='local'||$app['db']->connection()->selectOne('select current_database() as name')->name!=='rapid_mind'||config('app.url')!=='http://localhost:8080'||config('inertia.devtools.enabled')||config('broadcasting.default')!=='reverb'||!App\\Domain\\Healthcare\\HealthcareCaseAccess::available())throw new RuntimeException('Unsafe environment');
${code}
}catch(Throwable $e){fwrite(STDERR,"Scoped test operation failed; details withheld.\\n");exit(1);}`;
    return JSON.parse(execFileSync('docker',['compose','exec','-T','app','php'],{cwd:resolve('.'),input:script,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
}
function pass(name,details){report.scenarios.push({name,status:'PASS',details});console.log('PASS '+name);}
async function until(check,timeout=20000) {const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await delay(100);}throw new Error('Scenario timeout');}
function evidence() {
    return php(`$e=App\\Models\\EmergencyEvent::where('user_id',${fixtures.relawan.id})->first();
echo json_encode($e?['id'=>$e->id,'status'=>$e->status->value,'responsible_facility_id'=>$e->responsible_facility_id,'originating_shelter_id'=>$e->originating_shelter_id,'routing_status'=>$e->routing_status,'verifications'=>$e->verifications()->get()->map(fn($v)=>['actor'=>$v->verified_by,'method'=>$v->method?->value,'result'=>$v->clinical_result?->value]),'audits'=>App\\Models\\AuditLog::where('entity_type','EmergencyEvent')->where('entity_id',$e->id)->orderBy('id')->get(['action','actor_id']),'referrals'=>$e->referrals()->count(),'dispatches'=>App\\Models\\EmergencyDispatch::where('emergency_event_id',$e->id)->count()]:null);`);
}
async function login(name,account) {
    const session=await nativeChromeSession({executable,profile:join(run,name),proxyPort:server.port});
    sessions.push(session);report.profiles.push(name);current=session;
    await session.goto('/login',"!!document.querySelector('#email')");
    await session.fill('#email',account.email);await session.fill('#password',passwords[name]);
    await session.evaluate("document.querySelector('form').requestSubmit()");
    await session.wait(name==='relawan'?"location.pathname.startsWith('/relawan/') && !!document.querySelector('#offline-key-title')":"location.pathname.startsWith('/healthcare/') && !!document.querySelector('main')");
    return session;
}
const channel=account=>`private-healthcare.facility.${account.facility_id}.user.${account.id}.version.1`;
const emergencyFrames=(session,name)=>session.frames.filter(f=>f.event===`App\\Events\\${name}`&&f.data?.emergency?.id===emergencyId);
try {
    phase='append scoped synthetic fixtures';
    const input=Buffer.from(JSON.stringify({marker,passwords,tag})).toString('base64');
    fixtures=php(`$d=json_decode(base64_decode('${input}'),true);
$out=Illuminate\\Support\\Facades\\DB::transaction(function()use($d){
$r=App\\Models\\Region::create(['name'=>$d['marker'].' REGION']);
$a=App\\Models\\HealthcareFacility::create(['name'=>$d['marker'].' FASKES A','type'=>'Puskesmas','is_active'=>true]);
$b=App\\Models\\HealthcareFacility::create(['name'=>$d['marker'].' FASKES B','type'=>'Puskesmas','is_active'=>true]);
$s=App\\Models\\Shelter::create(['name'=>$d['marker'].' POSKO','region_id'=>$r->id,'primary_facility_id'=>$a->id,'is_active'=>true]);
$users=[];
foreach(['relawan','healthcareA','healthcareB']as$key){$u=App\\Models\\User::create(['name'=>$d['marker'].' '.$key,'email'=>'p0-hc-'.$d['tag'].'-'.$key.'@example.invalid','password'=>$d['passwords'][$key],'role'=>$key==='relawan'?App\\Enums\\UserRole::RELAWAN:App\\Enums\\UserRole::HEALTHCARE,'is_active'=>true,'token_version'=>1,'shelter_id'=>$key==='relawan'?$s->id:null,'facility_id'=>$key==='healthcareA'?$a->id:($key==='healthcareB'?$b->id:null)]);$users[$key]=$u->only(['id','email','facility_id','shelter_id']);}
return [...$users,'region_id'=>$r->id,'shelter_id'=>$s->id,'facilityA'=>$a->id,'facilityB'=>$b->id];});echo json_encode($out);`);
    report.retainedSynthetic={users:Object.fromEntries(['relawan','healthcareA','healthcareB'].map(k=>[k,fixtures[k].id])),facilities:[fixtures.facilityA,fixtures.facilityB],region:fixtures.region_id,shelter:fixtures.shelter_id};
    pass('scoped-fixtures-and-real-reverb','Appended isolated synthetic region, Posko, two facilities and three users; real broadcast driver is Reverb. No existing organization/account was modified.');
    phase='healthcare private subscriptions';
    const A=await login('healthcareA',fixtures.healthcareA);
    const B=await login('healthcareB',fixtures.healthcareB);
    await until(()=>A.frames.some(f=>f.event==='pusher_internal:subscription_succeeded'&&f.channel===channel(fixtures.healthcareA)));
    await until(()=>B.frames.some(f=>f.event==='pusher_internal:subscription_succeeded'&&f.channel===channel(fixtures.healthcareB)));
    assert.ok(A.socketId && B.socketId);
    pass('actual-private-echo-subscriptions','Both Healthcare pages established actual Reverb sockets and received subscription_succeeded for their own facility/user/version channels.');
    current=B;
    const foreignChannel=await B.jsonRequest('/broadcasting/auth',{socket_id:B.socketId,channel_name:channel(fixtures.healthcareA)});
    assert.equal(foreignChannel.status,403);
    const broadChannel=await B.jsonRequest('/broadcasting/auth',{socket_id:B.socketId,channel_name:'private-emergencies'});
    assert.equal(broadChannel.status,403);
    pass('private-channel-boundaries','Actual foreign-user/facility and legacy role-wide channel authorization both return HTTP 403.');
    phase='relawan explicit T0';
    const R=await login('relawan',fixtures.relawan);
    await R.wait("(async()=> (await navigator.serviceWorker.getRegistration('/relawan/'))?.active?.state==='activated')()");
    if(!await R.evaluate('!!navigator.serviceWorker.controller')){await R.call('Page.reload');await R.text('Daftarkan kunci');}
    await R.fill('input[type="password"]',passphrase);
    await R.evaluate(`(()=>{const e=document.querySelectorAll('input[type="password"]')[1];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(passphrase)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await R.click('Daftarkan kunci');await R.text('Saya sudah menyimpan kode');await R.click('Saya sudah menyimpan kode');
    await R.wait("!!document.querySelector('main a[href=\"/relawan/pfa\"]') && !document.querySelector('#offline-key-title')");
    assert.equal(evidence(),null);
    await R.click('T0 DARURAT');await R.wait("!!document.querySelector('#t0-verification-title')");
    assert.equal(evidence(),null);
    await R.click('Kegawatdaruratan Medis & Somatik',{contains:true});
    await R.fill('[role="dialog"] textarea',marker+' SIMULASI - bukan insiden riil.');
    await R.click('KIRIM T0-SUSPECT');
    await until(()=>{const event=evidence();if(event){emergencyId=event.id;return true;}return false;});
    report.retainedSynthetic.emergency=emergencyId;
    let saved=evidence();assert.equal(saved.status,'PENDING');assert.equal(saved.responsible_facility_id,fixtures.facilityA);assert.equal(saved.routing_status,'ROUTED');
    pass('real-routed-t0-server-receipt','Explicit final send created a real PENDING T0 routed to facility A; first tap created nothing and receipt performed no Healthcare action.');
    phase='created frame and automatic Healthcare queue';
    current=A;
    await until(()=>emergencyFrames(A,'EmergencyCreated').length>0);
    const created=emergencyFrames(A,'EmergencyCreated')[0];
    assert.equal(created.channel,channel(fixtures.healthcareA));assert.deepEqual(created.data,{emergency:{id:emergencyId}});
    await A.wait("!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Akui Kasus')");
    assert.ok(A.requests.some(r=>r.path==='/healthcare/emergencies'&&r.time>=created.time));
    await delay(1500);
    assert.equal(emergencyFrames(B,'EmergencyCreated').length,0);
    assert.equal(await B.evaluate(`document.body.textContent.includes(${JSON.stringify(marker+' SIMULASI')})`),false);
    assert.equal(evidence().status,'PENDING');
    const own=await A.jsonRequest(`/healthcare/emergencies/${emergencyId}`);assert.equal(own.status,200);
    current=B;
    const forbiddenRead=await B.jsonRequest(`/healthcare/emergencies/${emergencyId}`);assert.equal(forbiddenRead.status,404);
    const forbiddenAck=await B.jsonRequest(`/healthcare/emergencies/${emergencyId}/acknowledge`,{});assert.equal(forbiddenAck.status,404);
    assert.equal(evidence().status,'PENDING');
    pass('id-only-realtime-and-automatic-queue','Facility A received actual ID-only EmergencyCreated and reconciled the queue without a manual reload; B received no case event and foreign GET/acknowledge both returned 404.');
    await A.screenshot(join(run,'01-healthcare-pending.png'));
    phase='explicit Healthcare acknowledgement';current=A;
    await A.click('Akui Kasus');
    await until(()=>evidence().status==='ACKNOWLEDGED');
    await until(()=>emergencyFrames(A,'EmergencyUpdated').length>=1);
    assert.equal(evidence().verifications.length,0);
    pass('healthcare-acknowledgement','Explicit Healthcare A action persisted ACKNOWLEDGED and its audit entry, with real EmergencyUpdated; it did not clinically confirm T0.');
    phase='secondary verification';
    await A.click('Lanjutkan Verifikasi Medis');
    await A.wait("!!document.querySelector('textarea')");
    await A.fill('textarea',marker+' SIMULASI verifikasi sekunder; tidak ada pemeriksaan pasien riil.');
    await A.click('Simpan Verifikasi');
    await until(()=>evidence().status==='REVIEWING');
    pass('secondary-verification','Healthcare UI persisted separate secondary verification and REVIEWING state. This is synthetic workflow proof, not evidence of physical field contact.');
    phase='explicit clinical confirmation';
    await A.wait("!!document.querySelector('select')");
    await A.fill('select','T0_CONFIRMED');
    await A.fill('textarea',marker+' SIMULASI keputusan T0; bukan diagnosis pasien riil.');
    await A.click('Simpan Keputusan Klinis');
    await until(()=>evidence().status==='CONFIRMED');
    saved=evidence();
    assert.equal(saved.verifications.length,2);assert.equal(saved.verifications[0].actor,fixtures.healthcareA.id);assert.equal(saved.verifications[1].actor,fixtures.healthcareA.id);
    assert.equal(saved.verifications[1].result,'T0_CONFIRMED');assert.equal(saved.referrals,0);assert.equal(saved.dispatches,0);
    assert.deepEqual(saved.audits.map(a=>a.action),['EMERGENCY_CREATED','EMERGENCY_ACKNOWLEDGED','EMERGENCY_VERIFIED','EMERGENCY_CLASSIFIED']);
    await until(()=>emergencyFrames(A,'EmergencyUpdated').length>=3);
    await delay(1500);
    assert.equal(emergencyFrames(B,'EmergencyUpdated').length,0);
    for(const frame of [...emergencyFrames(A,'EmergencyCreated'),...emergencyFrames(A,'EmergencyUpdated')])assert.deepEqual(frame.data,{emergency:{id:emergencyId}});
    pass('audited-clinical-confirmation-and-scoped-updates','Explicit A confirmation persisted CONFIRMED, two distinct verification records and ordered audits. Updates stayed ID-only and facility-scoped; no referral or dispatch was created.');
    await A.screenshot(join(run,'02-healthcare-confirmed.png'));
    phase='replay and stale-state safety';current=A;
    const beforeReplayUpdates=emergencyFrames(A,'EmergencyUpdated').length;
    const replay=await A.jsonRequest(`/healthcare/emergencies/${emergencyId}/classify`,{clinical_result:'T0_CONFIRMED',notes:marker+' SIMULASI keputusan T0; bukan diagnosis pasien riil.'});
    assert.equal(replay.status,200);
    const stale=await A.jsonRequest(`/healthcare/emergencies/${emergencyId}/acknowledge`,{});assert.equal(stale.status,409);
    await delay(1500);
    const afterReplay=evidence();assert.equal(afterReplay.verifications.length,2);assert.equal(afterReplay.audits.length,4);assert.equal(afterReplay.status,'CONFIRMED');
    assert.equal(emergencyFrames(A,'EmergencyUpdated').length,beforeReplayUpdates);
    pass('exact-replay-and-stale-action','Exact classification replay adds no verification, audit or realtime event; stale acknowledgement returns HTTP 409 without moving CONFIRMED backward.');
    phase='Relawan privacy after clinical action';current=R;
    const relawan=await R.jsonRequest(`/relawan/emergencies/${emergencyId}`);
    assert.equal(relawan.status,200);
    const eventProps=relawan.data.props.emergency;
    assert.equal(eventProps.id,emergencyId);
    for(const key of ['status','verifications','referrals','dispatch','clinical_result'])assert.equal(Object.hasOwn(eventProps,key),false);
    pass('relawan-report-only-boundary','After clinical confirmation, real Relawan response still contains only its report/delivery projection, with no Healthcare status, verification, referral or dispatch outcome.');
    report.databaseEvidence=saved;
    report.realtimeEvidence={channelA:channel(fixtures.healthcareA),channelB:channel(fixtures.healthcareB),createdA:emergencyFrames(A,'EmergencyCreated').length,updatedA:emergencyFrames(A,'EmergencyUpdated').length,createdB:emergencyFrames(B,'EmergencyCreated').length,updatedB:emergencyFrames(B,'EmergencyUpdated').length,payload:'emergency.id only'};
    assert.ok(server.log.some(e=>e.target==='live-reverb-tunnel'));
    for(const session of sessions)assert.deepEqual(session.errors,[]);
    report.status='PASS';
} catch(error) {
    report.status='FAIL';report.failure={phase,kind:error.name,message:'Secret-bearing exception details withheld.'};
    if(current)report.failure.dom=await current.evaluate(`({path:location.pathname,title:document.title,headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent.trim()),buttons:[...document.querySelectorAll('button')].map(e=>e.textContent.trim()),alerts:[...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent.trim())})`).catch(()=>null);
    report.transportSummary=sessions.map(s=>({events:s.frames.map(f=>({event:f.event,channel:f.channel})),exceptions:s.errors.length}));
    console.log('FAIL '+phase);
} finally {
    await Promise.allSettled(sessions.map(s=>s.close()));await server.close();
    report.publishedAssetsUnchanged=await ownerAssetDigest()===before;
    if(!report.publishedAssetsUnchanged)report.status='FAIL';
    report.network=server.log;
    await writeFile(join(run,'results.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({status:report.status,scenarios:report.scenarios.length,artifacts:run,retainedSynthetic:report.retainedSynthetic,publishedAssetsUnchanged:report.publishedAssetsUnchanged}));
    process.exitCode=report.status==='PASS'?0:1;
}
