<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import { t as $t } from "@/i18n";
</script>

<template>
    <Head :title="$t('setup.title', 'Setup')" />

    <main class="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section
            class="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8"
        >
            <p class="text-sm font-medium text-slate-500">RAPID-MIND</p>

            <h1 class="mt-2 text-2xl font-semibold text-slate-900">
                {{ $t("setup.heading", "Fondasi frontend aktif") }}
            </h1>

            <p class="mt-3 text-slate-600">
                {{ $t("setup.description", "Laravel, Inertia, Vue, TypeScript, dan Tailwind berhasil terhubung.") }}
            </p>
        </section>
    </main>
</template>
