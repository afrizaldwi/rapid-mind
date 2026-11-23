import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { unlockOfflineKey } from "../../../resources/js/offline/offlineCrypto.ts";

// Read only the isolated synthetic assessment. Wait for transaction completion,
// then decrypt in the test process; never install a key in the browser or write
// plaintext to storage, logs, or artifacts.
export async function readCommittedSrqAnswer(page, owner, id, question, passphrase) {
    const { envelope, wrappedKey } = await page.evaluate(async ({ owner, id }) => {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open("RapidMindOfflineDB");
            request.onupgradeneeded = () => request.transaction.abort();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(["encryptedStaging", "offlineKeys"], "readonly");
                const assessment = tx.objectStore("encryptedStaging").get(`assessments:${owner}:${id}`);
                const key = tx.objectStore("offlineKeys").get(owner);
                tx.oncomplete = () => resolve({ envelope: assessment.result, wrappedKey: key.result });
                tx.onabort = () => reject(tx.error ?? new Error("Assessment read aborted"));
                tx.onerror = () => reject(tx.error ?? new Error("Assessment read failed"));
            });
        } finally {
            db.close();
        }
    }, { owner, id });
    assert.ok(envelope, "Specific encrypted assessment is missing");
    assert.ok(wrappedKey, "Synthetic owner's wrapped key is missing");
    const session = await unlockOfflineKey(wrappedKey, passphrase, "passphrase");
    try {
        await session.assertMatches(wrappedKey);
        const assessment = await session.decrypt(envelope, owner, "assessments", id);
        assert.equal(assessment.id, id);
        assert.equal(assessment.owner_user_id, owner);
        assert.ok(Number.isInteger(assessment.local_revision));
        return {
            revision: assessment.local_revision,
            answer: assessment.srq_answers?.[question],
            syncState: assessment.sync_state,
            fingerprint: createHash("sha256").update(`${envelope.iv}:${envelope.ciphertext}`).digest("hex"),
        };
    } finally {
        session.lock();
    }
}
