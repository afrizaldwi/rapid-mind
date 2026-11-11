<template>
    <HealthcareLayout>
        <div class="space-y-6 max-w-5xl">
            <!-- Page Header -->
            <div>
                <h1 class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                    {{ $t('healthcare.validations.title', 'Validasi Asesmen') }}
                </h1>
                <p class="text-xs text-slate-500 mt-1 font-normal">
                    {{ $t('healthcare.validations.subtitle', 'Verifikasi klinis hasil skrining T1 dan T2 dari posko lapangan. Rekomendasi sistem berfungsi sebagai bantuan keputusan.') }}
                </p>
            </div>

            <!-- Section 1: Perlu Divalidasi (Pending Queue) -->
            <section class="space-y-2.5">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {{ $t('healthcare.validations.pendingTitle', 'Perlu Divalidasi') }}
                        </h2>
                        <p class="text-[11px] text-slate-400 mt-0.5">
                            {{ $t('healthcare.validations.pendingHint', 'Kasus T1 diprioritaskan lebih dulu berdasarkan urgensi klinis.') }}
                        </p>
                    </div>
                    <span class="text-xs font-semibold text-slate-500">
                        {{ pendingAssessments.length }} {{ $t('healthcare.validations.cases', 'kasus') }}
                    </span>
                </div>

                <!-- Unified Surface List -->
                <div class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                    <div
                        v-if="pendingAssessments.length > 0"
                        class="divide-y divide-slate-100"
                    >
                        <div
                            v-for="a in pendingAssessments"
                            :key="a.id"
                            class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                        >
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-slate-900 text-xs">
                                        {{ a.patient?.name || $t('healthcare.validations.unrecordedPatient', 'Pasien tidak tercatat') }}
                                    </span>
                                    <span
                                        class="inline-flex items-center gap-1.5 text-xs font-bold"
                                        :class="
                                            a.triage_result?.system_recommendation === 'T1'
                                                ? 'text-orange-700'
                                                : 'text-amber-700'
                                        "
                                    >
                                        <span
                                            class="w-1.5 h-1.5 rounded-full shrink-0"
                                            :class="
                                                a.triage_result?.system_recommendation === 'T1'
                                                    ? 'bg-orange-600'
                                                    : 'bg-amber-600'
                                            "
                                        ></span>
                                        {{ a.triage_result?.system_recommendation }}
                                    </span>
                                </div>
                                <div class="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                                    <span>{{ a.user?.shelter?.name || $t('healthcare.patients.unrecordedShelter', 'Posko tidak tercatat') }}</span>
                                    <span>•</span>
                                    <span>SRQ: <strong class="font-semibold text-slate-700">{{ a.triage_result?.srq_score }}/20</strong></span>
                                    <span>•</span>
                                    <span>{{ formatDate(a.completed_at) }}</span>
                                </div>
                            </div>

                            <div class="shrink-0">
                                <Link
                                    :href="`/healthcare/validations/${a.id}`"
                                    class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition inline-block"
                                >
                                    {{ $t('healthcare.validations.validateAction', 'Tinjau Asesmen') }}
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div
                        v-else
                        class="p-8 text-center text-xs text-slate-400"
                    >
                        {{ $t('healthcare.validations.noPending', 'Tidak ada asesmen T1/T2 yang menunggu validasi.') }}
                    </div>
                </div>
            </section>

            <!-- Section 2: Selesai Divalidasi (Completed History) -->
            <section class="space-y-2.5">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {{ $t('healthcare.validations.completedTitle', 'Selesai Divalidasi') }}
                        </h2>
                        <p class="text-[11px] text-slate-400 mt-0.5">
                            {{ $t('healthcare.validations.completedSubtitle', 'Asesmen yang telah melalui validasi klinis tenaga medis.') }}
                        </p>
                    </div>
                    <span class="text-xs font-semibold text-slate-500">
                        {{ completedAssessments.length }} {{ $t('healthcare.validations.cases', 'kasus') }}
                    </span>
                </div>

                <!-- Unified Surface List -->
                <div class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                    <div
                        v-if="completedAssessments.length > 0"
                        class="divide-y divide-slate-100"
                    >
                        <div
                            v-for="a in completedAssessments"
                            :key="a.id"
                            class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                        >
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="font-semibold text-slate-900 text-xs">
                                        {{ a.patient?.name || $t('healthcare.validations.unrecordedPatient', 'Pasien tidak tercatat') }}
                                    </span>
                                    <span class="text-[11px] text-slate-400">
                                        {{ $t('triage.recommendation', 'Sistem') }}: {{ a.triage_result?.system_recommendation }}
                                    </span>
                                    <span class="text-slate-300">→</span>
                                    <span
                                        class="inline-flex items-center gap-1.5 text-xs font-bold"
                                        :class="
                                            a.clinical_validation?.clinical_result === 'T1'
                                                ? 'text-orange-700'
                                                : a.clinical_validation?.clinical_result === 'T2'
                                                ? 'text-amber-700'
                                                : 'text-emerald-700'
                                        "
                                    >
                                        <span
                                            class="w-1.5 h-1.5 rounded-full shrink-0"
                                            :class="
                                                a.clinical_validation?.clinical_result === 'T1'
                                                    ? 'bg-orange-600'
                                                    : a.clinical_validation?.clinical_result === 'T2'
                                                    ? 'bg-amber-600'
                                                    : 'bg-emerald-600'
                                            "
                                        ></span>
                                        {{ $t('triage.clinicalValidation', 'Validasi') }}: {{ a.clinical_validation?.clinical_result }}
                                    </span>
                                </div>
                                <div class="text-[11px] text-slate-400">
                                    {{ $t('healthcare.validations.validatedBadge', 'Divalidasi') }}: {{ formatDate(a.completed_at) }}
                                </div>
                            </div>

                            <div class="shrink-0">
                                <Link
                                    :href="`/healthcare/validations/${a.id}`"
                                    class="px-3 py-1.5 text-xs font-semibold text-teal-800 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition inline-block"
                                >
                                    {{ $t('common.viewDetail', 'Lihat Detail') }}
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div
                        v-else
                        class="p-8 text-center text-xs text-slate-400"
                    >
                        {{ $t('healthcare.validations.noHistory', 'Belum ada validasi T1/T2 yang selesai.') }}
                    </div>
                </div>
            </section>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { Link } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";
import { t as $t, useI18n } from "@/i18n";

interface Item {
    id: string;
    completed_at: string;
    patient?: { name: string } | null;
    user?: { shelter?: { name: string } | null } | null;
    triage_result?: { system_recommendation: string; srq_score: number } | null;
    clinical_validation?: { clinical_result: string } | null;
}

defineProps<{ pendingAssessments: Item[]; completedAssessments: Item[] }>();

const { locale } = useI18n();

function formatDate(value: string) {
    return value
        ? new Date(value).toLocaleString(locale.value === "en" ? "en-US" : "id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : $t("relawan.dataWorkspace.timeUnavailable", "Waktu tidak tercatat");
}
</script>
