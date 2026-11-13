import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { project, ownerAssetDigest } from "./helpers/localPwaBuild.mjs";
import { liveLaravelProxy } from "./helpers/liveLaravelProxy.mjs";
import { nativeChromeSession } from "./helpers/nativeChromeSession.mjs";

const executable=process.env.RAPID_MIND_CHROME_BIN;
assert.ok(executable,"An existing Chrome executable is required");
const run=await mkdtemp(join(tmpdir(),"rapid-mind-healthcare-reconnect-"));
const tag=randomUUID().slice(0,12);
const marker=`P0-HC-SYNTHETIC-${tag}`;
const passwords=Object.fromEntries(['relawan','healthcareA','healthcareB'].map(key=>[key,randomBytes(32).toString('base64url')]));
const before=await ownerAssetDigest();
const output=process.env.RAPID_MIND_CANDIDATE ?? join(project,'public/build');
const manifest=JSON.parse(await readFile(join(output,'manifest.json'),'utf8'));
const server=await liveLaravelProxy({output,manifest},{published:!process.env.RAPID_MIND_CANDIDATE,healthcare:true});
const report={status:'NOT TESTED',tag,scenarios:[],profiles:[],retainedSynthetic:{},limitations:[
    'New synthetic organizations/users/case only; no actual field contact, medical care, referral or dispatch.',
    'Actual Nginx/Laravel/PostgreSQL/Reverb/Echo and new Chrome profiles; assets are published or candidate per RAPID_MIND_CANDIDATE. No auth, event or receipt mocks.',
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
    pass('scoped-fixtures-and-real-reverb','Appended isolated synthetic region, Posko, two facilities and three users; only these new fixtures are later revoked or reassigned. Real broadcast driver is Reverb.');

    const A=await login('healthcareA',fixtures.healthcareA);
    const B=await login('healthcareB',fixtures.healthcareB);
    const subscribed=s=>s.frames.filter(f=>f.event==='pusher_internal:subscription_succeeded').length;
    await until(()=>subscribed(A)>0&&subscribed(B)>0);
    const originalSocket=A.socketId, initialSubscriptions=subscribed(A);
    function createCase() {
        return php(`$e=App\\Models\\EmergencyEvent::create(['user_id'=>${fixtures.relawan.id},'responsible_facility_id'=>${fixtures.facilityA},'originating_shelter_id'=>${fixtures.shelter_id},'routing_status'=>'ROUTED','red_flag_type'=>App\\Enums\\RedFlagType::MEDICAL_CRISIS,'status'=>App\\Enums\\EmergencyStatus::PENDING,'notes'=>'${marker} SIMULASI reconnect']);event(new App\\Events\\EmergencyCreated($e));echo json_encode($e->id);`);
    }
    function emitUpdated() {php(`$e=App\\Models\\EmergencyEvent::findOrFail('${emergencyId}');event(new App\\Events\\EmergencyUpdated($e));echo json_encode(true);`);}
    phase='real socket outage';current=A;
    server.state.realtimeOffline=true;server.disconnectRealtime();
    await A.text('Menghubungkan Ulang');
    const outageAt=Date.now();emergencyId=createCase();report.retainedSynthetic.emergency=emergencyId;
    await A.wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Akui Kasus')`,25000);
    assert.equal(emergencyFrames(A,'EmergencyCreated').length,0);
    assert.ok(A.requests.some(r=>r.path==='/healthcare/emergencies'&&r.time>outageAt));
    pass('socket-only-outage-http-fallback','Real socket tunnels cut, no EmergencyCreated delivered; HTTP fallback reconciled real PENDING case while reconnect warning remained.');
    phase='real socket reconnect';
    server.state.realtimeOffline=false;
    await until(()=>subscribed(A)>initialSubscriptions&&A.socketId!==originalSocket,45000);
    await A.text('Online');
    emitUpdated();await until(()=>emergencyFrames(A,'EmergencyUpdated').length===1);
    pass('reauthenticated-reconnect','New actual Reverb socket and private subscription, canonical reload and subsequent ID-only event, without page reload.');
    phase='dirty draft before session revoke';
    await A.click('Akui Kasus');await A.click('Lanjutkan Verifikasi Medis');await A.wait("!!document.querySelector('textarea')");
    await A.fill('textarea',marker+' DRAF SINTETIS BELUM DIKIRIM');
    emitUpdated();await A.text('Draf Anda tetap tersimpan');
    assert.ok(await A.evaluate(`document.querySelector('textarea').value.includes('DRAF SINTETIS')`));
    pass('authorized-draft-preservation','Canonical update deferred while authorized synthetic draft is dirty.');
    phase='session version revoked while dirty';
    php(`App\\Models\\User::whereKey(${fixtures.healthcareA.id})->increment('token_version');echo json_encode(true);`);
    const framesBefore=emergencyFrames(A,'EmergencyUpdated').length;emitUpdated();await delay(1200);
    assert.equal(emergencyFrames(A,'EmergencyUpdated').length,framesBefore);
    await A.wait("location.pathname==='/login' && !document.querySelector('textarea')",22000);
    assert.equal((await A.jsonRequest(`/healthcare/emergencies/${emergencyId}`)).status,401);
    assert.equal((await A.jsonRequest(`/healthcare/emergencies/${emergencyId}/acknowledge`,{})).status,401);
    pass('dirty-draft-does-not-delay-session-revocation','Revoked token version ends browser clinical access despite dirty draft; existing private subscription receives no subsequent case event.');
    phase='facility reassignment';current=A;
    await A.goto('/login',"!!document.querySelector('#email')");await A.fill('#email',fixtures.healthcareA.email);await A.fill('#password',passwords.healthcareA);await A.evaluate("document.querySelector('form').requestSubmit()");await A.wait("location.pathname.startsWith('/healthcare/')");
    await A.goto(`/healthcare/emergencies/${emergencyId}`,"!!document.querySelector('textarea')");
    await A.fill('textarea',marker+' DRAF PINDAH FASKES');
    const oldChannel=`private-healthcare.facility.${fixtures.facilityA}.user.${fixtures.healthcareA.id}.version.2`;
    php(`App\\Models\\User::whereKey(${fixtures.healthcareA.id})->update(['facility_id'=>${fixtures.facilityB}]);echo json_encode(true);`);
    await A.wait("location.pathname==='/healthcare/emergencies' && !document.querySelector('textarea')",22000);
    assert.equal((await A.jsonRequest(`/healthcare/emergencies/${emergencyId}`)).status,404);
    assert.equal((await A.jsonRequest('/broadcasting/auth',{socket_id:A.socketId,channel_name:oldChannel})).status,403);
    assert.equal((await A.jsonRequest(`/healthcare/emergencies/${emergencyId}/verify`,{method:'FIELD_TEAM',notes:'SIMULASI DITOLAK'})).status,404);
    pass('facility-change-retires-open-clinical-context','Changed facility removes dirty former-case context, rejects former case and old versioned channel.');
    phase='inactive facility';
    php(`App\\Models\\HealthcareFacility::whereKey(${fixtures.facilityB})->update(['is_active'=>false]);echo json_encode(true);`);
    await until(()=>A.frames.some(f=>f.event==='pusher_internal:subscription_succeeded'&&f.channel===`private-healthcare.facility.${fixtures.facilityB}.user.${fixtures.healthcareA.id}.version.2`));
    const inactiveAt=Date.now();
    await until(()=>A.requests.some(r=>r.path==='/healthcare/emergencies'&&r.time>inactiveAt),22000);await delay(1500);
    assert.equal((await A.jsonRequest('/broadcasting/auth',{socket_id:A.socketId,channel_name:`private-healthcare.facility.${fixtures.facilityB}.user.${fixtures.healthcareA.id}.version.2`})).status,403);
    pass('inactive-facility-denies-subscription','Synthetic inactive facility cannot retain clinical channel.');
    phase='account deactivation';
    php(`App\\Models\\User::whereKey(${fixtures.healthcareB.id})->update(['is_active'=>false]);echo json_encode(true);`);
    await B.wait("location.pathname==='/login'",22000);
    pass('inactive-account-ends-session','Synthetic account deactivation ends idle Healthcare browser session.');
    await A.screenshot(join(run,'01-access-removed.png'));await B.screenshot(join(run,'02-account-revoked.png'));
    report.databaseEvidence=evidence();
    assert.equal(report.databaseEvidence.status,'ACKNOWLEDGED');assert.equal(report.databaseEvidence.verifications.length,0);assert.equal(report.databaseEvidence.referrals,0);assert.equal(report.databaseEvidence.dispatches,0);
    for(const frame of sessions.flatMap(s=>s.frames).filter(f=>f.event?.startsWith('App\\Events\\')))assert.deepEqual(frame.data,{emergency:{id:emergencyId}});
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
