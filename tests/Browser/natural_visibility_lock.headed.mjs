import assert from "node:assert/strict";
import { join } from "node:path";
import { loadProtectedInputs } from "./support/protectedInputs.mjs";
import { runProtectedBrowserCheck } from "./support/protectedBrowserRun.mjs";

const origin = "http://localhost:8080";

await runProtectedBrowserCheck(["natural_visibility_lock"], async ({ runDir, pass, trackContext }) => {
    const { creds, passphrase } = await loadProtectedInputs();
    const { chromium } = await import("playwright");
    const testProfile = join(runDir, "headed-profile");

    console.log(
        "=== HEADED BROWSER PRIVACY-LOCK TEST (Kubuntu Wayland/Xwayland) ===",
    );
    console.log(
        `DISPLAY: ${process.env.DISPLAY}, WAYLAND_DISPLAY: ${process.env.WAYLAND_DISPLAY}`,
    );

    let context;
    let page;
    let coverTab;

    console.log("1. Launching headed Chromium instance...");
    context = trackContext(await chromium.launchPersistentContext(testProfile, {
        executablePath: "/usr/bin/google-chrome",
        headless: false,
        env: {
            ...process.env,
            DISPLAY: process.env.DISPLAY || ":0",
            WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "wayland-0",
        },
        args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--window-size=1280,800",
        ],
    }));

    page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(15000);

    console.log("2. Logging in as Relawan A...");
    await page.goto(`${origin}/login`);
    await page.locator("#email").fill(creds.relawan_a.email);
    await page.locator("#password").fill(creds.relawan_a.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname.startsWith("/relawan/"), {
        timeout: 10000,
    });

    console.log("3. Enrolling encryption key in fresh profile...");
    await page.waitForSelector("text=Kunci data klinis offline", {
        timeout: 10000,
    });
    const inputs = await page.locator('input[type="password"]').all();
    assert.equal(
        inputs.length,
        2,
        "Expected 2 password fields for fresh enrollment",
    );
    await inputs[0].fill(passphrase);
    await inputs[1].fill(passphrase);
    await page.getByRole("button", { name: "Daftarkan kunci" }).click();
    await page.waitForSelector("text=Simpan kode pemulihan ini sekarang", {
        timeout: 10000,
    });
    await page
        .getByRole("button", { name: "Saya sudah menyimpan kode" })
        .click();
    await page.waitForSelector("header", { timeout: 10000 });

    async function ensureUnlocked(p, secret = passphrase) {
        await p.waitForFunction(
            () => {
                return (
                    document.body.innerText.includes(
                        "Kunci data klinis offline",
                    ) ||
                    document.body.innerText.includes(
                        "Mulai Asesmen Baru",
                    ) ||
                    document.querySelector("header") !== null
                );
            },
            undefined,
            { timeout: 15000 },
        );

        const gate = p.locator("text=Kunci data klinis offline");
        if (await gate.isVisible()) {
            const pwInput = p.locator('input[type="password"]');
            await pwInput.fill(secret);
            await p.getByRole("button", { name: "Buka data" }).click();
            await p.waitForSelector("text=Kunci data klinis offline", {
                state: "hidden",
                timeout: 10000,
            });
        }
    }

    console.log("4. Navigating to Assessment page...");
    await page.goto(`${origin}/relawan/assessment`);
    await ensureUnlocked(page);
    await page.waitForSelector("text=Mulai Asesmen Baru", { timeout: 10000 });
    assert.ok(
        await page.locator("text=Mulai Asesmen Baru").isVisible(),
        "Clinical assessment form must be visible in unlocked state",
    );

    console.log("5. Attaching natural visibility event tracker...");
    await page.evaluate(() => {
        window.__visibilityHistory = [];
        document.addEventListener("visibilitychange", () => {
            window.__visibilityHistory.push({
                state: document.visibilityState,
                timestamp: new Date().toISOString(),
            });
        });
    });

    console.log(
        "6. Opening second tab to background the clinical tab naturally...",
    );
    coverTab = await context.newPage();
    await coverTab.goto(`${origin}/login`);
    await coverTab.bringToFront();
    await coverTab.waitForTimeout(2000);

    // Read the clinical tab's natural visibility state
    const bgVisibilityState = await page.evaluate(
        () => document.visibilityState,
    );
    const bgHistory = await page.evaluate(
        () => window.__visibilityHistory || [],
    );
    console.log(
        `Clinical tab natural visibility state while in background: "${bgVisibilityState}"`,
    );
    console.log("Visibility events recorded on backgrounding:", bgHistory);

    if (bgVisibilityState !== "hidden") {
        console.warn(
            "\x1b[33m[NOT TESTED]\x1b[0m No natural 'hidden' state observed in this attempt.",
        );
        // Unfinished scenario stays NOT TESTED; shared runner returns exit 2.
    } else {
        console.log(
            "Natural background transition confirmed: visibilityState is 'hidden'.",
        );

        console.log("7. Switching back to the clinical tab (foreground)...");
        await page.bringToFront();
        await page.waitForTimeout(1000);

        const fgVisibilityState = await page.evaluate(
            () => document.visibilityState,
        );
        console.log(
            `Clinical tab visibility state upon return: "${fgVisibilityState}"`,
        );

        // Check if OfflineEncryptionGate is rendered
        const gate = page.locator("text=Kunci data klinis offline");
        const gateVisible = await gate.isVisible();
        const assessmentFormVisible = await page
            .locator("text=Mulai Asesmen Baru")
            .isVisible();

        console.log(`Gate visible upon return: ${gateVisible}`);
        console.log(
            `Clinical assessment form visible upon return: ${assessmentFormVisible}`,
        );

        assert.ok(
            gateVisible,
            "OfflineEncryptionGate MUST be visible upon foreground return from background!",
        );
        assert.ok(
            !assessmentFormVisible,
            "Clinical assessment form MUST be masked/hidden upon foreground return!",
        );

        console.log("8. Verifying unlock recovers clinical data...");
        await page.locator('input[type="password"]').fill(passphrase);
        await page.getByRole("button", { name: "Buka data" }).click();
        await page.waitForSelector("text=Mulai Asesmen Baru", {
            timeout: 10000,
        });

        assert.ok(
            await page.locator("text=Mulai Asesmen Baru").isVisible(),
            "Clinical assessment form restored after entering passphrase",
        );

        console.log(
            "\x1b[32m[PASS]\x1b[0m Natural tab-background/foreground privacy-lock fully VERIFIED in headed Chromium!",
        );
        pass("natural_visibility_lock", "Natural hidden transition, foreground privacy gate and unlock assertions completed.");
    }
});
