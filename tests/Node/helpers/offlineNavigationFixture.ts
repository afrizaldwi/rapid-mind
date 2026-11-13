import { offlineRepositoryFixture } from "./offlineRepositoryFixture.ts";
import { loadVueSource, moduleStub } from "./mountedVueFixture.ts";

// Real routing, repositories, encryption and access fence. Browser history,
// Dexie observation and leaf pages are doubles; this is not browser evidence.
export async function offlineNavigationFixture(t: any) {
    const f = await offlineRepositoryFixture(true, {
        mode: "encrypted-acceptance",
    });
    const id = crypto.randomUUID();
    const registry = ((globalThis as any).__offlineNavigationFixtures ??=
        new Map());
    const state: any = { ...f, masks: 0, routeCalls: [], recovery: 0 };
    registry.set(id, state);
    const global = `globalThis.__offlineNavigationFixtures.get(${JSON.stringify(id)})`;
    const bind = (field: string, names: string[]) =>
        moduleStub(
            names
                .map(
                    (name) =>
                        `export const ${name} = ${global}.${field}.${name};`,
                )
                .join("\n"),
        );
    const vue = import.meta.resolve("vue");
    const stack = [f.browser.location.origin + "/relawan/assessment"];
    let index = 0;
    f.browser.location.href = stack[0];
    const assignments: string[] = [];
    f.browser.location.assign = (href: string) => {
        assignments.push(href);
    };
    const historyStates: unknown[] = [];
    (f.browser as any).history = {
        pushState(data: unknown, _title: string, href: string) {
            historyStates.push(data);
            stack.splice(++index);
            stack.push(new URL(href, f.browser.location.href).href);
            f.browser.location.href = stack[index];
        },
        back() {
            move(-1);
        },
        forward() {
            move(1);
        },
    };
    function move(delta: number) {
        if (!stack[index + delta]) return;
        const oldHash = f.browser.location.hash;
        f.browser.location.href = stack[(index += delta)];
        f.browser.dispatchEvent(new Event("popstate"));
        if (oldHash !== f.browser.location.hash)
            f.browser.dispatchEvent(new Event("hashchange"));
    }
    (f.browser as any).scrollTo = () => {};
    const focused: string[] = [];
    (f.browser.document as any).getElementById = (id: string) => ({
        scrollIntoView() {},
        focus() {
            focused.push(id);
        },
    });
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: f.browser,
    });
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: f.browser.document,
    });
    const overrides: Record<string, string> = {
        "@/offline/assessmentRepository": bind("assessmentsModule", [
            "assessmentRepository",
        ]),
        "@/offline/patientRepository": bind("patientsModule", [
            "patientRepository",
        ]),
        "@/offline/emergencyRepository": bind("emergenciesModule", [
            "emergencyRepository",
        ]),
        "@/offline/db": moduleStub(
            "export const requireOwner = owner => { if (!Number.isInteger(owner) || owner <= 0) throw Error(); return owner; };",
        ),
        "@/offline/relawanContinuity": bind("continuity", [
            "resolveRelawanContinuity",
            "lockRelawanContinuity",
        ]),
        "@/offline/clinicalAccessFence": bind("fence", [
            "captureClinicalAccess",
            "assertClinicalAccess",
        ]),
        "@/offline/encryptedClinicalStorage": bind("storage", [
            "assertStorageMode",
            "clinicalKeyReady",
            "clinicalKeyVersion",
            "encryptedMode",
            "lockAllClinicalKeys",
        ]),
        "@/offline/clinicalStorageInitialization": bind("initialization", [
            "syntheticLegacyFixture",
        ]),
        dexie: moduleStub(`export const liveQuery = read => ({ subscribe(observer) {
            ${global}.observer = observer;
            void read().then(observer.next, observer.error);
            return { unsubscribe() {} };
        } });`),
    };
    state.assessmentsModule = { assessmentRepository: f.assessments };
    state.patientsModule = { patientRepository: f.patients };
    state.emergenciesModule = {
        emergencyRepository: {
            get: (owner: number, id: string) =>
                f.storage.encryptedGet(owner, "emergencies", id),
        },
    };
    const ownerProfile = await f.load(
        "resources/js/offline/offlineOwnerProfile.ts",
    );
    overrides["@/offline/offlineOwnerProfile"] = ownerProfile.url;
    const routeSource = await loadVueSource(
        "resources/js/relawan/offlineRoutes.ts",
        overrides,
    );
    const route = await import(
        moduleStub(
            routeSource.replace(
                /import\("(@\/Pages\/[^"\n]+\.vue)"\)/g,
                (_match, page) => {
                    const component = moduleStub(
                        `import {defineComponent,h} from '${vue}'; export default defineComponent({ props:['patient'], setup:props=>()=>h('p',{},${JSON.stringify(page)}+' '+(props.patient?.name ?? '')) });`,
                    );
                    return `import(${JSON.stringify(component)})`;
                },
            ),
        )
    );
    state.resolve = route.resolveOfflineRoute;
    overrides["./offlineRoutes"] = moduleStub(
        `export const resolveOfflineRoute = (owner, path) => { ${global}.routeCalls.push(path); return ${global}.resolve(owner, path); };`,
    );
    const Navigation = await import(
        moduleStub(
            await loadVueSource(
                "resources/js/relawan/offlineNavigation.ts",
                overrides,
            ),
        )
    );
    state.controller = Navigation.createOfflineNavigation;
    state.navigation = state.controller(101, () => {
        state.masks++;
    });
    const runtimeModule = moduleStub(
        `import {inject} from '${vue}'; export const relawanRuntimeKey = Symbol('offline-test-runtime'); export const useRelawanRuntime = () => inject(relawanRuntimeKey);`,
    );
    overrides["./runtime"] = runtimeModule;
    overrides["./offlineNavigation"] = moduleStub(
        `export const createOfflineNavigation = (owner,mask) => { const n = ${global}.controller(owner,mask); ${global}.shellNavigation = n; return n; };`,
    );
    overrides["@/offline/sessionRecovery"] = moduleStub(
        `export const startRelawanSessionRecovery = () => { ${global}.recovery++; };`,
    );
    overrides["@/components/Relawan/OfflineEncryptionGate.vue"] = moduleStub(
        `import {defineComponent,h} from '${vue}'; export default defineComponent({setup:()=>()=>h('p',{},'OFFLINE LOCKED')});`,
    );
    const shellModule = await loadVueSource(
        "resources/js/relawan/OfflineRelawanShell.vue",
        overrides,
    );
    state.Shell = (await import(moduleStub(shellModule))).default;
    t.after(() => {
        state.mounted?.app.unmount();
        state.shellNavigation?.stop();
        for (const navigation of state.extraNavigations ?? []) navigation.stop();
        state.navigation.stop();
        f.cleanup();
        registry.delete(id);
        for (const [name, previous] of [
            ["window", oldWindow],
            ["document", oldDocument],
        ] as const) {
            if (previous) Object.defineProperty(globalThis, name, previous);
            else delete (globalThis as any)[name];
        }
    });
    return {
        ...f,
        state,
        assignments,
        focused,
        historyStates,
        actualResolve: route.resolveOfflineRoute,
    };
}

export async function settle() {
    // Decryption uses real async WebCrypto, independently of Vue microtasks.
    await new Promise((resolve) => setTimeout(resolve, 30));
}
