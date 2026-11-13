import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { unlockOfflineKey } from "../../resources/js/offline/offlineCrypto.ts";
import { ownerAssetDigest, project } from "./helpers/localPwaBuild.mjs";
import { liveLaravelProxy } from "./helpers/liveLaravelProxy.mjs";

const origin = "http://localhost:8080";
const published = process.env.RAPID_MIND_P0_PUBLISHED === "1";
const output = published ? join(project, "public/build") : resolve(process.env.RAPID_MIND_P0_BUILD);
const executable = process.env.RAPID_MIND_CHROME_BIN;
assert.ok(executable, "Existing Chrome required");
const run = await mkdtemp(join(tmpdir(), "rapid-mind-p0-live-"));
const tag = randomUUID().slice(0, 12);
const patientName = `P0-INTEGRATION-SYNTHETIC-${tag}`;
const email = `p0-integration-${tag}@example.invalid`;
const password = randomBytes(32).toString("base64url");
const passphrase = randomBytes(40).toString("base64url");
const beforeAssets = await ownerAssetDigest();
const build = { output, manifest: JSON.parse(await readFile(join(output, "manifest.json"), "utf8")) };
const server = await liveLaravelProxy(build, { published });
const report = { published, status: "NOT TESTED", scenarios: [], profiles: [], tag, retainedSynthetic: {}, limitations: [
    "One new Relawan without Posko/facility; linked T0 only, no Healthcare notification/acknowledgement/dispatch acceptance.",
    published ? "All allowed HTTP responses and assets come from real localhost Nginx/Laravel, without candidate overlay or HTML rewriting." : "Candidate frontend is overlaid only in the isolated browser proxy; dynamic responses and persistence are real Laravel/PostgreSQL.",
    "No resets, manual data purge, old-key migration or dependency changes; browser run does not change published assets.",
] };
let browser; let cdp; let ownerId; let assessmentId; let emergencyId;
let phase = "preflight"; const errors = [];
function php(code) {
    const script = `<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
try {
 if ($app->environment() !== 'local' || $app['db']->connection()->selectOne('select current_database() as name')->name !== 'rapid_mind' || config('app.url') !== 'http://localhost:8080' || !config('offline.local_enrollment') || config('inertia.devtools.enabled')) throw new RuntimeException('Unsafe target');
 ${code}
} catch (Throwable $e) { fwrite(STDERR, "Scoped fixture/read failed; details withheld.\\n"); exit(1); }
`;
    return JSON.parse(execFileSync("docker", ["compose", "exec", "-T", "app", "php"], { cwd: resolve("."), input: script, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }));
}
function serverEvidence() {
    assert.ok(Number.isInteger(ownerId));
    return php(`$u=App\\Models\\User::findOrFail(${ownerId});
$a=App\\Models\\Assessment::where('user_id',$u->id)->with(['srqResponses','triageResult'])->get();
$e=App\\Models\\EmergencyEvent::where('user_id',$u->id)->get();
echo json_encode(['assessment_count'=>$a->count(),'patient_count'=>App\\Models\\Patient::where('created_by',$u->id)->count(),'assessments'=>$a->map(fn($x)=>['id'=>$x->id,'status'=>$x->status->value,'triage_exists'=>$x->triageResult!==null,'answers'=>$x->srqResponses->mapWithKeys(fn($r)=>[$r->question_number=>$r->responseValue()])]),'emergencies'=>$e->map(fn($x)=>['id'=>$x->id,'status'=>$x->status->value,'red_flag_type'=>$x->red_flag_type->value,'assessment_id'=>$x->assessment_id,'patient_id'=>$x->patient_id,'latitude'=>$x->latitude,'longitude'=>$x->longitude,'routing_status'=>$x->routing_status]),'audit_count'=>App\\Models\\AuditLog::where('actor_id',$u->id)->count()]);`);
}
async function fillSelector(selector, value) {
    assert.equal(await cdp.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e || e.disabled) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`), true);
}
async function answer(question, label) {
    await waitFor(`!![...document.querySelectorAll('#srq-question-${question} button')].find(b=>b.textContent.trim()===${JSON.stringify(label)} && !b.disabled)`);
    await cdp.evaluate(`(() => [...document.querySelectorAll('#srq-question-${question} button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click())()`);
}
async function decryptedEmergency() {
    const data = await storage();
    const envelope = data.encryptedStaging.find(row => row.record_type === "emergencies");
    if (!envelope) return null;
    const session = await unlockOfflineKey(data.offlineKeys.find(row=>row.owner_user_id === ownerId), passphrase, "passphrase");
    try { return await session.decrypt(envelope, ownerId, "emergencies", envelope.record_id); }
    finally { session.lock(); }
}

class Cdp {
    constructor(ws) {
        this.ws = ws; this.next = 0; this.pending = new Map();
        ws.addEventListener("message", event => {
            const message = JSON.parse(String(event.data));
            const pending = this.pending.get(message.id);
            if (pending) {
                this.pending.delete(message.id); clearTimeout(pending.timer);
                if (message.error) pending.reject(new Error("CDP command failed"));
                else pending.resolve(message.result);
            }
            if (message.method === "Runtime.exceptionThrown") errors.push("Uncaught browser exception");
        });
    }
    call(method, params = {}) {
        const id = ++this.next;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
            this.pending.set(id, { resolve, reject, timer });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }
    async evaluate(expression) {
        const value = await this.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        if (value.exceptionDetails) throw new Error("Browser evaluation failed");
        return value.result.value;
    }
}
async function connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
    return new Cdp(ws);
}
async function waitFor(expression, timeout = 20000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (await cdp.evaluate(expression)) return;
        await delay(100);
    }
    throw new Error(`Condition timed out during ${phase}`);
}
async function textIncludes(text) { await waitFor(`document.body.innerText.includes(${JSON.stringify(text)})`); }
async function navigate(path) {
    await cdp.call("Page.navigate", { url: origin + path });
    await waitFor(`document.readyState === 'complete' && !!document.querySelector('#offline-key-title, main, #offline-state')`);
}
async function click(label) {
    const result = await cdp.evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!button || button.disabled) return false; button.click(); return true; })()`);
    assert.equal(result, true, `Missing enabled button: ${label}`);
}
async function fill(secret, index = 0) {
    const result = await cdp.evaluate(`(() => { const input = document.querySelectorAll('input[type="password"]')[${index}]; if (!input) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(secret)}); input.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    assert.equal(result, true, "Expected password input");
}
async function storage() {
    return cdp.evaluate(`(async () => { const db = await new Promise((resolve, reject) => { const r = indexedDB.open('RapidMindOfflineDB'); r.onupgradeneeded = () => r.transaction.abort(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(new Error('DB unavailable')); }); try { const result = {}; for (const store of db.objectStoreNames) result[store] = await new Promise((resolve, reject) => { const tx = db.transaction(store); const r = tx.objectStore(store).getAll(); tx.oncomplete = () => resolve(r.result); tx.onabort = () => reject(new Error('Read aborted')); }); return result; } finally { db.close(); } })()`);
}
const clinical = snapshot => Object.fromEntries(Object.entries(snapshot).filter(([name]) => name !== "relawanContinuity"));
async function assessmentEvidence() {
    const snapshot = await storage();
    const wrapped = snapshot.offlineKeys.find(row => row.owner_user_id === ownerId);
    const envelope = snapshot.encryptedStaging.find(row => row.record_type === "assessments" && row.record_id === assessmentId);
    assert.ok(envelope, "Synthetic assessment ciphertext missing");
    const session = await unlockOfflineKey(wrapped, passphrase, "passphrase");
    try {
        await session.assertMatches(wrapped);
        const value = await session.decrypt(envelope, ownerId, "assessments", assessmentId);
        return { revision: value.local_revision, answers: value.srq_answers, sync_state: value.sync_state, patient_id: value.patient_id };
    } finally { session.lock(); }
}
async function screenshot(name) {
    assert.equal(await cdp.evaluate("!!document.querySelector('output')"), false, "Do not capture recovery codes");
    const shot = await cdp.call("Page.captureScreenshot", { format: "png" });
    await writeFile(join(run, name + ".png"), Buffer.from(shot.data, "base64"));
}
function pass(name, details) { report.scenarios.push({ name, status: "PASS", details }); console.log(`PASS ${name}`); }
async function closeBrowser() {
    if (!browser) return;
    cdp?.ws.close(); cdp = undefined;
    browser.kill();
    if (browser.exitCode === null) await new Promise(resolve => browser.once("exit", resolve));
    browser = undefined;
}
async function openBrowser(profileName, reuse) {
    await closeBrowser();
    const profile = reuse ?? join(run, profileName);
    await mkdir(profile, { recursive: true });
    if (!reuse) report.profiles.push(profileName);
    browser = spawn(executable, [
        "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
        "--remote-debugging-port=0", `--user-data-dir=${profile}`,
        `--proxy-server=http://127.0.0.1:${server.port}`, "--proxy-bypass-list=<-loopback>",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp", "about:blank",
    ], { stdio: "ignore", windowsHide: true });
    browser.on("error", () => {});
    let port;
    for (let i = 0; i < 100; i++) {
        try { const [p] = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split(/\r?\n/); await fetch(`http://127.0.0.1:${p}/json/version`); port = p; break; } catch { await delay(100); }
    }
    assert.ok(port, "Isolated Chrome did not start");
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    cdp = await connect(targets.find(t => t.type === "page").webSocketDebuggerUrl);
    await cdp.call("Page.enable"); await cdp.call("Runtime.enable"); await cdp.call("Network.enable");
    await cdp.call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    return profile;
}
async function unlock(secret = passphrase) {
    await textIncludes("Buka data"); await fill(secret); await click("Buka data");
}


