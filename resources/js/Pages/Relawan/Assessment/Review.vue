<template>
    <RelawanLayout @clinical-lock="scope.invalidate" @clinical-ready="loadReview">
        <div class="flex-1 min-h-0 flex flex-col">
            <div class="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-6 pt-3 pb-20 lg:pb-6 space-y-4">
                <div
                    class="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200"
                >
                    <span
                        class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800"
                    >
                        {{ isEn ? "Review Before Finalization" : "Tinjau Sebelum Finalisasi" }}
                    </span>
                    <h2 class="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                        {{ isEn ? "Assessment Sheet Summary" : "Ringkasan Lembar Asesmen" }}
                    </h2>
                    <p class="text-xs text-slate-500 mt-1">
                        {{ isEn ? "Ensure answers and observations have been validated with the survivor." : "Pastikan jawaban dan observasi telah divalidasi bersama penyintas." }}
                    </p>
                </div>

                <!-- Identity Review Card -->
                <div
                    class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-1.5"
                >
                    <h3
                        class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                        {{ isEn ? "Survivor Identity" : "Identitas Penyintas" }}
                    </h3>
                    <div class="text-sm font-bold text-slate-900">
                        {{ localPatient?.name }} ({{
                            localPatient?.age
                                ? `${localPatient.age} ${isEn ? "years old" : "tahun"}`
                                : (isEn ? "Age not recorded" : "Usia tidak terdata")
                        }}
                        / {{ formatGender(localPatient?.gender) }})
                    </div>
                    <p class="text-xs text-slate-500">
                        NIK: {{ localPatient?.nik || (isEn ? "Without NIK" : "Tanpa NIK") }} • Mode:
                        {{ localAssessment?.mode === "NON_VERBAL" ? "Non-Verbal" : "Verbal" }}
                    </p>
                </div>

                <section v-if="unresolved.length" role="alert" class="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm sm:text-base text-amber-950">
                    <h2 class="font-bold">
                        {{ isEn ? `${unresolved.length} SRQ answers require clarification` : `${unresolved.length} jawaban SRQ perlu diklarifikasi` }}
                    </h2>
                    <p>
                        {{ isEn ? "Definitive scores and finalization are not available yet. Review the following responses with the survivor." : "Skor definitif dan finalisasi belum tersedia. Periksa respons berikut bersama penyintas." }}
                    </p>
                    <ul class="space-y-2">
                        <li v-for="item in unresolved" :key="item.number">
                            <RelawanLink :href="`/relawan/assessment/${assessment.id}/srq#srq-question-${item.number}`" class="inline-flex min-h-11 items-center rounded-lg px-2 underline focus-visible:outline-2 focus-visible:outline-teal-700">
                                {{ isEn ? `Question ${item.number}: ${item.label} — Clarify` : `Pertanyaan ${item.number}: ${item.label} — Klarifikasi` }}
                            </RelawanLink>
                        </li>
                    </ul>
                </section>
                <section v-if="localAssessment?.non_verbal_reasons?.length" class="space-y-2 rounded-xl border border-slate-300 bg-white p-4 text-sm sm:text-base">
                    <h2 class="font-bold">{{ isEn ? "Communication Observations" : "Observasi komunikasi" }}</h2>
                    <ul class="list-disc pl-5"><li v-for="reason in localAssessment.non_verbal_reasons" :key="reason">{{ getObservationLabel(reason, locale) }}</li></ul>
                    <p v-if="localAssessment.non_verbal_other_note" class="whitespace-pre-wrap break-words">{{ localAssessment.non_verbal_other_note }}</p>
                    <p class="text-xs sm:text-sm text-slate-600">{{ isEn ? "Observation notes do not determine score or diagnosis." : "Catatan observasi tidak menentukan skor atau diagnosis." }}</p>
                </section>

                <!-- Subtotal Breakdown -->
                <div class="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                    <div
                        class="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs min-w-0"
                    >
                        <p class="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate">
                            SRQ-20
                        </p>
                        <p class="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">
                            {{ srqYesCount }}
                        </p>
                        <p class="text-[10px] text-slate-400 leading-tight">{{ isEn ? "out of 20 Yes" : "dari 20 Ya" }}</p>
                    </div>

                    <div
                        class="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs min-w-0"
                    >
                        <p class="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase leading-tight">
                            {{ isEn ? "Risk Factors" : "Faktor Risiko" }}
                        </p>
                        <p class="text-lg sm:text-xl font-extrabold text-amber-800 mt-0.5 sm:mt-1">
                            {{ riskScore }}
                        </p>
                        <p class="text-[10px] text-slate-400 leading-tight">{{ isEn ? "out of 8 Pts" : "dari 8 Poin" }}</p>
                    </div>

                    <div
                        class="bg-white p-2.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs min-w-0"
                    >
                        <p class="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase leading-tight">
                            {{ isEn ? "Daily Function" : "Fungsi Harian" }}
                        </p>
                        <p class="text-lg sm:text-xl font-extrabold text-teal-800 mt-0.5 sm:mt-1">
                            {{ functionScore }}
                        </p>
                        <p class="text-[10px] text-slate-400 leading-tight">{{ isEn ? "out of 9 Pts" : "dari 9 Poin" }}</p>
                    </div>
                </div>

                <!-- Estimation Card -->
                <div
                    v-if="assessmentComplete"
                    class="bg-teal-50 border border-teal-200 rounded-xl p-4 sm:p-5 space-y-2"
                >
                    <div
                        class="flex items-center space-x-2 text-teal-900 font-bold text-sm"
                    >
                        <Calculator class="h-4 w-4 shrink-0" aria-hidden="true" />
                        <h4>{{ isEn ? "Deterministic System Calculation" : "Kalkulasi Deterministik Sistem" }}</h4>
                    </div>
                    <p class="text-xs text-teal-950 leading-relaxed" v-if="persistence.online">
                        {{ isEn ? 'Estimated total score:' : 'Total skor estimasi:' }} <strong>{{ totalScore }} / 37</strong>.
                        {{ isEn ? 'The final system recommendation is calculated and saved by the server when you finalize.' : 'Rekomendasi sistem final dihitung dan disimpan oleh server saat asesmen diselesaikan.' }}
                    </p>
                    <p class="text-xs text-teal-950 leading-relaxed" v-else-if="isEn">
                        Estimated total score:
                        <strong>{{ totalScore }} / 37 points</strong>. System recommendation is calculated and saved on this device. Server synchronization runs separately.
                    </p>
                    <p class="text-xs text-teal-950 leading-relaxed" v-else>
                        Total skor estimasi:
                        <strong>{{ totalScore }} / 37 poin</strong>. Rekomendasi
                        sistem dihitung dan disimpan di perangkat ini. Sinkronisasi
                        server berjalan terpisah.
                    </p>
                </div>

                <p
                    v-if="!assessmentComplete"
                    role="alert"
                    class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900"
                >
                    {{ isEn ? "Assessment is incomplete. Please review SRQ-20 answers, risk factors, and daily functioning." : "Asesmen belum lengkap. Periksa kembali jawaban SRQ-20, faktor risiko, dan fungsi harian." }}
                </p>
            </div>

            <!-- Sticky Action Bar -->
            <div
                data-assessment-action-bar
                class="shrink-0 bg-white border-t border-slate-200 px-3.5 sm:px-4 py-2 sm:py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] z-30"
            >
                <div class="flex items-center justify-between gap-2.5 sm:gap-3">
                    <RelawanLink
                        :href="`/relawan/assessment/${assessment.id}/function`"
                        class="shrink-0 min-h-[44px] flex items-center justify-center py-2.5 px-3.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                        ← {{ isEn ? "Back" : "Kembali" }}
                    </RelawanLink>
                    <button
                        type="button"
                        :disabled="isSubmitting || !assessmentComplete"
                        @click="finalizeAssessment"
                        class="flex-1 min-h-[44px] py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm leading-tight shadow-md transition disabled:opacity-60 cursor-pointer"
                    >
                        <span v-if="isSubmitting">{{ isEn ? "Calculating Recommendation…" : "Menghitung Rekomendasi…" }}</span>
                        <span v-else>{{ isEn ? "FINALIZE & VIEW TRIAGE →" : "SELESAIKAN & LIHAT TRIASE →" }}</span>
                    </button>
                </div>
                <p
                    v-if="completionError"
                    role="alert"
                    class="mt-1.5 text-xs font-semibold text-red-800"
                >
                    {{ completionError }}
                </p>
            </div>
        </div>
    </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Calculator } from "lucide-vue-next";
