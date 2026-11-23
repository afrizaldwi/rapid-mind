import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { readCommittedSrqAnswer } from "./helpers/localPwaAssessment.mjs";
import { buildLocalPwa, ownerAssetDigest } from "./helpers/localPwaBuild.mjs";
import {
    checkBackgroundLock,
    checkCrossTabLock,
    checkSessionIdentity,
    checkOwnerSwitch,
} from "./helpers/localPwaLifecycle.mjs";
import {
    localPwaServer,
    origin,
    assessmentPath,
    patientName,
    ownerId,
} from "./helpers/localPwaServer.mjs";
import {
    passphrase,
    unlock,
    readStorage,
    assertCiphertext,
    assertPrivateCaches,
    assertPrecacheGraph,
} from "./helpers/localPwaAssertions.mjs";

let build;
if (process.env.RAPID_MIND_C1_BUILD) {
    const artifacts = resolve(process.env.RAPID_MIND_C1_BUILD);
    assert.match(artifacts, /^\/tmp\/rapid-mind-c1-pwa-[^/]+$/);
    const output = join(artifacts, "build");
    build = {
        artifacts,
        output,
        manifest: JSON.parse(
            await readFile(join(output, "manifest.json"), "utf8"),
        ),
        before: await ownerAssetDigest(),
    };
} else build = await buildLocalPwa();
const run = await mkdtemp(join(build.artifacts, "acceptance-"));
const profile = join(run, "chromium-profile");
const server = await localPwaServer(build);
const results = [];
const errors = [];
let context;
let page;
const pass = (message) => {
    results.push({ status: "PASS", message });
    console.log(`PASS: ${message}`);
};
const notTested = (message) => {
    results.push({ status: "NOT TESTED", message });
    console.log(`NOT TESTED: ${message}`);
};
async function open() {
    context = await chromium.launchPersistentContext(profile, {
        executablePath:
            process.env.RAPID_MIND_CHROME_BIN ?? "/usr/bin/google-chrome",
        headless: process.env.RAPID_MIND_C1_HEADED !== "1",
        serviceWorkers: "allow",
        proxy: {
            server: `http://127.0.0.1:${server.port}`,
            bypass: "<-loopback>",
        },
        args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-background-networking",
            "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        ],
    });
    context.on("page", (tab) =>
        tab.on("pageerror", (error) => errors.push(error.message)),
    );
    page = context.pages()[0] ?? (await context.newPage());
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(20_000);
}
try {
    await open();
    await page.goto(`${origin}/relawan/home`);
    await page
        .getByText("Aplikasi siap dibuka offline.", { exact: false })
        .waitFor();
    assert.equal(new URL(page.url()).origin, origin);
    await page.waitForFunction(
        () => navigator.serviceWorker.controller?.state === "activated",
    );
    await assertPrecacheGraph(page, build.manifest);
    pass(
        "ordinary production assets install, activate, control page, and verify precache at exact localhost origin",
    );
    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill(passphrase);
    await inputs.nth(1).fill(passphrase);
    await page
        .getByRole("button", { name: "Daftarkan kunci", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Saya sudah menyimpan kode" })
        .click();
    await page.getByText("Pilihan Modul Operasional").waitFor();
    pass(
        "ordinary build enrollment uses exact local policy endpoint with synthetic authenticated owner",
    );

    await page.goto(origin + assessmentPath);
    await unlock(page, "frasa sandi yang salah");
    await page
        .getByText("Frasa sandi atau kode pemulihan salah", { exact: false })
        .waitFor();
    assert.equal(await page.getByText(patientName, { exact: true }).count(), 0);
    assert.equal(await page.locator('script[data-page="app"]').count(), 0);
    assert.ok(
        !(await page.locator("body").textContent()).includes(patientName),
    );
    await unlock(page);
    await page.getByText(patientName, { exact: true }).waitFor();
    await assertCiphertext(page);
    const history = await page.evaluate(() => ({
        encrypted: history.state?.page instanceof ArrayBuffer,
        text: JSON.stringify(history.state),
    }));
    assert.equal(history.encrypted, true);
    assert.ok(!history.text.includes(patientName));
    pass(
        "reload requires passphrase; wrong passphrase masks clinical DOM; patient/assessment persist as ciphertext; history is encrypted",
    );

    await page.evaluate(async () => {
        await fetch("/api/c1-private");
        await fetch("/relawan/patients/options");
        await fetch("/login?reauth=1");
    });
    await assertPrivateCaches(page);
    pass(
        "clinical JSON and authentication HTML never enter persistent service-worker caches",
    );

    server.state.offline = true;
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await unlock(page);
    await page.getByText(patientName, { exact: true }).waitFor();
    pass(
        "offline reload resolves encrypted assessment and patient through actual cached shell",
    );
    const readAnswer = () => readCommittedSrqAnswer(page, ownerId, "c1-assessment", 1, passphrase);
    const beforeAnswer = await readAnswer();
    await page
        .locator("#srq-question-1")
        .getByRole("button", { name: "Tidak", exact: true })
        .click();
    let savedAnswer;
    await expect.poll(async () => {
        savedAnswer = await readAnswer();
        return {
            revised: savedAnswer.revision > beforeAnswer.revision,
            changed: savedAnswer.fingerprint !== beforeAnswer.fingerprint,
            answer: savedAnswer.answer,
            syncState: savedAnswer.syncState,
        };
    }, { timeout: 10_000, intervals: [100], message: "Specific encrypted assessment must durably save Q1 = false before browser closure" })
        .toEqual({ revised: true, changed: true, answer: false, syncState: "PENDING_SYNC" });
    pass("specific encrypted assessment commits Q1 = false offline without downloading an STT model");
    await context.close();
    context = undefined;
    await open();
    await context.setOffline(true);
    await page.goto(origin + assessmentPath, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByText(patientName, { exact: true }).count(), 0);
    await unlock(page);
    await page.getByText(patientName, { exact: true }).waitFor();
    await assertCiphertext(page);
    const restoredAnswer = await readAnswer();
    // Local queue metadata can re-encrypt this row without changing its clinical
    // revision. Verify durable clinical content, not randomized ciphertext bytes.
    assert.equal(restoredAnswer.revision, savedAnswer.revision);
    assert.equal(restoredAnswer.answer, false, "Stored Q1 must remain boolean false after cold restart");
    // Patient props render before asynchronous loadDraft() restores answers.
    await expect(page.locator("#srq-question-1").getByRole("button", { name: "Tidak", exact: true }))
        .toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
    pass(
        "cold Chromium restart with network blocked retains ciphertext and requires explicit offline unlock",
    );
    await checkCrossTabLock(context, page, pass);
    await checkBackgroundLock(context, page, pass, notTested);

    await page.goto(`${origin}/relawan/not-an-offline-route`, {
        waitUntil: "domcontentloaded",
    });
    await unlock(page);
    await page.getByText("Halaman tidak tersedia", { exact: true }).waitFor();
    pass("unsupported offline route fails explicitly without deleting storage");

    await context.setOffline(false);
    server.state.offline = false;
    server.state.hang = true;
    const start = Date.now();
    await page.goto(origin + assessmentPath, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
    });
    assert.ok(Date.now() - start < 14_000);
    server.state.session = "REAUTHENTICATION_REQUIRED";
    await unlock(page);
    await page.getByText(patientName, { exact: true }).waitFor();
    await page
        .getByText("Perlu masuk kembali untuk sinkronisasi.", { exact: true })
        .waitFor();
    pass(
        "hanging navigation falls back within deadline; expired synthetic session permits local unlock only",
    );
    server.state.hang = false;
    await checkSessionIdentity(page, server, pass);

    await page.evaluate(() => {
        window.c1OriginalController = navigator.serviceWorker.controller;
    });
    server.state.update = true;
    await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration.update();
    });
    await page.waitForFunction(
        async () =>
            (await navigator.serviceWorker.getRegistration())?.waiting
                ?.state === "installed",
    );
    await page.getByText("Pembaruan tersedia.", { exact: false }).waitFor();
    assert.equal(
        await page.evaluate(
            () =>
                window.c1OriginalController ===
                navigator.serviceWorker.controller,
        ),
        true,
    );
    await assertCiphertext(page);
    pass(
        "updated real worker waits while active clinical page remains on its current controller",
    );
    await checkOwnerSwitch(context, page, server, pass);

    await page
        .getByRole("button", { name: "Logout Relawan", exact: true })
        .click();
    await page.getByText("Akses lokal dikunci", { exact: true }).waitFor();
    assert.equal(await page.getByText(patientName, { exact: true }).count(), 0);
    const stores = await readStorage(page);
    assert.equal(stores.relawanContinuity[0].logout_pending, true);
    await assertCiphertext(page);
    pass(
        "offline-runtime logout revokes access and retains encrypted patient and draft",
    );
    server.state.offline = true;
    await context.close();
    context = undefined;
    await open();
    await context.setOffline(true);
    await page.goto(origin + assessmentPath, { waitUntil: "domcontentloaded" });
    await page
        .getByText("Akses lapangan belum tersedia", { exact: true })
        .waitFor();
    await page.waitForFunction(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return (
            registration?.active?.state === "activated" && !registration.waiting
        );
    });
    await assertCiphertext(page);
    pass(
        "waiting worker activates after all controlled tabs close; offline restart preserves logout intent and ciphertext",
    );
    await assertPrivateCaches(page);
    assert.deepEqual(errors, [], "Unexpected browser application errors");
    assert.ok(
        !server.log.some((entry) =>
            /\/resources\/|@vite|5173/.test(entry.path ?? ""),
        ),
    );
    pass(
        "no Vite development assets, owner backend, or successful mutation transport used",
    );
} catch (error) {
    results.push({ status: "FAIL", message: error.message });
    if (page && !page.isClosed()) {
        await page
            .screenshot({ path: join(run, "failure.png"), fullPage: true })
            .catch(() => {});
        await writeFile(
            join(run, "failure.txt"),
            await page
                .locator("body")
                .innerText()
                .catch(() => "unavailable"),
        );
    }
    console.error(error);
    process.exitCode = 1;
} finally {
    await context?.close();
    await server.close();
    assert.equal(
        await ownerAssetDigest(),
        build.before,
        "Owner production assets/hot file changed",
    );
    await writeFile(
        join(run, "results.json"),
        JSON.stringify(
            {
                results,
                errors,
                network: server.log,
                limitations: [
                    "Synthetic authentication/server responses; no live Laravel or PostgreSQL integration",
                    "No C2 synchronization",
                    "Browser profiles intentionally retained",
                ],
                ownerAssetsUnchanged: true,
            },
            null,
            2,
        ),
    );
    console.log(`Artifacts retained: ${run}`);
    if (
        !process.exitCode &&
        results.some((result) => result.status === "NOT TESTED")
    ) {
        console.log(
            "C1 IMPLEMENTED — ACCEPTANCE PENDING (see NOT TESTED evidence)",
        );
        process.exitCode = 2;
    }
}
