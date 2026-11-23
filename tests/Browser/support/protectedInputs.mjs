import { constants } from "node:fs";
import { open, lstat, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Secret values belong in owner-only files, never CLI arguments or environment values.
export async function readProtectedJson(path) {
    if (!path) throw new Error("Protected input file is required");
    const absolute = resolve(path);
    const parent = await lstat(dirname(absolute));
    if (
        !parent.isDirectory() || parent.uid !== process.getuid() ||
        (parent.mode & 0o077) !== 0 || (await realpath(absolute)) !== absolute
    ) throw new Error("Protected input path is unsafe");

    const file = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const stat = await file.stat();
        if (
            !stat.isFile() || stat.uid !== process.getuid() ||
            (stat.mode & 0o777) !== 0o600 || stat.nlink !== 1
        ) throw new Error("Protected input file must be owner-only");
        return JSON.parse(await file.readFile("utf8"));
    } finally {
        await file.close();
    }
}

export async function loadProtectedInputs() {
    const secrets = await readProtectedJson(process.env.P0_TEST_SECRETS_FILE);
    if (typeof secrets.enrollment_passphrase !== "string" || secrets.enrollment_passphrase.length < 16) {
        throw new Error("A runtime enrollment passphrase of at least 16 characters is required");
    }
    const creds = await readProtectedJson(resolve("storage/app/private/c2-acceptance/credentials.json"));
    for (const name of ["relawan_a", "relawan_b", "healthcare_a", "healthcare_b"]) {
        if (typeof creds[name]?.email !== "string" || typeof creds[name]?.password !== "string") {
            throw new Error("Protected account input is incomplete");
        }
    }
    return { creds, passphrase: secrets.enrollment_passphrase };
}
