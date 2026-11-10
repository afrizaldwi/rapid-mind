import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';
import { moduleStub, mountFixture, vueModuleUrl } from './helpers/mountedVueFixture.ts';

const accounts = [
    { id: 'admin', name: 'Database Admin', email: 'admin@example.invalid', role: 'ADMIN', organization: null },
    { id: 'r1', name: 'Database Volunteer A', email: 'a@example.invalid', role: 'RELAWAN', organization: 'Posko A' },
    { id: 'r3', name: 'Database Volunteer B', email: 'b@example.invalid', role: 'RELAWAN', organization: 'Posko B' },
    { id: 'h1', name: 'Database Healthcare A', email: 'ha@example.invalid', role: 'HEALTHCARE', organization: 'Faskes A' },
    { id: 'h2', name: 'Database Healthcare B', email: 'hb@example.invalid', role: 'HEALTHCARE', organization: 'Faskes B' },
];
const inertia = moduleStub('export const router = { post: (...args) => globalThis.__demoLoginCalls.push(args) };');
const continuity = moduleStub('export const lockRelawanContinuity = async () => {}; export const recordVerifiedRelawan = async () => {};');
async function login(props: any = {}) {
    (globalThis as any).Document = class {};
    (globalThis as any).ShadowRoot = class {};
    (globalThis as any).__demoLoginCalls = [];
    const filename = 'resources/js/Pages/Auth/Login.vue';
    const compiled = compileScript(parse(readFileSync(filename, 'utf8'), { filename }).descriptor, {
        id: 'demo-login-test', inlineTemplate: true,
        templateOptions: { compilerOptions: { hoistStatic: false } },
    });
    let code = ts.transpileModule(compiled.content, { compilerOptions: {
        target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    } }).outputText;
    const replacements: Record<string, string> = {
        vue: import.meta.resolve('vue'), '@inertiajs/vue3': inertia,
        '@/offline/relawanContinuity': continuity,
        '@/components/DemoLoginAccounts.vue': await vueModuleUrl('resources/js/components/DemoLoginAccounts.vue'),
    };
    code = code.replace(/from (["'])([^"']+)\1/g, (whole, _quote, specifier) =>
        replacements[specifier] ? `from ${JSON.stringify(replacements[specifier])}` : whole);
    return mountFixture((await import(`data:text/javascript,${encodeURIComponent(code)}`)).default, props);
}

test('database-driven shortcuts show five grouped choices and organization labels', async () => {
    const f = await login({ demoAccounts: accounts });
    assert.equal(f.nodes(n => n['data-demo-account']).length, 5);
    for (const a of accounts) assert.ok(f.text().includes(a.name));
    assert.ok(f.text().includes('Posko A') && f.text().includes('Faskes B'));
    f.app.unmount();
});

test('selection clears previous password, focuses password and requires normal form submission', async () => {
    const f = await login({ demoAccounts: accounts });
    const password = f.nodes(n => n.id === 'password')[0];
    password.value = 'private-test-input';
    password.listeners.input({ target: password });
    let focused = 0;
    password.focus = () => focused++;
    f.nodes(n => n['data-demo-account'] === 'r3')[0].onClick();
    await f.flush();
    assert.equal(f.nodes(n => n.id === 'email')[0].value, accounts[2].email);
    assert.equal(password.value, '');
    assert.equal(focused, 1);
    assert.equal((globalThis as any).__demoLoginCalls.length, 0);
    password.value = 'explicit-user-test-input';
    password.listeners.input({ target: password });
    f.nodes(n => n.tag === 'form')[0].onSubmit({ preventDefault() {} });
    const [endpoint, values] = (globalThis as any).__demoLoginCalls[0];
    assert.equal(endpoint, '/login');
    assert.equal(values.email, accounts[2].email);
    assert.equal(values.password, 'explicit-user-test-input');
    f.app.unmount();
});

test('ordinary login without fixture metadata has no demo shortcuts', async () => {
    const f = await login();
    assert.equal(f.nodes(n => n['data-demo-account']).length, 0);
    assert.ok(!f.text().includes('Akun Demo Cepat'));
    assert.equal(f.nodes(n => n.type === 'submit').length, 1);
    f.app.unmount();
});
