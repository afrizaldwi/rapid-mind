export type SupportedLocale = "id" | "en";

export interface LocaleOption {
    code: SupportedLocale;
    label: string;
    flag: string;
    shortLabel: string;
}

export type TranslationDictionary = Record<string, any>;

