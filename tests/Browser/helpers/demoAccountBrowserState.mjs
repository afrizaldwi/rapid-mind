import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Read-only checks against the actually served build; no key/session installation.
export function readinessModule(manifest) {
    const entry = Object.values(manifest).find(item => /\/relawanContinuity-[^/]+\.js$/.test(item.file));
    assert.ok(entry, 'shared clinical runtime chunk');
    const source = readFileSync(`public/build/${entry.file}`, 'utf8');
    const name = source.match(/function (\w+)\(\w+\)\{[^{}]{0,140}\.unlocked===!0\}/)?.[1];
    const exported = source.slice(source.lastIndexOf('export{')).match(new RegExp(`[,\\{]${name} as (\\w+)[,}]`))?.[1];
    assert.ok(name && exported, 'clinical readiness export must be identifiable');
    return { url: `/build/${entry.file}`, exported };
}

export async function browserState(page, module, owners = [36, 38]) {
    return page.evaluate(async ({ module, owners }) => {
        const runtime = await import(module.url);
        const ready = Object.fromEntries(owners.map(owner => [owner, runtime[module.exported](owner)]));
        if (!(await indexedDB.databases()).some(db => db.name === 'RapidMindOfflineDB')) return { ready };
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('RapidMindOfflineDB');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('storage read failed'));
        });
        const rows = name => new Promise((resolve, reject) => {
            const request = db.transaction(name, 'readonly').objectStore(name).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('storage read failed'));
        });
        try {
            const continuity = (await rows('relawanContinuity'))[0];
            const modes = (await rows('ownerEncryptionModes')).map(m => ({ owner: m.owner_user_id, mode: m.mode }));
            const keyFingerprints = {};
            for (const key of await rows('offlineKeys')) {
                const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(key)));
                keyFingerprints[key.owner_user_id] = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
            }
            const counts = {};
            for (const name of ['patients', 'patientSnapshots', 'assessments', 'emergencies', 'outbox', 'encryptedStaging', 'encryptedOutboxIndex']) {
                counts[name] = await new Promise((resolve, reject) => {
                    const request = db.transaction(name, 'readonly').objectStore(name).count();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(new Error('storage count failed'));
                });
            }
            return { ready, owner: continuity?.owner_user_id ?? null, logoutPending: continuity?.logout_pending ?? null, modes, keyFingerprints, counts };
        } finally { db.close(); }
    }, { module, owners });
}

// This environment's trusted input intermittently returns without a DOM click.
// Use the existing visible/enabled button's normal DOM activation; never invoke
// enrollment functions, mutate IndexedDB, or fabricate a successful response.
export async function activate(button) {
    await button.waitFor({ state: 'visible' });
    assert.equal(await button.isEnabled(), true, 'button enabled');
    await button.evaluate(element => element.click());
}
