import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, chmod, readFile, readdir, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { readProtectedJson } from "./support/protectedInputs.mjs";

const runnerUrl = new URL("./support/protectedBrowserRun.mjs", import.meta.url).href;
const runs = [];

function checkChild(child, expectedExit) {
    assert.ifError(child.error);
    assert.equal(child.status, expectedExit);
    const output = child.stdout + child.stderr;
    assert.ok(!output.includes("NEGATIVE_CONTROL_PRIVATE_CANARY"));
    return output;
}

async function savedReport(output) {
    const path = output.match(/Results saved to: (.+)/)?.[1];
    assert.ok(path, "Runner must emit a private report path");
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal((await stat(resolve(path, ".."))).mode & 0o777, 0o700);
    runs.push(resolve(path, ".."));
    return JSON.parse(await readFile(path, "utf8"));
}

for (const harness of ["p0_browser_acceptance_suite.mjs", "natural_visibility_lock.headed.mjs"]) {
    for (const [control, exitCode, status] of [["fatal", 1, "FAIL"], ["incomplete", 2, "NOT TESTED"]]) {
        test(`${harness}: ${control} is nonzero without browser/credential/database access`, async () => {
            const child = spawnSync(process.execPath, [resolve("tests/Browser", harness), `--negative-control=${control}`], {
                encoding: "utf8", timeout: 10000,
                env: { ...process.env, P0_TEST_SECRETS_FILE: "/nonexistent/p0-input", PATH: "" },
            });
            const report = await savedReport(checkChild(child, exitCode));
            assert.equal(report.status, status);
            assert.ok(Object.values(report.scenarios).every((scenario) => scenario.status === "NOT TESTED"));
            assert.deepEqual(await readdir(runs.at(-1)), ["results.json"]);
        });
    }
}

test("partial completion cannot pass; context-close failures fail closed; run directories are unique", async () => {
    const root = await mkdtemp(join(tmpdir(), "p0-runner-control-"));
    await chmod(root, 0o700);
    for (const [body, exitCode, expected] of [
        ['pass("a", "Controlled assertion only")', 2, "NOT TESTED"],
        ['pass("a", "Controlled assertion only"); pass("b", "Controlled assertion only"); trackContext({close: async () => {throw new Error("NEGATIVE_CONTROL_PRIVATE_CANARY")}})', 1, "FAIL"],
        ['pass("a", "Controlled assertion only"); pass("b", "Controlled assertion only")', 0, "PASS"],
    ]) {
        const script = `import {runProtectedBrowserCheck} from ${JSON.stringify(runnerUrl)};
            await runProtectedBrowserCheck(["a", "b"], async ({pass, trackContext}) => {${body}}, {root: ${JSON.stringify(root)}, args: []});`;
        const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 10000 });
        const report = await savedReport(checkChild(child, exitCode));
        assert.equal(report.status, expected);
    }
    assert.equal(new Set(runs).size, runs.length);
    // Keep all private reports; never recursively delete shared or retained profiles.
});

test("runtime secret files require private permissions, ownership and a non-symlink path", async () => {
    const root = await mkdtemp(join(tmpdir(), "p0-input-control-"));
    await chmod(root, 0o700);
    const path = join(root, "input.json");
    await writeFile(path, JSON.stringify({ marker: true }), { mode: 0o600 });
    assert.deepEqual(await readProtectedJson(path), { marker: true });
    await chmod(path, 0o644);
    await assert.rejects(readProtectedJson(path));
    await chmod(path, 0o600);
    await symlink(path, join(root, "linked.json"));
    await assert.rejects(readProtectedJson(join(root, "linked.json")));
    await chmod(root, 0o755);
    await assert.rejects(readProtectedJson(path));
    await chmod(root, 0o700);
});
