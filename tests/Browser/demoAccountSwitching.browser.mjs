import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { readProtectedJson } from './support/protectedInputs.mjs';
import { runProtectedBrowserCheck } from './support/protectedBrowserRun.mjs';
import { readinessModule, browserState, activate } from './helpers/demoAccountBrowserState.mjs';

const origin = 'http://localhost:8080';
const scenarios = ['admin', 'relawan-1', 'healthcare-a', 'relawan-3', 'healthcare-b', 'locked-logout', 'admin-return'];
await runProtectedBrowserCheck(scenarios, async ({ runDir, pass, trackContext }) => {
    let stage = 'protected-inputs';
    try {
        const credentials = (await readProtectedJson('storage/app/private/competition-fixture/credentials.json')).accounts;
        const manifest = JSON.parse(readFileSync('public/build/manifest.json', 'utf8'));
        const module = readinessModule(manifest);
        assert.equal(existsSync('public/hot'), false, 'production assets required');
        const { chromium } = await import('playwright');
        stage = 'launch';
        const context = trackContext(await chromium.launchPersistentContext(join(runDir, 'profile'), {
            executablePath: process.env.RAPID_MIND_CHROME_BIN || '/usr/bin/google-chrome',
            headless: true,
        }));
        let blockedWrites = 0;
        let failLogout = false;
        await context.route('**/*', route => {
            const request = route.request(), url = new URL(request.url());
            if (url.origin !== origin) return route.abort();
            if (failLogout && url.pathname === '/logout') return route.abort();
            if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
                !(request.method() === 'POST' && ['/login', '/logout', '/broadcasting/auth'].includes(url.pathname))) {
                blockedWrites++;
                return route.abort();
            }
            return route.continue();
        });
        const page = context.pages()[0];
        page.setDefaultTimeout(20000);
        const authorizations = [];
        page.on('response', response => {
            if (new URL(response.url()).pathname === '/relawan/offline-enrollment-status') authorizations.push(response.status());
        });
        stage = 'initial-login-page';
        await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
        const assets = [manifest['resources/js/app.ts'].file, module.url.replace('/build/', ''), ...Object.values(manifest).filter(item => /\/(RelawanLayout|sessionRecovery)-[^/]+\.js$/.test(item.file)).map(item => item.file), 'serviceWorker.js'];
        stage = 'served-assets';
        const assetHashes = {};
        for (const file of assets) {
            const response = await context.request.get(`${origin}/build/${file}`);
            assert.equal(response.status(), 200);
            const hash = buffer => createHash('sha256').update(buffer).digest('hex');
            assert.equal(hash(await response.body()), hash(readFileSync(`public/build/${file}`)), 'served asset matches');
            assetHashes[file] = hash(await response.body());
        }
        const appScript = page.locator(`script[src$="/${assets[0]}"]`);
        assert.equal(await appScript.count(), 1);
        const secrets = {};
        const paths = { ADMIN: '/admin/summary', RELAWAN: '/relawan/home', HEALTHCARE: '/healthcare/emergencies' };
        async function login(alias) {
            stage = `login-${alias}`;
            const role = alias === 'admin' ? 'ADMIN' : alias.startsWith('relawan') ? 'RELAWAN' : 'HEALTHCARE';
            await activate(page.locator(`[data-demo-account="${alias}"]`));
            assert.equal(await page.locator('#email').inputValue(), credentials[alias].email);
            await page.locator('#password').fill(credentials[alias].password);
            const responsePromise = page.waitForResponse(response => response.url() === origin + paths[role] && response.status() === 200 && (response.headers()['content-type'] ?? '').includes('json'));
            await activate(page.locator('button[type="submit"]'));
            stage = `role-route-${alias}`;
            await page.waitForURL(origin + paths[role]);
            await page.waitForLoadState('networkidle');
            stage = `server-identity-${alias}`;
            const user = (await (await responsePromise).json()).props.auth.user;
            assert.equal(user.email, credentials[alias].email);
            assert.equal(user.role, role);
            return user;
        }
        async function logout(user, relawan = false) {
            stage = `logout-${user.role}`;
            if (relawan) await activate(page.getByRole('button', { name: 'Logout Relawan', exact: true }));
            else {
                await activate(page.locator('header button').filter({ hasText: user.name }));
                await activate(page.getByRole('button', { name: 'Keluar Akun', exact: true }));
            }
            await checkLoggedOut();
        }
        async function checkLoggedOut() {
            await page.waitForURL(`${origin}/login`);
            stage = 'logout-key-state';
            const state = await browserState(page, module);
            assert.ok(Object.values(state.ready).every(value => !value), 'all clinical keys locked');
            if (state.owner) assert.equal(state.logoutPending, true);
            stage = 'logout-server-denial';
            const denied = await context.request.get(`${origin}/relawan/home`, { headers: { Accept: 'application/json' }, maxRedirects: 0 });
            assert.equal(denied.status(), 401);
            return state;
        }
        for (const alias of scenarios.slice(0, 5)) {
            const user = await login(alias);
            stage = `workspace-${alias}`;
            let before;
            if (user.role === 'RELAWAN') {
                await page.locator('#offline-key-title').waitFor();
                const locked = await browserState(page, module);
                assert.equal(locked.owner, user.id);
                assert.equal(locked.logoutPending, false);
                assert.ok(Object.values(locked.ready).every(value => !value));
                secrets[alias] = { passphrase: randomBytes(24).toString('base64url') };
                await page.getByLabel('Frasa sandi offline', { exact: true }).fill(secrets[alias].passphrase);
                await page.getByLabel('Ulangi frasa sandi', { exact: true }).fill(secrets[alias].passphrase);
                await activate(page.getByRole('button', { name: 'Daftarkan kunci', exact: true }));
                await page.locator('output').waitFor();
                secrets[alias].recoveryCode = await page.locator('output').innerText();
                writeFileSync(join(runDir, 'enrollment-private.json'), JSON.stringify(secrets), { mode: 0o600 });
                stage = `pending-${alias}`;
                const pending = await browserState(page, module);
                assert.equal(pending.modes.find(m => m.owner === user.id)?.mode, 'ENROLLMENT_PENDING');
                assert.equal(pending.ready[user.id], false);
                stage = `confirm-${alias}`;
                const requests = authorizations.length;
                await activate(page.getByRole('button', { name: 'Saya sudah menyimpan kode', exact: true }));
                await page.getByRole('button', { name: 'Logout Relawan', exact: true }).waitFor();
                stage = `unlocked-${alias}`;
                await page.waitForFunction(async owner => {
                    const db = await new Promise(resolve => { const r = indexedDB.open('RapidMindOfflineDB'); r.onsuccess = () => resolve(r.result); });
                    try { return await new Promise(resolve => { const r = db.transaction('encryptedStaging').objectStore('encryptedStaging').get(`ownerProfiles:${owner}:${owner}`); r.onsuccess = () => resolve(!!r.result); }); } finally { db.close(); }
                }, user.id);
                before = await browserState(page, module);
                assert.equal(before.modes.find(m => m.owner === user.id)?.mode, 'ENCRYPTED');
                assert.equal(before.ready[user.id], true);
                assert.equal(before.ready[user.id === 36 ? 38 : 36], false);
                assert.equal(await page.getByRole('heading', { name: user.name, exact: true }).count(), 1);
                assert.ok(authorizations.length > requests && authorizations.at(-1) === 200);
                assert.ok(Object.entries(before.counts).filter(([name]) => name !== 'encryptedStaging').every(([, count]) => count === 0), 'authentication only: no clinical rows/outbox');
            } else {
                const state = await browserState(page, module);
                assert.ok(Object.values(state.ready).every(value => !value));
                if (state.owner) assert.equal(state.logoutPending, true);
            }
            await logout(user, user.role === 'RELAWAN');
            const after = await browserState(page, module);
            if (before) {
                assert.deepEqual(after.keyFingerprints, before.keyFingerprints, 'wrapped keys preserved');
                assert.deepEqual(after.counts, before.counts, 'local rows preserved');
            }
            pass(alias, 'Normal login, workspace and logout; keys locked after logout.', { owner: user.id });
        }
        // Returning owner requires explicit unlock; reload then verifies locked-gate logout.
        stage = 'locked-logout-start';
        const relawan = await login('relawan-1');
        await page.locator('#offline-key-title').waitFor();
        assert.equal((await browserState(page, module)).ready[relawan.id], false);
        await page.getByLabel('Frasa sandi offline', { exact: true }).fill(secrets['relawan-1'].passphrase);
        await activate(page.getByRole('button', { name: 'Buka data', exact: true }));
        await page.getByRole('button', { name: 'Logout Relawan', exact: true }).waitFor();
        assert.equal((await browserState(page, module)).ready[relawan.id], true);
        await page.reload({ waitUntil: 'networkidle' });
        await page.locator('#offline-key-title').waitFor();
        const retained = await browserState(page, module);
        assert.ok(Object.values(retained.ready).every(value => !value));
        stage = 'offline-gate-logout';
        await context.setOffline(true);
        await activate(page.getByRole('button', { name: 'Keluar', exact: true }));
        await page.getByText('Logout server tertunda hingga perangkat terhubung kembali.').waitFor();
        assert.equal((await browserState(page, module)).logoutPending, true);
        await context.setOffline(false);
        stage = 'failed-server-logout';
        failLogout = true;
        await activate(page.getByRole('button', { name: 'Selesaikan keluar', exact: true }));
        await page.getByText('Logout server belum berhasil. Akses lokal tetap dikunci.').waitFor();
        const failed = await browserState(page, module);
        assert.equal(failed.logoutPending, true);
        assert.ok(Object.values(failed.ready).every(value => !value));
        stage = 'retry-server-logout';
        failLogout = false;
        await activate(page.getByRole('button', { name: 'Selesaikan keluar', exact: true }));
        const final = await checkLoggedOut();
        assert.deepEqual(final.keyFingerprints, retained.keyFingerprints);
        assert.deepEqual(final.counts, retained.counts);
        pass('locked-logout', 'Reload locks keys; offline gate logout, failed server retry and successful retry preserve wrapped keys and row counts.');
        const admin = await login('admin');
        assert.ok(Object.values((await browserState(page, module)).ready).every(value => !value));
        stage = 'no-clinical-writes';
        assert.equal(blockedWrites, 0, 'no clinical mutation attempted');
        pass('admin-return', 'Admin workspace reached again; all clinical keys remain locked.', { owner: admin.id, assetHashes, authorizationStatuses: authorizations, clinicalWrites: 0, interaction: 'visible enabled DOM button activation' });
    } catch { console.error(`Failed stage: ${stage}; raw errors withheld.`); throw new Error('Sanitized browser failure'); }
}, { root: '/tmp/rapid-mind-demo-switching' });
