<template>
  <RelawanLayout @clinical-ready="loadRiskContext" @clinical-lock="scope.invalidate">
    <div class="flex-1 min-h-0 flex flex-col">
      <div class="shrink-0 border-b border-slate-200 bg-white px-3.5 py-2 sm:px-6">
        <div class="flex items-center justify-between gap-2">
          <h2 class="min-w-0 truncate text-sm font-bold text-slate-900">{{ patient?.name || (isEn ? 'Survivor' : 'Penyintas') }}</h2>
          <span class="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800" role="status">
            {{ isEn ? `${answeredCount}/5 Answered` : `${answeredCount}/5 Terjawab` }}
          </span>
        </div>
        <progress :value="answeredCount" max="5" :aria-label="isEn ? 'Risk factors answered' : 'Faktor risiko terjawab'" class="risk-progress mt-1.5 block h-1.5 w-full overflow-hidden rounded-full"></progress>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-6 pt-3 pb-20 lg:pb-6 space-y-3 sm:space-y-4">
        <header class="px-0.5 pb-1">
          <h1 class="text-lg font-bold tracking-tight text-slate-900">{{ isEn ? 'Risk factors' : 'Faktor risiko' }}</h1>
          <p class="mt-1 text-sm leading-relaxed text-slate-600">
            {{ isEn ? 'Select Yes or No for each condition based on observation or survivor account.' : 'Pilih Ya atau Tidak untuk setiap kondisi berdasarkan observasi atau cerita penyintas.' }}
          </p>
          <p class="mt-1 text-xs text-slate-500">{{ isEn ? 'Background Vulnerability Assessment' : 'Penilaian Kerentanan Latar Belakang' }}</p>
        </header>

        <div class="space-y-3">
          <div v-for="item in localizedRiskItems" :key="item.code" class="rounded-xl border bg-white p-4 transition-colors sm:p-5"
            :class="risks[item.code] === true ? 'border-teal-400' : 'border-slate-200'">
            <div class="space-y-1">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-2">
                  <span class="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{{ item.code }}</span>
                  <span class="pt-0.5 text-xs leading-relaxed text-slate-600">{{ item.category }}</span>
                </div>
                <span class="shrink-0 pt-0.5 text-xs font-medium tabular-nums text-slate-500">
                  +{{ item.weight }} {{ isEn ? 'Points' : 'Poin' }}
                </span>
              </div>
              <h3 class="pt-1 text-base font-bold leading-snug text-slate-900">
                {{ item.title }}
              </h3>
              <p class="text-sm text-slate-600 leading-relaxed">
                {{ item.description }}
              </p>
              <fieldset class="mt-4" :disabled="!draftReady">
                <legend class="sr-only">{{ isEn ? 'Answer for' : 'Jawaban untuk' }} {{ item.code }} {{ item.title }}</legend>
                <div class="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <button type="button" :aria-pressed="risks[item.code] === true" @click="setRiskAnswer(item.code, true)"
                    class="min-h-[48px] rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 cursor-pointer sm:min-h-[52px] sm:text-base"
                    :class="risks[item.code] === true
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'">
                    <span>{{ isEn ? 'Yes' : 'Ya' }}</span>
                  </button>
                  <button type="button" :aria-pressed="risks[item.code] === false" @click="setRiskAnswer(item.code, false)"
                    class="min-h-[48px] rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 cursor-pointer sm:min-h-[52px] sm:text-base"
                    :class="risks[item.code] === false
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'">
                    <span>{{ isEn ? 'No' : 'Tidak' }}</span>
                  </button>
                </div>
              </fieldset>
            </div>
          </div>
        </div>

        <!-- Current Risk Subtotal Indicator -->
        <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium">
          <span class="text-slate-600">{{ isEn ? 'Risk Score Subtotal:' : 'Subtotal Skor Risiko:' }}</span>
          <span class="font-semibold tabular-nums text-teal-800">
            {{ riskScore }} / 8 {{ isEn ? 'Points' : 'Poin' }}
          </span>
        </div>
      </div>

      <!-- Bottom Assessment Action Bar -->
      <div data-assessment-action-bar
        class="shrink-0 bg-white border-t border-slate-200 px-3.5 sm:px-4 py-2 sm:py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] z-30">
        <div class="flex items-center justify-between gap-2.5 sm:gap-3">
          <RelawanLink :href="`/relawan/assessment/${assessment.id}/srq`"
            class="shrink-0 min-h-[44px] flex items-center justify-center py-2.5 px-3.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50">
            ← {{ isEn ? 'Back' : 'Kembali' }}
          </RelawanLink>
          <button type="button" @click="saveAndNext" :disabled="isSaving || !draftReady || answeredCount !== 5"
            class="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition disabled:opacity-60 cursor-pointer">
            {{ isEn ? `Next: Daily Function (${answeredCount}/5) →` : `Lanjut: Fungsi Harian (${answeredCount}/5) →` }}
          </button>
        </div>
        <p v-if="draftWarning" role="alert" class="mt-1.5 text-xs font-semibold text-amber-900">{{ draftWarning }}</p>
        <p v-if="saveError" role="alert" class="mt-1.5 text-xs font-semibold text-red-800">{{ saveError }}</p>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { mergeAssessmentDraft } from '@/offline/assessmentDraft';
