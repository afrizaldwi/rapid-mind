<template>
  <RelawanLayout @clinical-ready="loadIdentityContext">
    <div class="space-y-5">
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <h1 class="text-lg font-extrabold text-slate-900">{{ $t('assessment.identityConfirmTitle') }}</h1>
        <p class="text-xs text-slate-600 mt-2">{{ $t('assessment.identityConfirmDesc') }}</p>
      </div>
      <div v-if="patient" class="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-sm">
        <p><strong>{{ $t('assessment.nameLabel') }}:</strong> {{ patient.name }}</p>
        <p><strong>{{ $t('assessment.nikLabel') }}:</strong> {{ patient.nik || $t('assessment.noNik') }}</p>
        <p><strong>{{ $t('assessment.ageLabel') }}:</strong> {{ patient.age ?? $t('assessment.notRecorded') }}</p>
        <p><strong>{{ $t('assessment.genderLabel') }}:</strong> {{ formatGender(patient.gender) }}</p>
        <p><strong>Mode:</strong> {{ localAssessment?.mode === 'NON_VERBAL' ? 'Non-Verbal' : 'Verbal' }}</p>
      </div>
      <p v-if="error" role="alert" class="text-sm font-semibold text-red-800">{{ error }}</p>
      <button type="button" :disabled="!localAssessment || !patient" @click="runtime.navigate(`/relawan/assessment/${assessment.id}/srq`)" class="w-full rounded-xl bg-teal-700 p-4 text-white font-bold disabled:opacity-60 cursor-pointer">{{ $t('assessment.identityConfirmedAction') }}</button>
    </div>
  </RelawanLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { loadAssessmentContext, relawanOwner, type ServerAssessment, type ServerPatient } from '@/offline/assessmentWorkflow';
import type { LocalAssessment, LocalPatient } from '@/offline/db';
import { useI18n } from '@/i18n';
import { localizeMessage } from '@/i18n/localizeMessage';

const { isEn, locale, t: $t } = useI18n();
const props = defineProps<{ assessment: ServerAssessment; patient?: ServerPatient | null }>();
const runtime = useRelawanRuntime();
const owner = relawanOwner();
const assessment = props.assessment;
const localAssessment = ref<LocalAssessment | null>(null);
const patient = ref<LocalPatient | null>(null);
const rawError = ref<{ id: string; en: string } | string>('');
const error = computed(() =>
  typeof rawError.value === 'string'
    ? localizeMessage(rawError.value, locale.value)
    : (isEn.value ? rawError.value.en : rawError.value.id),
);

function formatGender(value?: string | null): string {
  if (!value) return $t('assessment.notRecorded');
  const upper = value.toUpperCase();
  if (upper === 'P' || upper === 'PEREMPUAN' || upper === 'FEMALE') {
    return $t('assessment.female');
  }
  if (upper === 'L' || upper === 'LAKI-LAKI' || upper === 'MALE') {
    return $t('assessment.male');
  }
  return value;
}

async function loadIdentityContext() {
  rawError.value = '';
  try {
    const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === 'OFFLINE_FIELD_MODE');
    localAssessment.value = context.assessment;
    patient.value = context.patient;
  } catch (e) {
    rawError.value = e instanceof Error
      ? e.message
      : { id: 'Asesmen lokal tidak tersedia.', en: 'Local assessment is not available.' };
  }
}
onMounted(() => { void loadIdentityContext(); });
</script>
