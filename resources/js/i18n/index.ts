import { computed, ref, type App, type Plugin } from "vue";
import type { LocaleOption, SupportedLocale, TranslationDictionary } from "./types";
import id from "./locales/id";
import en from "./locales/en";
import { localizeMessage } from "./localizeMessage";

export * from "./types";
export { localizeMessage };

const STORAGE_KEY = "rapid_mind_locale";

export const AVAILABLE_LOCALES: readonly LocaleOption[] = [
    { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩", shortLabel: "ID" },
    { code: "en", label: "English", flag: "🇬🇧", shortLabel: "EN" },
] as const;

const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
    id,
    en,
};

function getInitialLocale(): SupportedLocale {
    if (typeof window !== "undefined" && window.localStorage) {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved === "en" || saved === "id") {
                return saved;
            }
        } catch {
            // Ignore storage access exceptions in sandboxed contexts.
        }
    }
    return "id";
}

const currentLocale = ref<SupportedLocale>(getInitialLocale());
if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = currentLocale.value;
}

export function getLocale(): SupportedLocale {
    return currentLocale.value;
}

export function setLocale(locale: SupportedLocale): void {
    if (locale !== "id" && locale !== "en") return;
    currentLocale.value = locale;
    if (typeof window !== "undefined") {
        try {
            window.localStorage?.setItem(STORAGE_KEY, locale);
        } catch {}
        if (typeof document !== "undefined" && document.documentElement) {
            document.documentElement.lang = locale;
        }
    }
}

function resolveKey(dict: TranslationDictionary, path: string): string | undefined {
    const segments = path.split(".");
    let current: any = dict;
    for (const segment of segments) {
        if (current === undefined || current === null || typeof current !== "object") {
            return undefined;
        }
        current = current[segment];
    }
    return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, params?: Record<string, string | number>): string {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, key) => {
        return key in params ? String(params[key]) : match;
    });
}

export function t(
    key: string,
    paramsOrFallback?: Record<string, string | number> | string,
    fallbackOrParams?: string | Record<string, string | number>,
): string {
    let params: Record<string, string | number> | undefined;
    let actualFallback: string | undefined;

    if (typeof paramsOrFallback === "string") {
        actualFallback = paramsOrFallback;
        params = typeof fallbackOrParams === "object" ? fallbackOrParams : undefined;
    } else {
        params = paramsOrFallback;
        actualFallback = typeof fallbackOrParams === "string" ? fallbackOrParams : undefined;
    }

    const activeDict = dictionaries[currentLocale.value] ?? dictionaries.id;
    let resolved = resolveKey(activeDict, key);
    if (resolved === undefined && currentLocale.value !== "id") {
        // Fallback to Indonesian if missing in English
        resolved = resolveKey(dictionaries.id, key);
    }
    if (resolved === undefined) {
        return actualFallback !== undefined ? interpolate(actualFallback, params) : key;
    }
    return interpolate(resolved, params);
}

export function useI18n() {
    return {
        locale: currentLocale,
        currentLocale: computed(() => currentLocale.value),
        isId: computed(() => currentLocale.value === "id"),
        isEn: computed(() => currentLocale.value === "en"),
        availableLocales: AVAILABLE_LOCALES,
        setLocale,
        t,
    };
}

export const i18nPlugin: Plugin = {
    install(app: App) {
        if (typeof globalThis !== "undefined") {
            (globalThis as any).__rapidMindLocale = currentLocale;
            (globalThis as any).__rapidMindSetLocale = setLocale;
            (globalThis as any).__rapidMindLocalize = (
                message: string | null | undefined,
                localeOverride?: SupportedLocale,
            ) => localizeMessage(message, localeOverride ?? currentLocale.value);
            (globalThis as any).__rapidMindT = (
                key: string,
                arg2?: string | Record<string, string | number>,
                arg3?: string | Record<string, string | number>,
            ) => {
                if (typeof arg2 === "string") {
                    return t(key, typeof arg3 === "object" ? arg3 : undefined, arg2);
                }
                return t(key, arg2, typeof arg3 === "string" ? arg3 : undefined);
            };
        }
        app.config.globalProperties.$t = t;
        app.config.globalProperties.$locale = currentLocale;
        app.provide("i18n", useI18n());
    },
};

declare module "vue" {
    interface ComponentCustomProperties {
        $t: typeof t;
        $locale: typeof currentLocale;
    }
}

export default i18nPlugin;

