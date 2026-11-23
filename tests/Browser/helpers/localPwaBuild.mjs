import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
    mkdtemp,
    readFile,
    readdir,
    symlink,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

export const project = resolve(import.meta.dirname, "../../..");
export async function ownerAssetDigest() {
    const hash = createHash("sha256");
    async function visit(path) {
        for (const item of (await readdir(path, { withFileTypes: true })).sort(
            (a, b) => a.name.localeCompare(b.name),
        )) {
            if (item.isDirectory()) await visit(join(path, item.name));
            else {
                hash.update(item.name);
                hash.update(await readFile(join(path, item.name)));
            }
        }
    }
    await visit(join(project, "public/build"));
    hash.update(
        await readFile(join(project, "public/hot")).catch(() => "NO_HOT_FILE"),
    );
    return hash.digest("hex");
}

export async function buildLocalPwa() {
    const before = await ownerAssetDigest();
    const artifacts = await mkdtemp(join(tmpdir(), "rapid-mind-c1-pwa-"));
    const output = join(artifacts, "build");
    let config = await readFile(join(project, "vite.config.js"), "utf8");
    const replace = (from, to) => {
        assert.equal(
            config.split(from).length,
            2,
            `Expected one config expression: ${from}`,
        );
        config = config.replace(from, to);
    };
    replace(
        "export default defineConfig({",
        `export default defineConfig({\n    build: { outDir: ${JSON.stringify(output)}, emptyOutDir: false },`,
    );
    replace(
        "refresh: true,",
        `refresh: false, hotFile: ${JSON.stringify(join(artifacts, "vite.hot"))},`,
    );
    replace(
        'new URL("./public/build/manifest.json", import.meta.url)',
        JSON.stringify(join(output, "manifest.json")),
    );
    replace(
        'new URL("./public/manifest.webmanifest", import.meta.url)',
        JSON.stringify(join(project, "public/manifest.webmanifest")),
    );
    await symlink(
        join(project, "node_modules"),
        join(artifacts, "node_modules"),
    );
    const configPath = join(artifacts, "vite.local.mjs");
    await writeFile(configPath, config);
    const child = spawn(
        join(project, "node_modules/.bin/vite"),
        ["build", "--mode", "production", "--config", configPath],
        {
            cwd: project,
            stdio: ["ignore", "pipe", "pipe"],
        },
    );
    let log = "";
    for (const stream of [child.stdout, child.stderr])
        stream.on("data", (chunk) => {
            log += chunk;
        });
    const code = await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", resolve);
    });
    await writeFile(join(artifacts, "build.log"), log);
    assert.equal(await ownerAssetDigest(), before, "Owner build/hot changed");
    assert.equal(code, 0, log);
    const manifest = JSON.parse(
        await readFile(join(output, "manifest.json"), "utf8"),
    );
    const worker = await readFile(join(output, "serviceWorker.js"), "utf8");
    assert.ok(!worker.includes("__WB_MANIFEST"), "Precache was not injected");
    return { artifacts, output, manifest, worker, before };
}

if (process.argv[1] === import.meta.filename) {
    const built = await buildLocalPwa();
    console.log(
        JSON.stringify({
            artifacts: built.artifacts,
            output: built.output,
            ownerAssetsUnchanged: true,
        }),
    );
}
