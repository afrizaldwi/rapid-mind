<template>
  <RelawanLayout>
    <div class="space-y-6 pb-64">
      <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
          Bagian A: Faktor Risiko
        </span>
        <h2 class="text-lg font-extrabold text-slate-900 mt-1">
          Penilaian Kerentanan Latar Belakang
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          {{ patient?.name }} • Pilih Ya atau Tidak untuk setiap kondisi berdasarkan observasi atau cerita penyintas.
        </p>
      </div>

      <div class="space-y-3">
        <div v-for="item in riskItems" :key="item.code" class="p-4 rounded-2xl border-2 transition"
          :class="risks[item.code] === true ? 'bg-amber-50/70 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'">
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-900 uppercase">
                {{ item.code }} • {{ item.category }}
              </span>
              <span class="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                +{{ item.weight }} Poin
              </span>
            </div>
            <h3 class="text-sm font-bold text-slate-900 leading-snug">
              {{ item.title }}
            </h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              {{ item.description }}
            </p>
            <div class="grid grid-cols-2 gap-3 mt-4">
              <button type="button" @click="setRiskAnswer(item.code, true)"
                class="min-h-[56px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2"
                :class="risks[item.code] === true
                  ? 'border-amber-700 bg-amber-600 text-white shadow-md'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'">
                <span v-if="risks[item.code] === true">✓</span>
                <span>YA</span>
              </button>
              <button type="button" @click="setRiskAnswer(item.code, false)"
                class="min-h-[56px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2"
                :class="risks[item.code] === false
                  ? 'border-slate-700 bg-slate-700 text-white shadow-md'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'">
                <span v-if="risks[item.code] === false">✓</span>
                <span>TIDAK</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Risk Subtotal Indicator -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold">
        <span class="text-slate-600">Subtotal Skor Risiko:</span>
        <span class="text-sm text-amber-800 bg-amber-100 px-3 py-1 rounded-lg">
          {{ riskScore }} / 8 Poin
        </span>
      </div>

      <!-- Sticky Bottom Navigation Bar -->
      <div data-assessment-action-bar
        class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl z-30 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <Link :href="`/relawan/assessment/${assessment.id}/srq`"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50">
            ← Kembali
          </Link>
          <button type="button" @click="saveAndNext" :disabled="isSaving || !draftReady || answeredCount !== 5"
            class="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition disabled:opacity-60">
            Lanjut: Fungsi Harian →
          </button>
        </div>
        <p v-if="answeredCount !== 5" class="mt-2 text-xs text-slate-600">Lengkapi semua jawaban sebelum melanjutkan ({{
          answeredCount }}/5).</p>
        <p v-if="draftWarning" role="alert" class="mt-2 text-xs font-semibold text-amber-900">{{ draftWarning }}</p>
        <p v-if="saveError" role="alert" class="mt-2 text-xs font-semibold text-red-800">{{ saveError }}</p>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { jsonRequest } from '@/offline/jsonRequest';
import { mergeAssessmentDraft, readAssessmentDraft, saveAssessmentDraft, clearSavedAssessmentDraft } from '@/offline/assessmentDraft';

const props = defineProps<{
  assessment: any;
  patient: any;
  risks?: Record<string, boolean>;
}>();

const risks = ref<Record<string, boolean>>(mergeAssessmentDraft('risk_indicators', props.risks, {}));
const isSaving = ref(false);
const saveError = ref('');
const draftWarning = ref('');
const draftReady = ref(false);
const editedKeys = new Set<string>();
const answeredCount = computed(() => ['R1', 'R2', 'R3', 'R4', 'R5'].filter(code => typeof risks.value[code] === 'boolean').length);

const riskItems = [
  {
    code: 'R1',
    category: 'Duka Cita / Kerugian Materi Akut',
    weight: 2,
    title: 'Kehilangan Berat',
    description: 'Penyintas kehilangan anggota keluarga inti (meninggal/hilang) ATAU rumah hancur total.',
  },
  {
    code: 'R2',
    category: 'Ancaman Nyawa Langsung',
    weight: 2,
    title: 'Pengalaman Traumatik Langsung',
    description: 'Sempat tertimbun, hanyut, terjebak, atau menyaksikan langsung kematian orang lain saat bencana.',
  },
  {
    code: 'R3',
    category: 'Kerentanan Biologis/Sosial',
    weight: 1,
    title: 'Kelompok Rentan',
    description: 'Penyintas adalah Lansia (>60 th), Ibu Hamil/Menyusui, Disabilitas, atau Anak Tanpa Orang Tua.',
  },
  {
    code: 'R4',
    category: 'Pre-existing Condition',
    weight: 2,
    title: 'Riwayat Gangguan Jiwa',
    description: 'Sebelum bencana pernah berobat rutin ke poli jiwa/Puskesmas atau minum obat penenang/jiwa.',
  },
  {
    code: 'R5',
    category: 'Komorbiditas Medis',
    weight: 1,
    title: 'Terputus Obat Kronis',
    description: 'Memiliki penyakit fisik kronis (Diabetes, Hipertensi, Epilepsi, dll.) dan obatnya habis/hilang.',
  },
];

const riskScore = computed(() => {
  let total = 0;
  for (const item of riskItems) {
    if (risks.value[item.code]) {
      total += item.weight;
    }
  }
  return total;
});


function setRiskAnswer(code: string, value: boolean) {
  risks.value[code] = value;
  editedKeys.add(code);
  void persistDraft();
}


async function persistDraft() {
  try {
    await saveAssessmentDraft(props.assessment, 'risk_indicators', risks.value);
    draftWarning.value = '';
  } catch {
    draftWarning.value = 'Draf lokal belum tersimpan. Jawaban di halaman ini masih ada; coba pilih jawaban lagi.';
  }
}

onMounted(async () => {
  try {
    const local = await readAssessmentDraft(props.assessment.user_id, props.assessment.id, 'risk_indicators');
    const merged = mergeAssessmentDraft('risk_indicators', risks.value, local);
    for (const [key, value] of Object.entries(merged)) {
      if (!editedKeys.has(key)) (risks.value as Record<string, typeof value>)[key] = value;
    }
  } catch {
    draftWarning.value = 'Draf lokal tidak dapat dibaca. Jawaban yang sudah tersimpan di server tetap ditampilkan.';
  } finally {
    draftReady.value = true;
  }
});

async function saveAndNext() {
  if (isSaving.value || !draftReady.value) return;
  if (answeredCount.value !== 5) {
    saveError.value = 'Lengkapi semua jawaban sebelum melanjutkan.';
    return;
  }
  isSaving.value = true;
  saveError.value = '';
  const savedAnswers = { ...risks.value };
  try {
    const response = await jsonRequest(`/relawan/assessment/${props.assessment.id}/risk`, { risks: savedAnswers });
    if (!response.ok) throw new Error('Simpan gagal');
    try {
      await clearSavedAssessmentDraft(props.assessment.user_id, props.assessment.id, 'risk_indicators', savedAnswers);
    } catch {
      draftWarning.value = 'Jawaban tersimpan di server, tetapi draf lokal belum dapat dibersihkan.';
    }
    router.visit(`/relawan/assessment/${props.assessment.id}/function`);
  } catch {
    saveError.value = 'Faktor risiko belum tersimpan di server. Periksa koneksi atau jawaban, lalu coba lagi.';
  } finally {
    isSaving.value = false;
  }
}
</script>