import { relawanOwner } from '@/offline/assessmentWorkflow';
import { useAssessmentPersistence } from '@/composables/useAssessmentPersistence';
import { useClinicalTaskScope } from '@/composables/useClinicalTaskScope';
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
const persistence = useAssessmentPersistence(props.assessment, props.patient);
const { loadAssessmentContext, readAssessmentDraft, saveAssessmentDraft } = persistence;
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
const scope = useClinicalTaskScope(() => {
  persistence.invalidate();
  risks.value = {};
  localAssessment.value = null;
  patient.value = null;
  draftReady.value = false;
  editedKeys.clear();
}, { serverOnly: persistence.online });
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
  const current = scope.capture();
  try {
    if (!localAssessment.value) throw new Error('Asesmen lokal belum siap.');
    await saveAssessmentDraft({ ...localAssessment.value, user_id: owner }, 'risk_indicators', risks.value, current);
    if (!current()) return;
    rawDraftWarning.value = '';
  } catch (error) {
    if (!current()) return;
    rawDraftWarning.value = persistence.online && error instanceof Error ? error.message : 'Draf lokal belum tersimpan. Jawaban di halaman ini masih ada; coba pilih jawaban lagi.';
  }
}

async function loadRiskContext() {
  const current = scope.capture();
  rawSaveError.value = '';
  try {
    const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === 'OFFLINE_FIELD_MODE');
    if (!current()) return;
    localAssessment.value = context.assessment;
    patient.value = context.patient;
    const restoredDraft = await readAssessmentDraft(owner, context.assessment.id, 'risk_indicators');
    if (!current()) return;
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
  const current = scope.capture();
  if (answeredCount.value !== 5 || !localAssessment.value) return;
  isSaving.value = true;
  rawSaveError.value = '';
  try {
    await saveAssessmentDraft({ ...localAssessment.value, user_id: owner }, 'risk_indicators', risks.value, current);
    if (!current()) return;
    runtime.navigate(`/relawan/assessment/${props.assessment.id}/function`);
  } catch (error) {
    if (current()) rawSaveError.value = error instanceof Error ? error.message : 'Gagal menyimpan faktor risiko.';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => { void loadRiskContext(); });
</script>


<style scoped>
.risk-progress {
  appearance: none;
  border: 0;
  background: #f1f5f9;
  color: #0d9488;
}
.risk-progress::-webkit-progress-bar { background: #f1f5f9; }
.risk-progress::-webkit-progress-value { background: #0d9488; border-radius: 999px; }
.risk-progress::-moz-progress-bar { background: #0d9488; border-radius: 999px; }
</style>