try {
    if (published) {
        phase = "verify published HTTP asset bytes";
        report.publishedAssets = {};
        const appFile = build.manifest["resources/js/app.ts"].file;
        for (const relative of ["manifest.json", "serviceWorker.js", appFile]) {
            const expected = createHash("sha256").update(await readFile(join(output,relative))).digest("hex");
            const response = await fetch(origin + "/build/" + relative, {cache:"no-store"});
            assert.equal(response.status,200);
            const actual = createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
            assert.equal(actual,expected,"Nginx must serve published asset bytes");
            if(relative === "serviceWorker.js") {
                assert.equal(response.headers.get("service-worker-allowed"),"/");
                assert.ok(response.headers.get("cache-control").includes("no-cache"));
            }
            report.publishedAssets[relative] = actual;
        }
        const html = await (await fetch(origin + "/login",{cache:"no-store"})).text();
        assert.ok(html.includes("/build/"+appFile));
        assert.ok(!html.includes(":5173/") && !html.includes("/@vite/client"));
        pass("published-http-assets", "Real Nginx manifest, worker and app bytes match disk hashes; Laravel login references the published app without Vite development assets.");
    }
    phase = "append synthetic account";
    const encoded = Buffer.from(JSON.stringify({ name: patientName.replace("SYNTHETIC", "RELAWAN"), email, password })).toString("base64");
    const account = php(`$input=json_decode(base64_decode('${encoded}'),true);
if (App\\Models\\User::where('email',$input['email'])->exists()) throw new RuntimeException('Collision');
$u=App\\Models\\User::create([...$input,'role'=>App\\Enums\\UserRole::RELAWAN,'is_active'=>true,'token_version'=>1,'shelter_id'=>null,'facility_id'=>null]);
echo json_encode(['id'=>$u->id,'database'=>'rapid_mind']);`);
    ownerId = account.id; report.retainedSynthetic.owner_user_id = ownerId;
    pass("preflight-and-scoped-fixture", "Verified local/rapid_mind target, enrollment opt-in and DevTools off; appended one unique synthetic Relawan, no Posko/facility.");
    phase = "real login and enrollment policy";
    await openBrowser("relawan-live");
    report.browserVersion = (await cdp.call("Browser.getVersion")).product;
    await cdp.call("Page.navigate", { url: origin + "/login" });
    await waitFor("!!document.querySelector('#email')");
    await fillSelector("#email", email); await fillSelector("#password", password);
    await cdp.evaluate("document.querySelector('form').requestSubmit()");
    await textIncludes("Daftarkan kunci");
    await waitFor("(async()=> (await navigator.serviceWorker.getRegistration('/relawan/'))?.active?.state === 'activated')()");
    if (!await cdp.evaluate("!!navigator.serviceWorker.controller")) {
        await cdp.call("Page.reload");
        await textIncludes("Daftarkan kunci");
    }
    await waitFor("navigator.serviceWorker.controller?.state === 'activated'");
    const policy = await cdp.evaluate(`(async () => {const r=await fetch('/relawan/offline-enrollment-status?owner_user_id=${ownerId}',{headers:{Accept:'application/json'},cache:'no-store'}); const data=await r.json(); return {status:r.status,state:data.state,origin:data.origin,owner:data.user?.id,cache:r.headers.get('cache-control')};})()`);
    assert.deepEqual({ status:policy.status,state:policy.state,origin:policy.origin,owner:policy.owner }, {status:200,state:"LOCAL_ENROLLMENT_ALLOWED",origin,owner:ownerId});
    assert.ok(policy.cache.includes("no-store"));
    const denied = await cdp.evaluate(`(async()=>{const r=await fetch('/relawan/offline-enrollment-status?owner_user_id=${ownerId+100000}',{headers:{Accept:'application/json'},cache:'no-store'});return r.status;})()`);
    assert.equal(denied, 403);
    assert.equal((await storage()).offlineKeys.length, 0);
    pass("real-session-and-owner-authorization", "Real CSRF-protected login; own enrollment policy 200/no-store, wrong owner 403; no key auto-created.");
    await fill(passphrase,0); await fill(passphrase,1); await click("Daftarkan kunci");
    await textIncludes("Saya sudah menyimpan kode");
    const pending = await storage();
    assert.equal(pending.ownerEncryptionModes[0].mode,"ENROLLMENT_PENDING");
    const proof = pending.offlineKeys[0].verification;
    await click("Saya sudah menyimpan kode");
    await waitFor(`!!document.querySelector('main a[href="/relawan/pfa"]') && !document.querySelector('#offline-key-title')`);
    pass("real-authorized-explicit-enrollment", "Laravel reverified identity at registration and recovery confirmation; explicit confirmation installs fresh key.");
    phase = "offline UI creation";
    await navigate("/relawan/assessment"); await unlock();
    await textIncludes("Mulai Asesmen Baru");
    server.state.offline = true;
    await cdp.call("Network.emulateNetworkConditions",{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await cdp.call("Page.reload"); await textIncludes("Buka data"); await unlock(); await textIncludes("Mulai Asesmen Baru");
    const fields = await cdp.evaluate("[...document.querySelectorAll('input')].map(e=>({type:e.type,placeholder:e.placeholder}))");
    const namePlaceholder = fields.find(e=>e.type==='text' && !e.placeholder.includes('NIK') && !e.placeholder.includes('16 digit'))?.placeholder;
    assert.ok(namePlaceholder);
    await fillSelector(`input[placeholder=${JSON.stringify(namePlaceholder)}]`,patientName);
    await fillSelector('input[type="number"]',"29");
    await click("Mulai Asesmen →");
    await waitFor("location.pathname.endsWith('/identity')");
    assessmentId = await cdp.evaluate("location.pathname.split('/')[3]");
    assert.match(assessmentId,/^[a-f0-9-]{36}$/);
    report.retainedSynthetic.assessment_id = assessmentId;
    await textIncludes("Identitas Sesuai, Lanjut ke SRQ-20 →");
    await click("Identitas Sesuai, Lanjut ke SRQ-20 →");
    await waitFor("location.pathname.endsWith('/srq')");
    await answer(1,"Ya"); await answer(2,"Tidak"); await answer(3,"Respons Tidak Jelas");
    await answer(4,"Tidak");
    await waitFor("!!document.querySelector('#srq-question-4 [data-srq-clear]')");
    await cdp.evaluate("document.querySelector('#srq-question-4 [data-srq-clear]').click()");
    let saved = false;
    for(let i=0;i<40;i++){const evidence=await assessmentEvidence();if(evidence.answers?.[1]===true && evidence.answers?.[2]===false && evidence.answers?.[3]==='UNCLEAR' && evidence.answers?.[4]==='UNANSWERED'){saved=true;break;}await delay(100);}
    assert.equal(saved,true);
    const local = await storage();
    for(const name of ['patients','patientSnapshots','assessments','emergencies','outbox']) assert.equal(local[name].length,0);
    assert.ok(!JSON.stringify(local).includes(patientName)); assert.ok(!JSON.stringify(local).includes(passphrase));
    assert.equal(serverEvidence().assessment_count,0);
    pass("offline-encrypted-assessment-not-yet-server", "New synthetic patient/assessment and four-state SRQ draft saved by UI into ciphertext while Laravel still has zero cases for this account.");
    phase = "offline emergency explicit send";
    await click("T0 DARURAT");
    await waitFor("!!document.querySelector('#t0-verification-title')");
    assert.equal(await decryptedEmergency(),null);
    await cdp.evaluate(`(() => {const b=[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent.includes('Kegawatdaruratan Medis & Somatik')); if(!b)throw new Error('Reason absent');b.click();})()`);
    await click("KIRIM T0-SUSPECT");
    await waitFor("!document.querySelector('[role=dialog]') || [...document.querySelectorAll('[role=alert]')].some(e=>e.textContent.includes('Penyintas tidak sesuai dengan asesmen'))");
    const linkedRejected = await cdp.evaluate("[...document.querySelectorAll('[role=alert]')].some(e=>e.textContent.includes('Penyintas tidak sesuai dengan asesmen'))");
    assert.equal(linkedRejected, false, "Active assessment context must reach final T0 submission");
    pass("assessment-linked-offline-t0", "Final send from active offline assessment retains the selected patient/assessment context.");
    let emergency;
    for(let i=0;i<50;i++){emergency=await decryptedEmergency();if(emergency)break;await delay(100);}
    assert.ok(emergency); emergencyId=emergency.id; report.retainedSynthetic.emergency_id=emergencyId;
    const afterEmergency=await storage();
    const key=afterEmergency.offlineKeys.find(r=>r.owner_user_id===ownerId);
    const session=await unlockOfflineKey(key,passphrase,'passphrase');
    let emergencyOutbox;
    try{for(const row of afterEmergency.encryptedStaging.filter(r=>r.record_type==='outbox')){const value=await session.decrypt(row,ownerId,'outbox',row.record_id);if(value.type==='EMERGENCY') emergencyOutbox=value;}}finally{session.lock();}
    assert.equal(emergencyOutbox.entity_id,emergencyId); assert.equal(emergencyOutbox.priority,1);
    assert.equal(serverEvidence().emergencies.length,0);
    pass("offline-t0-and-priority-outbox", "First emergency tap created no event. Explicit reason/final send persisted encrypted emergency plus priority-1 outbox, with no server event yet.");
    phase = "reload lock and preservation";
    await cdp.call("Page.reload"); await textIncludes("Buka data");
    const locked=await storage();
    await unlock('synthetic wrong passphrase'); await textIncludes('Frasa sandi atau kode pemulihan salah');
    assert.deepEqual(clinical(await storage()),clinical(locked));
    assert.equal(await cdp.evaluate(`document.body.textContent.includes(${JSON.stringify(patientName)})`),false);
    await screenshot('01-locked-live-profile');
    await unlock();
    await waitFor(`!!document.querySelector('main') && !document.querySelector('#offline-key-title')`);
    assert.equal((await decryptedEmergency()).id,emergencyId);
    assert.equal((await assessmentEvidence()).answers[3],'UNCLEAR');
    pass("offline-reload-wrong-secret-preserves-fieldwork", "Wrong secret kept clinical DOM closed and all retained ciphertext unchanged; explicit unlock recovered same emergency and SRQ draft.");
    phase = "real reconnection and synchronization";
    server.state.offline = false;
    await cdp.call("Network.emulateNetworkConditions",{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await cdp.call("Page.reload");
    await waitFor("document.readyState === 'complete' && (document.title === 'Not Found' || document.body.innerText.includes('Buka data'))");
    assert.equal(await cdp.evaluate("document.title === 'Not Found'"), false, "Local emergency route must bootstrap rather than return 404");
    pass("reconnect-local-emergency-route", "The original pending emergency URL boots an authenticated local lookup shell; no home redirect or 404 fallback is used.");
    await textIncludes('Buka data'); await unlock();
    let database;
    for(let i=0;i<35;i++){database=serverEvidence(); if(database.assessment_count===1 && database.emergencies.length===1 && Object.keys(database.assessments[0].answers).length>=4)break;await delay(400);}
    assert.equal(database.assessment_count,1);assert.equal(database.patient_count,1);assert.equal(database.emergencies.length,1);
    assert.equal(database.assessments[0].id,assessmentId);assert.equal(database.assessments[0].status,'IN_PROGRESS');assert.equal(database.assessments[0].triage_exists,false);
    assert.equal(database.assessments[0].answers[1],true);assert.equal(database.assessments[0].answers[2],false);assert.equal(database.assessments[0].answers[3],'UNCLEAR');assert.equal(database.assessments[0].answers[4],'UNANSWERED');
    assert.equal(database.emergencies[0].id,emergencyId);assert.equal(database.emergencies[0].status,'PENDING');
    assert.equal(database.emergencies[0].assessment_id,assessmentId);
    assert.equal(database.emergencies[0].patient_id,(await assessmentEvidence()).patient_id);
    assert.equal(database.emergencies[0].red_flag_type,'MEDICAL_CRISIS');assert.equal(database.emergencies[0].latitude,null);assert.equal(database.emergencies[0].longitude,null);
    assert.equal(database.emergencies[0].routing_status,'UNRESOLVED');
    report.databaseEvidence=database;
    const posts=server.log.filter(r=>r.method==='POST' && r.path.startsWith('/relawan/sync/'));
    assert.ok(posts.some(r=>r.path.endsWith('/emergencies')&&[200,201].includes(r.status)));
    assert.ok(posts.some(r=>r.path.endsWith('/assessments')&&[200,201].includes(r.status)));
    assert.equal(posts[0].path,'/relawan/sync/emergencies');
    pass("real-laravel-postgresql-sync", "Actual Laravel accepted emergency before assessment. PostgreSQL has one patient/assessment/emergency, four SRQ states, no definitive score and unresolved facility routing.");
    phase = "canonical receipt and online wrong secret";
    let received=false;
    for(let i=0;i<50;i++){if((await decryptedEmergency()).sync_state==='SYNCED' && (await assessmentEvidence()).sync_state==='SYNCED'){received=true;break;}await delay(100);}
    assert.equal(received,true);
    assert.deepEqual((await storage()).offlineKeys.find(r=>r.owner_user_id===ownerId).verification,proof);
    await cdp.call("Page.reload"); await textIncludes('Buka data');
    const onlineLocked=await storage();await unlock('synthetic wrong passphrase');await textIncludes('Frasa sandi atau kode pemulihan salah');
    assert.deepEqual(clinical(await storage()),clinical(onlineLocked));
    await unlock();await waitFor("!!document.querySelector('main') && !document.querySelector('#offline-key-title')");
    assert.equal(serverEvidence().emergencies.length,1);assert.equal(serverEvidence().assessment_count,1);
    pass("canonical-receipts-and-online-preservation", "Local SYNCED follows canonical server receipts; online wrong-secret retry preserves key/ciphertext and server case counts remain one each.");
    phase = "local shell authorization and missing record";
    const foreign = php(`echo json_encode(App\\Models\\EmergencyEvent::whereHas('user',fn($q)=>$q->where('email','like','p0-integration-%@example.invalid'))->where('user_id','<>',${ownerId})->value('id'));`);
    assert.ok(foreign, "An existing retained synthetic foreign emergency is required for this negative control");
    const foreignStatus=await cdp.evaluate(`(async()=>{const r=await fetch('/relawan/emergencies/${foreign}',{headers:{Accept:'application/json'},cache:'no-store'});return r.status;})()`);
    assert.equal(foreignStatus,404);
    const missingId=randomUUID();
    await navigate(`/relawan/emergencies/${missingId}`);await textIncludes('Buka data');await unlock();
    await textIncludes('Laporan ini tidak tersedia untuk akun ini di perangkat ini.');
    const counts=serverEvidence();assert.equal(counts.emergencies.length,1);assert.equal(counts.assessment_count,1);
    pass('local-shell-does-not-grant-case-access','Persisted foreign synthetic case stays HTTP 404; an unknown UUID displays local-unavailable state and creates no case.');
    phase = "anonymous policy denial";
    await openBrowser('anonymous-live');await cdp.call('Page.navigate',{url:origin+'/login'});await waitFor("!!document.querySelector('#email')");
    const anonymous=await cdp.evaluate(`(async()=>{const r=await fetch('/relawan/offline-enrollment-status?owner_user_id=${ownerId}',{headers:{Accept:'application/json'},cache:'no-store'});return r.status;})()`);
    assert.equal(anonymous,401);
    pass("anonymous-laravel-enrollment-denial", "A separate new unauthenticated browser profile receives real Laravel HTTP 401 for enrollment.");
    if(published) {
        assert.equal(server.log.some(row=>row.target === 'candidate-assets'),false);
        assert.ok(server.log.some(row=>row.target === 'live-laravel' && row.status === 200 && row.path === '/build/'+build.manifest['resources/js/app.ts'].file));
    }
    assert.deepEqual(errors,[]);report.status=report.scenarios.some(s=>s.status==='FAIL')?'FAIL':'PASS';
} catch(error) {
    report.status='FAIL';report.failure={phase,kind:error.name,message:'Details withheld to protect credentials and decrypted data.'};
    if(cdp){report.failure.dom=await cdp.evaluate(`({title:document.title,path:location.pathname,headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent.trim()),buttons:[...document.querySelectorAll('button')].map(e=>e.textContent.trim()),inputTypes:[...document.querySelectorAll('input')].map(e=>e.type),alerts:[...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent.trim())})`).catch(()=>null);}
    console.log(`FAIL ${phase}`);
} finally {
    await closeBrowser();await server.close();
    report.ownerAssetsUnchanged=await ownerAssetDigest()===beforeAssets;
    if(!report.ownerAssetsUnchanged)report.status='FAIL';
    report.browserExceptions=errors.length;report.network=server.log;
    await writeFile(join(run,'results.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({status:report.status,scenarios:report.scenarios.length,artifacts:run,retainedSynthetic:report.retainedSynthetic,ownerAssetsUnchanged:report.ownerAssetsUnchanged}));
    process.exitCode=report.status==='PASS'?0:1;
}
