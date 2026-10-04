<template>
    <HealthcareLayout>
        <div class="max-w-4xl space-y-5">
            <!-- Back Navigation -->
            <div>
                <Link
                    href="/healthcare/validations"
                    class="text-xs font-semibold text-teal-800 hover:text-teal-900 flex items-center gap-1 transition"
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Kembali ke Daftar Validasi</span>
                </Link>
            </div>

            <!-- 1. Patient & System Recommendation Surface (Unified) -->
            <div class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 text-xs">
                            <span class="font-bold text-slate-400 uppercase tracking-wider">Validasi Asesmen</span>
                            <span class="text-slate-300">·</span>
                            <span
                                class="inline-flex items-center gap-1.5 font-bold"
                                :class="
                                    assessment.triage_result?.system_recommendation === 'T1'
                                        ? 'text-orange-700'
                                        : 'text-amber-700'
                                "
                            >
                                <span
                                    class="w-1.5 h-1.5 rounded-full shrink-0"
                                    :class="
                                        assessment.triage_result?.system_recommendation === 'T1'
                                            ? 'bg-orange-600'
                                            : 'bg-amber-600'
                                    "
                                ></span>
                                Rekomendasi: {{ assessment.triage_result?.system_recommendation }}
                            </span>
                        </div>
                        <h1 class="text-xl font-bold text-slate-900 tracking-tight">
                            {{ assessment.patient?.name || "Pasien tidak tercatat" }}
                        </h1>
                        <p class="text-xs text-slate-500">
                            NIK: <span class="font-mono text-slate-700">{{ assessment.patient?.nik || "Tidak tercatat" }}</span>
                            • Usia: {{ assessment.patient?.age ?? "-" }} th
                            • Posko: <span class="text-slate-700">{{ assessment.patient?.shelter?.name || "Tidak tercatat" }}</span>
                        </p>
                    </div>

                    <div class="shrink-0 text-left sm:text-right text-xs">
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">Waktu Asesmen</span>
                        <span class="font-medium text-slate-700">{{ formatDate(assessment.completed_at) }}</span>
                        <div class="mt-1">
                            <Link
                                :href="`/healthcare/patients/${assessment.patient_id}`"
                                class="text-xs font-semibold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1"
                            >
                                <span>Lihat rekam pasien</span>
                                <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <!-- Clinical Score Breakdown Strip -->
                <div class="pt-3 border-t border-slate-100">
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                            <span class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">SRQ-20</span>
                            <span class="text-sm font-bold text-slate-900">
                                {{ assessment.triage_result?.srq_score }}/20
                            </span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Faktor Risiko</span>
                            <span class="text-sm font-bold text-slate-900">
                                {{ assessment.triage_result?.risk_score }}/8
                            </span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Fungsi Harian</span>
                            <span class="text-sm font-bold text-slate-900">
                                {{ assessment.triage_result?.function_score }}/9
                            </span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Total Skor</span>
                            <span class="text-sm font-bold text-slate-900">
                                {{ assessment.triage_result?.total_score }}/37
                            </span>
                        </div>
                    </div>

                    <p
                        v-if="
                            assessment.triage_result?.system_recommendation === 'T1' &&
                            assessment.triage_result?.function_score >= 6
                        "
                        class="mt-2.5 text-xs text-amber-800 font-medium"
                    >
                        Catatan: Skor fungsi harian (≥6) memenuhi kriteria pemicu rekomendasi T1.
                    </p>

                    <p class="mt-1.5 text-[11px] text-slate-400">
                        Rekomendasi sistem merupakan bantuan keputusan awal dan bukan diagnosis klinis resmi.
                    </p>
                </div>
            </div>

            <!-- 2. Detailed Assessment Evidence (Unified Surface with 3 Columns) -->
            <div class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100">
                    <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Bukti Klinis Penapisan Lapangan
                    </h2>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 p-5 gap-y-4 text-xs">
                    <!-- Column 1: SRQ-20 -->
                    <div class="lg:pr-4 space-y-2">
                        <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <span class="font-bold text-slate-800 text-xs">
                                Jawaban SRQ-20
                            </span>
                            <span class="text-[10px] text-slate-400">
                                {{ assessment.srq_responses?.length || 0 }} butir
                            </span>
                        </div>
                        <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            <div
                                v-for="r in assessment.srq_responses"
                                :key="r.id"
                                class="text-[11px] py-1 border-b border-slate-50 flex items-start justify-between gap-2"
                            >
                                <span class="text-slate-600 leading-snug">
                                    {{ r.question_number }}. {{ srqLabels[r.question_number] || "Pertanyaan SRQ-20" }}
                                </span>
                                <span
                                    class="font-semibold shrink-0"
                                    :class="r.answer ? 'text-rose-700' : 'text-slate-400'"
                                >
                                    {{ answer(r.answer) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Faktor Risiko -->
                    <div class="lg:px-4 space-y-2">
                        <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <span class="font-bold text-slate-800 text-xs">
                                Faktor Risiko
                            </span>
                            <span class="text-[10px] text-slate-400">
                                {{ assessment.risk_assessment?.length || 0 }} indikator
                            </span>
                        </div>
                        <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            <div
                                v-for="r in assessment.risk_assessment"
                                :key="r.id"
                                class="text-[11px] py-1 border-b border-slate-50 flex items-start justify-between gap-2"
                            >
                                <span class="text-slate-600 leading-snug">
                                    {{ r.indicator }} — {{ riskLabels[r.indicator] || "Faktor risiko" }}
                                </span>
                                <span
                                    class="font-semibold shrink-0"
                                    :class="r.answer ? 'text-amber-800' : 'text-slate-400'"
                                >
                                    {{ answer(r.answer) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Column 3: Fungsi Harian -->
                    <div class="lg:pl-4 space-y-2">
                        <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <span class="font-bold text-slate-800 text-xs">
                                Fungsi Harian
                            </span>
                            <span class="text-[10px] text-slate-400">
                                {{ assessment.function_assessment?.length || 0 }} domain
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
                                <span class="font-semibold text-slate-800 shrink-0">
                                    Tingkat {{ r.level }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. Riwayat Asesmen Sebelumnya -->
            <div class="bg-white rounded-xl border border-slate-200/80 p-5 space-y-2.5">
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Riwayat Asesmen Sebelumnya
                </h3>
                <div v-if="previousAssessments.length" class="divide-y divide-slate-100 text-xs">
                    <div
                        v-for="a in previousAssessments"
                        :key="a.id"
                        class="py-2 flex items-center justify-between text-slate-600"
                    >
                        <span>{{ formatDate(a.completed_at) }}</span>
                        <span>Sistem: <strong class="text-slate-800">{{ a.triage_result?.system_recommendation || "Tidak tercatat" }}</strong></span>
                        <span>Validasi: <strong class="text-teal-800">{{ a.clinical_validation?.clinical_result || "Belum ada" }}</strong></span>
                    </div>
                </div>
                <p v-else class="text-xs text-slate-400 py-1">
                    Belum ada asesmen sebelumnya untuk pasien ini.
                </p>
            </div>

            <!-- 4. Hasil Validasi (Read-only jika sudah divalidasi) -->
            <div
                v-if="assessment.clinical_validation"
                class="bg-white rounded-xl border border-teal-200/80 p-5 space-y-3 text-xs"
            >
                <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Hasil Validasi Tenaga Medis (Tersimpan)
                    </h3>
                    <span
                        class="inline-flex items-center gap-1.5 text-xs font-bold"
                        :class="
                            assessment.clinical_validation.clinical_result === 'T1'
                                ? 'text-orange-700'
                                : assessment.clinical_validation.clinical_result === 'T2'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                        "
                    >
                        <span
                            class="w-1.5 h-1.5 rounded-full shrink-0"
                            :class="
                                assessment.clinical_validation.clinical_result === 'T1'
                                    ? 'bg-orange-600'
                                    : assessment.clinical_validation.clinical_result === 'T2'
                                    ? 'bg-amber-600'
                                    : 'bg-emerald-600'
                            "
                        ></span>
                        Hasil: {{ assessment.clinical_validation.clinical_result }}
                    </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                    <div>
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">Validator</span>
                        <span class="font-semibold text-slate-900">{{ assessment.clinical_validation.validator?.name || "Tidak tercatat" }}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">Kebutuhan Rujukan</span>
                        <span class="font-semibold text-slate-900">{{ assessment.clinical_validation.referral_required ? "Ya, rujukan diperlukan" : "Tidak memerlukan rujukan" }}</span>
                    </div>
                </div>

                <div v-if="assessment.clinical_validation.diagnosis_notes">
                    <span class="text-slate-400 block text-[10px] uppercase font-semibold">Catatan Diagnosis</span>
                    <p class="text-slate-800 mt-0.5">{{ assessment.clinical_validation.diagnosis_notes }}</p>
                </div>

                <div v-if="assessment.clinical_validation.intervention_plan">
                    <span class="text-slate-400 block text-[10px] uppercase font-semibold">Rencana Intervensi</span>
                    <p class="text-slate-800 mt-0.5">{{ assessment.clinical_validation.intervention_plan }}</p>
                </div>

                <div v-if="assessment.clinical_validation.referral">
                    <span class="text-slate-400 block text-[10px] uppercase font-semibold">Tujuan Rujukan</span>
                    <p class="text-slate-800 mt-0.5">
                        {{ assessment.clinical_validation.referral.facility?.name || "Faskes tidak tersedia" }}
                        <span v-if="assessment.clinical_validation.referral.facility && !assessment.clinical_validation.referral.facility.is_active" class="text-rose-600 text-[11px]">
                            (Nonaktif saat ini)
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
                        Validasi Klinis Tenaga Medis
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Tentukan klasifikasi klinis akhir dan rencana tindak lanjut.
                    </p>
                </div>

                <div
                    v-if="saveError || formError"
                    role="alert"
                    class="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800"
                >
                    {{ formError || saveError }}
                </div>

                <form class="space-y-4 text-xs" @submit.prevent="submit">
                    <div>
                        <label for="clinical_result" class="block text-xs font-semibold text-slate-700 mb-1">
                            Hasil Klasifikasi Klinis *
                        </label>
                        <select
                            id="clinical_result"
                            v-model="form.clinical_result"
                            class="w-full sm:w-64 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                            required
                        >
                            <option value="T1">T1 (Distres Berat / Evaluasi Klinis)</option>
                            <option value="T2">T2 (Distres Sedang / Pantau Posko)</option>
                            <option value="T3">T3 (Distres Ringan / Komunitas)</option>
                        </select>
                        <p v-if="form.errors.clinical_result" class="text-xs text-rose-600 mt-1">
                            {{ form.errors.clinical_result }}
                        </p>
                    </div>

                    <div>
                        <label for="diagnosis_notes" class="block text-xs font-semibold text-slate-700 mb-1">
                            Catatan Diagnosis / Temuan Klinis
                        </label>
                        <textarea
                            id="diagnosis_notes"
                            v-model="form.diagnosis_notes"
                            rows="2"
                            placeholder="Catatan hasil evaluasi atau diagnosis..."
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                        <p v-if="form.errors.diagnosis_notes" class="text-xs text-rose-600 mt-1">
                            {{ form.errors.diagnosis_notes }}
                        </p>
                    </div>

                    <div>
                        <label for="intervention_plan" class="block text-xs font-semibold text-slate-700 mb-1">
                            Rencana Intervensi / Tindak Lanjut
                        </label>
                        <textarea
                            id="intervention_plan"
                            v-model="form.intervention_plan"
                            rows="2"
                            placeholder="Rencana konseling, evaluasi lanjutan, atau terapi..."
                            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        ></textarea>
                        <p v-if="form.errors.intervention_plan" class="text-xs text-rose-600 mt-1">
                            {{ form.errors.intervention_plan }}
                        </p>
                    </div>

                    <div class="pt-2 border-t border-slate-100">
                        <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input
                                v-model="form.referral_required"
                                type="checkbox"
                                class="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                            />
                            <span>Rujukan ke Fasilitas Kesehatan Lanjutan Diperlukan</span>
                        </label>
                    </div>

                    <div v-if="form.referral_required" class="space-y-1">
                        <label for="facility_id" class="block text-xs font-semibold text-slate-700">
                            Fasilitas Kesehatan Tujuan Rujukan *
                        </label>
                        <select
                            id="facility_id"
                            v-model="form.facility_id"
                            required
                            class="w-full sm:w-80 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-teal-700 focus:outline-none"
                        >
                            <option :value="null" disabled>
                                Pilih Fasilitas Kesehatan Aktif
                            </option>
                            <option
                                v-for="facility in facilities"
                                :key="facility.id"
                                :value="facility.id"
                            >
                                {{ facility.name }} ({{ facility.type }})
                            </option>
                        </select>
                        <p v-if="form.errors.facility_id" class="text-xs text-rose-600 mt-1">
                            {{ form.errors.facility_id }}
                        </p>
                    </div>

                    <div class="pt-2">
                        <button
                            type="submit"
                            :disabled="form.processing"
                            class="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition"
                        >
                            {{ form.processing ? "Menyimpan…" : "Simpan Validasi Klinis" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Link, useForm } from "@inertiajs/vue3";
import HealthcareLayout from "@/layouts/HealthcareLayout.vue";

const props = defineProps<{
    assessment: any;
    previousAssessments: any[];
    facilities: { id: number; name: string; type: string }[];
}>();

const saveError = ref("");
const formError = computed(() => (form.errors as Record<string, string>).form);

const form = useForm({
    clinical_result:
        props.assessment.triage_result?.system_recommendation || "T1",
    diagnosis_notes: "",
    intervention_plan: "",
    referral_required: false,
    facility_id: null as number | null,
});

function submit() {
    saveError.value = "";
    form.post(`/healthcare/validations/${props.assessment.id}`, {
        preserveScroll: true,
        onError: () => {
            saveError.value =
                "Validasi belum tersimpan. Periksa isian dan coba lagi.";
        },
        onSuccess: () => {
            saveError.value = "";
        },
    });
}

const srqLabels: Record<number, string> = {
    1: "Sering merasa sakit kepala",
    2: "Nafsu makan menurun",
    3: "Sulit tidur nyenyak",
    4: "Mudah merasa takut",
    5: "Tangan terasa gemetar",
    6: "Merasa cemas, tegang, atau khawatir",
    7: "Pencernaan terasa buruk",
    8: "Sulit berpikir jernih",
    9: "Merasa tidak bahagia",
    10: "Lebih sering menangis",
    11: "Sulit menikmati kegiatan sehari-hari",
    12: "Kesulitan mengambil keputusan",
    13: "Hasil kerja atau tugas posko terganggu",
    14: "Merasa tidak mampu berbuat hal bermanfaat",
    15: "Kehilangan minat total pada berbagai hal",
    16: "Merasa diri tidak berharga atau gagal",
    17: "Pemikiran untuk mengakhiri hidup",
    18: "Merasa lelah sepanjang waktu",
    19: "Tidak nyaman di perut atau ulu hati",
    20: "Mudah merasa lelah",
};

const riskLabels: Record<string, string> = {
    R1: "Kehilangan Berat",
    R2: "Pengalaman Traumatik Langsung",
    R3: "Kelompok Rentan",
    R4: "Riwayat Gangguan Jiwa",
    R5: "Terputus Obat Kronis",
};

const functionLabels: Record<string, string> = {
    F1: "Perawatan Diri",
    F2: "Fungsi Peran dan Sosial",
    F3: "Akses Kebutuhan dan Bantuan",
};

function answer(value: boolean | null) {
    return value === true ? "Ya" : value === false ? "Tidak" : "Tidak tercatat";
}

function formatDate(value: string) {
    return value
        ? new Date(value).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "Waktu tidak tercatat";
}
</script>
