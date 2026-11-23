<template>
  <RelawanLayout @clinical-ready="loadDrafts">
    <div class="space-y-4">
      <header class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h1 class="text-xl font-extrabold text-slate-900">
          {{ isEn ? 'Unfinished Assessments' : 'Asesmen Belum Selesai' }}
        </h1>
        <p class="mt-1 text-xs leading-relaxed text-slate-600">
          {{ isEn ? 'Assessments saved on this device can be resumed from the last stage.' : 'Asesmen yang tersimpan di perangkat ini dapat dilanjutkan dari tahap terakhir.' }}
        </p>
      </header>

      <p v-if="error" role="alert" class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{{ error }}</p>

      <section v-if="!loading && !drafts.length" class="rounded-xl border border-slate-200 bg-white p-5">
        <p v-if="!readFailed" class="text-sm text-slate-600">
          {{ isEn ? 'No unfinished assessments yet.' : 'Belum ada asesmen yang belum selesai.' }}
        </p>
        <RelawanLink href="/relawan/assessment" class="mt-3 inline-block rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white">
          {{ isEn ? 'Start New Assessment' : 'Mulai Asesmen Baru' }}
        </RelawanLink>
      </section>

      <section v-else-if="drafts.length" class="space-y-3" :aria-label="isEn ? 'Unfinished assessments list' : 'Daftar asesmen belum selesai'">
        <p class="text-xs font-semibold text-slate-600">
          {{ drafts.length }} {{ isEn ? 'assessments saved on this device' : 'asesmen tersimpan di perangkat ini' }}
        </p>
        <ul class="rounded-2xl bg-slate-200/70 p-1">
          <li
            v-for="draft in drafts"
            :key="draft.id"
            class="grid gap-3 border-b border-slate-100 bg-white p-4 first:rounded-t-xl last:rounded-b-xl last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div class="min-w-0">
              <h2 class="break-words text-lg font-bold leading-tight text-slate-900">
                {{ draft.hasPatientName ? draft.patientName : (isEn ? 'Survivor' : 'Penyintas') }}
              </h2>
              <p class="mt-1 break-words text-sm text-slate-600">
                {{ draft.nik ? 'NIK: ' + draft.nik : (isEn ? 'No NIK' : 'Tanpa NIK') }}
                · {{ draft.mode === 'NON_VERBAL' ? 'Non-Verbal' : 'Verbal' }}
              </p>
              <p class="mt-1 text-xs text-slate-600">
                {{ isEn ? 'Updated' : 'Diperbarui' }} {{ formatDate(draft.updatedAt) }}
              </p>
            </div>
            <RelawanLink
              :href="draft.resumeUrl"
              class="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              {{ resumeTitle(draft.stage) }}
            </RelawanLink>
          </li>
        </ul>
      </section>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { relawanOwner, type ServerAssessment } from '@/offline/assessmentWorkflow';
import { loadRelawanAssessmentDrafts, type AssessmentDraft } from '@/composables/relawanAssessmentDrafts';
import { ensureDeviceClinicalAccess } from '@/offline/deviceKeyWorkflow';
import { useI18n } from '@/i18n';

const { isEn } = useI18n();
const props = defineProps<{ inProgressAssessments?: ServerAssessment[] }>();
const owner = relawanOwner();
const drafts = ref<AssessmentDraft[]>([]);
const loading = ref(true);
const readFailed = ref(false);
const errorCode = ref<'hydration' | 'read' | null>(null);
const error = computed(() => {
  if (errorCode.value === 'hydration') {
    return isEn.value
      ? 'Some server assessments could not be copied to this device yet.'
      : 'Sebagian asesmen server belum dapat disalin ke perangkat ini.';
  }
  if (errorCode.value === 'read') {
    return isEn.value
      ? 'Local assessment list cannot be read yet.'
      : 'Daftar asesmen lokal belum dapat dibaca.';
  }
  return '';
});

function stageTitle(stage: AssessmentDraft['stage']): string {
  switch (stage) {
    case 'srq':
      return 'SRQ-20';
    case 'risk':
      return isEn.value ? 'Risk Factors' : 'Faktor Risiko';
    case 'function':
      return isEn.value ? 'Daily Function' : 'Fungsi Harian';
    case 'review':
      return isEn.value ? 'Review Assessment' : 'Tinjau Asesmen';
  }
}

function resumeTitle(stage: AssessmentDraft['stage']): string {
  if (stage === 'review') {
    return isEn.value ? 'Review Assessment' : 'Tinjau Asesmen';
  }
  return isEn.value ? `Continue ${stageTitle(stage)}` : `Lanjutkan ${stageTitle(stage)}`;
}

async function loadDrafts() {
  loading.value = true;
  readFailed.value = false;
  errorCode.value = null;
  try {
    await ensureDeviceClinicalAccess(owner);
    const loaded = await loadRelawanAssessmentDrafts(owner, props.inProgressAssessments);
    drafts.value = loaded.drafts;
    if (loaded.hydrationFailed) errorCode.value = 'hydration';
  } catch {
    readFailed.value = true;
    errorCode.value = 'read';
  } finally {
    loading.value = false;
  }
}

onMounted(() => { void loadDrafts(); });

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? (isEn.value ? 'Time unavailable' : 'Waktu tidak tersedia')
    : date.toLocaleString(isEn.value ? 'en-US' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>
