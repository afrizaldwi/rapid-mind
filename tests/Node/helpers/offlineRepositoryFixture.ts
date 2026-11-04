import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import {
    jsonRequest,
    MissingCsrfTokenError,
} from "../../../resources/js/offline/jsonRequest.ts";
import { createOfflineKey } from "../../../resources/js/offline/offlineCrypto.ts";

// Real repository / encryption modules; only IndexedDB transport is replaced.
// This does not establish browser Dexie transaction or Service Worker behavior.
export async function offlineRepositoryFixture(encrypted: boolean) {
    const clone = <T>(value: T): T => structuredClone(value);
    class Table {
        rows = new Map<string, any>();
        readonly name: string;
        constructor(name: string) {
            this.name = name;
        }
        key(value: any) {
            if (this.name === "patientSnapshots")
                return String([value.owner_user_id, value.id]);
            const field = ["ownerEncryptionModes", "offlineKeys"].includes(
                this.name,
            )
                ? "owner_user_id"
                : [
                        "encryptedStaging",
                        "localSyncReceipts",
                        "outboxIdCounter",
                    ].includes(this.name)
                  ? "key"
                  : "id";
            return String(value[field]);
        }
        async get(key: any) {
            return clone(this.rows.get(String(key)));
        }
        async put(value: any) {
            this.rows.set(this.key(value), clone(value));
            return value.id ?? value.key;
        }
        async add(value: any) {
            if (this.rows.has(this.key(value)))
                throw new Error("Duplicate key");
            return this.put(value);
        }
        async update(key: any, patch: any) {
            const row = await this.get(key);
            if (row) await this.put({ ...row, ...patch });
        }
        async delete(key: any) {
            this.rows.delete(String(key));
        }
        where(field: string) {
            return {
                equals: (expected: unknown) => ({
                    toArray: async () =>
                        [...this.rows.values()]
                            .filter((row) => {
                                const value = field.startsWith("[")
                                    ? field
                                          .slice(1, -1)
                                          .split("+")
                                          .map((key) => row[key])
                                    : row[field];
                                return (
                                    JSON.stringify(value) ===
                                    JSON.stringify(expected)
                                );
                            })
                            .map(clone),
                }),
            };
        }
    }
    const tables = Object.fromEntries(
        [
            "assessments",
            "patients",
            "patientSnapshots",
            "emergencies",
            "outbox",
            "ownerEncryptionModes",
            "offlineKeys",
            "encryptedStaging",
            "encryptedOutboxIndex",
            "outboxIdCounter",
            "localSyncReceipts",
        ].map((name) => [name, new Table(name)]),
    );
    const db = {
        ...tables,
        transaction: async (...args: any[]) => {
            const before = Object.fromEntries(
                Object.entries(tables).map(([key, table]) => [
                    key,
                    clone(table.rows),
                ]),
            );
            try {
                return await args.at(-1)();
            } catch (error) {
                for (const [key, table] of Object.entries(tables))
                    table.rows = before[key];
                throw error;
            }
        },
    };
    let outboxId = 0;
    const identity = crypto.randomUUID();
    const temp = mkdtempSync(join(tmpdir(), "rapid-mind-repository-unit-"));
    let moduleId = 0;
    function moduleUrl(code: string) {
        const file = join(temp, `module-${++moduleId}.mjs`);
        writeFileSync(file, code);
        return pathToFileURL(file).href;
    }
    const registry = ((globalThis as any).__rapidMindRepositoryFixtures ??=
        new Map());
    const context: any = {
        db,
        requireOwner: (owner: number) => {
            if (!Number.isInteger(owner) || owner <= 0)
                throw new Error("Invalid owner");
            return owner;
        },
        localUuid: () => crypto.randomUUID(),
        nextOutboxId: async () => ++outboxId,
    };
    registry.set(identity, context);
    function stub(exports: string[]) {
        return moduleUrl(
            exports
                .map(
                    (key) =>
                        `export const ${key} = globalThis.__rapidMindRepositoryFixtures.get(${JSON.stringify(identity)})[${JSON.stringify(key)}];`,
                )
                .join("\n"),
        );
    }
    const modules: Record<string, string> = {
        "./db": stub(["db", "requireOwner", "localUuid", "nextOutboxId"]),
    };
    async function load(
        file: string,
        dependencies: Record<string, string> = {},
    ) {
        let code = ts.transpileModule(readFileSync(resolve(file), "utf8"), {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
            },
        }).outputText;
        code = code.replace(/from ["']([^"']+)["']/g, (_match, specifier) => {
            const target =
                dependencies[specifier] ??
                modules[specifier] ??
                (specifier.startsWith(".")
                    ? pathToFileURL(
                          resolve(
                              file,
                              "..",
                              specifier.endsWith(".ts")
                                  ? specifier
                                  : `${specifier}.ts`,
                          ),
                      ).href
                    : import.meta.resolve(specifier));
            return `from ${JSON.stringify(target)}`;
        });
        if (file.endsWith("/syncManager.ts"))
            code =
                'const navigator = { onLine: true }; const window = { addEventListener() {}, setTimeout, location: { assign() {} } }; const document = { addEventListener() {}, visibilityState: \"visible\" };\n' +
                code;
        code = code.replace(
            'new BroadcastChannel("rapid-mind:offline-mode-v1")',
            "({ addEventListener() {}, postMessage() {} })",
        );
        const url = moduleUrl(code);
        return { url, exports: await import(url) };
    }
    const storage = await load(
        "resources/js/offline/encryptedClinicalStorage.ts",
    );
    modules["./encryptedClinicalStorage"] = storage.url;
    if (encrypted) {
        const { record, session } = await createOfflineKey(
            101,
            "frasa sandi panjang pengujian repository sintetis",
        );
        await tables.offlineKeys.put(record);
        await tables.ownerEncryptionModes.put({
            owner_user_id: 101,
            mode: "ENCRYPTED",
        });
        await storage.exports.installClinicalKey(session);
    }
    const health = await load("resources/js/offline/localPersistenceHealth.ts");
    modules["./localPersistenceHealth"] = health.url;
    const assessments = await load(
        "resources/js/offline/assessmentRepository.ts",
    );
    modules["./assessmentRepository"] = assessments.url;
    const patients = await load("resources/js/offline/patientRepository.ts");
    context.patientRepository = patients.exports.patientRepository;
    context.emergencyRepository = {
        get: async (owner: number, id: string) => {
            const value = await tables.emergencies.get(id);
            return value?.owner_user_id === owner ? value : undefined;
        },
        setState: async () => {},
    };
    modules["./patientRepository"] = patients.url;
    modules["./emergencyRepository"] = stub(["emergencyRepository"]);
    const encryptedOutbox = await load(
        "resources/js/offline/encryptedOutbox.ts",
    );
    modules["./encryptedOutbox"] = encryptedOutbox.url;
    const outbox = await load("resources/js/offline/outboxRepository.ts");
    modules["./outboxRepository"] = outbox.url;
    const sync = await load("resources/js/offline/assessmentSync.ts");
    modules["./assessmentSync"] = sync.url;
    const drafts = await load("resources/js/offline/assessmentDraft.ts");
    modules["./assessmentDraft"] = drafts.url;
    context.syncManager = { sync: async () => {} };
    context.useRelawanRuntime = () => ({ owner: 101 });
    const workflow = await load("resources/js/offline/assessmentWorkflow.ts", {
        "./syncManager": stub(["syncManager"]),
        "@/relawan/runtime": stub(["useRelawanRuntime"]),
        "@/domain/triage/triageCalculator": `data:text/javascript,export class TriageCalculator {}`,
    });
    context.resolveRelawanContinuity = async () => ({
        state: "ELIGIBLE",
        context: { owner_user_id: 101 },
    });
    context.jsonRequest = (url: string, payload: unknown) =>
        jsonRequest(url, payload, 15);
    context.MissingCsrfTokenError = MissingCsrfTokenError;
    const manager = await load("resources/js/offline/syncManager.ts", {
        "./jsonRequest": stub(["jsonRequest", "MissingCsrfTokenError"]),
        "./relawanContinuity": stub(["resolveRelawanContinuity"]),
    });
    await context.patientRepository.saveServerSnapshot(101, {
        id: "patient-synthetic",
        name: "Penyintas Sintetis",
    });
    return {
        assessments: assessments.exports.assessmentRepository,
        patients: patients.exports.patientRepository,
        outbox: outbox.exports.outboxRepository,
        syncManager: manager.exports.syncManager,
        workflow: workflow.exports,
        drafts: drafts.exports,
        queue: sync.exports.queueAssessmentSnapshot,
        db,
        cleanup: () => {
            storage.exports.lockAllClinicalKeys();
            registry.delete(identity);
            rmSync(temp, { recursive: true, force: true });
        },
    };
}
