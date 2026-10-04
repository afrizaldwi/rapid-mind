<template>
  <RelawanLayout>
    <div class="space-y-6 pb-56">
      <div class="bg-white rounded-xl p-5 shadow-xs border border-slate-200">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
          Tinjau Sebelum Finalisasi
        </span>
        <h2 class="text-lg font-extrabold text-slate-900 mt-1">
          Ringkasan Lembar Asesmen
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Pastikan jawaban dan observasi telah divalidasi bersama penyintas.
        </p>
      </div>

      <!-- Identity Review Card -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Identitas Penyintas
        </h3>
        <div class="text-sm font-bold text-slate-900">
          {{ localPatient?.name }} ({{ localPatient?.age ? `${localPatient.age} tahun` : 'Usia tidak terdata' }} / {{ localPatient?.gender }})
        </div>
        <p class="text-xs text-slate-500">
          NIK: {{ localPatient?.nik || 'Tanpa NIK' }} • Mode: {{ localAssessment?.mode }}
        </p>
      </div>

      <!-- Subtotal Breakdown -->
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p class="text-[11px] font-bold text-slate-500 uppercase">SRQ-20</p>
          <p class="text-xl font-extrabold text-slate-900 mt-1">{{ srqYesCount }}</p>
          <p class="text-[10px] text-slate-400">dari 20 Ya</p>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p class="text-[11px] font-bold text-slate-500 uppercase">Faktor Risiko</p>
          <p class="text-xl font-extrabold text-amber-800 mt-1">{{ riskScore }}</p>
          <p class="text-[10px] text-slate-400">dari 8 Poin</p>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p class="text-[11px] font-bold text-slate-500 uppercase">Fungsi Harian</p>
          <p class="text-xl font-extrabold text-teal-800 mt-1">{{ functionScore }}</p>
          <p class="text-[10px] text-slate-400">dari 9 Poin</p>
        </div>
      </div>

      <!-- Estimation Card -->
      <div v-if="assessmentComplete" class="bg-teal-50 border border-teal-200 rounded-xl p-5 space-y-2">
        <div class="flex items-center space-x-2 text-teal-900 font-bold text-sm">
          <Calculator class="h-4 w-4" aria-hidden="true" />
          <h4>Kalkulasi Deterministik Sistem</h4>
        </div>
        <p class="text-xs text-teal-950 leading-relaxed">
          Total skor estimasi: <strong>{{ totalScore }} / 37 poin</strong>. Rekomendasi sistem dihitung dan disimpan di perangkat ini. Sinkronisasi server berjalan terpisah.
        </p>
      </div>

      <p v-if="!assessmentComplete" role="alert" class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900">Asesmen belum lengkap. Periksa kembali jawaban SRQ-20, faktor risiko, dan fungsi harian.</p>

      <!-- Sticky Action Bar -->
      <div data-assessment-action-bar class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl z-30 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <RelawanLink
            :href="`/relawan/assessment/${assessment.id}/function`"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            ← Kembali
          </RelawanLink>
          <button
            type="button"
            :disabled="isSubmitting || !assessmentComplete"
            @click="finalizeAssessment"
            class="flex-1 py-3.5 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition disabled:opacity-60"
          >
            <span v-if="isSubmitting">Menghitung Rekomendasi…</span>
            <span v-else>SELESAIKAN & LIHAT REKOMENDASI TRIASE →</span>
          </button>
        </div>
        <p v-if="completionError" role="alert" class="mt-2 text-xs font-semibold text-red-800">{{ completionError }}</p>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Calculator } from 'lucide-vue-next';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { completeLocalAssessment, exactAssessmentAnswers, loadAssessmentContext, relawanOwner, type ServerAssessment, type ServerPatient } from '@/offline/assessmentWorkflow';
import { RiskCalculator } from '@/domain/triage/riskCalculator';
import type { LocalAssessment, LocalPatient } from '@/offline/db';

const props = defineProps<{ assessment: ServerAssessment; patient?: ServerPatient | null }>();
const runtime = useRelawanRuntime();
const owner = relawanOwner();
const localAssessment = ref<LocalAssessment | null>(null);
const localPatient = ref<LocalPatient | null>(null);
const isSubmitting = ref(false);
const completionError = ref('');
const assessmentComplete = computed(() => !!localAssessment.value && exactAssessmentAnswers(localAssessment.value));
const srqYesCount = computed(() => Object.values(localAssessment.value?.srq_answers ?? {}).filter(Boolean).length);
const riskScore = computed(() => new RiskCalculator().calculate(localAssessment.value?.risk_indicators ?? {}));
const functionScore = computed(() => Object.values(localAssessment.value?.function_domains ?? {}).reduce((sum, value) => sum + value, 0));
const totalScore = computed(() => srqYesCount.value + riskScore.value + functionScore.value);
onMounted(async () => {
  try {
    const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === 'OFFLINE_FIELD_MODE');
    localAssessment.value = context.assessment;
    localPatient.value = context.patient;
  } catch (error) { completionError.value = error instanceof Error ? error.message : 'Asesmen lokal tidak tersedia.'; }
});
async function finalizeAssessment() {
  if (isSubmitting.value || !assessmentComplete.value) return;
  isSubmitting.value = true;
  completionError.value = '';
  try {
    await completeLocalAssessment(owner, props.assessment.id);
    runtime.navigate(`/relawan/assessment/${props.assessment.id}/result`);
  } catch (error) {
    completionError.value = error instanceof Error ? error.message : 'Asesmen belum dapat diselesaikan.';
  } finally { isSubmitting.value = false; }
}
</script>
