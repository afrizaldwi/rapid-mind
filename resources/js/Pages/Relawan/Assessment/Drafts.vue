<template>
  <RelawanLayout>
    <div class="space-y-4">
      <header class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h1 class="text-xl font-extrabold text-slate-900">Asesmen Belum Selesai</h1>
        <p class="mt-1 text-xs leading-relaxed text-slate-600">Asesmen yang tersimpan di perangkat ini dapat dilanjutkan dari tahap terakhir.</p>
      </header>

      <p v-if="error" role="alert" class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{{ error }}</p>

      <section v-if="!loading && !drafts.length" class="rounded-2xl border border-slate-200 bg-white p-5">
        <p v-if="!readFailed" class="text-sm text-slate-600">Belum ada asesmen yang belum selesai.</p>
        <RelawanLink href="/relawan/assessment" class="mt-3 inline-block rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white">Mulai Asesmen Baru</RelawanLink>
      </section>

      <section v-else-if="drafts.length" class="space-y-3" aria-label="Daftar asesmen belum selesai">
        <p class="text-xs font-semibold text-slate-600">{{ drafts.length }} asesmen tersimpan di perangkat ini</p>
        <article v-for="draft in drafts" :key="draft.id" class="rounded-xl border border-amber-200 bg-white p-4 shadow-xs">
          <h2 class="text-sm font-bold text-slate-900">{{ draft.patientName }}</h2>
          <p class="mt-1 text-xs text-slate-600">NIK: {{ draft.nik || 'Tanpa NIK' }}</p>
          <p class="mt-1 text-xs text-slate-600">Mode: {{ draft.mode }} • Tahap: {{ draft.stageLabel }}</p>
          <p class="mt-1 text-xs text-slate-600">Terakhir diperbarui: {{ formatDate(draft.updatedAt) }}</p>
          <p class="mt-2 text-xs font-semibold text-amber-800">Tersimpan di perangkat</p>
          <RelawanLink :href="draft.resumeUrl" class="mt-3 inline-block rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700">{{ draft.resumeLabel }} →</RelawanLink>
        </article>
      </section>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { relawanOwner, type ServerAssessment } from '@/offline/assessmentWorkflow';
import { loadRelawanAssessmentDrafts, type AssessmentDraft } from '@/composables/relawanAssessmentDrafts';

const props = defineProps<{ inProgressAssessments?: ServerAssessment[] }>();
const owner = relawanOwner();
const drafts = ref<AssessmentDraft[]>([]);
const loading = ref(true);
const readFailed = ref(false);
const error = ref('');

onMounted(async () => {
  try {
    const loaded = await loadRelawanAssessmentDrafts(owner, props.inProgressAssessments);
    drafts.value = loaded.drafts;
    if (loaded.hydrationFailed) error.value = 'Sebagian asesmen server belum dapat disalin ke perangkat ini.';
  } catch {
    readFailed.value = true;
    error.value = 'Daftar asesmen lokal belum dapat dibaca.';
  } finally {
    loading.value = false;
  }
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Waktu tidak tersedia' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>
