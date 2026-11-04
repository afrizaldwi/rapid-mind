import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import ts from "typescript";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, defineComponent, h, nextTick } from "vue";

// Compile real SFCs; use normal Vue scheduling. This is not browser evidence.
export async function loadVueSource(
    file: string,
    overrides: Record<string, string> = {},
): Promise<any> {
    const filename = resolve(file);
    const source = readFileSync(filename, "utf8");
    const content = file.endsWith(".vue")
        ? compileScript(parse(source, { filename }).descriptor, {
              id: filename,
              inlineTemplate: true,
          }).content
        : source;
    let code = ts.transpileModule(content, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
        },
    }).outputText;
    const imports = [...code.matchAll(/from ["']([^"']+)["']/g)];
    for (const match of imports) {
        const specifier = match[1];
        let target = overrides[specifier];
        if (!target) {
            const local = specifier.startsWith("@/")
                ? resolve("resources/js", specifier.slice(2))
                : specifier.startsWith(".")
                  ? resolve(dirname(filename), specifier)
                  : null;
            if (local) {
                const path = /\.(ts|vue)$/.test(local) ? local : `${local}.ts`;
                target = await vueModuleUrl(path, overrides);
            } else target = import.meta.resolve(specifier);
        }
        code = code.replace(match[0], `from ${JSON.stringify(target)}`);
    }
    return code;
}
export async function vueModuleUrl(
    file: string,
    overrides: Record<string, string> = {},
) {
    return `data:text/javascript,${encodeURIComponent(await loadVueSource(file, overrides))}`;
}
export function moduleStub(value: string) {
    return `data:text/javascript,${encodeURIComponent(value)}`;
}

export function mountFixture(component: any, props: Record<string, any> = {}) {
    function element(tag: string): any {
        return {
            tag,
            tagName: tag.toUpperCase(),
            children: [],
            style: {},
            text: "",
            listeners: {},
            addEventListener(name: string, fn: any) {
                this.listeners[name] = fn;
            },
            removeEventListener() {},
            getRootNode() {
                return null;
            },
            focus() {},
            setAttribute(name: string, value: any) {
                this[name] = value;
            },
            querySelectorAll() {
                return [];
            },
            getClientRects() {
                return [];
            },
        };
    }
    const renderer = createRenderer<any, any>({
        createElement: element,
        createText: (text) => ({ ...element("#text"), text }),
        createComment: () => element("#comment"),
        insert(child, parent, anchor) {
            if (child.parent)
                child.parent.children.splice(
                    child.parent.children.indexOf(child),
                    1,
                );
            const index = anchor ? parent.children.indexOf(anchor) : -1;
            parent.children.splice(
                index < 0 ? parent.children.length : index,
                0,
                child,
            );
            child.parent = parent;
        },
        remove(child) {
            if (child.parent)
                child.parent.children.splice(
                    child.parent.children.indexOf(child),
                    1,
                );
        },
        setText(node, text) {
            node.text = text;
        },
        setElementText(node, text) {
            node.text = text;
            node.children = [];
        },
        patchProp(node, key, _old, value) {
            node[key] = value;
        },
        parentNode: (node) => node.parent,
        nextSibling: (node) =>
            node.parent?.children[node.parent.children.indexOf(node) + 1] ??
            null,
    });
    const root = element("root");
    const app = renderer.createApp(
        defineComponent({ setup: () => () => h(component, props) }),
    );
    app.mount(root);
    const nodes = (predicate: (node: any) => boolean) => {
        const found: any[] = [];
        const visit = (node: any) => {
            if (predicate(node)) found.push(node);
            node.children.forEach(visit);
        };
        visit(root);
        return found;
    };
    const text = (node = root): string =>
        node.text + node.children.map((child: any) => text(child)).join("");
    return {
        root,
        app,
        nodes,
        text,
        flush: async () => {
            for (let i = 0; i < 12; i++) await nextTick();
        },
    };
}
