<template>
    <div
        class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
        <div class="space-y-1">
            <div class="flex items-center gap-2.5">
                <h2
                    class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
                >
                    {{ item.survivorName }}
                </h2>
                <span class="text-xs font-mono font-medium text-slate-500">
                    {{ item.rmCode }}
                </span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-500">
                <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="
                        item.semanticPriority === 'T0_CONFIRMED'
                            ? 'bg-rose-600'
                            : 'bg-amber-600'
                    "
                ></span>
                <span
                    class="font-bold text-[11px] uppercase tracking-wider"
                    :class="
                        item.semanticPriority === 'T0_CONFIRMED'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                    "
                >
                    {{ item.semanticPriorityLabel }}
                </span>
                <span class="text-slate-300">·</span>
                <span class="text-slate-600">{{
                    item.semanticStatusDescription
                }}</span>
            </div>
        </div>

        <!-- ONE Primary Action CTA on Top Right (Section 14: No duplicate buttons!) -->
        <div class="shrink-0">
            <button
                v-if="item.isEmergency && item.status === 'PENDING'"
                type="button"
                @click="emit('acknowledge', item)"
                :disabled="isSubmitting"
                class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
            >
                Akui Kasus
            </button>
            <button
                v-else-if="['ACKNOWLEDGED', 'REVIEWING'].includes(item.status)"
                type="button"
                @click="emit('open-actions')"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
            >
                Lanjutkan Verifikasi Medis
            </button>
            <button
                v-else-if="item.status === 'CONFIRMED' && !item.hasReferral"
                type="button"
                @click="emit('open-actions')"
                class="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg transition"
            >
                Terbitkan Rujukan Medis
            </button>
            <span
                v-else-if="item.hasReferral"
                class="text-xs font-semibold text-teal-800 flex items-center gap-1"
            >
                <svg
                    class="w-4 h-4 text-teal-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                    />
                </svg>
                <span>Rujukan medis diterbitkan</span>
            </span>
        </div>
    </div>

    <!-- 2. PATIENT METADATA STRIP (Section 15: Clean strip, subtle dividers, NO nested boxes) -->
    <div
        class="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-y-2 text-xs divide-x divide-slate-100 text-slate-600"
    >
        <div class="pr-4">
            <span
                class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                >NIK</span
            >
            <span class="font-mono text-slate-800 font-semibold">{{
                item.maskedNik || "••••"
            }}</span>
        </div>
        <div class="px-4">
            <span
                class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                >Usia</span
            >
            <span class="text-slate-800 font-semibold">{{
                item.age !== null ? `${item.age} tahun` : "-"
            }}</span>
        </div>
        <div class="px-4">
            <span
                class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                >Jenis Kelamin</span
            >
            <span class="text-slate-800 font-semibold">{{
                item.genderLabel || "-"
            }}</span>
        </div>
        <div class="pl-4">
            <span
                class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                >Lokasi Posko</span
            >
            <span class="text-slate-800 font-semibold">{{
                item.shelterName
            }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { HealthcareEmergencyQueueItem } from "@/lib/healthcareEmergency";

type HeaderItem = HealthcareEmergencyQueueItem & { genderLabel?: string };

defineProps<{
    item: HeaderItem;
    isSubmitting: boolean;
}>();

const emit = defineEmits<{
    acknowledge: [item: HeaderItem];
    "open-actions": [];
}>();
</script>
