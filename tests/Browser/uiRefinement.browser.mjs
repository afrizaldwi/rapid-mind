import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nativeChromeSession } from './helpers/nativeChromeSession.mjs';
import { liveLaravelProxy } from './helpers/liveLaravelProxy.mjs';
import { project, ownerAssetDigest } from './helpers/localPwaBuild.mjs';

// Read-only visual audit against the established demo roster. Never submits clinical forms.
const phase = process.env.RAPID_MIND_UI_PHASE ?? 'before';
const output = process.env.RAPID_MIND_P0_BUILD ?? join(project, 'public/build');
const run = await mkdtemp(join(tmpdir(), `rapid-mind-ui-${phase}-`));
const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
const before = await ownerAssetDigest();
const proxy = await liveLaravelProxy({ output, manifest }, { published: !process.env.RAPID_MIND_P0_BUILD, healthcare: true, admin: true });
const bootstrap = String.raw`<?php require 'vendor/autoload.php';$app=require 'bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();if(!app()->environment('local')||config('app.url')!=='http://localhost:8080'||Illuminate\Support\Facades\DB::selectOne('select current_database() as name')->name!=='rapid_mind')exit(1);echo json_encode(Database\Seeders\Competition\FixtureCredentials::load(false));`;
let accounts;
try { accounts = JSON.parse(execFileSync('docker', ['compose', 'exec', '-T', 'app', 'php'], { cwd: project, input: bootstrap, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })); }
catch { throw new Error('Protected demo roster unavailable; no credential details printed.'); }
const report = { phase, status: 'RUNNING', artifacts: run, pages: [], errors: [], limits: ['Synthetic existing roster; GET navigation only, no clinical/admin mutations.', 'Emulated viewport is not physical-device or screen-reader acceptance.'] };
const widths = [320, 360, 390, 430, 768, 1024, 1440];
report.interactions = [];
async function key(name, modifiers = 0) {
    await session.call('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, modifiers });
    await session.call('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, modifiers });
}
async function navigationChecks(role, path) {
    await session.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 960, deviceScaleFactor: 1, mobile: true });
    await session.goto(path, `location.pathname === ${JSON.stringify(path)} && !!document.querySelector('main')`);
    await session.evaluate("document.querySelector('.rm-skip-link').focus()");
    await key('Enter');
    await session.wait("document.activeElement.tagName === 'MAIN'");
    report.interactions.push({ role, checks: ['skip link activated with Enter moves focus to main content'] });
    await session.evaluate("document.querySelector('button[title=English]').click()");
    await session.wait("document.querySelector('button[title=English]').getAttribute('aria-pressed') === 'true'");
    await session.evaluate("document.querySelector('button[title=\"Bahasa Indonesia\"]').click()");
    await session.wait("document.querySelector('button[title=\"Bahasa Indonesia\"]').getAttribute('aria-pressed') === 'true'");
    report.interactions.push({ role, checks: ['existing language switch toggles EN and ID'] });
    if (role === 'relawan-1') {
        assert.equal(await session.evaluate("!!document.querySelector('#offline-key-title')"), false, 'Dashboard must remain available while locked');
        await session.evaluate("document.querySelector('.rm-status').focus(); document.querySelector('.rm-status').click()");
        await session.wait("!!document.querySelector('[aria-labelledby=status-data-title]')");
        await key('Tab', 8);
        assert.equal(await session.evaluate("document.activeElement.closest('[aria-labelledby=status-data-title]') !== null"), true);
        await session.screenshot(join(run, 'relawan-status-dialog.png'));
        await key('Escape');
        await session.wait("!document.querySelector('[aria-labelledby=status-data-title]') && document.activeElement.classList.contains('rm-status')");
        report.interactions.push({ role, checks: ['status dialog traps keyboard focus', 'Escape returns to status trigger'] });
        await session.goto('/relawan/assessment', "!!document.querySelector('#assessment-patient-name')");
        assert.equal(await session.evaluate("document.querySelector('#assessment-patient-name').labels.length"), 1);
        assert.equal(await session.evaluate("document.querySelector('main form').reportValidity()"), false);
        await session.evaluate("document.querySelectorAll('button[aria-pressed]')[1].click()");
        await session.wait("document.querySelectorAll('button[aria-pressed]')[1].getAttribute('aria-pressed') === 'true'");
        report.interactions.push({ role, checks: ['locked dashboard available', 'assessment label association', 'empty required input rejected', 'assessment mode selection without submission'] });
        return;
    }
    const prefix = role === 'admin' ? 'admin' : 'healthcare';
    await session.evaluate(`document.querySelector('button[aria-controls="${prefix}-navigation"]').click()`);
    await session.wait(`document.activeElement.id === '${prefix}-navigation' && document.querySelector('main').inert`);
    await key('Tab');
    assert.equal(await session.evaluate(`document.activeElement === document.querySelector('#${prefix}-navigation button')`), true);
    await key('Tab', 8);
    assert.equal(await session.evaluate(`document.activeElement === [...document.querySelectorAll('#${prefix}-navigation a[href],#${prefix}-navigation button')].filter(e => e.getClientRects().length).at(-1)`), true);
    await key('Tab');
    assert.equal(await session.evaluate(`document.activeElement === document.querySelector('#${prefix}-navigation button')`), true);
    await key('Escape');
    await session.wait(`!document.querySelector('main').inert && document.activeElement.getAttribute('aria-controls') === '${prefix}-navigation'`);
    await session.evaluate(`document.querySelector('button[aria-controls="${prefix}-profile-menu"]').click()`);
    await session.wait(`!!document.querySelector('#${prefix}-profile-menu')`);
    await key('Escape');
    await session.wait(`!document.querySelector('#${prefix}-profile-menu') && document.activeElement.getAttribute('aria-controls') === '${prefix}-profile-menu'`);
    await session.screenshot(join(run, `${role}-keyboard.png`));
    report.interactions.push({ role, checks: ['drawer opens with focus', 'background inert', 'Tab and Shift+Tab wrap', 'Escape restores menu focus', 'profile Escape restores focus'] });
    if (role === 'admin') {
        await session.goto('/admin/volunteers/create', "!!document.querySelector('main form')");
        assert.equal(await session.evaluate("document.querySelector('main form').reportValidity()"), false);
        report.interactions.push({ role, checks: ['empty administrative form rejected without write'] });
    } else {
        await session.fill('input[aria-label="Cari antrean darurat"]', 'UI_SYNTHETIC_NO_MATCH_20261113');
        await session.wait("/Tidak ada kasus sesuai filter|Belum ada antrean darurat/.test(document.querySelector('main').innerText)");
        await session.screenshot(join(run, `${role}-empty-search.png`));
        await session.fill('input[aria-label="Cari antrean darurat"]', '');
        report.interactions.push({ role, checks: ['unmatched queue search shows empty state', 'search can be cleared'] });
    }
}
const roles = [
    ['relawan-1', ['/relawan/home', '/relawan/pfa', '/relawan/assessment', '/relawan/data']],
    ['healthcare-a', ['/healthcare/emergencies', '/healthcare/validations', '/healthcare/referrals', '/healthcare/patients']],
    ['admin', ['/admin/summary', '/admin/volunteers', '/admin/facilities/organizations', '/admin/logistics', '/admin/volunteers/create', '/admin/analytics', '/admin/map', '/admin/operations/posko', '/admin/facilities/users']],
];
let session;
try {
    for (const [role, paths] of roles) {
        if (process.env.RAPID_MIND_UI_INTERACTION_ONLY) paths.splice(1);
        session = await nativeChromeSession({ executable: process.env.RAPID_MIND_CHROME_BIN, profile: join(run, role), proxyPort: proxy.port });
        await session.goto('/login', "!!document.querySelector('#email')");
        await session.fill('#email', accounts[role].email);
        await session.fill('#password', accounts[role].password);
        await session.evaluate("document.querySelector('form').requestSubmit()");
        await session.wait("!location.pathname.startsWith('/login') && !!document.querySelector('main')");
        for (let index = 0; index < paths.length; index++) {
            const path = paths[index];
            await session.goto(path, `location.pathname === ${JSON.stringify(path)} && !!document.querySelector('main')`);
            for (const width of (index === 0 ? widths : [390, 768, 1440])) {
                await session.call('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: width < 768 });
                await session.evaluate('document.fonts.ready.then(() => new Promise(resolve => setTimeout(resolve, 350)))');
                const metrics = await session.evaluate(`(() => {
                    const visible = e => {const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
                    const actions=[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')].filter(visible);
                    const small=actions.filter(e=>!e.disabled&&!e.closest('.maplibregl-ctrl-attrib-inner')&&!(e.labels?.length&&[...e.labels].some(l=>l.getBoundingClientRect().height>=43.5))&&e.getBoundingClientRect().height<43.5).map(e=>({tag:e.tagName,class:e.className}));
                    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
                    const rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
                    const blend=(f,b)=>{const a=f[3]/255;return [0,1,2].map(i=>f[i]*a+b[i]*(1-a)).concat(255);};
                    const luminance=c=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
                    const failures=new Map();let checked=0;const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
                    while(walker.nextNode()){const n=walker.currentNode,e=n.parentElement;if(!n.textContent.trim()||!e||!visible(e)||['SCRIPT','STYLE','OPTION'].includes(e.tagName)||e.closest('[disabled],[aria-hidden="true"],[inert]'))continue;
                        const style=getComputedStyle(e);let bg=[255,255,255,255],chain=[],p=e,gradient=false;while(p){const s=getComputedStyle(p);if(s.backgroundImage!=='none')gradient=true;chain.unshift(rgb(s.backgroundColor));p=p.parentElement;}if(gradient)continue;
                        for(const c of chain)bg=blend(c,bg);const fg=blend(rgb(style.color),bg);const l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);const size=parseFloat(style.fontSize),large=size>=24||(size>=18.66&&parseInt(style.fontWeight)>=700);checked++;
                        if(ratio<(large?3:4.5)-.03){const key=style.color+' / '+bg.slice(0,3).map(Math.round).join(',');if(!failures.has(key))failures.set(key,{foreground:style.color,background:bg.slice(0,3).map(Math.round),ratio:Math.round(ratio*100)/100,class:e.className});}
                    }
                    const unnamed=actions.filter(e=>['INPUT','SELECT','TEXTAREA'].includes(e.tagName)&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.labels?.length).map(e=>({tag:e.tagName,type:e.type}));
                    return {overflow:document.documentElement.scrollWidth>innerWidth+1,viewport:innerWidth,smallTargets:small.length,smallExamples:small.slice(0,8),unlabeledControls:unnamed,contrastChecked:checked,contrastFailures:[...failures.values()]};
                })()`);
                const file = `${role}-${index}-${width}.png`;
                await session.screenshot(join(run, file));
                report.pages.push({ role, path, width, file, ...metrics });
            }
            console.log(JSON.stringify({ phase, role, path, screenshots: report.pages.filter(p => p.role === role && p.path === path).length }));
            if (role === 'healthcare-a' && /^\/healthcare\/(patients|validations)$/.test(path)) {
                const detail = await session.evaluate("[...document.querySelectorAll('main a[href]')].map(e=>e.getAttribute('href')).find(p=>/^\\/healthcare\\/(patients|validations)\\/[a-f0-9-]{36}$/.test(p))");
                if (detail && !paths.includes(detail)) paths.push(detail);
            }
        }
        if (phase !== 'before') await navigationChecks(role, paths[0]);
        report.errors.push(...session.errors.map(() => ({ role, message: 'Browser application exception' })));
        await session.close(); session = undefined;
    }
    report.verificationPhase = 'exceptions';
    assert.equal(report.errors.length, 0, 'Browser exceptions');
    report.verificationPhase = 'writes';
    assert.equal(proxy.log.filter(r => r.target === 'live-laravel' && !['GET', 'HEAD'].includes(r.method) && !['/login', '/broadcasting/auth'].includes(r.path)).length, 0, 'No clinical or administrative writes');
    if (phase !== 'before') {
        report.verificationPhase = 'metrics';
        assert.equal(report.pages.filter(p => p.overflow || p.unlabeledControls.length || p.contrastFailures.length || p.smallTargets).length, 0, 'UI metric acceptance');
    }
    report.status = 'PASS';
} catch (error) {
    report.status = 'FAIL'; report.failure = { kind: error.name, message: 'Details withheld to avoid credential or clinical exposure.' };
} finally {
    report.nonReadRequests = proxy.log.filter(r => !['GET', 'HEAD'].includes(r.method)).map(r => ({method:r.method, path:r.path.replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/g,'[id]'), target:r.target, status:r.status}));
    if (session) await session.close();
    await proxy.close();
    report.publishedAssetsUnchanged = await ownerAssetDigest() === before;
    if (!report.publishedAssetsUnchanged) report.status = 'FAIL';
    await writeFile(join(run, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, phase, screenshots: report.pages.length, exceptions: report.errors.length, artifacts: run }));
    process.exitCode = report.status === 'PASS' ? 0 : 1;
}