import RelawanLink from "@/relawan/RelawanLink.vue";
import RelawanLayout from "@/layouts/RelawanLayout.vue";
import { useRelawanRuntime } from "@/relawan/runtime";
import {
    exactAssessmentAnswers,
    relawanOwner,
    type ServerAssessment,
    type ServerPatient,
} from "@/offline/assessmentWorkflow";
import { RiskCalculator } from "@/domain/triage/riskCalculator";
import type { LocalAssessment, LocalPatient } from "@/offline/db";
import { SrqCalculator } from "@/domain/triage/srqCalculator";
import { hasDefinitiveSrqAnswers, srqAnswerLabel } from "@/domain/srq/srqAnswer";

import { getObservationLabel } from "@/domain/assessment/observationPresentation";
import { useClinicalTaskScope } from "@/composables/useClinicalTaskScope";
import { useAssessmentPersistence } from "@/composables/useAssessmentPersistence";
import { useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";

const { locale } = useI18n();
const isEn = computed(() => locale.value === "en");

function formatGender(value?: string | null): string {
    if (!value) return isEn.value ? "Gender not recorded" : "Jenis kelamin tidak terdata";
    const upper = value.toUpperCase();
    if (upper === "P" || upper === "PEREMPUAN" || upper === "FEMALE") {
        return isEn.value ? "Female" : "Perempuan";
    }
    if (upper === "L" || upper === "LAKI-LAKI" || upper === "MALE") {
        return isEn.value ? "Male" : "Laki-laki";
    }
    return value;
}

const props = defineProps<{
    assessment: ServerAssessment;
    patient?: ServerPatient | null;
}>();
const runtime = useRelawanRuntime();
const persistence = useAssessmentPersistence(props.assessment, props.patient);
const { loadAssessmentContext, completeLocalAssessment } = persistence;
const owner = relawanOwner();
const localAssessment = ref<LocalAssessment | null>(null);
const localPatient = ref<LocalPatient | null>(null);
const isSubmitting = ref(false);
const rawCompletionError = ref("");
const completionError = computed(() =>
    localizeMessage(rawCompletionError.value, locale.value),
);
const scope = useClinicalTaskScope(() => { persistence.invalidate(); localAssessment.value = null; localPatient.value = null; isSubmitting.value = false; }, { serverOnly: persistence.online });
onMounted(() => { if (persistence.online) void loadReview(); });
const unresolved = computed(() => localAssessment.value ? Array.from({ length: 20 }, (_, index) => {
    const number = index + 1;
    const answer = localAssessment.value!.srq_answers?.[number];
    const label = isEn.value
        ? (answer === "UNCLEAR" ? "Unclear Response" : "Unanswered")
        : srqAnswerLabel(answer);
    return { number, answer, label };
}).filter(item => typeof item.answer !== "boolean") : []);
const assessmentComplete = computed(
    () =>
        !!localAssessment.value &&
        exactAssessmentAnswers(localAssessment.value),
);
const srqYesCount = computed(() =>
    hasDefinitiveSrqAnswers(localAssessment.value?.srq_answers)
        ? new SrqCalculator().calculate(localAssessment.value!.srq_answers!)
        : "—",
);
const riskScore = computed(() =>
    new RiskCalculator().calculate(
        localAssessment.value?.risk_indicators ?? {},
    ),
);
const functionScore = computed(() =>
    Object.values(localAssessment.value?.function_domains ?? {}).reduce(
        (sum, value) => sum + value,
        0,
    ),
);
const totalScore = computed(() =>
    assessmentComplete.value && typeof srqYesCount.value === "number"
        ? srqYesCount.value + riskScore.value + functionScore.value
        : null,
);
async function loadReview() {
    if (runtime.owner !== owner) return;
    const current = scope.capture();
    try {
        const context = await loadAssessmentContext(
            owner,
            props.assessment,
            props.patient,
            runtime.mode === "OFFLINE_FIELD_MODE",
        );
        if (!current()) return;
        localAssessment.value = context.assessment;
        localPatient.value = context.patient;
    } catch (error) {
        if (!current()) return;
        rawCompletionError.value =
            error instanceof Error
                ? error.message
                : "Asesmen lokal tidak tersedia.";
    }
}
async function finalizeAssessment() {
    if (isSubmitting.value || !assessmentComplete.value) return;
    const current = scope.capture();
    isSubmitting.value = true;
    rawCompletionError.value = "";
    try {
        await completeLocalAssessment(owner, props.assessment.id, current);
        if (!current()) return;
        runtime.navigate(`/relawan/assessment/${props.assessment.id}/result`);
    } catch (error) {
        if (!current()) return;
        rawCompletionError.value =
            error instanceof Error
                ? error.message
                : "Asesmen belum dapat diselesaikan.";
    } finally {
        if (current()) isSubmitting.value = false;
    }
}
</script>
