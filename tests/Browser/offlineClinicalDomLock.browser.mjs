import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
    mkdtemp,
    readFile,
    realpath,
    rm,
    symlink,
    writeFile,
} from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const projectRoot = resolve(import.meta.dirname, "../..");
const tempRoot = await realpath(
    await mkdtemp(join(tmpdir(), "rapid-mind-clinical-dom-isolated-")),
);
const profile = join(tempRoot, "chrome-profile");
const buildRoot = resolve(tempRoot, "build");
const configPath = join(tempRoot, "vite.fixture.mjs");
const inside = (parent, child) => {
    const path = relative(parent, child);
    return (
        path === "" ||
        (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))
    );
};
const replaceOnce = (source, original, replacement) => {
    if (source.split(original).length !== 2)
        throw new Error(`Unexpected Vite config: ${original}`);
    return source.replace(original, replacement);
};
let vite;
let context;
let staticServer;
const open = async () => {
    context = await chromium.launchPersistentContext(profile, {
        executablePath:
            process.env.RAPID_MIND_CHROME_BIN ?? "/usr/bin/google-chrome",
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${origin}/tests/Browser/stagingBlank.html`);
    return page;
};
const route = async (page, path) => {
    await page.evaluate((pathname) => {
        const target = document.createElement("div");
        target.id = "offline-state";
        document.body.replaceChildren(target);
        history.pushState({}, "", pathname);
        void import("/resources/js/offline/bootstrap.ts");
    }, path);
};
const visible = (page, value) =>
    page.evaluate((text) => document.body.innerText.includes(text), value);

// Real repositories + SyncManager, mocked transport, synthetic profile only.
async function assertTimeoutPreservation(owner) {
    const tab = await context.newPage();
    await tab.goto(`${origin}/tests/Browser/stagingBlank.html`);
    const result = await tab.evaluate(async (owner) => {
        const { createLocalEmergency } =
            await import("/resources/js/offline/emergencyWorkflow.ts");
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        const { emergencyRepository } =
            await import("/resources/js/offline/emergencyRepository.ts");
        const { syncManager } =
            await import("/resources/js/offline/syncManager.ts");
        const { emergencyDeliveryStatus } =
            await import("/resources/js/lib/emergencyDelivery.ts");
        if (owner === 101) {
            const { unlockOwnerKey } =
                await import("/resources/js/offline/offlineEncryptionStaging.ts");
            const { installClinicalKey } =
                await import("/resources/js/offline/encryptedClinicalStorage.ts");
            await installClinicalKey(
                await unlockOwnerKey(
                    owner,
                    "frasa sandi sintetik panjang untuk relawan",
                    "passphrase",
                ),
            );
        }
        const meta = document.createElement("meta");
        meta.name = "csrf-token";
        meta.content = "synthetic-only";
        document.head.append(meta);
        const id = await createLocalEmergency(owner, {
            redFlagType: "MEDICAL_CRISIS",
        });
        const list = outboxRepository.list.bind(outboxRepository);
        // Leave older fixtures intact and exercise only this test's new event.
        outboxRepository.list = async (active) =>
            (await list(active)).filter((item) => item.entity_id === id);
        const before = (await list(owner)).find(
            (item) => item.entity_id === id,
        );
        const fetchOriginal = window.fetch;
        let lateResponse;
        let aborted = false;
        let requests = 0;
        window.fetch = async (_url, options) => {
            requests++;
            options.signal.addEventListener("abort", () => {
                aborted = true;
            });
            return await new Promise((resolve) => {
                lateResponse = resolve;
            });
        };
        const lease = syncManager.setOwner(owner);
        try {
            const pending = syncManager.sync(owner);
            while (!lateResponse)
                await new Promise((resolve) => setTimeout(resolve, 10));
            const during = await emergencyRepository.get(owner, id);
            await pending; // Actual production deadline, no test-only timeout override.
            const after = await outboxRepository.get(owner, before.id);
            const failed = await emergencyRepository.get(owner, id);
            lateResponse(new Response(JSON.stringify({ emergency: { id } })));
            await new Promise((resolve) => setTimeout(resolve, 30));
            const afterLate = await outboxRepository.get(owner, before.id);
            let retryBody;
            window.fetch = async (_url, options) => {
                retryBody = options.body;
                return new Response(
                    JSON.stringify({
                        emergency: { id },
                        realtime_delivered: false,
                    }),
                );
            };
            await syncManager.sync(owner);
            const accepted = await emergencyRepository.get(owner, id);
            return {
                aborted,
                requests,
                during: during.sync_state,
                preserved: !!after && !!afterLate,
                sameId: after.id === before.id && after.entity_id === id,
                sameRevision: after.revision === before.revision,
                samePayload:
                    JSON.stringify(after.payload) ===
                    JSON.stringify(before.payload),
                priority: after.priority,
                failed: failed.sync_state,
                error: after.last_error,
                retrySameBody: retryBody === JSON.stringify(before.payload),
                removedAfterCanonical: !(await outboxRepository.get(
                    owner,
                    before.id,
                )),
                accepted: accepted.sync_state,
                realtime: accepted.realtime_status,
                display: emergencyDeliveryStatus(accepted),
            };
        } finally {
            syncManager.clearOwner(lease);
            window.fetch = fetchOriginal;
            outboxRepository.list = list;
        }
    }, owner);
    assert.equal(result.aborted, true);
    assert.equal(result.requests, 1);
    assert.equal(result.during, "SYNCING");
    assert.equal(result.preserved, true);
    assert.equal(result.sameId, true);
    assert.equal(result.sameRevision, true);
    assert.equal(result.samePayload, true);
    assert.equal(result.priority, 1);
    assert.equal(result.failed, "SYNC_FAILED");
    assert.match(result.error, /Penerimaan server belum terkonfirmasi/);
    assert.equal(result.retrySameBody, true);
    assert.equal(result.removedAfterCanonical, true);
    assert.equal(result.accepted, "SYNCED");
    assert.equal(result.realtime, "UNAVAILABLE");
    assert.match(result.display.realtime, /Healthcare belum terkonfirmasi/);
    await tab.close();
    console.log(
        `PASS: owner ${owner} timeout preserves T0, ID, revision, payload and priority; late response ignored; canonical replay reconciles`,
    );
}

try {
    if (
        !inside(tempRoot, buildRoot) ||
        inside(await realpath(projectRoot), buildRoot)
    ) {
        throw new Error(`Unsafe fixture build output: ${buildRoot}`);
    }
    let config = await readFile(join(projectRoot, "vite.config.js"), "utf8");
    config = replaceOnce(
        config,
        "export default defineConfig({",
        `export default defineConfig({\n    build: { outDir: ${JSON.stringify(buildRoot)}, emptyOutDir: true },`,
    );
    config = replaceOnce(
        config,
        "refresh: true,",
        `refresh: true,\n            hotFile: ${JSON.stringify(join(tempRoot, "vite.hot"))},`,
    );
    config = replaceOnce(
        config,
        'new URL("./public/build/manifest.json", import.meta.url)',
        JSON.stringify(join(buildRoot, "manifest.json")),
    );
    config = replaceOnce(
        config,
        'new URL("./public/manifest.webmanifest", import.meta.url)',
        JSON.stringify(join(projectRoot, "public/manifest.webmanifest")),
    );
    await symlink(
        join(projectRoot, "node_modules"),
        join(tempRoot, "node_modules"),
        "dir",
    );
    await writeFile(configPath, config);
    const build = spawn(
        join(projectRoot, "node_modules/.bin/vite"),
        ["build", "--mode", "staging-fixture", "--config", configPath],
        { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    let buildOutput = "";
    for (const stream of [build.stdout, build.stderr]) {
        stream.on("data", (chunk) => {
            buildOutput += chunk;
        });
    }
    const buildExit = await new Promise((resolveExit, reject) => {
        build.once("error", reject);
        build.once("exit", resolveExit);
    });
    if (buildExit !== 0)
        throw new Error(`Isolated fixture build failed:\n${buildOutput}`);
    for (const asset of ["manifest.json", "offline.html", "serviceWorker.js"]) {
        await readFile(join(buildRoot, asset));
    }
    vite = spawn(
        join(projectRoot, "node_modules/.bin/vite"),
        [
            "--config",
            configPath,
            "--mode",
            "staging-fixture",
            "--host",
            "127.0.0.1",
            "--port",
            String(port),
            "--strictPort",
        ],
        { cwd: projectRoot, stdio: "ignore" },
    );
    let ready = false;
    for (let i = 0; i < 60; i++) {
        try {
            if ((await fetch(`${origin}/tests/Browser/stagingBlank.html`)).ok) {
                ready = true;
                break;
            }
        } catch {
            /* isolated Vite startup */
        }
        await delay(250);
    }
    if (!ready) throw new Error("Isolated Vite server did not start");
    let page = await open();
    const setup = await page.evaluate(async () => {
        const { seedSyntheticV4 } =
            await import("/tests/Browser/offlineStagingFixture.ts");
        await seedSyntheticV4();
        const { prepareOwnerKey, stageOwnerPlaintext, activateSyntheticOwner } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const { installClinicalKey } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        const { emergencyRepository } =
            await import("/resources/js/offline/emergencyRepository.ts");
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        const created = await prepareOwnerKey(
            101,
            "frasa sandi sintetik panjang untuk relawan",
        );
        await stageOwnerPlaintext(created.session);
        await activateSyntheticOwner(created.session);
        await installClinicalKey(created.session);
        await emergencyRepository.save(101, {
            id: "emergency-101",
            red_flag_type: "PSYCHOSIS",
            status: "PENDING",
            patient_name: "Nama T0 Sintetis",
            notes: "Catatan darurat sintetis",
        });
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Relawan Sintetis" },
            true,
        );
        return { recoveryCode: created.recoveryCode };
    });

    await assertTimeoutPreservation(101);
    await route(page, "/relawan/assessment/assessment-101/srq");
    await page.getByText("Penyintas Sintetis", { exact: true }).waitFor();
    assert.equal(await visible(page, "0000000000000101"), true);
    assert.equal(await visible(page, "1 dari 20 Terjawab"), true);
    const beforeLock = await page.evaluate(() => ({
        patient: document.body.innerText.includes("Penyintas Sintetis"),
        nik: document.body.innerText.includes("0000000000000101"),
        assessment: document.body.innerText.includes("1 dari 20 Terjawab"),
    }));
    assert.deepEqual(beforeLock, {
        patient: true,
        nik: true,
        assessment: true,
    });

    const immediateLock = await page.evaluate(async () => {
        const { lockIsolatedOwner } =
            await import("/resources/js/offline/offlineKeyWorkflow.ts");
        lockIsolatedOwner();
        return {
            patient: document.body.innerText.includes("Penyintas Sintetis"),
            nik: document.body.innerText.includes("0000000000000101"),
            assessment: document.body.innerText.includes("1 dari 20 Terjawab"),
        };
    });
    assert.deepEqual(immediateLock, {
        patient: false,
        nik: false,
        assessment: false,
    });
    await page
        .getByRole("heading", { name: "Kunci data klinis offline" })
        .waitFor();
    const afterUnmount = await page.locator("body").textContent();
    for (const secret of [
        "Penyintas Sintetis",
        "0000000000000101",
        "1 dari 20 Terjawab",
    ])
        assert.equal(afterUnmount.includes(secret), false);
    const lockedRepositories = await page.evaluate(async () => {
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        const failures = [];
        for (const operation of [
            () => patientRepository.get(101, "patient-101"),
            () =>
                patientRepository.save(101, {
                    id: "patient-101",
                    name: "Tidak boleh tersimpan",
                }),
            () => outboxRepository.list(101),
        ]) {
            try {
                await operation();
                failures.push(false);
            } catch {
                failures.push(true);
            }
        }
        return failures;
    });
    assert.deepEqual(lockedRepositories, [true, true, true]);
    await page
        .getByRole("heading", {
            name: "Butuh bantuan darurat saat data terkunci?",
        })
        .waitFor();
    assert.equal(await visible(page, "Jangan menunggu data terbuka"), true);
    assert.equal(
        await page.getByRole("button", { name: /KIRIM T0/i }).count(),
        0,
    );
    assert.equal(await page.locator('a[href^="sms:"]').count(), 0);
    console.log(
        "PASS: assessment name, NIK, and answers visible before lock; immediate mask, DOM unmount, and read/write rejection after lock",
    );

    await page.getByLabel("Frasa sandi offline").fill("frasa yang salah");
    await page.getByRole("button", { name: "Buka data" }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await visible(page, "Penyintas Sintetis"), false);
    await page
        .getByLabel("Frasa sandi offline")
        .fill("frasa sandi sintetik panjang untuk relawan");
    await page.getByRole("button", { name: "Buka data" }).click();
    await page.getByText("Penyintas Sintetis", { exact: true }).waitFor();
    assert.equal(await visible(page, "0000000000000101"), true);
    const intact = await page.evaluate(async () => {
        const { emergencyRepository } =
            await import("/resources/js/offline/emergencyRepository.ts");
        const { outboxRepository } =
            await import("/resources/js/offline/outboxRepository.ts");
        return {
            emergency: await emergencyRepository.get(101, "emergency-101"),
            outbox: await outboxRepository.get(101, 7),
        };
    });
    assert.equal(intact.emergency.notes, "Catatan darurat sintetis");
    assert.equal(intact.outbox.priority, 1);
    assert.equal(intact.outbox.status, "PENDING");
    console.log(
        "PASS: wrong passphrase stays masked; correct passphrase restores owner content and pending T0/outbox remain intact",
    );

    const replaced = await page.evaluate(async () => {
        const { unlockOwnerKey } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const { installClinicalKey, clinicalKeyVersion } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        window.oldClinicalRoot = document.querySelector(
            ".min-h-screen.flex.flex-col",
        );
        const before = clinicalKeyVersion();
        await installClinicalKey(
            await unlockOwnerKey(
                101,
                "frasa sandi sintetik panjang untuk relawan",
                "passphrase",
            ),
        );
        return { before, after: clinicalKeyVersion() };
    });
    assert.ok(replaced.after > replaced.before);
    await page.waitForFunction(
        () => window.oldClinicalRoot && !window.oldClinicalRoot.isConnected,
    );
    await page.getByText("Penyintas Sintetis", { exact: true }).waitFor();
    console.log(
        "PASS: same-owner session replacement remounts the clinical view",
    );

    const emergencyTab = await context.newPage();
    await emergencyTab.goto(`${origin}/tests/Browser/stagingBlank.html`);
    await route(emergencyTab, "/relawan/emergencies/emergency-101");
    await emergencyTab
        .getByRole("heading", { name: "Kunci data klinis offline" })
        .waitFor();
    await emergencyTab
        .getByLabel("Frasa sandi offline")
        .fill("frasa sandi sintetik panjang untuk relawan");
    await emergencyTab.getByRole("button", { name: "Buka data" }).click();
    await emergencyTab.getByText("Nama T0 Sintetis").waitFor();
    assert.equal(await visible(emergencyTab, "Catatan darurat sintetis"), true);
    const sms = await emergencyTab
        .locator('a[href^="sms:"]')
        .getAttribute("href");
    assert.ok(sms.startsWith("sms:?body="));
    assert.doesNotMatch(
        decodeURIComponent(sms),
        /119|Nama T0 Sintetis|Catatan darurat sintetis|PSYCHOSIS/,
    );
    assert.equal(await visible(emergencyTab, "tidak mengirim otomatis"), true);
    assert.equal(
        await visible(emergencyTab, "Penerimaan server belum terkonfirmasi"),
        true,
    );
    await page.evaluate(async () => {
        const { announceSyntheticModeActivation } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        announceSyntheticModeActivation(101);
    });
    await emergencyTab
        .getByRole("heading", { name: "Kunci data klinis offline" })
        .waitFor();
    assert.equal(await visible(emergencyTab, "Nama T0 Sintetis"), false);
    assert.equal(
        (await emergencyTab.locator("body").textContent()).includes(
            "Catatan darurat sintetis",
        ),
        false,
    );
    await emergencyTab.getByLabel("Metode pembukaan").selectOption("recovery");
    await emergencyTab
        .getByRole("textbox", { name: "Kode pemulihan" })
        .fill(setup.recoveryCode);
    await emergencyTab.getByRole("button", { name: "Buka data" }).click();
    await emergencyTab.getByText("Nama T0 Sintetis").waitFor();
    console.log(
        "PASS: broadcast masks emergency details in another tab; recovery code restores correct-owner content",
    );

    const raceTab = await context.newPage();
    await raceTab.goto(`${origin}/tests/Browser/stagingBlank.html`);
    await raceTab.evaluate(async () => {
        const { unlockOwnerKey } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const { installClinicalKey } =
            await import("/resources/js/offline/encryptedClinicalStorage.ts");
        const { patientRepository } =
            await import("/resources/js/offline/patientRepository.ts");
        await installClinicalKey(
            await unlockOwnerKey(
                101,
                "frasa sandi sintetik panjang untuk relawan",
                "passphrase",
            ),
        );
        const original = patientRepository.get.bind(patientRepository);
        let delayed = false;
        patientRepository.get = async (...args) => {
            const result = await original(...args);
            if (!delayed) {
                delayed = true;
                window.patientReadPending = true;
                await new Promise((resolve) => {
                    window.releasePatientRead = resolve;
                });
            }
            return result;
        };
    });
    await route(raceTab, "/relawan/assessment/assessment-101/srq");
    await raceTab.waitForFunction(() => window.patientReadPending === true);
    const raceImmediate = await raceTab.evaluate(async () => {
        const { lockIsolatedOwner } =
            await import("/resources/js/offline/offlineKeyWorkflow.ts");
        lockIsolatedOwner();
        window.releasePatientRead();
        return document.body.innerText.includes("Penyintas Sintetis");
    });
    assert.equal(raceImmediate, false);
    await raceTab
        .getByRole("heading", { name: "Kunci data klinis offline" })
        .waitFor();
    assert.equal(
        (await raceTab.locator("body").textContent()).includes(
            "Penyintas Sintetis",
        ),
        false,
    );
    await raceTab
        .getByLabel("Frasa sandi offline")
        .fill("frasa sandi sintetik panjang untuk relawan");
    await raceTab.getByRole("button", { name: "Buka data" }).click();
    await raceTab.getByText("Penyintas Sintetis", { exact: true }).waitFor();
    console.log(
        "PASS: delayed decrypted read cannot mount stale clinical props after lock",
    );

    await emergencyTab.evaluate(async () => {
        const { lockRelawanContinuity } =
            await import("/resources/js/offline/relawanContinuity.ts");
        await lockRelawanContinuity();
    });
    await emergencyTab
        .getByRole("heading", { name: "Akses lokal dikunci" })
        .waitFor();
    assert.equal(await visible(emergencyTab, "Nama T0 Sintetis"), false);
    assert.equal(
        (await emergencyTab.locator("body").textContent()).includes(
            "Catatan darurat sintetis",
        ),
        false,
    );
    console.log("PASS: logout removes rendered emergency content");

    await raceTab.evaluate(async () => {
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Relawan Sintetis" },
            true,
        );
    });
    await raceTab.goto(`${origin}/tests/Browser/stagingBlank.html`);
    await raceTab.evaluate(async () => {
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Relawan Sintetis" },
            true,
        );
    });
    await route(raceTab, "/relawan/assessment/assessment-101/srq");
    await raceTab
        .getByRole("heading", { name: "Kunci data klinis offline" })
        .waitFor();
    await raceTab
        .getByLabel("Frasa sandi offline")
        .fill("frasa sandi sintetik panjang untuk relawan");
    await raceTab.getByRole("button", { name: "Buka data" }).click();
    await raceTab.getByText("Penyintas Sintetis", { exact: true }).waitFor();
    await raceTab.evaluate(async () => {
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        await recordVerifiedRelawan(
            { id: 102, role: "RELAWAN", name: "Akun Lain Sintetis" },
            true,
        );
    });
    await raceTab
        .getByRole("heading", { name: "Akses lokal dikunci" })
        .waitFor();
    assert.equal(await visible(raceTab, "Penyintas Sintetis"), false);
    console.log(
        "PASS: owner switch removes prior owner's rendered clinical content",
    );

    const legacyTab = await context.newPage();
    await legacyTab.goto(`${origin}/tests/Browser/stagingBlank.html`);
    await route(legacyTab, "/relawan/home");
    await legacyTab.getByRole("link", { name: "Beranda" }).waitFor();
    assert.equal(
        (await legacyTab.getByRole("link", { name: "Data" }).count()) > 0,
        true,
    );
    console.log(
        "PASS: legacy Relawan owner retains ordinary navigation without a blocking encrypted gate",
    );
    await assertTimeoutPreservation(102);
    await raceTab.evaluate(async () => {
        const { prepareOwnerKey, stageOwnerPlaintext, activateSyntheticOwner } =
            await import("/resources/js/offline/offlineEncryptionStaging.ts");
        const created = await prepareOwnerKey(
            102,
            "frasa sandi sintetik pemilik kedua yang kuat",
        );
        await stageOwnerPlaintext(created.session);
        await activateSyntheticOwner(created.session);
    });
    await legacyTab
        .getByRole("heading", { name: "Kunci data klinis offline" })
        .waitFor();
    assert.equal(
        await legacyTab.getByRole("link", { name: "Beranda" }).count(),
        0,
    );
    console.log(
        "PASS: cross-tab mode activation replaces a previously rendered legacy view with the encrypted-owner gate",
    );

    await raceTab.evaluate(async () => {
        const { recordVerifiedRelawan } =
            await import("/resources/js/offline/relawanContinuity.ts");
        await recordVerifiedRelawan(
            { id: 101, role: "RELAWAN", name: "Relawan Sintetis" },
            true,
        );
    });
    vite.kill("SIGTERM");
    await new Promise((resolveExit) => {
        if (vite.exitCode !== null) resolveExit();
        else vite.once("exit", resolveExit);
    });
    const publicRoot = join(projectRoot, "public");
    staticServer = createHttpServer(async (request, response) => {
        const pathname = decodeURIComponent(
            new URL(request.url, origin).pathname,
        );
        const file = pathname.startsWith("/build/")
            ? resolve(buildRoot, `.${pathname.slice("/build".length)}`)
            : resolve(publicRoot, `.${pathname}`);
        const allowed =
            (pathname.startsWith("/build/") && inside(buildRoot, file)) ||
            ["/pwa-192.png", "/pwa-512.png"].includes(pathname);
        if (!allowed) {
            response.writeHead(403).end();
            return;
        }
        try {
            const body = await readFile(file);
            const mime =
                {
                    ".js": "text/javascript",
                    ".mjs": "text/javascript",
                    ".css": "text/css",
                    ".html": "text/html",
                    ".png": "image/png",
                    ".svg": "image/svg+xml",
                    ".wasm": "application/wasm",
                    ".webmanifest": "application/manifest+json",
                }[extname(file)] ?? "application/octet-stream";
            response
                .writeHead(200, {
                    "Content-Type": mime,
                    ...(pathname === "/build/serviceWorker.js"
                        ? { "Service-Worker-Allowed": "/relawan/" }
                        : {}),
                })
                .end(body);
        } catch {
            response.writeHead(404).end();
        }
    });
    await new Promise((resolveListen) =>
        staticServer.listen(port, "127.0.0.1", resolveListen),
    );
    await raceTab.evaluate(async () => {
        const registration = await navigator.serviceWorker.register(
            "/build/serviceWorker.js",
            { scope: "/relawan/" },
        );
        if (!registration.active) {
            const worker = registration.installing ?? registration.waiting;
            if (!worker)
                throw new Error("Fixture Service Worker did not install");
            await new Promise((resolve, reject) => {
                worker.addEventListener("statechange", () => {
                    if (worker.state === "activated") resolve();
                    if (worker.state === "redundant")
                        reject(new Error("Fixture Service Worker failed"));
                });
            });
        }
        if (
            !(await caches.match("/build/offline.html", { ignoreSearch: true }))
        )
            throw new Error("Offline shell was not precached");
    });
    await context.close();
    context = await chromium.launchPersistentContext(profile, {
        executablePath:
            process.env.RAPID_MIND_CHROME_BIN ?? "/usr/bin/google-chrome",
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    await context.setOffline(true);
    const coldPage = context.pages()[0] ?? (await context.newPage());
    await coldPage.goto(`${origin}/relawan/assessment/assessment-101/srq`);
    await coldPage
        .getByRole("heading", { name: "Kunci data klinis offline" })
        .waitFor();
    assert.equal(await visible(coldPage, "Penyintas Sintetis"), false);
    await coldPage
        .getByLabel("Frasa sandi offline")
        .fill("frasa sandi sintetik panjang untuk relawan");
    await coldPage.getByRole("button", { name: "Buka data" }).click();
    await coldPage.getByText("Penyintas Sintetis", { exact: true }).waitFor();
    assert.equal(await visible(coldPage, "0000000000000101"), true);
    console.log(
        "PASS: cold browser reopening with network offline uses cached shell and requires passphrase before clinical DOM appears",
    );

    console.log(
        "PASS: fixture build and Chrome profile stayed in a unique temporary directory",
    );
} finally {
    await context?.close().catch(() => {});
    if (vite && vite.exitCode === null) {
        const exited = new Promise((resolveExit) =>
            vite.once("exit", resolveExit),
        );
        vite.kill("SIGTERM");
        await exited;
    }
    await new Promise(
        (resolveClose) => staticServer?.close(resolveClose) ?? resolveClose(),
    );
    await rm(tempRoot, { recursive: true, force: true });
}
