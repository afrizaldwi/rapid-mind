<template>
    <div
        class="space-y-5"
    >
        <div>
            <div
                class="pb-2.5 border-b border-slate-100 flex items-center justify-between"
            >
                <div>
                    <h3
                        class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                    >
                        Instrumen SRQ-20 (20 Pertanyaan)
                    </h3>
                    <p
                        class="text-[11px] text-slate-400 mt-0.5"
                    >
                        Skor:
                        <strong
                            class="text-slate-800"
                            >{{
                                item.srqScore !==
                                null
                                    ? `${item.srqScore} / 20`
                                    : "Data SRQ-20 tidak tersedia"
                            }}</strong
                        >
                    </p>
                </div>
                <span
                    v-if="item.srqScore !== null"
                    class="text-xs font-mono font-medium text-slate-600"
                >
                    Skor: {{ item.srqScore }} / 20
                </span>
            </div>

            <div
                v-if="
                    item.srqResponses &&
                    item.srqResponses.length > 0
                "
                class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-xs"
            >
                <div
                    v-for="q in srqQuestions"
                    :key="q.number"
                    class="p-2 rounded-lg border text-xs flex items-start justify-between gap-2"
                    :class="
                        getSrqAnswer(q.number) === true
                            ? 'border-rose-200 bg-rose-50/40 text-rose-950 font-medium'
                            : getSrqAnswer(q.number) ===
                                false
                              ? 'border-slate-100 bg-slate-50/50 text-slate-600'
                              : 'border-slate-100 bg-white text-slate-400 italic'
                    "
                >
                    <span
                        class="text-[11px] leading-tight"
                    >
                        <strong
                            class="font-mono text-[10px] text-slate-500 mr-1"
                            >{{ q.number }}.</strong
                        >
                        {{ q.text }}
                    </span>
                    <span
                        v-if="
                            getSrqAnswer(q.number) ===
                            true
                        "
                        class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white shrink-0"
                    >
                        YA
                    </span>
                    <span
                        v-else-if="
                            getSrqAnswer(q.number) ===
                            false
                        "
                        class="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-200 text-slate-600 shrink-0"
                    >
                        TIDAK
                    </span>
                    <span
                        v-else
                        class="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-400 shrink-0"
                    >
                        -
                    </span>
                </div>
            </div>
            <div
                v-else
                class="py-6 text-center text-xs text-slate-400"
            >
                Data rincian pertanyaan SRQ-20 belum
                tercatat.
            </div>
        </div>

        <!-- Risk Factors & Functioning Breakdown -->
        <div
            class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
        >
            <!-- Risk factors -->
            <div>
                <div
                    class="pb-2 border-b border-slate-100"
                >
                    <h4
                        class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                    >
                        Faktor Risiko Bencana
                    </h4>
                </div>
                <div
                    v-if="
                        item.riskResponses
                            ?.length
                    "
                    class="divide-y divide-slate-100 text-xs"
                >
                    <div
                        v-for="item in riskItems"
                        :key="item.code"
                        class="py-2 flex items-center justify-between text-[11px]"
                    >
                        <!-- <span class="text-slate-700">{{ item.label }}</span> -->
                        <span
                            class="font-bold text-slate-900"
                            >{{
                                formatRiskAnswer(
                                    getRiskAnswer(
                                        item.code,
                                    ),
                                )
                            }}</span
                        >
                    </div>
                </div>
                <div
                    v-else
                    class="py-4 text-center text-xs text-slate-400"
                >
                    Data faktor risiko belum tersedia
                </div>
            </div>

            <!-- Functioning -->
            <div>
                <div
                    class="pb-2 border-b border-slate-100"
                >
                    <h4
                        class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                    >
                        Penilaian Fungsi & ADL
                    </h4>
                </div>
                <div
                    v-if="
                        item.functionResponses
                            ?.length
                    "
                    class="divide-y divide-slate-100 text-xs"
                >
                    <div
                        v-for="domain in [
                            'SELF_CARE',
                            'WORK_PRODUCTIVITY',
                            'FAMILY_SOCIAL',
                            'MOBILITY',
                        ]"
                        :key="domain"
                        class="py-2 flex items-center justify-between text-[11px]"
                    >
                        <span class="text-slate-700">{{
                            domain.replace("_", " ")
                        }}</span>
                        <span
                            class="font-bold text-slate-900"
                            >{{
                                getFunctionLabel(domain)
                            }}</span
                        >
                    </div>
                </div>
                <div
                    v-else
                    class="py-4 text-center text-xs text-slate-400"
                >
                    Data fungsi belum tersedia
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    formatRiskAnswer,
    getFunctionLabel as functionLabelForItem,
    getRiskAnswer as riskAnswerForItem,
    getSrqAnswer as srqAnswerForItem,
    riskItems,
    srqQuestions,
    type HealthcareEmergencyQueueItem,
} from "@/lib/healthcareEmergency";

const props = defineProps<{ item: HealthcareEmergencyQueueItem }>();

function getSrqAnswer(qNumber: number): boolean | null {
    return srqAnswerForItem(props.item, qNumber);
}

function getRiskAnswer(code: string): boolean | null {
    return riskAnswerForItem(props.item, code);
}

function getFunctionLabel(domain: string): string {
    return functionLabelForItem(props.item, domain);
}
</script>
