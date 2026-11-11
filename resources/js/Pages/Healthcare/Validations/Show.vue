<template>
    <HealthcareLayout>
        <div class="max-w-4xl space-y-5">
            <!-- Back Navigation -->
            <div>
                <Link
                    href="/healthcare/validations"
                    class="text-xs font-semibold text-teal-800 hover:text-teal-900 flex items-center gap-1 transition"
                >
                    <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    <span>{{ $t('healthcare.validationShow.backToList', 'Kembali ke Daftar Validasi') }}</span>
                </Link>
            </div>

            <!-- 1. Patient & System Recommendation Surface (Unified) -->
            <div
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4"
            >
                <div
                    class="flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 text-xs">
                            <span
                                class="font-bold text-slate-400 uppercase tracking-wider"
                                >{{ $t('healthcare.validations.title', 'Validasi Asesmen') }}</span
                            >
                            <span class="text-slate-300">·</span>
                            <span
                                v-if="assessmentContext.finalized"
                                class="inline-flex items-center gap-1.5 font-bold"
                                :class="
                                    assessment.triage_result
                                        ?.system_recommendation === 'T1'
                                        ? 'text-orange-700'
                                        : 'text-amber-700'
                                "
                            >
                                <span
                                    class="w-1.5 h-1.5 rounded-full shrink-0"
                                    :class="
                                        assessment.triage_result
                                            ?.system_recommendation === 'T1'
                                            ? 'bg-orange-600'
                                            : 'bg-amber-600'
                                    "
                                ></span>
                                {{ $t('healthcare.validationShow.recommendationPrefix', 'Rekomendasi:') }}
                                {{
                                    assessment.triage_result
                                        ?.system_recommendation
                                }}
                            </span>
                        </div>
                        <h1
                            class="text-xl font-bold text-slate-900 tracking-tight"
                        >
                            {{
                                assessment.patient?.name ||
                                $t('healthcare.validations.unrecordedPatient', 'Pasien tidak tercatat')
                            }}
                        </h1>
                        <p class="text-xs text-slate-500">
                            NIK:
                            <span class="font-mono text-slate-700">{{
                                assessment.patient?.nik || $t('assessment.notRecorded', 'Tidak tercatat')
                            }}</span>
                            • {{ $t('assessment.ageLabel', 'Usia') }}: {{ assessment.patient?.age ?? "-" }} {{ $t('common.years', 'th') }} •
                            {{ $t('common.shelter', 'Posko') }}:
                            <span class="text-slate-700">{{
                                assessment.patient?.shelter?.name ||
                                $t('assessment.notRecorded', 'Tidak tercatat')
                            }}</span>
                        </p>
                    </div>

                    <div class="shrink-0 text-left sm:text-right text-xs">
                        <span
                            class="text-slate-400 block text-[10px] uppercase font-semibold"
                            >{{ $t('healthcare.validationShow.assessmentTime', 'Waktu Asesmen') }}</span
                        >
                        <span class="font-medium text-slate-700">{{
                            formatDate(assessment.completed_at)
                        }}</span>
                        <div class="mt-1">
                            <Link
                                :href="`/healthcare/patients/${assessment.patient_id}`"
                                class="text-xs font-semibold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1"
                            >
                                <span>{{ $t('healthcare.validationShow.viewPatientRecord', 'Lihat rekam pasien') }}</span>
                                <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <!-- Clinical Score Breakdown Strip -->
                <div class="pt-3 border-t border-slate-100">
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                            <span
                                class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider"
                                >SRQ-20</span
                            >
                            <span class="text-sm font-bold text-slate-900">
                                {{
                                    assessmentContext.srqScore !== null
                                        ? `${assessmentContext.srqScore}/20`
                                        : $t('healthcare.assessmentTab.notAvailable', 'Belum tersedia')
                                }}
                            </span>
                        </div>
                        <div>
                            <span
                                class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider"
                                >{{ $t('assessment.riskStep', 'Faktor Risiko') }}</span
                            >
                            <span class="text-sm font-bold text-slate-900">
                                {{
                                    assessmentContext.riskScore !== null
                                        ? `${assessmentContext.riskScore}/8`
                                        : $t('healthcare.assessmentTab.notAvailable', 'Belum tersedia')
                                }}
                            </span>
                        </div>
                        <div>
                            <span
                                class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider"
                                >{{ $t('assessment.functionStep', 'Fungsi Harian') }}</span
                            >
                            <span class="text-sm font-bold text-slate-900">
                                {{
                                    assessmentContext.functionScore !== null
                                        ? `${assessmentContext.functionScore}/9`
                                        : $t('healthcare.assessmentTab.notAvailable', 'Belum tersedia')
                                }}
                            </span>
                        </div>
                        <div>
                            <span
                                class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider"
                                >{{ $t('healthcare.overview.totalScore', 'Total Skor') }}</span
                            >
                            <span class="text-sm font-bold text-slate-900">
                                {{
                                    assessmentContext.totalScore !== null
                                        ? `${assessmentContext.totalScore}/37`
                                        : $t('healthcare.assessmentTab.notAvailable', 'Belum tersedia')
                                }}
                            </span>
                        </div>
                    </div>

                    <p
                        v-if="
                            assessmentContext.finalized &&
                            assessment.triage_result?.system_recommendation ===
                                'T1' &&
                            assessment.triage_result?.function_score >= 6
                        "
                        class="mt-2.5 text-xs text-amber-800 font-medium"
                    >
                        {{ $t('healthcare.validationShow.t1FunctionNote', 'Catatan: Skor fungsi harian (≥6) memenuhi kriteria pemicu rekomendasi T1.') }}
                    </p>

                    <p class="mt-1.5 text-[11px] text-slate-400">
                        {{ $t('healthcare.validationShow.recommendationDisclaimer', 'Rekomendasi sistem merupakan bantuan keputusan awal dan bukan diagnosis klinis resmi.') }}
                    </p>
                </div>
            </div>

            <AssessmentContextSummary :context="assessmentContext" />

            <!-- 2. Detailed Assessment Evidence (Unified Surface with 3 Columns) -->
            <div
                class="bg-white rounded-xl border border-slate-200/80 overflow-hidden"
            >
                <div class="px-5 py-3 border-b border-slate-100">
                    <h2
                        class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                    >
                        {{ $t('healthcare.validationShow.fieldEvidenceTitle', 'Bukti Klinis Penapisan Lapangan') }}
                    </h2>
                </div>

                <div
                    class="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 p-5 gap-y-4 text-xs"
                >
                    <!-- Column 1: SRQ-20 -->
                    <div class="lg:pr-4 space-y-2">
                        <div
                            class="flex items-center justify-between pb-1.5 border-b border-slate-100"
                        >
                            <span class="font-bold text-slate-800 text-xs">
                                {{ $t('healthcare.validationShow.srqAnswersTitle', 'Jawaban SRQ-20') }}
                            </span>
                            <span class="text-[10px] text-slate-400">
                                {{ $t('healthcare.validationShow.itemsCount', { count: assessment.srq_responses?.length || 0 }, `${assessment.srq_responses?.length || 0} butir`) }}
                            </span>
                        </div>
                        <div
                            class="max-h-96 overflow-y-auto rounded-lg focus-visible:outline-2 focus-visible:outline-teal-700"
                            tabindex="0"
                            role="region"
                            :aria-label="$t('healthcare.validationShow.srqAnswersTitle', 'Jawaban SRQ-20')"
                        >
                            <SrqResponseList
                                :responses="assessmentContext.responses"
                            />
                        </div>
                    </div>

                    <!-- Column 2: Faktor Risiko -->
                    <div class="lg:px-4 space-y-2">
                        <div
                            class="flex items-center justify-between pb-1.5 border-b border-slate-100"
                        >
                            <span class="font-bold text-slate-800 text-xs">
                                {{ $t('assessment.riskStep', 'Faktor Risiko') }}
                            </span>
                            <span class="text-[10px] text-slate-400">
                                {{ $t('healthcare.validationShow.indicatorsCount', { count: assessment.risk_assessment?.length || 0 }, `${assessment.risk_assessment?.length || 0} indikator`) }}
                            </span>
                        </div>
                        <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            <div
                                v-for="r in assessment.risk_assessment"
                                :key="r.id"
                                class="text-[11px] py-1 border-b border-slate-50 flex items-start justify-between gap-2"
                            >
                                <span class="text-slate-600 leading-snug">
                                    {{ r.indicator }} —
                                    {{
                                        riskLabels[r.indicator] ||
                                        $t('healthcare.validationShow.riskFallback', 'Faktor risiko')
                                    }}
                                </span>
                                <span
                                    class="font-semibold shrink-0"
                                    :class="
                                        r.answer
                                            ? 'text-amber-800'
                                            : 'text-slate-400'
                                    "
                                >
                                    {{ answer(r.answer) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Column 3: Fungsi Harian -->
                    <div class="lg:pl-4 space-y-2">
                        <div
                            class="flex items-center justify-between pb-1.5 border-b border-slate-100"
                        >
                            <span class="font-bold text-slate-800 text-xs">
                                {{ $t('assessment.functionStep', 'Fungsi Harian') }}
                            </span>
                            <span class="text-[10px] text-slate-400">
                                {{ $t('healthcare.validationShow.domainsCount', { count: assessment.function_assessment?.length || 0 }, `${assessment.function_assessment?.length || 0} domain`) }}
                            </span>
                        </div>
                        <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            <div
                                v-for="r in assessment.function_assessment"
                                :key="r.id"
                                class="text-[11px] py-1 border-b border-slate-50 flex items-start justify-between gap-2"
                            >
                                <span class="text-slate-600 leading-snug">
                                    {{ functionLabels[r.domain] || r.domain }}
                                </span>
                                <span
                                    class="font-semibold text-slate-800 shrink-0"
                                >
                                    {{ $t('healthcare.validationShow.levelValue', { level: r.level }, `Tingkat ${r.level}`) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. Riwayat Asesmen Sebelumnya -->
            <div
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-2.5"
            >
                <h3
                    class="text-xs font-bold text-slate-900 uppercase tracking-wider"
                >
                    {{ $t('healthcare.validationShow.previousAssessmentsTitle', 'Riwayat Asesmen Sebelumnya') }}
                </h3>
                <div
                    v-if="previousAssessments.length"
                    class="divide-y divide-slate-100 text-xs"
                >
                    <div
                        v-for="a in previousAssessments"
                        :key="a.id"
                        class="py-2 flex items-center justify-between text-slate-600"
                    >
                        <span>{{ formatDate(a.completed_at) }}</span>
                        <span
                            >{{ $t('healthcare.validationShow.systemPrefix', 'Sistem:') }}
                            <strong class="text-slate-800">{{
                                a.triage_result?.system_recommendation ||
                                $t('assessment.notRecorded', 'Tidak tercatat')
                            }}</strong></span
                        >
                        <span
                            >{{ $t('healthcare.validationShow.validationPrefix', 'Validasi:') }}
                            <strong class="text-teal-800">{{
                                a.clinical_validation?.clinical_result ||
                                $t('healthcare.validationShow.noneYet', 'Belum ada')
                            }}</strong></span
                        >
                    </div>
                </div>
                <p v-else class="text-xs text-slate-400 py-1">
                    {{ $t('healthcare.validationShow.noPreviousAssessments', 'Belum ada asesmen sebelumnya untuk pasien ini.') }}
                </p>
            </div>

            <!-- 4. Hasil Validasi (Read-only jika sudah divalidasi) -->
            <div
                v-if="assessment.clinical_validation"
                class="bg-white rounded-xl border border-teal-200/80 p-5 space-y-3 text-xs"
            >
                <div
                    class="flex items-center justify-between border-b border-slate-100 pb-2.5"
                >
                    <h3
                        class="font-bold text-slate-900 text-xs uppercase tracking-wider"
                    >
                        {{ $t('healthcare.validationShow.savedResultTitle', 'Hasil Validasi Tenaga Medis (Tersimpan)') }}
                    </h3>
                    <span
                        class="inline-flex items-center gap-1.5 text-xs font-bold"
                        :class="
                            assessment.clinical_validation.clinical_result ===
                            'T1'
                                ? 'text-orange-700'
                                : assessment.clinical_validation
                                        .clinical_result === 'T2'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                        "
                    >
                        <span
                            class="w-1.5 h-1.5 rounded-full shrink-0"
                            :class="
                                assessment.clinical_validation
                                    .clinical_result === 'T1'
                                    ? 'bg-orange-600'
                                    : assessment.clinical_validation
                                            .clinical_result === 'T2'
                                      ? 'bg-amber-600'
                                      : 'bg-emerald-600'
                            "
                        ></span>
                        {{ $t('healthcare.historyTab.result', 'Hasil') }}:
                        {{ assessment.clinical_validation.clinical_result }}
                    </span>
                </div>

                <div
                    class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700"
                >
                    <div>
                        <span
                            class="text-slate-400 block text-[10px] uppercase font-semibold"
                            >{{ $t('healthcare.validationShow.validatorLabel', 'Validator') }}</span
                        >
                        <span class="font-semibold text-slate-900">{{
                            assessment.clinical_validation.validator?.name ||
                            $t('assessment.notRecorded', 'Tidak tercatat')
                        }}</span>
                    </div>
                    <div>
                        <span
                            class="text-slate-400 block text-[10px] uppercase font-semibold"
                            >{{ $t('healthcare.validationShow.referralNeedLabel', 'Kebutuhan Rujukan') }}</span
                        >
                        <span class="font-semibold text-slate-900">{{
                            assessment.clinical_validation.referral_required
                                ? $t('healthcare.validationShow.referralYes', 'Ya, rujukan diperlukan')
                                : $t('healthcare.validationShow.referralNo', 'Tidak memerlukan rujukan')
                        }}</span>
                    </div>
                </div>

                <div v-if="assessment.clinical_validation.diagnosis_notes">
                    <span
                        class="text-slate-400 block text-[10px] uppercase font-semibold"
                        >{{ $t('healthcare.validationShow.diagnosisNotesTitle', 'Catatan Diagnosis') }}</span
                    >
                    <p class="text-slate-800 mt-0.5">
                        {{ assessment.clinical_validation.diagnosis_notes }}
                    </p>
                </div>

                <div v-if="assessment.clinical_validation.intervention_plan">
                    <span
                        class="text-slate-400 block text-[10px] uppercase font-semibold"
                        >{{ $t('healthcare.validationShow.interventionPlanTitle', 'Rencana Intervensi') }}</span
                    >
                    <p class="text-slate-800 mt-0.5">
                        {{ assessment.clinical_validation.intervention_plan }}
                    </p>
                </div>

                <div v-if="assessment.clinical_validation.referral">
                    <span
                        class="text-slate-400 block text-[10px] uppercase font-semibold"
                        >{{ $t('healthcare.validationShow.referralTargetTitle', 'Tujuan Rujukan') }}</span
                    >
                    <p class="text-slate-800 mt-0.5">
                        {{
                            assessment.clinical_validation.referral.facility
                                ?.name || $t('healthcare.operations.facilityUnavailable', 'Faskes tidak tersedia')
                        }}
                        <span
                            v-if="
                                assessment.clinical_validation.referral
                                    .facility &&
                                !assessment.clinical_validation.referral
                                    .facility.is_active
                            "
                            class="text-rose-600 text-[11px]"
                        >
                            ({{ $t('healthcare.validationShow.currentlyInactive', 'Nonaktif saat ini') }})
                        </span>
                    </p>
                </div>
            </div>

            <!-- 5. Form Validasi Klinis (Jika belum divalidasi) -->
            <div
                v-else
                class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4"
            >
                <div class="border-b border-slate-100 pb-2.5">
                    <h3 class="font-bold text-slate-900 text-sm">
                        {{ $t('healthcare.validationShow.formTitle', 'Validasi Klinis Tenaga Medis') }}
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        {{ $t('healthcare.validationShow.formSubtitle', 'Tentukan klasifikasi klinis akhir dan rencana tindak lanjut.') }}
                    </p>
                </div>

                <div
                    v-if="saveError || formError"
                    role="alert"
                    class="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800"
                >
                    {{ formError || saveError }}
                </div>

                <p v-if="assessment.can_manage === false" role="status">{{ $t('healthcare.actions.readOnlyNotice', 'Akses baca untuk kasus rujukan.') }}</p>
                <fieldset :disabled="assessment.can_manage === false">
                <form class="space-y-4 text-xs" @submit.prevent="submit">
                    <div>
                        <label
                            for="clinical_result"
                            class="block text-xs font-semibold text-slate-700 mb-1"
                        >
                            {{ $t('healthcare.validationShow.resultFieldLabel', 'Hasil Klasifikasi Klinis *') }}
                        </label>
                        <select
                            id="clinical_result"
                            v-model="form.clinical_result"
                            class="w-full sm:w-64 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                            required
                        >
                            <option disabled value="">
                                {{ $t('healthcare.validationShow.selectResultOption', 'Pilih hasil evaluasi klinis') }}
                            </option>
                            <option value="T1">
                                {{ $t('healthcare.validationShow.optionT1', 'T1 (Distres Berat / Evaluasi Klinis)') }}
                            </option>
                            <option value="T2">
                                {{ $t('healthcare.validationShow.optionT2', 'T2 (Distres Sedang / Pantau Posko)') }}
                            </option>
                            <option value="T3">
                                {{ $t('healthcare.validationShow.optionT3', 'T3 (Distres Ringan / Komunitas)') }}
                            </option>
                        </select>
                        <p
                            v-if="form.errors.clinical_result"
                            class="text-xs text-rose-600 mt-1"
                        >
                            {{ localizeMessage(form.errors.clinical_result, locale) }}
                        </p>
                    </div>

                    <div>
                        <label
                            for="diagnosis_notes"
                            class="block text-xs font-semibold text-slate-700 mb-1"
                        >
                            {{ $t('healthcare.validationShow.diagnosisFieldLabel', 'Catatan Diagnosis / Temuan Klinis') }}
                        </label>
                        <textarea
                            id="diagnosis_notes"
                            v-model="form.diagnosis_notes"
                            rows="2"
                            :placeholder="$t('healthcare.validationShow.diagnosisFieldPlaceholder', 'Catatan hasil evaluasi atau diagnosis...')"
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                        <p
                            v-if="form.errors.diagnosis_notes"
                            class="text-xs text-rose-600 mt-1"
                        >
                            {{ localizeMessage(form.errors.diagnosis_notes, locale) }}
                        </p>
                    </div>

                    <div>
                        <label
                            for="intervention_plan"
                            class="block text-xs font-semibold text-slate-700 mb-1"
                        >
                            {{ $t('healthcare.validationShow.interventionFieldLabel', 'Rencana Intervensi / Tindak Lanjut') }}
                        </label>
                        <textarea
                            id="intervention_plan"
                            v-model="form.intervention_plan"
                            rows="2"
                            :placeholder="$t('healthcare.validationShow.interventionFieldPlaceholder', 'Rencana konseling, evaluasi lanjutan, atau terapi...')"
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                        <p
                            v-if="form.errors.intervention_plan"
                            class="text-xs text-rose-600 mt-1"
                        >
                            {{ localizeMessage(form.errors.intervention_plan, locale) }}
                        </p>
                    </div>

                    <div class="pt-2 border-t border-slate-100">
                        <label
                            class="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer"
                        >
                            <input
                                v-model="form.referral_required"
                                type="checkbox"
                                class="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                            />
                            <span
                                >{{ $t('healthcare.validationShow.referralCheckboxLabel', 'Rujukan ke Fasilitas Kesehatan Lanjutan Diperlukan') }}</span
                            >
                        </label>
                    </div>

                    <div v-if="form.referral_required" class="space-y-1">
                        <label
                            for="facility_id"
                            class="block text-xs font-semibold text-slate-700"
                        >
                            {{ $t('healthcare.validationShow.targetFacilityRequired', 'Fasilitas Kesehatan Tujuan Rujukan *') }}
                        </label>
                        <select
                            id="facility_id"
                            v-model="form.facility_id"
                            required
                            class="w-full sm:w-80 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        >
                            <option :value="null" disabled>
                                {{ $t('healthcare.emergencyShow.selectActiveFacility', 'Pilih Fasilitas Kesehatan Aktif') }}
                            </option>
                            <option
                                v-for="facility in facilities"
                                :key="facility.id"
                                :value="facility.id"
                            >
                                {{ facility.name }} ({{ facility.type }})
                            </option>
                        </select>
                        <p
                            v-if="form.errors.facility_id"
                            class="text-xs text-rose-600 mt-1"
                        >
                            {{ localizeMessage(form.errors.facility_id, locale) }}
                        </p>
                    </div>

                    <div class="pt-2">
                        <button
                            type="submit"
                            :disabled="
                                form.processing ||
                                !assessmentContext.validationReady
                            "
                            class="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                        >
                            {{
                                form.processing
                                    ? $t('healthcare.validationShow.saving', 'Menyimpan…')
                                    : $t('healthcare.validationShow.saveValidationBtn', 'Simpan Validasi Klinis')
                            }}
                        </button>
                    </div>
                </form>
                </fieldset>
            </div>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { healthcareAssessmentPresentation } from "@/lib/healthcareAssessmentPresentation";
import AssessmentContextSummary from "@/components/Healthcare/Assessments/AssessmentContextSummary.vue";
import SrqResponseList from "@/components/Healthcare/Assessments/SrqResponseList.vue";
import { useHealthcareDraft } from "@/composables/useHealthcareDraft";
import { computed, ref } from "vue";
import { Link, useForm } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";
import { t as $t, useI18n } from "@/i18n";
import { localizeMessage } from "@/i18n/localizeMessage";

const props = defineProps<{
    assessment: any;
    previousAssessments: any[];
    facilities: { id: number; name: string; type: string }[];
}>();

const { locale } = useI18n();
const assessmentContext = computed(() =>
    healthcareAssessmentPresentation(props.assessment, locale.value),
);
const saveErrorCode = ref<"" | "saveBlockedError" | "saveFailedError">("");
const saveError = computed(() =>
    saveErrorCode.value
        ? $t(
              `healthcare.validationShow.${saveErrorCode.value}`,
              saveErrorCode.value === "saveBlockedError"
                  ? "Konteks asesmen belum lengkap atau validasi sedang disimpan."
                  : "Validasi belum tersimpan. Periksa isian dan coba lagi.",
          )
        : "",
);
const formError = computed(() =>
    localizeMessage((form.errors as Record<string, string>).form, locale.value),
);

const form = useForm({
    clinical_result: assessmentContext.value.validationReady
        ? assessmentContext.value.systemRecommendation!
        : "",
    diagnosis_notes: "",
    intervention_plan: "",
    referral_required: false,
    facility_id: null as number | null,
});

const draft = useHealthcareDraft(
    () => form.data(),
    () => !props.assessment.clinical_validation,
);

function submit() {
    if (
        !assessmentContext.value.validationReady ||
        form.processing ||
        !["T1", "T2", "T3"].includes(form.clinical_result)
    ) {
        saveErrorCode.value = "saveBlockedError";
        return;
    }
    const saved = draft.submitted();
    saveErrorCode.value = "";
    form.post(`/healthcare/validations/${props.assessment.id}`, {
        preserveScroll: true,
        onError: () => {
            saveErrorCode.value = "saveFailedError";
        },
        onSuccess: () => {
            saved();
            saveErrorCode.value = "";
        },
    });
}

const riskLabels = computed<Record<string, string>>(() => ({
    R1: $t("healthcare.validationShow.riskLabels.R1", "Kehilangan Berat"),
    R2: $t("healthcare.validationShow.riskLabels.R2", "Pengalaman Traumatik Langsung"),
    R3: $t("healthcare.validationShow.riskLabels.R3", "Kelompok Rentan"),
    R4: $t("healthcare.validationShow.riskLabels.R4", "Riwayat Gangguan Jiwa"),
    R5: $t("healthcare.validationShow.riskLabels.R5", "Terputus Obat Kronis"),
}));

const functionLabels = computed<Record<string, string>>(() => ({
    F1: $t("healthcare.assessmentTab.f1Label", "Perawatan Diri"),
    F2: $t("healthcare.assessmentTab.f2Label", "Fungsi Peran dan Sosial"),
    F3: $t("healthcare.assessmentTab.f3Label", "Akses Kebutuhan dan Bantuan"),
}));

function answer(value: boolean | null) {
    return value === true
        ? $t("common.yes", "Ya")
        : value === false
          ? $t("common.no", "Tidak")
          : $t("assessment.notRecorded", "Tidak tercatat");
}

function formatDate(value: string) {
    return value
        ? new Date(value).toLocaleString(locale.value === "en" ? "en-US" : "id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : $t("relawan.dataWorkspace.timeUnavailable", "Waktu tidak tercatat");
}
</script>
