import assert from "node:assert/strict";
import { origin, assessmentPath, patientName } from "./localPwaServer.mjs";
import { unlock, assertCiphertext } from "./localPwaAssertions.mjs";

export async function checkBackgroundLock(context, page, pass, notTested) {
    const client = await context.newCDPSession(page);
    const { windowId } = await client.send("Browser.getWindowForTarget");
    let naturallyHidden = false;
    let cover;
    let transition = "window minimization";
    try {
        await page.evaluate(() => {
            const observation = { hidden: false };
            const listener = event => {
                if (event.isTrusted && document.visibilityState === "hidden")
                    observation.hidden = true;
            };
            window.__c1NativeVisibility = { observation, listener };
            document.addEventListener("visibilitychange", listener);
        });
        // Playwright forces focus by default, which also masks native visibility.
        // Disable that automation override for this real window transition.
        await client.send("Emulation.setFocusEmulationEnabled", {
            enabled: false,
        });
        if (process.env.RAPID_MIND_C1_MANUAL_BACKGROUND === "1") {
            console.log(
                "MANUAL CHECK: minimize or background ONLY the isolated C1 Chromium window within 60 seconds. Restore it after the clinical view locks.",
            );
            transition = "manual background transition";
            await page.waitForFunction(
                () => window.__c1NativeVisibility.observation.hidden,
                undefined,
                { timeout: 60_000, polling: 100 },
            );
        } else {
            await client.send("Browser.setWindowBounds", {
                windowId,
                bounds: { windowState: "minimized" },
            });
            try {
                await page.waitForFunction(
                    () => window.__c1NativeVisibility.observation.hidden,
                    undefined,
                    { timeout: 2000, polling: 100 },
                );
            } catch (error) {
                if (error.name !== "TimeoutError") throw error;
                // Some window managers ignore programmatic minimization. Switching
                // to a real blank tab is another native background transition.
                await client.send("Browser.setWindowBounds", {
                    windowId,
                    bounds: { windowState: "normal" },
                });
                // A hidden event can survive foreground restoration even when
                // the browser suspended the polling task in the background.
                if (!await page.evaluate(() => window.__c1NativeVisibility.observation.hidden)) {
                    cover = await context.newPage();
                    await cover.bringToFront();
                    transition = "foreground tab switch";
                    await page.waitForFunction(
                        () => window.__c1NativeVisibility.observation.hidden,
                        undefined,
                        { timeout: 5000, polling: 100 },
                    );
                }
            }
        }
    } catch (error) {
        if (error.name !== "TimeoutError") throw error;
    } finally {
        await cover?.close();
        await client.send("Browser.setWindowBounds", {
            windowId,
            bounds: { windowState: "normal" },
        });
        await client.send("Emulation.setFocusEmulationEnabled", {
            enabled: true,
        });
        naturallyHidden = await page.evaluate(() => {
            const recorded = window.__c1NativeVisibility;
            if (!recorded) return false;
            document.removeEventListener("visibilitychange", recorded.listener);
            delete window.__c1NativeVisibility;
            return recorded.observation.hidden;
        });
        await client.detach();
    }
    await page.bringToFront();
    if (!naturallyHidden) {
        notTested(
            "natural background visibility transition: no trusted hidden event was recorded; requires isolated graphical acceptance",
        );
        // The native recorder is already removed. This fallback can never
        // supply evidence for the native acceptance result.
        await page.evaluate(() => {
            Object.defineProperty(document, "visibilityState", {
                configurable: true,
                get: () => "hidden",
            });
            try {
                document.dispatchEvent(new Event("visibilitychange"));
            } finally {
                delete document.visibilityState;
            }
        });
    }
    // Assert after restoration, when rendering resumes. A native event alone
    // is insufficient: the application must stay locked until explicit unlock.
    await page.getByRole("button", { name: "Buka data", exact: true }).waitFor();
    assert.equal(await page.getByText(patientName, { exact: true }).count(), 0);
    assert.ok(!(await page.locator("body").textContent()).includes(patientName));
    assert.equal(await page.locator('input[type="password"]').inputValue(), "");
    await unlock(page);
    await page.getByText(patientName, { exact: true }).waitFor();
    pass(naturallyHidden
        ? `actual Chromium ${transition} records a trusted hidden event, removes clinical DOM, and requires explicit passphrase unlock after restoration`
        : "browser visibilitychange handler locks clinical DOM and requires explicit unlock (synthetic hidden-state stimulus)");
}

