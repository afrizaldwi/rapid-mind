import { mkdir, mkdtemp, lstat, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// Shared reporting/lifecycle only. Negative controls never call browser/application code.
export async function runProtectedBrowserCheck(scenarioNames, execute, options = {}) {
    process.umask(0o077);
    delete process.env.DEBUG;
    delete process.env.PWDEBUG;
    const report = {
        executed_at: new Date().toISOString(),
        origin: "http://localhost:8080",
        status: "NOT TESTED",
        scenarios: Object.fromEntries(scenarioNames.map((name) => [name, { status: "NOT TESTED" }])),
    };
    const contexts = [];
    let resultsFile;
    let failed = false;
    try {
        const root = resolve(options.root ?? "storage/app/private/c2-acceptance");
        await mkdir(root, { recursive: true, mode: 0o700 });
        const stat = await lstat(root);
        if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0 || await realpath(root) !== root) {
            throw new Error("Private run directory is unsafe");
        }
        const runDir = await mkdtemp(join(root, "p0-run-"));
        resultsFile = join(runDir, "results.json");
        const args = options.args ?? process.argv.slice(2);
        const control = args[0];
        if (args.length > 1 || (control && !["--negative-control=fatal", "--negative-control=incomplete"].includes(control))) {
            throw new Error("Unknown runner arguments");
        }
        if (control === "--negative-control=fatal") {
            throw new Error("NEGATIVE_CONTROL_PRIVATE_CANARY");
        }
        if (control !== "--negative-control=incomplete") {
            await execute({
                runDir,
                trackContext(context) { contexts.push(context); return context; },
                pass(name, message, details = {}) {
                    if (!scenarioNames.includes(name) || report.scenarios[name].status !== "NOT TESTED") {
                        throw new Error("Unexpected or duplicate scenario");
                    }
                    report.scenarios[name] = { status: "PASS", message, details, timestamp: new Date().toISOString() };
                    console.log(`[PASS] ${name}`);
                },
            });
        }
    } catch {
        failed = true;
        // Playwright/assertion/process errors can embed passwords or decrypted responses.
        report.error = "Harness failed; raw error details withheld for privacy.";
        console.error(report.error);
    } finally {
        const closed = await Promise.allSettled(contexts.map((context) => context.close()));
        if (closed.some((result) => result.status === "rejected")) {
            failed = true;
            report.error = "Browser cleanup failed; profiles retained privately.";
        }
        const complete = scenarioNames.length > 0 && scenarioNames.every((name) => report.scenarios[name].status === "PASS");
        report.status = failed ? "FAIL" : complete ? "PASS" : "NOT TESTED";
        process.exitCode = failed ? 1 : complete ? 0 : 2;
        if (resultsFile) {
            try {
                await writeFile(resultsFile, JSON.stringify(report, null, 2), { mode: 0o600, flag: "wx" });
                console.log(`Results saved to: ${resultsFile}`);
            } catch {
                process.exitCode = 1;
                report.status = "FAIL";
                console.error("Private report could not be saved.");
            }
        }
        console.log(`Runner status: ${report.status}`);
    }
    return report;
}
