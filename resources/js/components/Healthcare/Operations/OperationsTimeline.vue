<template>
    <section
        class="space-y-2 text-xs"
        :aria-label="$t('healthcare.operations.timelineAria', 'Riwayat rujukan dan respons lapangan')"
    >
        <h3 class="font-bold text-slate-900">
            {{ $t('healthcare.operations.timelineTitle', 'Riwayat Rujukan & Respons Lapangan') }}
        </h3>
        <p v-if="!operations?.available" class="text-amber-800">
            {{ $t('healthcare.operations.timelineUnavailable', 'Riwayat respons belum tersedia: skema Dispatch belum siap.') }}
        </p>
        <p v-else-if="!rows.length" class="text-slate-500">
            {{ $t('healthcare.operations.timelineEmpty', 'Belum ada peristiwa rujukan atau respons tercatat.') }}
        </p>
        <ol class="space-y-2">
            <li
                v-for="row in rows"
                :key="row.key"
                class="border-l-2 border-slate-200 pl-3"
            >
                <strong>{{ row.domain }} — {{ row.label }}</strong>
                <p>
                    {{ row.actor?.name || $t('healthcare.operations.actorUnrecorded', 'Pelaku tidak tercatat') }} •
                    {{ formatDateTime(row.created_at, activeLocale) }}
                </p>
                <p v-if="row.referral_id">{{ $t('healthcare.operations.referralPrefix', 'Rujukan:') }} {{ row.referral_id }}</p>
                <p v-if="row.notes" class="text-slate-600">{{ row.notes }}</p>
            </li>
        </ol>
    </section>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { timeline, type Operations } from "@/lib/healthcareOperations";
import { formatDateTime } from "@/lib/healthcareEmergency";

const activeLocale = computed(
    () =>
        (globalThis as any)?.__rapidMindLocale?.value ||
        (typeof window !== "undefined" ? (window as any)?.__rapidMindLocale?.value : null) ||
        "id",
);
function $t(key: string, fallback: string): string {
    const fn =
        (globalThis as any)?.__rapidMindT ||
        (typeof window !== "undefined" ? (window as any)?.__rapidMindT : null);
    return typeof fn === "function" ? fn(key, fallback) : fallback;
}

const props = defineProps<{ operations?: Operations }>();
const rows = computed(() => timeline(props.operations, activeLocale.value));
</script>
