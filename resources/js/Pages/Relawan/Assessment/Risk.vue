<template>
  <RelawanLayout @clinical-ready="loadRiskContext">
    <div class="space-y-6 pb-64">
      <div class="bg-white rounded-xl p-5 shadow-xs border border-slate-200">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
          {{ isEn ? 'Part A: Risk Factors' : 'Bagian A: Faktor Risiko' }}
        </span>
        <h2 class="text-lg font-extrabold text-slate-900 mt-1">
          {{ isEn ? 'Background Vulnerability Assessment' : 'Penilaian Kerentanan Latar Belakang' }}
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          {{ patient?.name }} • {{ isEn ? 'Select Yes or No for each condition based on observation or survivor account.' : 'Pilih Ya atau Tidak untuk setiap kondisi berdasarkan observasi atau cerita penyintas.' }}
        </p>
      </div>

      <div class="space-y-3">
        <div v-for="item in localizedRiskItems" :key="item.code" class="p-4 rounded-xl border-2 transition"
          :class="risks[item.code] === true ? 'bg-amber-50/70 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'">
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-900 uppercase">
                {{ item.code }} • {{ item.category }}
              </span>
              <span class="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                +{{ item.weight }} {{ isEn ? 'Points' : 'Poin' }}
              </span>
            </div>
            <h3 class="text-sm font-bold text-slate-900 leading-snug">
              {{ item.title }}
            </h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              {{ item.description }}
            </p>
            <div class="grid grid-cols-2 gap-3 mt-4">
              <button type="button" :disabled="!draftReady" @click="setRiskAnswer(item.code, true)"
                class="min-h-[56px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                :class="risks[item.code] === true
                  ? 'border-amber-700 bg-amber-600 text-white shadow-md'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'">
                <span v-if="risks[item.code] === true">✓</span>
                <span>{{ isEn ? 'YES' : 'YA' }}</span>
              </button>
              <button type="button" :disabled="!draftReady" @click="setRiskAnswer(item.code, false)"
                class="min-h-[56px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                :class="risks[item.code] === false
                  ? 'border-slate-700 bg-slate-700 text-white shadow-md'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'">
                <span v-if="risks[item.code] === false">✓</span>
                <span>{{ isEn ? 'NO' : 'TIDAK' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Risk Subtotal Indicator -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold">
        <span class="text-slate-600">{{ isEn ? 'Risk Score Subtotal:' : 'Subtotal Skor Risiko:' }}</span>
        <span class="text-sm text-amber-800 bg-amber-100 px-3 py-1 rounded-lg">
          {{ riskScore }} / 8 {{ isEn ? 'Points' : 'Poin' }}
        </span>
      </div>

      <!-- Sticky Bottom Navigation Bar -->
      <div data-assessment-action-bar
        class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl z-30 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <RelawanLink :href="`/relawan/assessment/${assessment.id}/srq`"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50">
            ← {{ isEn ? 'Back' : 'Kembali' }}
          </RelawanLink>
          <button type="button" @click="saveAndNext" :disabled="isSaving || !draftReady || answeredCount !== 5"
            class="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition disabled:opacity-60 cursor-pointer">
            {{ isEn ? 'Next: Daily Function →' : 'Lanjut: Fungsi Harian →' }}
          </button>
        </div>
        <p v-if="answeredCount !== 5" class="mt-2 text-xs text-slate-600">
          {{ isEn ? `Complete all answers before proceeding (${answeredCount}/5).` : `Lengkapi semua jawaban sebelum melanjutkan (${answeredCount}/5).` }}
        </p>
        <p v-if="draftWarning" role="alert" class="mt-2 text-xs font-semibold text-amber-900">{{ draftWarning }}</p>
        <p v-if="saveError" role="alert" class="mt-2 text-xs font-semibold text-red-800">{{ saveError }}</p>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { mergeAssessmentDraft, readAssessmentDraft, saveAssessmentDraft } from '@/offline/assessmentDraft';
import { loadAssessmentContext, relawanOwner } from '@/offline/assessmentWorkflow';
import type { LocalAssessment, LocalPatient } from '@/offline/db';
import { useI18n } from '@/i18n';
import { localizeMessage } from '@/i18n/localizeMessage';

const { locale } = useI18n();
const isEn = computed(() => locale.value === 'en');

const props = defineProps<{
  assessment: any;
  patient: any;
  risks?: Record<string, boolean>;
}>();

const risks = ref<Record<string, boolean>>(mergeAssessmentDraft('risk_indicators', props.risks, {}));
const runtime = useRelawanRuntime();
const owner = relawanOwner();
const localAssessment = ref<LocalAssessment | null>(null);
const patient = ref<LocalPatient | null>(props.patient);
const isSaving = ref(false);
const rawSaveError = ref('');
const rawDraftWarning = ref('');
const saveError = computed(() => localizeMessage(rawSaveError.value, locale.value));
const draftWarning = computed(() => localizeMessage(rawDraftWarning.value, locale.value));
const draftReady = ref(false);
const editedKeys = new Set<string>();
const answeredCount = computed(() => ['R1', 'R2', 'R3', 'R4', 'R5'].filter(code => typeof risks.value[code] === 'boolean').length);

const localizedRiskItems = computed(() => [
  {
    code: 'R1',
    category: isEn.value ? 'Grief / Acute Material Loss' : 'Duka Cita / Kerugian Materi Akut',
    weight: 2,
    title: isEn.value ? 'Severe Loss' : 'Kehilangan Berat',
    description: isEn.value
      ? 'Survivor lost nuclear family members (deceased/missing) OR home completely destroyed.'
      : 'Penyintas kehilangan anggota keluarga inti (meninggal/hilang) ATAU rumah hancur total.',
  },
  {
    code: 'R2',
    category: isEn.value ? 'Direct Life Threat' : 'Ancaman Nyawa Langsung',
    weight: 2,
    title: isEn.value ? 'Direct Traumatic Experience' : 'Pengalaman Traumatik Langsung',
    description: isEn.value
      ? 'Was buried, swept away, trapped, or witnessed directly the death of others during disaster.'
      : 'Sempat tertimbun, hanyut, terjebak, atau menyaksikan langsung kematian orang lain saat bencana.',
  },
  {
    code: 'R3',
    category: isEn.value ? 'Biological/Social Vulnerability' : 'Kerentanan Biologis/Sosial',
    weight: 1,
    title: isEn.value ? 'Vulnerable Group' : 'Kelompok Rentan',
    description: isEn.value
      ? 'Survivor is Elderly (>60 yrs), Pregnant/Lactating, Disabled, or Unaccompanied Minor.'
      : 'Penyintas adalah Lansia (>60 th), Ibu Hamil/Menyusui, Disabilitas, atau Anak Tanpa Orang Tua.',
  },
  {
    code: 'R4',
    category: isEn.value ? 'Pre-existing Condition' : 'Riwayat Kondisi Sebelumnya',
    weight: 2,
    title: isEn.value ? 'History of Psychiatric Disorders' : 'Riwayat Gangguan Jiwa',
    description: isEn.value
      ? 'Had routine psychiatric care / psychiatric medications prior to disaster.'
      : 'Sebelum bencana pernah berobat rutin ke poli jiwa/Puskesmas atau minum obat penenang/jiwa.',
  },
  {
    code: 'R5',
    category: isEn.value ? 'Medical Comorbidity' : 'Komorbiditas Medis',
    weight: 1,
    title: isEn.value ? 'Discontinued Chronic Medication' : 'Terputus Obat Kronis',
    description: isEn.value
      ? 'Has chronic physical illness (Diabetes, Hypertension, Epilepsy, etc.) and medication has run out / was lost.'
      : 'Memiliki penyakit fisik kronis (Diabetes, Hipertensi, Epilepsi, dll.) dan obatnya habis/hilang.',
  },
]);

const riskScore = computed(() => {
  let total = 0;
  for (const item of localizedRiskItems.value) {
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
    if (!localAssessment.value) throw new Error('Asesmen lokal belum siap.');
    await saveAssessmentDraft({ ...localAssessment.value, user_id: owner }, 'risk_indicators', risks.value);
    rawDraftWarning.value = '';
  } catch {
    rawDraftWarning.value = 'Draf lokal belum tersimpan. Jawaban di halaman ini masih ada; coba pilih jawaban lagi.';
  }
}

async function loadRiskContext() {
  rawSaveError.value = '';
  try {
    const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === 'OFFLINE_FIELD_MODE');
    localAssessment.value = context.assessment;
    patient.value = context.patient;
    const restoredDraft = await readAssessmentDraft(owner, context.assessment.id, 'risk_indicators');
    if (restoredDraft && typeof restoredDraft === 'object') {
      const merged: Record<string, boolean> = { ...risks.value };
      for (const [key, value] of Object.entries(restoredDraft as Record<string, boolean>)) {
        if (!editedKeys.has(key)) merged[key] = value;
      }
      risks.value = merged;
    }
    draftReady.value = true;
  } catch (error) {
    rawSaveError.value = error instanceof Error ? error.message : 'Asesmen lokal tidak tersedia.';
  }
}

async function saveAndNext() {
  if (answeredCount.value !== 5 || !localAssessment.value) return;
  isSaving.value = true;
  rawSaveError.value = '';
  try {
    await saveAssessmentDraft({ ...localAssessment.value, user_id: owner }, 'risk_indicators', risks.value);
    runtime.navigate(`/relawan/assessment/${props.assessment.id}/function`);
  } catch (error) {
    rawSaveError.value = error instanceof Error ? error.message : 'Gagal menyimpan faktor risiko.';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => { void loadRiskContext(); });
</script>
