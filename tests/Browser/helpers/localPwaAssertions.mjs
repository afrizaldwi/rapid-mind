import assert from "node:assert/strict";
import { patientName } from "./localPwaServer.mjs";

export const passphrase = "frasa sandi sintetis checkpoint C1 localhost";
export async function unlock(page, secret = passphrase) {
    await page
        .getByRole("button", { name: "Buka data", exact: true })
        .waitFor();
    await page.locator('input[type="password"]').fill(secret);
    await page.getByRole("button", { name: "Buka data", exact: true }).click();
}

export async function readStorage(page) {
    return page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open("RapidMindOfflineDB");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        try {
            const result = {};
            for (const store of db.objectStoreNames)
                result[store] = await new Promise((resolve, reject) => {
                    const request = db
                        .transaction(store)
                        .objectStore(store)
                        .getAll();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            return result;
        } finally {
            db.close();
        }
    });
}

export async function assertCiphertext(page) {
    const stores = await readStorage(page);
    for (const name of [
        "patients",
        "patientSnapshots",
        "assessments",
        "emergencies",
        "outbox",
    ])
        assert.equal(
            stores[name].length,
            0,
            `${name} must not contain plaintext`,
        );
    assert.ok(
        stores.encryptedStaging.some(
            (row) => row.record_type === "assessments",
        ),
    );
    assert.ok(
        stores.encryptedStaging.some((row) =>
            ["patients", "patientSnapshots"].includes(row.record_type),
        ),
    );
    assert.ok(!JSON.stringify(stores).includes(patientName));
    assert.ok(!JSON.stringify(stores).includes(passphrase));
    const webStorage = await page.evaluate(() =>
        JSON.stringify({
            local: { ...localStorage },
            session: { ...sessionStorage },
        }),
    );
    assert.ok(!webStorage.includes(patientName));
    assert.ok(!webStorage.includes(passphrase));
    return stores;
}

export async function assertPrecacheGraph(page, manifest) {
    const required = new Set([
        "/build/offline.html",
        "/build/manifest.webmanifest",
        "/logo.png",
        "/pwa-192.png",
        "/pwa-512.png",
    ]);
    const visited = new Set();
    function include(key) {
        if (visited.has(key)) return;
        visited.add(key);
        const item = manifest[key];
        for (const file of [
            item.file,
            ...(item.css ?? []),
            ...(item.assets ?? []),
        ])
            required.add(`/build/${file}`);
        for (const dependency of [
            ...(item.imports ?? []),
            ...(item.dynamicImports ?? []),
        ])
            include(dependency);
    }
    include("offline.html");
    const cached = new Set(
        (await assertPrivateCaches(page)).map(
            (item) => new URL(item.url).pathname,
        ),
    );
    for (const path of required)
        assert.ok(cached.has(path), `Missing offline dependency: ${path}`);
}

export async function assertPrivateCaches(page) {
    const entries = await page.evaluate(async () => {
        const entries = [];
        for (const name of await caches.keys()) {
            const cache = await caches.open(name);
            for (const key of await cache.keys()) {
                const response = await cache.match(key);
                const type = response.headers.get("content-type") ?? "";
                entries.push({
                    name,
                    url: key.url,
                    type,
                    body: /html|json/.test(type) ? await response.text() : "",
                });
            }
        }
        return entries;
    });
    assert.ok(
        entries.some(
            (entry) => new URL(entry.url).pathname === "/build/offline.html",
        ),
    );
    assert.ok(
        entries.some((entry) => new URL(entry.url).pathname === "/logo.png"),
    );
    for (const entry of entries) {
        const path = new URL(entry.url).pathname;
        assert.match(path, /^\/(?:build\/|pwa-(?:192|512)\.png|logo\.png)/);
        assert.ok(!entry.body.includes(patientName));
        assert.ok(!entry.body.includes("C1-PRIVATE-JSON"));
        assert.ok(!entry.body.includes(passphrase));
    }
    return entries.map(({ name, url, type }) => ({ name, url, type }));
}
