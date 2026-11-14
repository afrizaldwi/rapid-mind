<template>
    <div
        class="rm-language inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 text-xs font-semibold transition select-none"
        :class="compact ? 'text-[11px]' : 'text-xs'"
        role="group"
        :aria-label="$t('common.languageSwitcherAria', 'Pilih Bahasa / Switch Language')"
    >
        <button
            type="button"
            class="flex items-center gap-1 rounded-md px-2 py-1 transition cursor-pointer"
            :class="
                locale === 'id'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
            "
            :aria-pressed="locale === 'id'"
            @click="setLocale('id')"
            title="Bahasa Indonesia"
        >
            <span v-if="!compact" aria-hidden="true" class="text-xs">🇮🇩</span>
            <span>ID</span>
        </button>
        <span class="sr-only" aria-hidden="true">|</span>
        <button
            type="button"
            class="flex items-center gap-1 rounded-md px-2 py-1 transition cursor-pointer"
            :class="
                locale === 'en'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
            "
            :aria-pressed="locale === 'en'"
            @click="setLocale('en')"
            title="English"
        >
            <span v-if="!compact" aria-hidden="true" class="text-xs">🇬🇧</span>
            <span>EN</span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { useI18n, t as $t } from "@/i18n";

withDefaults(
    defineProps<{
        compact?: boolean;
    }>(),
    {
        compact: false,
    },
);

const { locale, setLocale } = useI18n();
</script>
