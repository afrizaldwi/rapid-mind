<template>
    <div class="space-y-5">
        <!-- Indikator Bahaya / Red Flag (Sections 19, 20: Real data, thin dividers, NO giant red container) -->
        <div class="pt-2">
            <div
                class="flex items-baseline justify-between pb-2.5 border-b border-slate-100"
            >
                <h3
                    class="text-xs font-bold uppercase tracking-wider text-slate-900"
                >
                    Indikator Bahaya
                </h3>
                <span
                    v-if="detectedRedFlags.length > 0"
                    class="text-xs font-semibold text-rose-700"
                >
                    {{ detectedRedFlags.length }} terdeteksi
                </span>
                <span v-else class="text-xs text-slate-400 font-normal"
                    >Tidak ada indikator terdeteksi</span
                >
            </div>

            <div
                v-if="detectedRedFlags.length > 0"
                class="divide-y divide-slate-100"
            >
                <div
                    v-for="rf in detectedRedFlags"
                    :key="rf.key"
                    class="py-3 flex items-start justify-between gap-3 text-xs"
                >
                    <div class="space-y-0.5">
                        <p class="font-bold text-slate-900 text-xs">
                            {{ rf.title }}
                        </p>
                        <p class="text-[11px] text-slate-500 leading-relaxed">
                            {{ rf.evidence }}
                        </p>
                    </div>
                    <span
                        class="text-xs font-semibold text-rose-700 shrink-0 flex items-center gap-1"
                    >
                        ✓ Terdeteksi
                    </span>
                </div>
            </div>
        </div>

        <!-- Clinical Summary (Sections 21, 22: ONE compact strip, 3 equal columns, subtle vertical dividers) -->
        <div class="pt-2">
            <div class="pb-2.5 border-b border-slate-100">
                <h3
                    class="text-xs font-bold uppercase tracking-wider text-slate-900"
                >
                    Ringkasan Hasil Skrining
                </h3>
            </div>
            <div
                class="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 pt-3 pb-1 text-xs"
            >
                <!-- Column 1: SRQ-20 -->
                <div class="sm:pr-4">
                    <span
                        class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                        >SRQ-20</span
                    >
                    <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-bold text-slate-900">
                            {{ item.srqScore !== null ? item.srqScore : "-" }}
                        </span>
                        <span class="text-xs text-slate-400 font-normal"
                            >/ 20</span
                        >
                    </div>
                    <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{
                            item.srqScore !== null
                                ? item.srqScore >= 6
                                    ? "Skor Positif (≥6)"
                                    : "Skor Negatif (<6)"
                                : "Data tidak tersedia"
                        }}
                    </span>
                </div>

                <!-- Column 2: Faktor Risiko -->
                <div class="pt-3 sm:pt-0 sm:px-4">
                    <span
                        class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                        >Faktor Risiko</span
                    >
                    <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-bold text-slate-900">
                            {{ item.riskScore !== null ? item.riskScore : "-" }}
                        </span>
                        <span class="text-xs text-slate-400 font-normal"
                            >/ 8</span
                        >
                    </div>
                    <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{
                            item.riskScore !== null
                                ? item.riskScore >= 3
                                    ? "Risiko Tinggi"
                                    : "Risiko Rendah"
                                : "Data tidak tersedia"
                        }}
                    </span>
                </div>

                <!-- Column 3: Fungsi / ADL -->
                <div class="pt-3 sm:pt-0 sm:pl-4">
                    <span
                        class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block"
                        >Fungsi / ADL</span
                    >
                    <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-xl font-bold text-slate-900">
                            {{
                                item.functionScore !== null
                                    ? item.functionScore
                                    : "-"
                            }}
                        </span>
                        <span class="text-xs text-slate-400 font-normal"
                            >/ 9</span
                        >
                    </div>
                    <span class="text-[11px] text-slate-500 block mt-0.5">
                        {{
                            item.functionScore !== null
                                ? item.functionScore >= 3
                                    ? "Terganggu Berat"
                                    : "Terganggu Ringan"
                                : "Data tidak tersedia"
                        }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Workflow Stepper (Section 23: Lightweight horizontal timeline, small circles, thin line) -->
        <div class="pt-2">
            <div class="pb-2.5 border-b border-slate-100">
                <h3
                    class="text-xs font-bold uppercase tracking-wider text-slate-900"
                >
                    Alur Penanganan
                </h3>
            </div>
            <div class="flex items-center justify-between text-xs pt-3 py-1">
                <!-- Step 1: Laporan -->
                <div class="flex items-center gap-2">
                    <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-teal-50 border border-teal-200 text-teal-700 shrink-0"
                    >
                        ✓
                    </span>
                    <div>
                        <p
                            class="font-semibold text-slate-800 leading-tight text-xs"
                        >
                            Laporan
                        </p>
                        <span
                            class="text-[10px] text-slate-400 block font-normal"
                            >Terdata</span
                        >
                    </div>
                </div>

                <div class="flex-1 h-px bg-slate-200 mx-3"></div>

                <!-- Step 2: Verifikasi -->
                <div class="flex items-center gap-2">
                    <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="
                            item.status !== 'PENDING'
                                ? 'bg-teal-50 border border-teal-200 text-teal-700'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                        "
                    >
                        {{ item.status !== "PENDING" ? "✓" : "2" }}
                    </span>
                    <div>
                        <p
                            class="font-semibold text-slate-800 leading-tight text-xs"
                        >
                            Verifikasi
                        </p>
                        <span
                            class="text-[10px] text-slate-400 block font-normal"
                            >{{
                                item.status === "PENDING"
                                    ? "Menunggu"
                                    : "Selesai"
                            }}</span
                        >
                    </div>
                </div>

                <div class="flex-1 h-px bg-slate-200 mx-3"></div>

                <!-- Step 3: Klasifikasi -->
                <div class="flex items-center gap-2">
                    <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="
                            ['CONFIRMED', 'DOWNGRADED'].includes(item.status)
                                ? 'bg-teal-50 border border-teal-200 text-teal-700'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                        "
                    >
                        {{
                            ["CONFIRMED", "DOWNGRADED"].includes(item.status)
                                ? "✓"
                                : "3"
                        }}
                    </span>
                    <div>
                        <p
                            class="font-semibold text-slate-800 leading-tight text-xs"
                        >
                            Klasifikasi
                        </p>
                        <span
                            class="text-[10px] text-slate-400 block font-normal"
                            >{{
                                ["CONFIRMED", "DOWNGRADED"].includes(
                                    item.status,
                                )
                                    ? "Ditetapkan"
                                    : "Menunggu"
                            }}</span
                        >
                    </div>
                </div>

                <div class="flex-1 h-px bg-slate-200 mx-3"></div>

                <!-- Step 4: Rujukan -->
                <div class="flex items-center gap-2">
                    <span
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        :class="
                            item.hasReferral
                                ? 'bg-teal-50 border border-teal-200 text-teal-700'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                        "
                    >
                        {{ item.hasReferral ? "✓" : "4" }}
                    </span>
                    <div>
                        <p
                            class="font-semibold text-slate-800 leading-tight text-xs"
                        >
                            Rujukan
                        </p>
                        <span
                            class="text-[10px] text-slate-400 block font-normal"
                            >{{
                                item.hasReferral ? "Diterbitkan" : "Menunggu"
                            }}</span
                        >
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type {
    HealthcareEmergencyQueueItem,
    getDetectedRedFlags,
} from "@/lib/healthcareEmergency";

defineProps<{
    item: HealthcareEmergencyQueueItem;
    detectedRedFlags: ReturnType<typeof getDetectedRedFlags>;
}>();
</script>
