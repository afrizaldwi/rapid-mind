import assert from "node:assert/strict";
import test from "node:test";
import { createOfflineKey } from "../../resources/js/offline/offlineCrypto.ts";
import { readCommittedSrqAnswer } from "../Browser/helpers/localPwaAssessment.mjs";

test("C1 observer waits for transaction completion and ignores unrelated encrypted rows", async () => {
    const owner = 910001;
    const id = "c1-assessment";
    const passphrase = "frasa sandi sintetis checkpoint C1 localhost";
    const created = await createOfflineKey(owner, passphrase);
    const rows = new Map<string, unknown>();
    const target = `assessments:${owner}:${id}`;
    const assessment = { id, owner_user_id: owner, local_revision: 1, srq_answers: {}, sync_state: "SYNCED" };
    rows.set(target, await created.session.encrypt("assessments", id, assessment));
    let transaction: any;
    let automaticCommit = false;
    const reads: unknown[] = [];
    const db = {
        close() {},
        transaction(stores: string[], mode: string) {
            assert.deepEqual(stores, ["encryptedStaging", "offlineKeys"]);
            assert.equal(mode, "readonly");
            transaction = {
                objectStore(name: string) {
                    return { get(key: string | number) {
                        reads.push([name, key]);
                        return { result: name === "offlineKeys" ? created.record : rows.get(String(key)) };
                    } };
                },
            };
            if (automaticCommit) setImmediate(() => transaction.oncomplete());
            return transaction;
        },
    };
    const previous = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: {
        open() {
            const request: any = { result: db };
            queueMicrotask(() => request.onsuccess());
            return request;
        },
    } });
    const page = { evaluate: (fn: any, args: any) => fn(args) };
    const read = () => readCommittedSrqAnswer(page, owner, id, 1, passphrase);
    try {
        let resolved = false;
        const pending = read().then(value => { resolved = true; return value; });
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(resolved, false, "Request results alone must not prove transaction completion");
        transaction.oncomplete();
        const before = await pending;
        automaticCommit = true;
        rows.set(`assessments:${owner}:unrelated`, { ciphertext: "unrelated write" });
        assert.deepEqual(await read(), before, "An unrelated row cannot count as a saved answer");
        rows.set(target, await created.session.encrypt("assessments", id, {
            ...assessment, local_revision: 2, srq_answers: { 1: false }, sync_state: "PENDING_SYNC",
        }));
        const saved = await read();
        assert.equal(saved.answer, false);
        assert.equal(saved.revision, 2);
        assert.notEqual(saved.fingerprint, before.fingerprint);
        assert.equal(saved.syncState, "PENDING_SYNC");
        for (let i = 0; i < reads.length; i += 2)
            assert.deepEqual(reads.slice(i, i + 2), [["encryptedStaging", target], ["offlineKeys", owner]]);

        automaticCommit = false;
        const aborted = read();
        const rejected = assert.rejects(aborted, /read aborted/);
        await new Promise(resolve => setImmediate(resolve));
        transaction.onabort();
        await rejected;
    } finally {
        created.session.lock();
        if (previous) Object.defineProperty(globalThis, "indexedDB", previous);
        else delete (globalThis as any).indexedDB;
    }
});
