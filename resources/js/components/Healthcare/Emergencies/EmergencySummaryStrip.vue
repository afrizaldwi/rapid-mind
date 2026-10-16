<template>
    <div
        class="bg-white rounded-xl border border-slate-200/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100"
    >
        <!-- Metric 1: ANTREAN AKTIF -->
        <div class="flex-1 min-w-[130px] sm:pr-4">
            <span
                class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                >Antrean Aktif</span
            >
            <div class="flex items-baseline gap-1 mt-0.5">
                <span
                    class="text-2xl font-bold text-slate-900 tracking-tight"
                    >{{ totalSurvivorsCount }}</span
                >
                <span class="text-xs text-slate-400 font-normal">kasus</span>
            </div>
        </div>

        <!-- Metric 2: T0 DARURAT -->
        <div class="flex-1 min-w-[130px] pt-3 sm:pt-0 sm:px-4">
            <div class="flex items-center gap-1.5">
                <span
                    v-if="criticalT0Count > 0"
                    class="w-1.5 h-1.5 rounded-full bg-rose-600"
                ></span>
                <span
                    class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                    >T0 Darurat</span
                >
            </div>
            <div class="flex items-baseline gap-1 mt-0.5">
                <span
                    class="text-2xl font-bold tracking-tight"
                    :class="
                        criticalT0Count > 0 ? 'text-rose-600' : 'text-slate-900'
                    "
                    >{{ criticalT0Count }}</span
                >
                <span class="text-xs text-slate-400 font-normal">kasus</span>
            </div>
        </div>

        <!-- Metric 3: DALAM VERIFIKASI -->
        <div class="flex-1 min-w-[130px] pt-3 sm:pt-0 sm:px-4">
            <span
                class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                >Dalam Verifikasi</span
            >
            <div class="flex items-baseline gap-1 mt-0.5">
                <span
                    class="text-2xl font-bold text-slate-900 tracking-tight"
                    >{{ pendingValidationCount }}</span
                >
                <span class="text-xs text-slate-400 font-normal">kasus</span>
            </div>
        </div>

        <!-- Metric 4: RUJUKAN AKTIF -->
        <div class="flex-1 min-w-[130px] pt-3 sm:pt-0 sm:pl-4">
            <span
                class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                >Rujukan Aktif</span
            >
            <div class="flex items-baseline gap-1 mt-0.5">
                <span
                    class="text-2xl font-bold text-slate-900 tracking-tight"
                    >{{ referralsIssuedCount }}</span
                >
                <span class="text-xs text-slate-400 font-normal">kasus</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    totalSurvivorsCount: number;
    criticalT0Count: number;
    pendingValidationCount: number;
    referralsIssuedCount: number;
}>();
</script>
