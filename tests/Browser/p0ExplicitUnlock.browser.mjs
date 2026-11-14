import assert from "node:assert/strict";
import { unlockOfflineKey } from "../../resources/js/offline/offlineCrypto.ts";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ownerAssetDigest } from "./helpers/localPwaBuild.mjs";
import { localPwaServer, origin, assessmentPath, patientName, ownerId } from "./helpers/localPwaServer.mjs";

// Native Chrome DevTools Protocol; no browser package or dependency installation.
// The closed proxy serves only a fresh isolated build and synthetic responses.
const output = resolve(process.env.RAPID_MIND_P0_BUILD);
const executable = process.env.RAPID_MIND_CHROME_BIN;
assert.ok(executable, "An existing Chromium executable is required");
const beforeAssets = await ownerAssetDigest();
const build = { output, manifest: JSON.parse(await readFile(join(output, "manifest.json"), "utf8")) };
const server = await localPwaServer(build);
const run = await mkdtemp(join(tmpdir(), "rapid-mind-p0-browser-"));
const passphrase = "frasa sandi sintetis browser checkpoint P0";
const report = { status: "NOT TESTED", scenarios: [], profiles: [], limitations: [
    "Real Chromium, IndexedDB, DOM and production-built service worker; HTTP authentication/policy responses are synthetic.",
    "No live Laravel backend, real-user profile, native mobile backgrounding or general migration acceptance.",
    "No data/profile/cache deletion, key migration or owner frontend publication.",
] };
let browser;
let cdp;
let phase = "setup";
let errors = [];

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
async function textIncludes(text) {
    if (text === "Buka data" || text === "Daftarkan kunci") {
        await waitFor("(()=>{if(document.querySelector('input[type=password]'))return true;const b=[...document.querySelectorAll('button')].find(b=>['Buka data offline / lanjutkan pekerjaan','T0 DARURAT'].includes(b.textContent.trim()));if(b)b.click();return false;})()");
    }
    if (text.startsWith('Pendaftaran enkripsi') || text.startsWith('Penyimpanan lama')) {
        await waitFor(`(()=>{if(document.body.innerText.includes(${JSON.stringify(text)}))return true;if(!document.querySelector('#offline-key-title')){const b=[...document.querySelectorAll('button')].find(b=>['T0 DARURAT','Buka data offline / lanjutkan pekerjaan'].includes(b.textContent.trim()));if(b)b.click();}return false;})()`);
    }
    await waitFor(`document.body.innerText.includes(${JSON.stringify(text)})`);
    if (text === "Buka data" || text === "Daftarkan kunci") await waitFor("!!document.querySelector('input[type=password]')"); }
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
    const envelope = snapshot.encryptedStaging.find(row => row.record_type === "assessments" && row.record_id === "c1-assessment");
    assert.ok(envelope, "Synthetic assessment ciphertext missing");
    const session = await unlockOfflineKey(wrapped, passphrase, "passphrase");
    try {
        await session.assertMatches(wrapped);
        const value = await session.decrypt(envelope, ownerId, "assessments", "c1-assessment");
        return { revision: value.local_revision, answer: value.srq_answers?.[1] };
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
async function seed(store, rows) {
    await cdp.evaluate(`(async () => { const db = await new Promise((resolve, reject) => { const r = indexedDB.open('RapidMindOfflineDB'); r.onsuccess = () => resolve(r.result); r.onerror = reject; }); try { await new Promise((resolve, reject) => { const tx = db.transaction(${JSON.stringify(store)}, 'readwrite'); for (const row of ${JSON.stringify(rows)}) tx.objectStore(${JSON.stringify(store)}).add(row); tx.oncomplete = resolve; tx.onabort = reject; }); } finally { db.close(); } })()`);
}
try {
    phase = "fresh enrollment and denied confirmation";
    await openBrowser("explicit-owner");
    report.browserVersion = (await cdp.call("Browser.getVersion")).product;
    await navigate("/relawan/home");
    await waitFor("!!document.querySelector('main') && !document.querySelector('#offline-key-title')");
    assert.equal(await cdp.evaluate("!!document.querySelector('input[type=password]')"), false);
    await click("Bantuan Darurat"); await textIncludes("Kontak bantuan terverifikasi belum tersedia"); await click("Bantuan Darurat");
    await click("T0 DARURAT");
    await textIncludes("Daftarkan kunci");
    await waitFor("navigator.serviceWorker.controller?.state === 'activated'");
    let saved = await storage();
    assert.equal(saved.offlineKeys.length, 0);
    await delay(800);
    assert.deepEqual(clinical(await storage()), clinical(saved));
    await screenshot("01-explicit-enrollment");
    pass("fresh-mount-read-only", "No key generated on mount; ordinary production assets and activated worker.");
    await fill(passphrase, 0); await fill(passphrase, 1); await click("Daftarkan kunci");
    await textIncludes("Saya sudah menyimpan kode");
    saved = await storage();
    assert.equal(saved.ownerEncryptionModes[0].mode, "ENROLLMENT_PENDING");
    const key = saved.offlineKeys[0];
    server.state.denyEnrollment = true;
    await click("Saya sudah menyimpan kode");
    await textIncludes("Konfirmasi belum selesai");
    assert.deepEqual(clinical(await storage()), clinical(saved));
    pass("denied-confirmation-preserves-key", "403 policy response leaves pending key intact and clinical view closed.");
    phase = "resume pending enrollment";
    server.state.denyEnrollment = false;
    await fill(passphrase); await click("Buat kode pemulihan pengganti");
    await textIncludes("Saya sudah menyimpan kode");
    const pendingRecovery = await cdp.evaluate("document.querySelector('output').textContent.trim()");
    const continued = await storage();
    assert.deepEqual(continued.offlineKeys[0].verification, key.verification);
    assert.deepEqual(continued.offlineKeys[0].passphrase, key.passphrase);
    phase = "confirm and mount workspace";
    await click("Saya sudah menyimpan kode");
    await waitFor(`!!document.querySelector('main a[href="/relawan/pfa"]') && !document.querySelector('#offline-key-title')`);
    pass("explicit-enrollment-same-dek", "User confirmation enables access; interrupted enrollment retained DEK identity. Recovery code remains only in harness memory.");

    phase = "wrong passphrase and offline persistence";
    await navigate(assessmentPath); await unlock();
    await textIncludes(patientName);
    await waitFor(`(async () => { const r = indexedDB.open('RapidMindOfflineDB'); const db = await new Promise(resolve => { r.onsuccess = () => resolve(r.result); }); const rows = await new Promise(resolve => { const q = db.transaction('encryptedStaging').objectStore('encryptedStaging').getAll(); q.onsuccess = () => resolve(q.result); }); db.close(); return rows.some(r => r.record_type === 'assessments'); })()`);
    await cdp.call("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    server.state.offline = true;
    await cdp.call("Page.reload"); await textIncludes("Buka data");
    saved = await storage();
    await cdp.call("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await cdp.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Bantuan Darurat').focus()");
    await cdp.call("Input.dispatchKeyEvent", {type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await cdp.call("Input.dispatchKeyEvent", {type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await textIncludes("Kontak bantuan terverifikasi belum tersedia");
    assert.equal(await cdp.evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
    assert.equal(await cdp.evaluate("document.activeElement.getAttribute('aria-expanded')"), 'true');
    assert.ok(await cdp.evaluate("document.activeElement.getBoundingClientRect().height >= 44"));
    await screenshot("02a-locked-assistance-mobile");
    await cdp.call("Emulation.setDeviceMetricsOverride", {width:1280,height:900,deviceScaleFactor:1,mobile:false});
    assert.equal(await cdp.evaluate("document.querySelectorAll('a[href^=\"tel:\"]').length"), 0);
    assert.equal(await cdp.evaluate(`document.body.textContent.includes(${JSON.stringify(patientName)})`), false);
    assert.deepEqual(clinical(await storage()), clinical(saved));
    await click("Bantuan Darurat");
    await unlock("passphrase salah sintetis"); await textIncludes("Frasa sandi atau kode pemulihan salah");
    assert.equal(await cdp.evaluate(`document.body.textContent.includes(${JSON.stringify(patientName)})`), false);
    assert.deepEqual(clinical(await storage()), clinical(saved));
    await screenshot("02-wrong-passphrase-preserved");
    pass("wrong-passphrase-no-reset", "Wrong secret while offline preserves ciphertext, key and indices; clinical patient absent from DOM.");
    await unlock(); await textIncludes(patientName);
    await waitFor(`!![...document.querySelectorAll('#srq-question-1 button')].find(b => b.textContent.trim() === 'Tidak' && !b.disabled)`);
    const beforeAnswer = await assessmentEvidence();
    await cdp.evaluate(`(() => { const b = [...document.querySelectorAll('#srq-question-1 button')].find(b => b.textContent.trim() === 'Tidak'); if (!b) throw new Error('SRQ button absent'); b.click(); })()`);
    let persisted = false;
    for (let attempt = 0; attempt < 40; attempt++) {
        const evidence = await assessmentEvidence();
        if (evidence.answer === false && evidence.revision > beforeAnswer.revision) { persisted = true; break; }
        await delay(100);
    }
    assert.equal(persisted, true, "UI edit must durably change the encrypted answer before reload");
    saved = await storage();
    assert.equal(saved.offlineKeys[0].verification.ciphertext, key.verification.ciphertext);
    for (const name of ['patients', 'patientSnapshots', 'assessments', 'emergencies', 'outbox']) assert.equal(saved[name].length, 0);
    assert.ok(saved.encryptedStaging.some(row => row.record_type === "outbox"));
    assert.ok(!JSON.stringify(saved).includes(patientName));
    assert.ok(!JSON.stringify(saved).includes(passphrase));
    pass("offline-encrypted-draft-outbox", "UI answer saved with encrypted assessment/outbox and no clinical plaintext stores.");
    await cdp.call("Page.reload"); await textIncludes("Buka data");
    const locked = await storage();
    await delay(800); assert.deepEqual(clinical(await storage()), clinical(locked));
    await unlock(); await textIncludes(patientName);
    await waitFor(`document.querySelector('#srq-question-1 button[aria-pressed="true"]')?.textContent.trim() === "Tidak"`);
    assert.equal((await assessmentEvidence()).answer, false);
    pass("offline-reload-explicit-unlock", "Offline shell retained saved answer; reload stayed locked until passphrase input.");
    await cdp.call("Page.reload"); await textIncludes("Buka data");
    await click("Lupa frasa sandi / Gunakan kode pemulihan");
    await cdp.evaluate(`(() => { const input = document.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(pendingRecovery)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await click("Buka data"); await textIncludes(patientName);
    pass("offline-recovery-unlock", "Explicit saved recovery code opens same key offline.");
    await screenshot("03-offline-synthetic-assessment");
    phase = "responsive T0 review without creating an emergency";
    const beforeEmergencyReview = clinical(await storage());
    await click("T0 DARURAT");
    await waitFor("!!document.querySelector('[role=dialog][aria-labelledby=t0-verification-title]')");
    for (const width of [320, 390, 430, 768, 1440]) {
        await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: width < 768 });
        await delay(200);
        assert.equal(await cdp.evaluate("(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})()"), true);
        await screenshot(`03-t0-review-${width}`);
    }
    await cdp.evaluate("document.querySelector('[role=dialog] button[aria-label=Tutup]').click()");
    await waitFor("!document.querySelector('[role=dialog][aria-labelledby=t0-verification-title]')");
    assert.deepEqual(clinical(await storage()), beforeEmergencyReview);
    pass("t0-review-responsive-no-write", "Review dialog fits five viewports; opening and cancelling creates no emergency or outbox operation.");
    phase = "online wrong passphrase with retained draft";
    server.state.offline = false;
    await cdp.call("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await cdp.call("Page.reload"); await textIncludes("Buka data");
    saved = await storage();
    await unlock("passphrase salah sintetis"); await textIncludes("Frasa sandi atau kode pemulihan salah");
    await delay(800);
    assert.deepEqual(clinical(await storage()), clinical(saved));
    assert.equal(await cdp.evaluate(`document.body.textContent.includes(${JSON.stringify(patientName)})`), false);
    pass("online-wrong-passphrase-no-reset", "Online failure preserves existing encrypted draft, outbox and DEK without re-enrollment.");
    await closeBrowser();

    phase = "server denial at initial enrollment";
    server.state.denyEnrollment = true;
    await openBrowser("denied-owner"); await navigate("/relawan/home");
    await textIncludes("Pendaftaran enkripsi perangkat belum diizinkan");
    saved = await storage();
    assert.equal(saved.offlineKeys.length, 0);
    assert.equal(await cdp.evaluate("!!document.querySelector('form')"), false);
    await cdp.call("Page.reload"); await textIncludes("Pendaftaran enkripsi perangkat belum diizinkan");
    assert.deepEqual(clinical(await storage()), clinical(saved));
    await screenshot("04-server-denial");
    pass("denied-enrollment-no-local-fallback", "Repeated 403 remains blocked and never creates key or activation mode.");
    server.state.denyEnrollment = false;

    phase = "legacy cross-owner preservation";
    await openBrowser("legacy-ownerless"); await navigate("/relawan/home"); await textIncludes("Daftarkan kunci");
    await seed("patients", [{ id: "p0-ownerless-synthetic", name: "P0-SYNTHETIC-OWNERLESS" }]);
    await seed("outbox", [{ id: 711, owner_user_id: ownerId + 1, type: "EMERGENCY", entity_id: "p0-other-owner", status: "PENDING", priority: 1, payload: { synthetic: true } }]);
    await textIncludes("Penyimpanan lama, rusak, atau metadata tidak sesuai");
    saved = await storage();
    await cdp.call("Page.reload"); await textIncludes("Penyimpanan lama, rusak, atau metadata tidak sesuai");
    assert.deepEqual(clinical(await storage()), clinical(saved));
    assert.equal(saved.patients.length, 1); assert.equal(saved.outbox.length, 1); assert.equal(saved.offlineKeys.length, 0);
    await screenshot("05-legacy-quarantine");
    pass("legacy-ownerless-cross-owner-quarantine", "Added synthetic legacy/other-owner records survive reload unchanged; no enrollment/reset occurs.");

    phase = "inconsistent metadata preservation";
    await openBrowser("inconsistent-owner"); await navigate("/relawan/home"); await textIncludes("Daftarkan kunci");
    await seed("ownerEncryptionModes", [{ owner_user_id: ownerId, mode: "ENCRYPTED", key_identity: "synthetic-missing-key" }]);
    await textIncludes("Penyimpanan lama, rusak, atau metadata tidak sesuai");
    saved = await storage();
    await cdp.call("Page.reload"); await textIncludes("Penyimpanan lama, rusak, atau metadata tidak sesuai");
    assert.deepEqual(clinical(await storage()), clinical(saved));
    await screenshot("06-inconsistent-quarantine");
    pass("inconsistent-metadata-no-replacement", "Missing-key synthetic metadata stays blocked and unchanged after reload.");
    assert.deepEqual(errors, []);
    report.status = "PASS";
} catch (error) {
    report.status = "FAIL";
    report.failure = { phase, kind: error.name, location: String(error.stack).split("\n").filter(line => line.trim().startsWith("at ")).slice(0, 2), message: "Scenario failed; no secret-bearing exception or DOM was recorded." };
    if (cdp) {
        report.failure.dom = await cdp.evaluate(`({title: document.title, headings: [...document.querySelectorAll('h1,h2')].map(e=>e.textContent.trim()), buttons: [...document.querySelectorAll('button')].map(e=>e.textContent.trim()), inputTypes: [...document.querySelectorAll('input')].map(e=>e.type), alerts: [...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent.trim())})`).catch(() => null);
        if (!await cdp.evaluate("!!document.querySelector('output')").catch(() => true)) await screenshot("failure").catch(() => {});
    }
    console.log(`FAIL ${phase}`);
} finally {
    await closeBrowser(); await server.close();
    const assetsUnchanged = await ownerAssetDigest() === beforeAssets;
    report.ownerAssetsUnchanged = assetsUnchanged;
    if (!assetsUnchanged) report.status = "FAIL";
    report.browserExceptions = errors.length;
    report.network = { syntheticRequests: server.log.length, blockedMutations: server.log.filter(e => e.outcome === "blocked-mutation").length, upstreamForwarding: false };
    await writeFile(join(run, "results.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, scenarios: report.scenarios.length, artifacts: run, ownerAssetsUnchanged: assetsUnchanged }));
    process.exitCode = report.status === "PASS" ? 0 : 1;
}
