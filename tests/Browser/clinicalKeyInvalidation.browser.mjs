import assert from "node:assert/strict";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer as createProbe } from "node:net";
import { createServer } from "vite";
import { chromium } from "playwright";

// Reuse the existing B4.3 isolation pattern: unique origin/profile, project
// config with an external hot file, and mocked authenticated synthetic session.
const project = resolve(import.meta.dirname, "../..");
const artifacts = await mkdtemp(join(tmpdir(), "rapid-mind-b43-key-invalidation-"));
const probe = createProbe();
await new Promise((resolve, reject) => probe.once("error", reject).listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const passphrase = "frasa sandi sintetis penerimaan kunci B4.3";
let config = await readFile(join(project, "vite.config.js"), "utf8");
assert.equal(config.split("refresh: true,").length, 2);
config = config.replace("refresh: true,", `refresh: false, hotFile: ${JSON.stringify(join(artifacts, "vite.hot"))},`);
await symlink(join(project, "node_modules"), join(artifacts, "node_modules"));
await symlink(join(project, "public"), join(artifacts, "public"));
const configFile = join(artifacts, "vite.isolated.mjs");
await writeFile(configFile, config);
let server;
let context;
try {
    server = await createServer({
        configFile, root: project, mode: "encrypted-acceptance", logLevel: "error",
        server: { host: "127.0.0.1", port, strictPort: true, origin },
    });
    await server.listen();
    context = await chromium.launchPersistentContext(join(artifacts, "chrome-profile"), {
        executablePath: process.env.RAPID_MIND_CHROME_BIN ?? "/usr/bin/google-chrome",
        headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = context.pages()[0] ?? await context.newPage();
    await page.route("**/relawan/session-status", route => route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ state: "AUTHENTICATED", user: { id: 101, role: "RELAWAN" } }),
    }));
    await page.goto(`${origin}/tests/Browser/stagingBlank.html`);
    await page.evaluate(async () => {
        const fixture = await import("/tests/Browser/clinicalKeyInvalidationFixture.ts");
        await fixture.mountClinicalKeyInvalidationFixture();
    });
    // Exercise legitimate FRESH → pending enrollment through the real gate.
    const passwords = page.locator('input[type="password"]');
    await passwords.nth(0).fill(passphrase);
    await passwords.nth(1).fill(passphrase);
    await page.getByRole("button", { name: "Daftarkan kunci", exact: true }).click();
    await page.getByRole("button", { name: "Saya sudah menyimpan kode" }).click();
    await page.locator("[data-clinical-fixture]").waitFor({ state: "visible" });
    await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        window.savedSyntheticMode = await db.ownerEncryptionModes.get(101);
        await db.ownerEncryptionModes.put({ ...window.savedSyntheticMode, key_identity: "synthetic-invalid-identity" });
    });
    await page.waitForFunction(async () => {
        const { clinicalKeyReady } = await import("/resources/js/offline/encryptedClinicalStorage.ts");
        return !clinicalKeyReady(101) && !document.querySelector("[data-clinical-fixture]");
    });
    await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        await db.ownerEncryptionModes.put(window.savedSyntheticMode);
    });
    await page.getByRole("button", { name: "Buka data", exact: true }).waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-clinical-fixture]").count(), 0);
    assert.equal(await page.evaluate(async () => (await import("/resources/js/offline/encryptedClinicalStorage.ts")).clinicalKeyReady(101)), false);
    await page.locator('input[type="password"]').fill(passphrase);
    await page.getByRole("button", { name: "Buka data", exact: true }).click();
    await page.locator("[data-clinical-fixture]").waitFor({ state: "visible" });
    assert.equal(await page.evaluate(async () => (await import("/resources/js/offline/encryptedClinicalStorage.ts")).clinicalKeyReady(101)), true);

    // Native IDB does not publish Dexie's mutation event. Observe the persisted
    // invalid metadata without triggering an application inspection or repair.
    const rawObservation = await page.evaluate(async () => {
        const { db } = await import("/resources/js/offline/db.ts");
        let mutations = 0;
        const listener = () => mutations++;
        window.addEventListener("x-storagemutated-1", listener);
        await new Promise((resolve, reject) => {
            const tx = db.backendDB().transaction("ownerEncryptionModes", "readwrite");
            tx.objectStore("ownerEncryptionModes").put({ ...window.savedSyntheticMode, key_identity: "native-invalid-identity" });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        await new Promise(resolve => setTimeout(resolve, 250));
        window.removeEventListener("x-storagemutated-1", listener);
        const { clinicalKeyReady } = await import("/resources/js/offline/encryptedClinicalStorage.ts");
        return { mutations, unlocked: clinicalKeyReady(101), visible: !!document.querySelector("[data-clinical-fixture]"), persisted: (await db.ownerEncryptionModes.get(101)).key_identity === "native-invalid-identity" };
    });
    assert.equal(rawObservation.persisted, true);
    assert.equal(rawObservation.mutations, 0);
    // Report cached access as an observation, not a required insecure behavior.
    // Future native-write detection may improve this without breaking the test.
    const result = { origin, artifacts, invalidationAndExplicitUnlock: "PASS", pendingEnrollment: "PASS", nativeWriteObservation: rawObservation };
    await writeFile(join(artifacts, "result.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
} finally {
    await context?.close();
    await server?.close();
    // Keep this run's isolated artifacts for review. No existing profile,
    // database, cache or browser storage is reset or removed.
}
