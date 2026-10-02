<template>
    <HealthcareLayout>
        <div class="max-w-5xl space-y-5">
            <Link
                href="/healthcare/validations"
                class="text-sm font-bold text-teal-800"
                >← Kembali ke Validasi</Link
            >
            <header class="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 class="text-xl font-black text-slate-900">
                    Validasi Asesmen:
                    {{ assessment.patient?.name || "Pasien tidak tercatat" }}
                </h2>
                <p class="mt-1 text-sm text-slate-600">
                    NIK: {{ assessment.patient?.nik || "Tidak tercatat" }} •
                    Usia: {{ assessment.patient?.age ?? "-" }} • Posko:
                    {{ assessment.patient?.shelter?.name || "Tidak tercatat" }}
                </p>
                <p class="mt-1 text-xs text-slate-500">
                    Asesmen {{ formatDate(assessment.completed_at) }} • Relawan:
                    {{ assessment.user?.name || "Tidak tercatat" }}
                </p>
                <Link
                    :href="`/healthcare/patients/${assessment.patient_id}`"
                    class="mt-2 inline-block text-sm font-bold text-teal-800"
                    >Lihat riwayat pasien →</Link
                >
            </header>
            <section
                class="rounded-2xl border border-slate-200 bg-white p-6 space-y-3"
            >
                <h3 class="font-bold text-slate-900">Rekomendasi Sistem</h3>
                <p class="text-sm text-slate-700">
                    {{ assessment.triage_result?.system_recommendation }} •
                    Total skor {{ assessment.triage_result?.total_score }}/37
                </p>
                <p class="text-sm text-slate-600">
                    SRQ-20 {{ assessment.triage_result?.srq_score }}/20 • Faktor
                    Risiko {{ assessment.triage_result?.risk_score }}/8 • Fungsi
                    Harian {{ assessment.triage_result?.function_score }}/9
                </p>
                <p
                    v-if="
                        assessment.triage_result?.system_recommendation ===
                            'T1' &&
                        assessment.triage_result?.function_score >= 6
                    "
                    class="text-sm text-amber-800"
                >
                    Skor Fungsi Harian memenuhi pemicu rekomendasi T1.
                </p>
                <p class="text-xs text-slate-500">
                    Rekomendasi sistem adalah bantuan keputusan dan bukan
                    diagnosis klinis.
                </p>
            </section>
            <div class="grid gap-4 lg:grid-cols-3">
                <details
                    class="rounded-2xl border border-slate-200 bg-white p-5"
                >
                    <summary class="cursor-pointer font-bold">
                        Jawaban SRQ-20 ({{
                            assessment.srq_responses?.length || 0
                        }})
                    </summary>
                    <p
                        v-for="r in assessment.srq_responses"
                        :key="r.id"
                        class="border-t border-slate-100 py-2 text-sm"
                    >
                        {{ r.question_number }}.
                        {{
                            srqLabels[r.question_number] || "Pertanyaan SRQ-20"
                        }}: {{ answer(r.answer) }}
                    </p>
                </details>
                <details
                    class="rounded-2xl border border-slate-200 bg-white p-5"
                >
                    <summary class="cursor-pointer font-bold">
                        Faktor Risiko ({{
                            assessment.risk_assessment?.length || 0
                        }})
                    </summary>
                    <p
                        v-for="r in assessment.risk_assessment"
                        :key="r.id"
                        class="border-t border-slate-100 py-2 text-sm"
                    >
                        {{ r.indicator }} —
                        {{ riskLabels[r.indicator] || "Faktor risiko" }}:
                        {{ answer(r.answer) }} • Bobot {{ r.weight }}
                    </p>
                </details>
                <details
                    class="rounded-2xl border border-slate-200 bg-white p-5"
                >
                    <summary class="cursor-pointer font-bold">
                        Fungsi Harian ({{
                            assessment.function_assessment?.length || 0
                        }})
                    </summary>
                    <p
                        v-for="r in assessment.function_assessment"
                        :key="r.id"
                        class="border-t border-slate-100 py-2 text-sm"
                    >
                        {{ r.domain }} —
                        {{ functionLabels[r.domain] || "Fungsi harian" }}:
                        Tingkat {{ r.level }}
                    </p>
                </details>
            </div>
            <section
                class="rounded-2xl border border-slate-200 bg-white p-6 space-y-3"
            >
                <h3 class="font-bold text-slate-900">
                    Riwayat Asesmen Sebelumnya
                </h3>
                <p
                    v-for="a in previousAssessments"
                    :key="a.id"
                    class="text-sm text-slate-600"
                >
                    {{ formatDate(a.completed_at) }} • Rekomendasi Sistem
                    {{
                        a.triage_result?.system_recommendation ||
                        "Tidak tercatat"
                    }}
                    • Validasi Healthcare
                    {{ a.clinical_validation?.clinical_result || "Belum ada" }}
                </p>
                <p
                    v-if="!previousAssessments.length"
                    class="text-sm text-slate-500"
                >
                    Belum ada asesmen sebelumnya.
                </p>
            </section>
            <section
                v-if="assessment.clinical_validation"
                class="rounded-2xl border border-teal-200 bg-teal-50 p-6 space-y-2"
            >
                <h3 class="font-bold text-slate-900">
                    Hasil Validasi Healthcare — Tersimpan
                </h3>
                <p class="text-sm">
                    Hasil klinis:
                    {{ assessment.clinical_validation.clinical_result }} • Oleh
                    {{
                        assessment.clinical_validation.validator?.name ||
                        "Tidak tercatat"
                    }}
                </p>
                <p class="text-sm">
                    Catatan klinis:
                    {{ assessment.clinical_validation.diagnosis_notes || "-" }}
                </p>
                <p class="text-sm">
                    Rencana tindak lanjut:
                    {{
                        assessment.clinical_validation.intervention_plan || "-"
                    }}
                </p>
                <p class="text-sm">
                    Rujukan diperlukan:
                    {{
                        assessment.clinical_validation.referral_required
                            ? "Ya"
                            : "Tidak"
                    }}
                </p>
                <p
                    v-if="assessment.clinical_validation.referral"
                    class="text-sm"
                >
                    Tujuan:
                    {{
                        assessment.clinical_validation.referral.facility
                            ?.name || "Faskes tidak tersedia"
                    }}<span
                        v-if="
                            assessment.clinical_validation.referral.facility &&
                            !assessment.clinical_validation.referral.facility
                                .is_active
                        "
                    >
                        (Nonaktif saat ini)</span
                    >
                </p>
                <p class="text-xs text-slate-600">
                    Validasi tersimpan ditampilkan untuk dibaca. Riwayat rujukan
                    tersedia di halaman pasien.
                </p>
            </section>
            <section
                v-else
                class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
            >
                <h3 class="font-bold text-slate-900">Validasi Healthcare</h3>
                <p
                    v-if="saveError || formError"
                    role="alert"
                    class="rounded-xl bg-red-50 p-3 text-sm text-red-800"
                >
                    {{ formError || saveError }}
                </p>
                <form class="space-y-4" @submit.prevent="submit">
                    <div>
                        <label
                            for="clinical_result"
                            class="block text-sm font-bold"
                            >Hasil klinis *</label
                        ><select
                            id="clinical_result"
                            v-model="form.clinical_result"
                            class="w-full rounded-xl border border-slate-300 p-2"
                            required
                        >
                            <option value="T1">T1</option>
                            <option value="T2">T2</option>
                            <option value="T3">T3</option>
                        </select>
                        <p
                            v-if="form.errors.clinical_result"
                            class="text-sm text-red-800"
                        >
                            {{ form.errors.clinical_result }}
                        </p>
                    </div>
                    <div>
                        <label
                            for="diagnosis_notes"
                            class="block text-sm font-bold"
                            >Catatan diagnosis / klinis</label
                        ><textarea
                            id="diagnosis_notes"
                            v-model="form.diagnosis_notes"
                            rows="3"
                            class="w-full rounded-xl border border-slate-300 p-2"
                        />
                        <p
                            v-if="form.errors.diagnosis_notes"
                            class="text-sm text-red-800"
                        >
                            {{ form.errors.diagnosis_notes }}
                        </p>
                    </div>
                    <div>
                        <label
                            for="intervention_plan"
                            class="block text-sm font-bold"
                            >Rencana intervensi / tindak lanjut</label
                        ><textarea
                            id="intervention_plan"
                            v-model="form.intervention_plan"
                            rows="3"
                            class="w-full rounded-xl border border-slate-300 p-2"
                        />
                        <p
                            v-if="form.errors.intervention_plan"
                            class="text-sm text-red-800"
                        >
                            {{ form.errors.intervention_plan }}
                        </p>
                    </div>
                    <label class="flex items-center gap-2 text-sm font-bold"
                        ><input
                            v-model="form.referral_required"
                            type="checkbox"
                        />
                        Rujukan diperlukan</label
                    >
                    <div v-if="form.referral_required">
                        <label for="facility_id" class="block text-sm font-bold"
                            >Tujuan Faskes *</label
                        ><select
                            id="facility_id"
                            v-model="form.facility_id"
                            required
                            class="w-full rounded-xl border border-slate-300 p-2"
                        >
                            <option :value="null" disabled>
                                Pilih Faskes aktif
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
                            class="text-sm text-red-800"
                        >
                            {{ form.errors.facility_id }}
                        </p>
                    </div>
                    <button
                        :disabled="form.processing"
                        class="rounded-xl bg-teal-800 px-5 py-2 font-bold text-white disabled:opacity-50"
                    >
                        {{ form.processing ? "Menyimpan…" : "Simpan Validasi" }}
                    </button>
                </form>
            </section>
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
        ? new Date(value).toLocaleString("id-ID")
        : "Waktu tidak tercatat";
}
</script>
