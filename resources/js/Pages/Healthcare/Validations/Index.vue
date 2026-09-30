<template>
  <HealthcareLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Validasi Klinis Asesmen Lapangan
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Penetapan diagnosis kerja, catatan medis bebas, dan rencana tindak lanjut faskes.
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="a in assessments"
          :key="a.id"
          class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-base font-extrabold text-slate-900">
                  {{ a.patient?.name }}
                </h3>
                <Badge :variant="badgeVariant(a.triage_result?.system_recommendation)">
                  Rekomendasi: {{ a.triage_result?.system_recommendation }}
                </Badge>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                NIK: {{ a.patient?.nik || 'Tanpa NIK' }} • Posko: {{ a.user?.shelter?.name || 'Posko Candi' }} • Skor: {{ a.triage_result?.total_score }}/37
              </p>
            </div>

            <span
              v-if="a.clinical_validation"
              class="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200"
            >
              ✓ Sudah Divalidasi: {{ a.clinical_validation.clinical_result }}
            </span>
            <span
              v-else
              class="px-3 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-full border border-amber-200"
            >
              Menunggu Validasi
            </span>
          </div>

          <!-- Existing validation info or Form to Validate -->
          <div v-if="a.clinical_validation" class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
            <p><strong>Catatan Klinis Dokter:</strong> {{ a.clinical_validation.diagnosis_notes || '-' }}</p>
            <p><strong>Rencana Intervensi:</strong> {{ a.clinical_validation.intervention_plan || '-' }}</p>
            <p><strong>Rujukan Medis:</strong> {{ a.clinical_validation.referral_required ? 'Ya, Diterbitkan' : 'Tidak Perlu' }}</p>
          </div>

          <div v-else class="pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="openValidationForm(a)"
              class="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Isi Catatan & Validasi Klinis →
            </button>
          </div>
        </div>

        <div v-if="!assessments || assessments.length === 0" class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
          Belum ada asesmen yang selesai untuk divalidasi.
        </div>
      </div>

      <!-- Quick Modal Validation Sheet -->
      <div v-if="selectedAssessment" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4">
        <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="font-bold text-slate-900 text-base">
              Validasi Klinis: {{ selectedAssessment.patient?.name }}
            </h3>
            <button type="button" @click="selectedAssessment = null" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <form @submit.prevent="submitValidation" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Klasifikasi Medis Akhir:
              </label>
              <select
                v-model="valForm.clinical_result"
                class="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-700 focus:outline-none"
              >
                <option value="T1">T1 — Distres Berat / Butuh Terapi Medis Faskes</option>
                <option value="T2">T2 — Distres Sedang / Intervensi Psikososial</option>
                <option value="T3">T3 — Stabil / Dukungan Rutin Komunitas</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Catatan Diagnosis Kerja (Teks Bebas):
              </label>
              <textarea
                v-model="valForm.diagnosis_notes"
                rows="2"
                placeholder="Contoh: Reaksi stres akut pascabencana, insomnia reaktif, somatisasi lambung..."
                class="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-teal-700 focus:outline-none"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Rencana Intervensi Faskes:
              </label>
              <textarea
                v-model="valForm.intervention_plan"
                rows="2"
                placeholder="Contoh: Farmakoterapi simtomatik jangka pendek, konseling individu, rujukan ke Poli Jiwa..."
                class="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-teal-700 focus:outline-none"
              ></textarea>
            </div>

            <div class="flex items-center space-x-2 pt-1">
              <input
                id="refReq"
                v-model="valForm.referral_required"
                type="checkbox"
                class="w-4 h-4 text-teal-700 rounded border-slate-300"
              />
              <label for="refReq" class="text-xs font-bold text-slate-700">
                Terbitkan Rujukan Lanjutan ke RS Rujukan
              </label>
            </div>

            <div class="flex justify-end space-x-2 pt-3">
              <button
                type="button"
                @click="selectedAssessment = null"
                class="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                class="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Simpan Validasi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import Badge from '@/components/ui/Badge.vue';

interface ValidationAssessment {
  id: string;
  patient?: { name: string; nik?: string | null } | null;
  user?: { shelter?: { name: string } | null } | null;
  triage_result?: { system_recommendation: string; total_score: number } | null;
  clinical_validation?: {
    clinical_result: string;
    diagnosis_notes?: string | null;
    intervention_plan?: string | null;
    referral_required: boolean;
  } | null;
}

defineProps<{
  assessments: ValidationAssessment[];
}>();

const selectedAssessment = ref<ValidationAssessment | null>(null);
const valForm = ref({
  clinical_result: 'T1',
  diagnosis_notes: '',
  intervention_plan: '',
  referral_required: false,
});

function openValidationForm(a: ValidationAssessment) {
  selectedAssessment.value = a;
  valForm.value.clinical_result = a.triage_result?.system_recommendation || 'T1';
  valForm.value.diagnosis_notes = '';
  valForm.value.intervention_plan = '';
  valForm.value.referral_required = false;
}

function submitValidation() {
  if (!selectedAssessment.value) return;
  router.post(`/healthcare/validations/${selectedAssessment.value.id}`, valForm.value, {
    onFinish: () => {
      selectedAssessment.value = null;
    },
  });
}

function badgeVariant(category?: string) {
  switch (category) {
    case 'T0_SUSPECT':
    case 'T0_CONFIRMED':
      return 't0';
    case 'T1':
      return 't1';
    case 'T2':
      return 't2';
    default:
      return 't3';
  }
}
</script>
