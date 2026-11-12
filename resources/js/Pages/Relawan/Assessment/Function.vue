<template>
  <RelawanLayout @clinical-ready="loadFunctionContext">
    <div class="flex-1 min-h-0 flex flex-col">
      <div class="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-6 pt-3 pb-20 lg:pb-6 space-y-4">
        <div class="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
            {{ isEn ? 'Part C: Daily Functioning' : 'Bagian C: Keberfungsian Harian' }}
          </span>
          <h2 class="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
            {{ isEn ? 'Shelter Functioning Evaluation' : 'Evaluasi Keberfungsian di Posko' }}
          </h2>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">
            {{ patient?.name }} • {{ isEn ? 'WHODAS Adaptation: Select the condition that best describes survivor activities over the last 3 days.' : 'Adaptasi WHODAS: Pilih kondisi yang paling menggambarkan aktivitas penyintas 3 hari terakhir.' }}
          </p>
        </div>

        <div class="space-y-4">
          <div v-for="d in localizedDomains" :key="d.code"
            class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div class="flex items-start justify-between gap-2.5 sm:gap-3">
              <h3 class="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
                {{ d.code }}. {{ d.title }}
              </h3>
              <span class="shrink-0 text-xs font-bold px-2 py-1 rounded-md"
                :class="[0, 1, 3].includes(functions[d.code]) ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'">
                {{ [0, 1, 3].includes(functions[d.code]) ? (isEn ? '✓ Selected' : '✓ Terpilih') : (isEn ? 'Not selected' : 'Belum dipilih') }}
              </span>
            </div>

            <div class="space-y-2">
              <button v-for="opt in d.options" :key="opt.level" type="button" :disabled="!draftReady" @click="setFunctionLevel(d.code, opt.level)"
                :aria-pressed="functions[d.code] === opt.level"
                class="w-full min-h-[52px] sm:min-h-[60px] text-left p-3.5 sm:p-4 rounded-xl border-2 transition flex items-start gap-3 cursor-pointer" :class="functions[d.code] === opt.level
                  ? 'border-teal-700 bg-teal-50 text-teal-950 ring-1 ring-teal-500/20'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'">
                <span class="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  :class="functions[d.code] === opt.level ? 'border-teal-700' : 'border-slate-400'" aria-hidden="true">
                  <span v-if="functions[d.code] === opt.level" class="w-2.5 h-2.5 rounded-full bg-teal-700"></span>
                </span>
                <span class="flex-1">
                  <span class="block text-sm font-medium leading-relaxed">{{ opt.label }}</span>
                  <span class="block mt-1 text-xs font-semibold">{{ opt.level }} {{ isEn ? 'points' : 'poin' }}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Functional Impairment Safety Warning if >= 6 -->
        <div v-if="functionScore !== null && functionScore >= 6"
          class="bg-orange-50 border-2 border-orange-400 p-4 rounded-xl text-orange-950 text-xs font-semibold space-y-1">
          <div class="flex items-center gap-2">
            <TriangleAlert class="h-4 w-4 shrink-0" aria-hidden="true" />
            <p class="m-0 leading-relaxed" v-if="isEn">
              Survivor daily functional disability score reached {{ functionScore }} points (≥ 6). System will recommend category <strong>T1 (Doctor / Medical Staff Priority Examination)</strong>.
            </p>
            <p class="m-0 leading-relaxed" v-else>
              Skor disabilitas fungsi harian penyintas mencapai {{ functionScore }} poin (≥ 6). Sistem akan merekomendasikan
              kategori <strong>T1 (Prioritas Pemeriksaan Dokter / Tenaga Medis)</strong>.
            </p>
          </div>
        </div>
      </div>

      <!-- Bottom Assessment Action Bar -->
      <div data-assessment-action-bar
        class="shrink-0 bg-white border-t border-slate-200 px-3.5 sm:px-4 py-2 sm:py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] z-30">
        <div class="flex items-center justify-between gap-2.5 sm:gap-3">
          <RelawanLink :href="`/relawan/assessment/${assessment.id}/risk`"
            class="shrink-0 min-h-[44px] flex items-center justify-center py-2.5 px-3.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50">
            ← {{ isEn ? 'Back' : 'Kembali' }}
          </RelawanLink>
          <button type="button" @click="saveAndNext" :disabled="isSaving || !draftReady || answeredCount !== 3"
            class="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition disabled:opacity-60 cursor-pointer">
            {{ isEn ? `Review & Summary (${answeredCount}/3) →` : `Tinjau & Ringkasan (${answeredCount}/3) →` }}
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
import { TriangleAlert } from 'lucide-vue-next';
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
  functions?: Record<string, number>;
}>();

