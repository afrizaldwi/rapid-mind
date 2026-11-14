<template>
  <RelawanLayout @clinical-ready="loadRiskContext" @clinical-lock="scope.invalidate">
    <div class="flex-1 min-h-0 flex flex-col">
      <div class="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-6 pt-3 pb-20 lg:pb-6 space-y-4">
        <div class="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
            {{ isEn ? 'Part A: Risk Factors' : 'Bagian A: Faktor Risiko' }}
          </span>
          <h2 class="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
            {{ isEn ? 'Background Vulnerability Assessment' : 'Penilaian Kerentanan Latar Belakang' }}
          </h2>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">
            {{ patient?.name }} • {{ isEn ? 'Select Yes or No for each condition based on observation or survivor account.' : 'Pilih Ya atau Tidak untuk setiap kondisi berdasarkan observasi atau cerita penyintas.' }}
          </p>
        </div>

        <div class="space-y-3">
          <div v-for="item in localizedRiskItems" :key="item.code" class="p-4 sm:p-5 rounded-xl border-2 transition"
            :class="risks[item.code] === true ? 'bg-amber-50/70 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'">
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold text-amber-900 uppercase">
                  {{ item.code }} • {{ item.category }}
                </span>
                <span class="shrink-0 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  +{{ item.weight }} {{ isEn ? 'Points' : 'Poin' }}
                </span>
              </div>
              <h3 class="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {{ item.title }}
              </h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                {{ item.description }}
              </p>
              <div class="grid grid-cols-2 gap-2.5 sm:gap-3 mt-3.5">
                <button type="button" :disabled="!draftReady" @click="setRiskAnswer(item.code, true)"
                  class="min-h-[48px] sm:min-h-[54px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                  :class="risks[item.code] === true
                    ? 'border-amber-700 bg-amber-600 text-white shadow-md'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'">
                  <span v-if="risks[item.code] === true">✓</span>
                  <span>{{ isEn ? 'YES' : 'YA' }}</span>
                </button>
                <button type="button" :disabled="!draftReady" @click="setRiskAnswer(item.code, false)"
                  class="min-h-[48px] sm:min-h-[54px] rounded-xl border-2 font-extrabold text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
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
            class="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition disabled:opacity-60 cursor-pointer">
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
