<template>
  <RelawanLayout>
    <div class="space-y-6 pb-56">
      <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
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
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Identitas Penyintas
        </h3>
        <div class="text-sm font-bold text-slate-900">
          {{ patient?.name }} ({{ patient?.age ? `${patient.age} tahun` : 'Usia tidak terdata' }} / {{ patient?.gender }})
        </div>
        <p class="text-xs text-slate-500">
          NIK: {{ patient?.nik || 'Tanpa NIK' }} • Mode: {{ assessment.mode }}
        </p>
      </div>

      <!-- Subtotal Breakdown -->
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p class="text-[11px] font-bold text-slate-500 uppercase">SRQ-20</p>
          <p class="text-xl font-extrabold text-slate-900 mt-1">{{ srqYesCount }}</p>
          <p class="text-[10px] text-slate-400">dari 20 Ya</p>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p class="text-[11px] font-bold text-slate-500 uppercase">Faktor Risiko</p>
          <p class="text-xl font-extrabold text-amber-800 mt-1">{{ riskScore }}</p>
          <p class="text-[10px] text-slate-400">dari 8 Poin</p>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p class="text-[11px] font-bold text-slate-500 uppercase">Fungsi Harian</p>
          <p class="text-xl font-extrabold text-teal-800 mt-1">{{ functionScore }}</p>
          <p class="text-[10px] text-slate-400">dari 9 Poin</p>
        </div>
      </div>

      <!-- Estimation Card -->
      <div v-if="assessmentComplete" class="bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-2">
        <div class="flex items-center space-x-2 text-teal-900 font-bold text-sm">
          <span>⚙️</span>
          <h4>Kalkulasi Deterministik Sistem</h4>
        </div>
        <p class="text-xs text-teal-950 leading-relaxed">
          Total skor estimasi: <strong>{{ totalScore }} / 37 poin</strong>. Sistem akan menghitung rekomendasi triase resmi dan menyimpan catatan ke server posko.
        </p>
      </div>

      <p v-if="!assessmentComplete" role="alert" class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900">Asesmen belum lengkap. Periksa kembali jawaban SRQ-20, faktor risiko, dan fungsi harian.</p>

      <!-- Sticky Action Bar -->
      <div data-assessment-action-bar class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl z-30 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <Link
            :href="`/relawan/assessment/${assessment.id}/function`"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            ← Kembali
          </Link>
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
import { ref, computed } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import RelawanLayout from '@/layouts/RelawanLayout.vue';

const props = defineProps<{
  assessment: any;
  patient: any;
  srqResponses?: Record<number, boolean>;
  riskResponses?: Record<string, boolean>;
  functionResponses?: Record<string, number>;
}>();

const isSubmitting = ref(false);
const completionError = ref('');
const assessmentComplete = computed(() =>
  Object.keys(props.srqResponses || {}).length === 20 &&
  Object.keys(props.riskResponses || {}).length === 5 &&
  Object.keys(props.functionResponses || {}).length === 3 &&
  Array.from({ length: 20 }, (_, index) => typeof props.srqResponses?.[index + 1] === 'boolean').every(Boolean) &&
  ['R1', 'R2', 'R3', 'R4', 'R5'].every(code => typeof props.riskResponses?.[code] === 'boolean') &&
  ['F1', 'F2', 'F3'].every(code => [0, 1, 3].includes(props.functionResponses?.[code] as number))
);


const srqYesCount = computed(() => {
  if (!props.srqResponses) return 0;
  return Object.values(props.srqResponses).filter((v) => v === true).length;
});

const riskScore = computed(() => {
  const weights: Record<string, number> = { R1: 2, R2: 2, R3: 1, R4: 2, R5: 1 };
  let total = 0;
  for (const [code, val] of Object.entries(props.riskResponses || {})) {
    if (val && weights[code]) {
      total += weights[code];
    }
  }
  return total;
});

const functionScore = computed(() => {
  if (!props.functionResponses) return 0;
  return Object.values(props.functionResponses).reduce((acc, v) => acc + (v || 0), 0);
});

const totalScore = computed(() => {
  return srqYesCount.value + riskScore.value + functionScore.value;
});

function finalizeAssessment() {
  if (isSubmitting.value || !assessmentComplete.value) return;
  isSubmitting.value = true;
  completionError.value = '';
  router.post(`/relawan/assessment/${props.assessment.id}/complete`, {}, {
    onError: (errors) => {
      completionError.value = errors.assessment || 'Asesmen belum dapat diselesaikan. Periksa semua jawaban, lalu coba lagi.';
    },
    onFinish: () => {
      isSubmitting.value = false;
    },
  });
}
</script>
