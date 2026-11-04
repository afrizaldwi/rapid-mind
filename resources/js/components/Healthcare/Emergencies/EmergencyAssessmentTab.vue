<template>
    <div class="space-y-5">
        <AssessmentContextSummary :context="item.assessmentContext" />
        <section class="space-y-3">
            <h3 class="text-sm font-bold text-slate-900">Instrumen SRQ-20</h3>
            <p class="text-sm text-slate-700">
                Skor SRQ-20:
                {{
                    item.srqScore !== null
                        ? `${item.srqScore} / 20`
                        : "Belum tersedia"
                }}
            </p>
            <SrqResponseList
                :responses="item.assessmentContext.responses"
                columns
            />
        </section>

        <!-- Risk Factors & Functioning Breakdown -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <!-- Risk factors -->
            <div>
                <div class="pb-2 border-b border-slate-100">
                    <h4
                        class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                    >
                        Faktor Risiko Bencana
                    </h4>
                </div>
                <div
                    v-if="item.riskResponses?.length"
                    class="divide-y divide-slate-100 text-xs"
                >
                    <div
                        v-for="item in riskItems"
                        :key="item.code"
                        class="py-2 flex items-center justify-between text-[11px]"
                    >
                        <span class="text-slate-700">{{ item.title }}</span>
                        <span class="font-bold text-slate-900">{{
                            formatRiskAnswer(getRiskAnswer(item.code))
                        }}</span>
                    </div>
                </div>
                <div v-else class="py-4 text-center text-xs text-slate-400">
                    Data faktor risiko belum tersedia
                </div>
            </div>

            <!-- Functioning -->
            <div>
                <div class="pb-2 border-b border-slate-100">
                    <h4
                        class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                    >
                        Penilaian Fungsi & ADL
                    </h4>
                </div>
                <div
                    v-if="item.functionResponses?.length"
                    class="divide-y divide-slate-100 text-xs"
                >
                    <div
                        v-for="domain in ['F1', 'F2', 'F3']"
                        :key="domain"
                        class="py-2 flex items-center justify-between text-[11px]"
                    >
                        <span class="text-slate-700">{{
                            functionLabels[domain]
                        }}</span>
                        <span class="font-bold text-slate-900">{{
                            getFunctionLabel(domain)
                        }}</span>
                    </div>
                </div>
                <div v-else class="py-4 text-center text-xs text-slate-400">
                    Data fungsi belum tersedia
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import AssessmentContextSummary from "@/components/Healthcare/Assessments/AssessmentContextSummary.vue";
import SrqResponseList from "@/components/Healthcare/Assessments/SrqResponseList.vue";
const functionLabels: Record<string, string> = {
    F1: "Perawatan diri",
    F2: "Fungsi peran dan sosial",
    F3: "Akses kebutuhan dan bantuan",
};
import {
    formatRiskAnswer,
    getFunctionLabel as functionLabelForItem,
    getRiskAnswer as riskAnswerForItem,
    riskItems,
    type HealthcareEmergencyQueueItem,
} from "@/lib/healthcareEmergency";

const props = defineProps<{ item: HealthcareEmergencyQueueItem }>();

function getRiskAnswer(code: string): boolean | null {
    return riskAnswerForItem(props.item, code);
}

function getFunctionLabel(domain: string): string {
    return functionLabelForItem(props.item, domain);
}
</script>
