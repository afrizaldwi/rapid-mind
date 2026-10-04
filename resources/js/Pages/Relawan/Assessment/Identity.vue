<template>
  <RelawanLayout>
    <div class="space-y-5">
      <div class="bg-white rounded-xl border border-slate-200 p-5">
        <h1 class="text-lg font-extrabold text-slate-900">Konfirmasi Identitas Penyintas</h1>
        <p class="text-xs text-slate-600 mt-2">Periksa identitas sebelum wawancara SRQ-20.</p>
      </div>
      <div v-if="patient" class="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-sm">
        <p><strong>Nama:</strong> {{ patient.name }}</p>
        <p><strong>NIK:</strong> {{ patient.nik || 'Tanpa NIK' }}</p>
        <p><strong>Usia:</strong> {{ patient.age ?? 'Tidak terdata' }}</p>
        <p><strong>Jenis kelamin:</strong> {{ patient.gender || 'Tidak terdata' }}</p>
        <p><strong>Mode:</strong> {{ localAssessment?.mode }}</p>
      </div>
      <p v-if="error" role="alert" class="text-sm font-semibold text-red-800">{{ error }}</p>
      <button type="button" :disabled="!localAssessment || !patient" @click="runtime.navigate(`/relawan/assessment/${assessment.id}/srq`)" class="w-full rounded-xl bg-teal-700 p-4 text-white font-bold disabled:opacity-60">Identitas Sesuai, Lanjut ke SRQ-20 →</button>
    </div>
  </RelawanLayout>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { loadAssessmentContext, relawanOwner, type ServerAssessment, type ServerPatient } from '@/offline/assessmentWorkflow';
import type { LocalAssessment, LocalPatient } from '@/offline/db';
const props = defineProps<{ assessment: ServerAssessment; patient?: ServerPatient | null }>();
const runtime = useRelawanRuntime();
const owner = relawanOwner();
const assessment = props.assessment;
const localAssessment = ref<LocalAssessment | null>(null);
const patient = ref<LocalPatient | null>(null);
const error = ref('');
onMounted(async () => {
  try {
    const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === 'OFFLINE_FIELD_MODE');
    localAssessment.value = context.assessment;
    patient.value = context.patient;
  } catch (e) { error.value = e instanceof Error ? e.message : 'Asesmen lokal tidak tersedia.'; }
});
</script>
