import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nativeChromeSession } from './helpers/nativeChromeSession.mjs';
import { liveLaravelProxy } from './helpers/liveLaravelProxy.mjs';
import { project, ownerAssetDigest } from './helpers/localPwaBuild.mjs';

const output = process.env.RAPID_MIND_P0_BUILD ?? join(project, 'public/build');
const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
const proxy = await liveLaravelProxy({ output, manifest }, { published: !process.env.RAPID_MIND_P0_BUILD, admin: true });
const artifacts = await mkdtemp(join(tmpdir(), 'rapid-mind-karhutla-'));
const before = await ownerAssetDigest();
const bootstrap = String.raw`<?php require 'vendor/autoload.php';$app=require 'bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();if(!app()->environment('local')||config('app.url')!=='http://localhost:8080')exit(1);echo json_encode(Database\Seeders\Competition\FixtureCredentials::load(false));`;
const accounts = JSON.parse(execFileSync('docker', ['compose', 'exec', '-T', 'app', 'php'], { cwd: project, input: bootstrap, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
const names = ['Posko Patdu Kel. Menteng', 'Posko Patdu Kel. Palangka', 'Posko Patdu Kel. Petuk Katimpun'];
const report = { status: 'RUNNING', artifacts, checks: [], limits: ['Historical positions, fictional clinical cases.', 'Closed proxy blocks external map tiles; no basemap-provider availability acceptance.'] };
let session;
try {
    for (const role of ['admin', 'relawan-1']) {
        report.stage = role + ':login';
        session = await nativeChromeSession({ executable: process.env.RAPID_MIND_CHROME_BIN, profile: join(artifacts, role), proxyPort: proxy.port });
        await session.goto('/login', "!!document.querySelector('#email')");
        await session.fill('#email', accounts[role].email);
        await session.fill('#password', accounts[role].password);
        await session.evaluate("document.querySelector('form').requestSubmit()");
        await session.wait("!location.pathname.startsWith('/login') && !!document.querySelector('main')");
        if (role === 'admin') {
            report.stage = 'map names';
            await session.goto('/admin/map', "location.pathname === '/admin/map' && !!document.querySelector('main')");
            for (const name of names) await session.text(name);
            report.stage = 'map server props';
            const response = await session.jsonRequest('/admin/map');
            assert.equal(response.status, 200);
            assert.equal(response.data.props.shelters.length, 3);
            for (const row of response.data.props.shelters) {
                assert.ok(names.includes(row.name));
                assert.ok(Number(row.latitude) > -2.4 && Number(row.latitude) < -2.0);
                assert.ok(Number(row.longitude) > 113.7 && Number(row.longitude) < 114.1);
            }
            report.stage = 'map marker positioning';
            await session.wait("document.querySelectorAll('.maplibregl-marker').length >= 3");
            await session.evaluate('new Promise(resolve=>setTimeout(resolve,900))');
            const markers = await session.evaluate("[...document.querySelectorAll('.maplibregl-marker')].map(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})");
            assert.ok(markers.length >= 3 && markers.every(Boolean), 'Map fits Palangka Raya markers into the viewport');
            await session.screenshot(join(artifacts, 'admin-map-palangka-raya.png'));
            report.checks.push('Admin map contains the three named Posko and Palangka Raya coordinates; markers fit visible viewport');
        } else {
            await session.text(names[0]);
            assert.equal(await session.evaluate("!!document.querySelector('#offline-key-title')"), false);
            await session.screenshot(join(artifacts, 'relawan-menteng.png'));
            report.checks.push('Existing Relawan account retains Menteng assignment and dashboard remains available while locked');
        }
        assert.equal(session.errors.length, 0);
        await session.close(); session = undefined;
    }
    report.status = 'PASS';
} catch (error) {
    report.status = 'FAIL';
    report.failure = { kind: error.name, location: String(error.stack).split('\n').filter(line=>line.includes('karhutlaGeography.browser.mjs:')).slice(0,1) };
    if (session && !await session.evaluate("!!document.querySelector('input[type=password]')")) await session.screenshot(join(artifacts, 'failure.png'));
} finally {
    if (session) await session.close();
    await proxy.close();
    report.assetsUnchanged = await ownerAssetDigest() === before;
    if (!report.assetsUnchanged) report.status = 'FAIL';
    await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    process.exitCode = report.status === 'PASS' ? 0 : 1;
}
