<template>
  <RelawanLayout>
    <div class="space-y-6">
      <!-- Result Card -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
          Hasil Skrining Lapangan
        </span>

        <!-- Triage Level Display -->
        <p v-if="loadError" role="alert" class="text-sm text-red-800">{{ loadError }}</p>
        <p v-if="triageResult" class="text-xs font-semibold text-teal-800">{{ syncLabel }}</p>
        <div v-if="triageResult" class="py-2">
          <div
            class="inline-flex items-center justify-center px-6 py-3 rounded-2xl text-2xl font-black tracking-wide border-2 shadow-sm"
            :class="categoryStyle.badge"
          >
            {{ triageResult?.system_recommendation || '—' }}
          </div>
          <h2 class="text-xl font-extrabold text-slate-900 mt-3">
            {{ categoryStyle.title }}
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Pasien: <strong class="text-slate-800">{{ localPatient?.name }}</strong> (NIK: {{ localPatient?.nik || 'Tanpa NIK' }})
          </p>
        </div>

        <!-- Score Breakdown Cards -->
        <div v-if="triageResult" class="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-bold text-slate-500 uppercase block">SRQ-20</span>
            <span class="text-base font-extrabold text-slate-900">{{ triageResult?.srq_score }}</span>
            <span class="text-[9px] text-slate-400 block">/20</span>
          </div>

          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-bold text-slate-500 uppercase block">Risiko</span>
            <span class="text-base font-extrabold text-amber-800">{{ triageResult?.risk_score }}</span>
            <span class="text-[9px] text-slate-400 block">/8</span>
          </div>

          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span class="text-[10px] font-bold text-slate-500 uppercase block">Fungsi</span>
            <span class="text-base font-extrabold text-teal-800">{{ triageResult?.function_score }}</span>
            <span class="text-[9px] text-slate-400 block">/9</span>
          </div>

          <div class="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
            <span class="text-[10px] font-bold text-teal-800 uppercase block">Total</span>
            <span class="text-base font-black text-teal-950">{{ triageResult?.total_score }}</span>
            <span class="text-[9px] text-teal-700 block">/37</span>
          </div>
        </div>
      </div>

      <!-- Field Intervention Guidance -->
      <div v-if="triageResult" class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Rekomendasi Tindak Lanjut Relawan
        </h3>
        <p class="text-xs text-slate-700 leading-relaxed font-medium">
          {{ categoryStyle.actionText }}
        </p>
      </div>

      <!-- Clinical Safety Disclaimer -->
      <div class="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start space-x-2.5 leading-relaxed">
        <span class="text-base leading-none">ℹ️</span>
        <div>
          <strong class="text-slate-800 block mb-0.5">Rekomendasi Sistem (Bukan Diagnosis Medis):</strong>
          RAPID-MIND adalah instrumen pendukung keputusan penapisan awal. Penetapan diagnosis klinis resmi, tata laksana medikamentosa, dan tindakan rujukan medis sepenuhnya menjadi kewenangan tenaga kesehatan (dokter/psikiater).
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2.5 pt-2">
        <RelawanLink
          href="/relawan/home"
          class="w-full flex justify-center py-3.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-md transition"
        >
          Kembali ke Beranda
        </RelawanLink>
        <RelawanLink
          href="/relawan/assessment"
          class="w-full flex justify-center py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-sm rounded-xl transition"
        >
          Kembali ke Daftar Asesmen
        </RelawanLink>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { loadAssessmentContext, relawanOwner, type ServerAssessment, type ServerPatient } from '@/offline/assessmentWorkflow';
import { normalizeTriage } from '@/offline/triageDisplay';
import type { LocalPatient } from '@/offline/db';

const props = defineProps<{
  assessment: ServerAssessment;
  patient?: ServerPatient | null;
  triageResult?: unknown;
}>();

const runtime = useRelawanRuntime();
const owner = relawanOwner();
const localPatient = ref<LocalPatient | null>(null);
const triageResult = ref(normalizeTriage(props.triageResult));
const syncLabel = ref('Tersimpan di perangkat ini; sinkronisasi belum dikonfirmasi.');
const loadError = ref('');
onMounted(async () => {
  try {
    const context = await loadAssessmentContext(owner, props.assessment, props.patient, runtime.mode === 'OFFLINE_FIELD_MODE');
    if (context.assessment.status !== 'COMPLETED') throw new Error('Asesmen belum selesai.');
    localPatient.value = context.patient;
    triageResult.value = normalizeTriage(context.assessment.triage_result ?? props.triageResult);
    if (!triageResult.value) throw new Error('Rekomendasi sistem belum tersedia.');
    syncLabel.value = context.assessment.sync_state === 'SYNCED' ? 'Tersinkronisasi dengan server.' : 'Tersimpan di perangkat ini; sinkronisasi belum dikonfirmasi.';
  } catch (error) { loadError.value = error instanceof Error ? error.message : 'Hasil tidak tersedia.'; }
});

const categoryStyle = computed(() => {
  const cat = triageResult.value?.system_recommendation;

  switch (cat) {
    case 'T0_SUSPECT':
    case 'T0_CONFIRMED':
      return {
        badge: 'bg-red-50 text-red-900 border-red-500',
        title: 'T0 — Gawat Darurat Psikiatrik',
        actionText: 'SEGERA dampingi penyintas secara fisik. Picu sinyal T0 Darurat untuk respons cepat evakuasi medis PSC 119.',
      };
    case 'T1':
      return {
        badge: 'bg-orange-50 text-orange-950 border-orange-400',
        title: 'T1 — Distres Berat / Prioritas Konsultasi Medis',
        actionText: 'Jadwalkan konsultasi dengan dokter / perawat faskes di Pos Medis terdekat untuk evaluasi lanjutan dan validasi klinis.',
      };
    case 'T2':
      return {
        badge: 'bg-amber-50 text-amber-950 border-amber-400',
        title: 'T2 — Distres Sedang / Dukungan Psikososial',
        actionText: 'Berikan intervensi PFA lanjutan, ajak bergabung dalam aktivitas dukungan psikososial kelompok terstruktur, dan evaluasi ulang dalam 7 hari.',
      };
    default:
      return {
        badge: 'bg-emerald-50 text-emerald-950 border-emerald-400',
        title: 'T3 — Resilien / Dukungan Komunitas Rutin',
        actionText: 'Kondisi psikologis stabil. Sertakan dalam kegiatan harian posko, berikan edukasi reaksi stres normal, dan pantau secara berkala.',
      };
  }
});
</script>
