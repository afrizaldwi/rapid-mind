import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { localPwaServer, origin, assessmentPath, ownerId } from './helpers/localPwaServer.mjs';
import { ownerAssetDigest } from './helpers/localPwaBuild.mjs';

const output = process.env.RAPID_MIND_DEVICE_BUILD;
assert.ok(output, 'Provide an isolated production build');
const before = await ownerAssetDigest();
const server = await localPwaServer({ output, manifest: JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8')) }, { deviceManaged: true });
const run = await mkdtemp(join(tmpdir(), 'rapid-mind-device-browser-'));
const profile = join(run, 'profile');
const results = { status: 'FAIL', scenarios: [], limitations: ['Synthetic HTTP server; no live Laravel E2E or native mobile acceptance.'] };
let context;
const launch = () => chromium.launchPersistentContext(profile, { executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--proxy-bypass-list=<-loopback>'], proxy: { server: `http://127.0.0.1:${server.port}` } });
const pass = name => { results.scenarios.push(name); console.log('PASS', name); };
async function evidence(page) {
 return page.evaluate(async owner => {
  const db = await new Promise((resolve,reject) => { const r=indexedDB.open('RapidMindOfflineDB');r.onsuccess=()=>resolve(r.result);r.onerror=reject; });
  try {
   const read = name => new Promise((resolve,reject) => { const t=db.transaction(name);const r=t.objectStore(name).getAll();t.oncomplete=()=>resolve(r.result);t.onabort=reject; });
   const keys=await read('offlineKeys'), rows=await read('encryptedStaging'), key=keys.find(k=>k.owner_user_id===owner);
   const data=[];
   if(key?.crypto_key) for(const row of rows) {
    const bytes=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
    const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(row.iv),additionalData:new TextEncoder().encode(JSON.stringify(['rapid-mind-offline',1,owner,row.record_type,row.record_id]))},key.crypto_key,bytes(row.ciphertext));
    data.push({type:row.record_type,value:JSON.parse(new TextDecoder().decode(raw))});
   }
   return {keyId:key?.key_id,version:key?.version,extractable:key?.crypto_key?.extractable,data,plaintext:(await Promise.all(['patients','assessments','emergencies','outbox'].map(read))).flat().length};
  } finally {db.close();}
 }, ownerId);
}
try {
 context=await launch(); let page=context.pages()[0];
 await page.goto(origin+assessmentPath);
 await page.getByRole('button',{name:'Tidak',exact:true}).first().waitFor();
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.waitForFunction(()=>!document.querySelector('button[disabled]') || document.querySelectorAll('#srq-question-1 button:not([disabled])').length>0);
 assert.equal(await page.locator('input[type=password]').count(),0);
 const first=await evidence(page); assert.equal(first.version,2);assert.equal(first.extractable,false);assert.equal(first.plaintext,0);
 pass('automatic encrypted startup without passphrase');
 await page.getByRole('button',{name:'Tidak',exact:true}).first().click();
 await context.setOffline(true); server.state.offline=true;
 await page.locator('#srq-question-2').getByRole('button',{name:'Ya',exact:true}).click();
 await page.waitForTimeout(200);
 assert.equal(page.url(),origin+assessmentPath);
 assert.equal((await evidence(page)).data.find(r=>r.type==='assessments').value.srq_answers[2],true);
 pass('online to offline preserves assessment and saves answers');
 await page.getByRole('button',{name:'T0 DARURAT',exact:true}).click();
 await page.getByRole('button',{name:'Kegawatdaruratan Medis',exact:false}).click();
 const notes=page.locator('[role=dialog] textarea'); await notes.fill('Catatan darurat sintetis');
 server.state.offline=false;await context.setOffline(false);await page.waitForTimeout(400);
 assert.equal(await notes.inputValue(),'Catatan darurat sintetis');
 assert.equal(page.url(),origin+assessmentPath);
 server.state.offline=true;await context.setOffline(true);
 await page.getByRole('button',{name:'KIRIM T0-SUSPECT',exact:false}).click();
 await page.waitForTimeout(300);
 const saved=await evidence(page);const emergency=saved.data.find(r=>r.type==='emergencies');
 assert.ok(emergency); assert.ok(saved.data.some(r=>r.type==='outbox' && r.value.priority===1));assert.equal(saved.plaintext,0);
 pass('T0 verification survives reconnect and saves encrypted priority outbox offline');
 await page.reload();
 await page.locator('#srq-question-2').waitFor();
 assert.equal(await page.locator('input[type=password]').count(),0);
 assert.equal((await evidence(page)).keyId,first.keyId);
 pass('offline reload restores key and assessment automatically');
 await context.close();context=undefined;
 context=await launch();await context.setOffline(true);page=context.pages()[0];await page.goto(origin+assessmentPath);
 await page.locator('#srq-question-2').waitFor();
 assert.equal((await evidence(page)).keyId,first.keyId);
 pass('cold offline browser restart restores encrypted work');
 server.state.csrf='rotated-synthetic-csrf';server.state.dropNextEmergencyResponse=true;server.state.offline=false;
 await context.setOffline(false);
 for(let i=0;i<100;i++){const e=await evidence(page);if(e.data.some(r=>r.type==='emergencies'&&r.value.sync_state==='SYNCED'))break;await page.waitForTimeout(100);}
 const delivered=await evidence(page);
 assert.ok(delivered.data.some(r=>r.type==='emergencies'&&r.value.sync_state==='SYNCED'));
 assert.equal(server.state.acceptedEmergencies.size,1);
 assert.equal(page.url(),origin+assessmentPath);
 pass('CSRF recovery and lost-response retry deliver one T0 without redirect');
 server.state.emergencyRouting='ROUTED';
 for(const offlineShell of [false,true]) {
  await page.goto(origin+'/relawan/home');
  await page.getByRole('button',{name:'T0 DARURAT',exact:true}).waitFor();
  if(offlineShell){await context.setOffline(true);server.state.offline=true;await page.reload();await page.getByRole('button',{name:'T0 DARURAT',exact:true}).waitFor();}
  await page.getByRole('button',{name:'T0 DARURAT',exact:true}).click();
  await page.getByRole('button',{name:'Kegawatdaruratan Medis',exact:false}).click();
  const marker='Laporan mandiri sintetis '+String(offlineShell);
  await page.locator('[role=dialog] textarea').fill(marker);
  await page.getByRole('button',{name:'KIRIM T0-SUSPECT',exact:false}).click();
  await page.getByText(marker,{exact:false}).first().waitFor();
  server.state.offline=false;await context.setOffline(false);
  for(let i=0;i<100;i++){if(!((await evidence(page)).data.some(r=>r.type==='emergencies'&&r.value.notes===marker)))break;await page.waitForTimeout(100);}
  assert.equal((await evidence(page)).data.some(r=>r.type==='emergencies'&&r.value.notes===marker),false,'Routed report cleanup must run');
  await page.getByText(marker,{exact:false}).first().waitFor();
  await page.getByText('Diterima server',{exact:true}).waitFor();
  pass('standalone T0 stays visible after routed receipt cleanup (offline shell='+offlineShell+')');
 }
 await page.goto(origin+assessmentPath);
 await page.locator('#srq-question-2').waitFor();

 await context.setOffline(true);server.state.offline=true;
 for(let i=1;i<=20;i++) await page.locator(`#srq-question-${i}`).getByRole('button',{name:'Tidak',exact:true}).click();
 await page.getByRole('button',{name:'Lanjut: Faktor Risiko',exact:false}).click();
 await page.waitForURL('**/risk');
 for(let i=0;i<5;i++) await page.getByRole('button',{name:/TIDAK/}).nth(i).click();
 await page.getByRole('button',{name:'Lanjut:',exact:false}).click();
 await page.waitForURL('**/function');
 for(let i=0;i<3;i++) await page.getByRole('button',{name:/0 poin/}).nth(i).click();
 await page.getByRole('button',{name:'Tinjau & Ringkasan',exact:false}).click();
 await page.waitForURL('**/review');
 const reviewed=(await evidence(page)).data.find(r=>r.type==='assessments').value;
 assert.equal(Object.keys(reviewed.risk_indicators).length,5);
 assert.equal(Object.keys(reviewed.function_domains).length,3);
 assert.equal(await page.locator('input[type=password]').count(),0);
 pass('offline stage navigation preserves SRQ, risk and function through review');
 await page.getByRole('button',{name:'SELESAIKAN & LIHAT TRIASE',exact:false}).click();
 await page.waitForURL('**/result');
 const completed=(await evidence(page)).data.find(r=>r.type==='assessments').value;
 assert.equal(completed.status,'COMPLETED');assert.ok(completed.triage_result);
 assert.equal((await evidence(page)).plaintext,0);
 pass('assessment completes and retains encrypted recommendation fully offline');
 const resultUrl=page.url();
 server.state.offline=false;await context.setOffline(false);
 for(let i=0;i<100;i++){if((await evidence(page)).data.some(r=>r.type==='assessments'&&r.value.sync_state==='SYNCED'))break;await page.waitForTimeout(100);}
 assert.equal((await evidence(page)).data.find(r=>r.type==='assessments').value.sync_state,'SYNCED');
 assert.equal(page.url(),resultUrl);assert.equal(server.state.acceptedAssessments.size,1);
 pass('completed assessment synchronizes after reconnect without leaving results');
 await context.setOffline(true);server.state.offline=true;
 await page.getByRole('button',{name:'Keluar akun',exact:true}).click();
 await page.getByText('Akses lokal dikunci',{exact:true}).waitFor();await page.reload();
 await page.getByText('Masuk kembali saat terhubung',{exact:false}).waitFor();
 assert.ok((await evidence(page)).data.some(r=>r.type==='emergencies'));
 pass('offline logout blocks reopening and preserves ciphertext');
 assert.equal(await ownerAssetDigest(),before);
 results.status='PASS';
} catch(error) {
 results.error=String(error.message).slice(0,500);
 if(context) { const page=context.pages()[0]; await page.screenshot({path:join(run,'failure.png')}).catch(()=>{}); await writeFile(join(run,'failure-text.txt'),await page.locator('body').innerText().catch(()=>'')); }
 process.exitCode=1;
} finally {
 await context?.close();await server.close();await writeFile(join(run,'results.json'),JSON.stringify(results,null,2));console.log('Results:',join(run,'results.json'));
}