export async function checkCrossTabLock(context, page, pass) {
    const other = await context.newPage();
    try {
        await other.goto(origin + assessmentPath, {
            waitUntil: "domcontentloaded",
        });
        await unlock(other);
        await other.getByText(patientName, { exact: true }).waitFor();
        // Exercise the real application lock entry point in another tab.
        // pagehide also covers BFCache/suspension; no storage is reset.
        await other.evaluate(() =>
            window.dispatchEvent(new PageTransitionEvent("pagehide")),
        );
        await page
            .getByRole("button", { name: "Buka data", exact: true })
            .waitFor();
        assert.equal(
            await page.getByText(patientName, { exact: true }).count(),
            0,
        );
        await page.bringToFront();
        await unlock(page);
        await page.getByText(patientName, { exact: true }).waitFor();
        await assertCiphertext(page);
        pass(
            "real cross-tab storage event revokes clinical DOM and requires another explicit unlock (pagehide stimulus)",
        );
    } finally {
        await other.close();
    }
    // Closing a peer can itself revoke the key through pagehide.
    await page
        .getByRole("button", { name: "Buka data", exact: true })
        .waitFor();
    await unlock(page);
    await page.getByText(patientName, { exact: true }).waitFor();
}

export async function checkSessionIdentity(page, server, pass) {
    server.state.session = "AUTHENTICATED";
    server.state.owner = 910002;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page
        .getByText("Akun server tidak sesuai.", { exact: true })
        .waitFor();
    assert.equal(new URL(page.url()).pathname, assessmentPath);
    await assertCiphertext(page);
    pass(
        "wrong synthetic server identity does not restore online runtime or replace retained owner data",
    );
    server.state.session = "ACCOUNT_INACTIVE";
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page
        .getByText("Sinkronisasi tidak diizinkan.", { exact: true })
        .waitFor();
    server.state.owner = 910001;
    server.state.session = "REAUTHENTICATION_REQUIRED";
    pass("inactive synthetic session is rejected without deleting ciphertext");
}

export async function checkOwnerSwitch(context, page, server, pass) {
    server.state.owner = 910002;
    server.state.session = "REAUTHENTICATION_REQUIRED";
    server.state.denyEnrollment = true;
    const other = await context.newPage();
    try {
        await other.goto(`${origin}/relawan/home`);
        await other
            .getByText("Pendaftaran enkripsi perangkat belum diizinkan", {
                exact: false,
            })
            .waitFor();
        await page.getByText("Akses lokal dikunci", { exact: true }).waitFor();
        assert.ok(
            !(await other.locator("body").textContent()).includes(patientName),
        );
        assert.ok(
            !(await page.locator("body").textContent()).includes(patientName),
        );
        await assertCiphertext(page);
        pass(
            "synthetic owner switch locks the previous offline tab; expired authorization cannot enroll the new owner",
        );
    } finally {
        await other.close();
        server.state.owner = 910001;
        server.state.denyEnrollment = false;
    }
    // Restore the synthetic verified owner through an ordinary server page.
    await page.goto(`${origin}/relawan/home`);
    await page
        .getByRole("button", { name: "Buka data", exact: true })
        .waitFor();
    server.state.hang = true;
    await page.goto(origin + assessmentPath, { waitUntil: "domcontentloaded" });
    await unlock(page);
    await page.getByText(patientName, { exact: true }).waitFor();
    server.state.hang = false;
}
