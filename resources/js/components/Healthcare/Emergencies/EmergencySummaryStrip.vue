<template>
    <div
        class="hc-metrics grid grid-cols-2 xl:grid-cols-4 gap-2.5"
    >
        <!-- Metric 1: ANTREAN AKTIF -->
        <div class="hc-metric">
            <span
                class="text-xs font-medium text-slate-600 block"
                >{{ $t('healthcare.summaryStrip.activeQueue', 'Antrean Aktif') }}</span
            >
            <div class="flex items-baseline gap-1">
                <span
                    class="text-2xl font-bold text-slate-900 tracking-tight"
                    >{{ totalSurvivorsCount }}</span
                >
                <span class="text-xs text-slate-400 font-normal">{{ $t('healthcare.summaryStrip.cases', 'kasus') }}</span>
            </div>
        </div>

        <!-- Metric 2: T0 DARURAT -->
        <div class="hc-metric">
            <div class="flex items-center gap-1.5">
                <span
                    v-if="criticalT0Count > 0"
                    class="w-1.5 h-1.5 shrink-0 rounded-full bg-rose-600"
                    aria-hidden="true"
                ></span>
                <span
                    class="text-xs font-medium text-slate-600 block"
                    >{{ $t('healthcare.summaryStrip.t0Emergency', 'T0 Darurat') }}</span
                >
            </div>
            <div class="flex items-baseline gap-1">
                <span
                    class="text-2xl font-bold tracking-tight"
                    :class="
                        criticalT0Count > 0 ? 'text-rose-600' : 'text-slate-900'
                    "
                    >{{ criticalT0Count }}</span
                >
                <span class="text-xs text-slate-400 font-normal">{{ $t('healthcare.summaryStrip.cases', 'kasus') }}</span>
            </div>
        </div>

        <!-- Metric 3: DALAM VERIFIKASI -->
        <div class="hc-metric">
            <span
                class="text-xs font-medium text-slate-600 block"
                >{{ $t('healthcare.summaryStrip.inVerification', 'Dalam Verifikasi') }}</span
            >
            <div class="flex items-baseline gap-1">
                <span
                    class="text-2xl font-bold text-slate-900 tracking-tight"
                    >{{ pendingValidationCount }}</span
                >
                <span class="text-xs text-slate-400 font-normal">{{ $t('healthcare.summaryStrip.cases', 'kasus') }}</span>
            </div>
        </div>

        <!-- Metric 4: RUJUKAN AKTIF -->
        <div class="hc-metric">
            <span
                class="text-xs font-medium text-slate-600 block"
                >{{ $t('healthcare.summaryStrip.activeReferrals', 'Rujukan Aktif') }}</span
            >
            <div class="flex items-baseline gap-1">
                <span
                    class="text-2xl font-bold text-slate-900 tracking-tight"
                    >{{ referralsIssuedCount }}</span
                >
                <span class="text-xs text-slate-400 font-normal">{{ $t('healthcare.summaryStrip.cases', 'kasus') }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { t as $t } from "@/i18n";

defineProps<{
    totalSurvivorsCount: number;
    criticalT0Count: number;
    pendingValidationCount: number;
    referralsIssuedCount: number;
}>();
</script>