const functions = ref<Record<string, number>>(mergeAssessmentDraft('function_domains', props.functions, {}));
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
const answeredCount = computed(() => ['F1', 'F2', 'F3'].filter(code => [0, 1, 3].includes(functions.value[code])).length);

const localizedDomains = computed(() => [
  {
    code: 'F1',
    title: isEn.value ? 'Self-Care' : 'Perawatan Diri (Self-Care)',
    options: [
      {
        level: 0,
        label: isEn.value
          ? 'Independently cares for self, eats, drinks, and changes clothes without prompting.'
          : 'Mandiri merawat diri, makan, minum, dan ganti pakaian tanpa dorongan.',
      },
      {
        level: 1,
        label: isEn.value
          ? 'Needs repeated reminders / direction from family or volunteers.'
          : 'Butuh diingatkan / diarahkan berulang kali oleh keluarga/relawan.',
      },
      {
        level: 3,
        label: isEn.value
          ? 'Completely refuses / totally unable to care for self.'
          : 'Menolak total / tidak mampu merawat diri sama sekali.',
      },
    ],
  },
  {
    code: 'F2',
    title: isEn.value ? 'Role & Social Functioning' : 'Fungsi Peran & Sosial',
    options: [
      {
        level: 0,
        label: isEn.value
          ? 'Able to interact normally and assist family or fellow shelter residents.'
          : 'Mampu berinteraksi wajar dan membantu keluarga/sesama pengungsi.',
      },
      {
        level: 1,
        label: isEn.value
          ? 'Withdraws, stays inside tent, reluctant to speak.'
          : 'Menarik diri, mengurung diri di tenda, enggan diajak bicara.',
      },
      {
        level: 3,
        label: isEn.value
          ? 'Hostile, aggressive, or complete mutism (does not respond to people).'
          : 'Memusuhi, agresif, atau mutisme total (tidak merespons orang).',
      },
    ],
  },
  {
    code: 'F3',
    title: isEn.value ? 'Access to Needs & Relief' : 'Akses Kebutuhan & Bantuan',
    options: [
      {
        level: 0,
        label: isEn.value
          ? 'Active and able to manage shelter needs / queue for logistics.'
          : 'Aktif dan mampu mengurus kebutuhan posko / antre logistik.',
      },
      {
        level: 1,
        label: isEn.value
          ? 'Passive, only waits for others to bring logistics.'
          : 'Pasif, hanya menunggu orang lain membawakan logistik.',
      },
      {
        level: 3,
        label: isEn.value
          ? 'Completely confused / severe disorientation, wandering around shelter.'
          : 'Bingung total / linglung parah, tersesat di sekitar posko.',
      },
    ],
  },
]);

const functionScore = computed(() => {
  if (answeredCount.value !== 3) return null;
  return functions.value.F1 + functions.value.F2 + functions.value.F3;
});

function setFunctionLevel(code: string, level: number) {
  functions.value[code] = level;
  editedKeys.add(code);
  void persistDraft();
}

async function persistDraft() {
  try {
    if (!localAssessment.value) throw new Error('Asesmen lokal belum siap.');
    await saveAssessmentDraft({ ...localAssessment.value, user_id: owner }, 'function_domains', functions.value);
    rawDraftWarning.value = '';
  } catch {
    rawDraftWarning.value = 'Draf lokal belum tersimpan. Jawaban di halaman ini masih ada; coba pilih jawaban lagi.';
  }
}

async function loadFunctionContext() {
  rawSaveError.value = '';
  try {
    const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === 'OFFLINE_FIELD_MODE');
    localAssessment.value = context.assessment;
    patient.value = context.patient;
    const restoredDraft = await readAssessmentDraft(owner, context.assessment.id, 'function_domains');
    if (restoredDraft && typeof restoredDraft === 'object') {
      const merged: Record<string, number> = { ...functions.value };
      for (const [key, value] of Object.entries(restoredDraft as Record<string, number>)) {
        if (!editedKeys.has(key)) merged[key] = value;
      }
      functions.value = merged;
    }
    draftReady.value = true;
  } catch (error) {
    rawSaveError.value = error instanceof Error ? error.message : 'Asesmen lokal tidak tersedia.';
  }
}

async function saveAndNext() {
  if (answeredCount.value !== 3 || !localAssessment.value) return;
  isSaving.value = true;
  rawSaveError.value = '';
  try {
    await saveAssessmentDraft({ ...localAssessment.value, user_id: owner }, 'function_domains', functions.value);
    runtime.navigate(`/relawan/assessment/${props.assessment.id}/review`);
  } catch (error) {
    rawSaveError.value = error instanceof Error ? error.message : 'Gagal menyimpan fungsi harian.';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => { void loadFunctionContext(); });
</script>
