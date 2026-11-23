<template>
    <div v-if="accounts.length" class="mt-6 border-t border-slate-200 pt-6">
        <p
            class="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
            {{ $t('auth.demoAccountsShortTitle', 'Akun Demo Cepat') }}
        </p>
        <div v-for="group in groups" :key="group.role" class="mb-3 last:mb-0">
            <p class="mb-1.5 text-xs font-semibold text-slate-500">
                {{ $t(`auth.roleGroup.${group.role}`, group.role) }}
            </p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                    v-for="account in group.accounts"
                    :key="account.id"
                    type="button"
                    :data-demo-account="account.id"
                    :disabled="disabled"
                    class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-teal-600 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-60"
                    @click="emit('select', account.email)"
                >
                    <span class="block font-medium">{{ account.name }}</span>
                    <span
                        v-if="account.organization"
                        class="mt-0.5 block text-xs text-slate-500"
                        >{{ account.organization }}</span
                    >
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface DemoLoginAccount {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "RELAWAN" | "HEALTHCARE";
    organization: string | null;
}
const props = defineProps<{
    accounts: DemoLoginAccount[];
    disabled?: boolean;
}>();
const emit = defineEmits<{ select: [email: string] }>();

function $t(key: string, fallback?: string): string {
    try {
        const fn = typeof window !== "undefined" ? (window as any)?.__rapidMindT : undefined;
        return typeof fn === "function" ? fn(key, fallback) : (fallback ?? key);
    } catch {
        return fallback ?? key;
    }
}

const groups = computed(() =>
    (["ADMIN", "RELAWAN", "HEALTHCARE"] as const)
        .map((role) => ({
            role,
            accounts: props.accounts.filter((account) => account.role === role),
        }))
        .filter((group) => group.accounts.length),
);
</script>
