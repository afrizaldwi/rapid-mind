<template>
  <RelawanLayout :clinical-access-requested="needsClinicalKey" @clinical-ready="onClinicalReady">
    <div class="space-y-6">
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
          {{ $t('assessment.subtitle') }}
        </span>
        <h2 class="text-xl font-extrabold text-slate-900 mt-1">
          {{ $t('assessment.title') }}
        </h2>
        <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">
          {{ $t('assessment.description') }}
        </p>
      </div>

      <section v-if="drafts.length" class="rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-xs">
        <h3 class="text-sm font-extrabold text-slate-900">{{ $t('relawan.dataWorkspace.unfinishedTitle') }}</h3>
        <p class="mt-1 text-xs text-slate-600">{{ $t('assessment.draftsCount', { count: drafts.length }) }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <RelawanLink :href="drafts[0]!.resumeUrl" class="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700">{{ $t('assessment.resumeLast') }}</RelawanLink>
          <RelawanLink href="/relawan/assessment/drafts" class="rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900">{{ $t('assessment.viewAllDrafts', { count: drafts.length }) }}</RelawanLink>
        </div>
      </section>

      <!-- Start New Assessment Form -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div class="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <UserRound class="h-5 w-5" aria-hidden="true" />
          <h3 class="font-extrabold text-slate-900 text-base">
            {{ $t('assessment.startNewTitle') }}
          </h3>
        </div>

        <form @submit.prevent="startNew" class="space-y-4">
          <p v-if="localError" role="alert" class="text-xs font-semibold text-red-800">{{ localError }}</p>
          <!-- Existing Patient Selector -->
          <div v-if="patients && patients.length > 0">
            <label class="block text-xs font-bold text-slate-700 mb-1">
              {{ $t('assessment.selectExistingPatient') }}
            </label>
            <select
              v-model="form.patient_id"
              class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option :value="''">{{ $t('assessment.createNewPatientOption') }}</option>
              <option v-for="p in patients" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.nik || $t('assessment.noNik') }})
              </option>
            </select>
          </div>

          <!-- New Patient Input fields (if no existing patient selected) -->
          <div v-if="!form.patient_id" class="space-y-3 pt-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                {{ $t('assessment.nameLabel') }}
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                :placeholder="$t('assessment.namePlaceholder')"
                class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                {{ $t('assessment.nikLabel') }}
              </label>
              <input
                v-model="form.nik"
                type="text"
                maxlength="16"
                :placeholder="$t('assessment.nikPlaceholder')"
                class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  {{ $t('assessment.ageLabel') }}
                </label>
                <input
                  v-model.number="form.age"
                  type="number"
                  min="0"
                  max="120"
                  :placeholder="$t('assessment.agePlaceholder')"
                  class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  {{ $t('assessment.genderLabel') }}
                </label>
                <select
                  v-model="form.gender"
                  class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
                >
                  <option value="Perempuan">{{ $t('assessment.female') }}</option>
                  <option value="Laki-laki">{{ $t('assessment.male') }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Mode Selection -->
          <div class="pt-2">
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              {{ $t('assessment.modeChoiceLabel') }}
            </label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="form.mode = 'VERBAL'"
                class="p-3.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer"
                :class="form.mode === 'VERBAL' ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-500/20' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
              >
                <span class="text-sm inline-flex items-center gap-2"><Mic class="h-4 w-4" aria-hidden="true" />{{ $t('assessment.verbalModeTitle') }}</span>
                <span class="text-[11px] font-normal text-slate-500 mt-1">{{ $t('assessment.verbalModeDesc') }}</span>
              </button>
              <button
                type="button"
                @click="form.mode = 'NON_VERBAL'"
                class="p-3.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer"
                :class="form.mode === 'NON_VERBAL' ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-500/20' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
              >
                <span class="text-sm">{{ $t('assessment.adaptiveModeTitle') }}</span>
                <span class="text-[11px] font-normal text-slate-500 mt-1">{{ $t('assessment.adaptiveModeDesc') }}</span>
              </button>
            </div>
          </div>

          <div class="pt-4">
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              <span v-if="loading">{{ $t('assessment.preparingAssessment') }}</span>
              <span v-else>{{ $t('assessment.startAssessment') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Mic, UserRound } from 'lucide-vue-next';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { clinicalKeyReady, clinicalKeyVersion } from '@/offline/encryptedClinicalStorage';
import { relawanOwner, startLocalAssessment } from '@/offline/assessmentWorkflow';
import { loadRelawanAssessmentDrafts, type AssessmentDraft } from '@/composables/relawanAssessmentDrafts';
import type { LocalPatient } from '@/offline/db';
import type { ServerAssessment } from '@/offline/assessmentWorkflow';
import { useI18n } from '@/i18n';
import { localizeMessage } from '@/i18n/localizeMessage';

const { isEn, locale, t: $t } = useI18n();
const props = defineProps<{
  inProgressAssessments?: ServerAssessment[];
  patients?: Array<{ id: string; name: string; nik?: string; age?: number; gender?: string; shelter_id?: number; created_by?: number }>;
}>();
const needsClinicalKey = ref(false);
const runtime = useRelawanRuntime();
const owner = relawanOwner();
const shelterId = runtime.shelterId;
type LocalizedError = { id: string; en: string } | string;
const rawLocalError = ref<LocalizedError>('');
const localError = computed(() =>
  typeof rawLocalError.value === 'string'
    ? localizeMessage(rawLocalError.value, locale.value)
    : (isEn.value ? rawLocalError.value.en : rawLocalError.value.id),
);
const drafts = ref<AssessmentDraft[]>([]);
const localPatients = ref<LocalPatient[]>([]);
const patients = computed(() => {
  const byId = new Map(localPatients.value.map(patient => [patient.id, patient]));
  for (const patient of props.patients ?? []) if (!byId.has(patient.id)) byId.set(patient.id, { ...patient, owner_user_id: owner, sync_state: 'SYNCED' });
  return [...byId.values()];
});
async function refreshDrafts() {
  if (!clinicalKeyReady(owner)) { drafts.value = []; localPatients.value = []; return; }
  rawLocalError.value = '';
  const generation = clinicalKeyVersion();
  const loaded = await loadRelawanAssessmentDrafts(owner, props.inProgressAssessments);
  if (generation !== clinicalKeyVersion() || !clinicalKeyReady(owner)) return;
  drafts.value = loaded.drafts;
  localPatients.value = loaded.patients;
  if (loaded.hydrationFailed) {
    rawLocalError.value = {
      id: 'Sebagian asesmen server belum dapat disalin ke perangkat ini.',
      en: 'Some server assessments could not be copied to this device yet.',
    };
  }
}
function onClinicalReady() {
  needsClinicalKey.value = false;
  void refreshDrafts().catch(() => {
    rawLocalError.value = {
      id: 'Daftar asesmen lokal belum dapat dibaca.',
      en: 'Local assessment list cannot be read yet.',
    };
  });
}
onMounted(() => { void refreshDrafts().catch(() => {}); });

const loading = ref(false);
const form = ref({
  patient_id: '',
  name: '',
  nik: '',
  age: undefined as number | undefined,
  gender: 'Perempuan',
  mode: 'VERBAL',
});

watch(clinicalKeyVersion, () => {
  if (!clinicalKeyReady(owner)) { drafts.value = []; localPatients.value = []; form.value = { patient_id: '', name: '', nik: '', age: undefined, gender: 'Perempuan', mode: 'VERBAL' }; }
}, { flush: 'sync' });

async function startNew() {
  if (!clinicalKeyReady(owner)) { needsClinicalKey.value = true; return; }
  if (loading.value) return;
  loading.value = true;
  rawLocalError.value = '';
  try {
    const selected = patients.value.find(p => p.id === form.value.patient_id);
    const patient = selected
      ? { id: selected.id, name: selected.name, nik: selected.nik, age: selected.age, gender: selected.gender, shelter_id: selected.shelter_id, serverKnown: selected.sync_state === 'SYNCED' }
      : { name: form.value.name.trim(), nik: form.value.nik || undefined, age: form.value.age, gender: form.value.gender, shelter_id: shelterId ?? undefined };
    if (!patient.name) {
      throw new Error('Nama penyintas harus diisi.');
    }
    const id = await startLocalAssessment(owner, patient, form.value.mode as 'VERBAL' | 'NON_VERBAL');
    runtime.navigate(`/relawan/assessment/${id}/identity`);
  } catch (error) {
    rawLocalError.value = error instanceof Error
      ? error.message
      : {
          id: 'Asesmen belum tersimpan pada perangkat ini.',
          en: 'Assessment could not be saved on this device yet.',
        };
  } finally {
    loading.value = false;
  }
}
</script>
