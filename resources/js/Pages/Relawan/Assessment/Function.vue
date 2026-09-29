<template>
  <RelawanLayout>
    <div class="space-y-6 pb-24">
      <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
          Bagian C: Keberfungsian Harian
        </span>
        <h2 class="text-lg font-extrabold text-slate-900 mt-1">
          Evaluasi Keberfungsian di Posko
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          {{ patient?.name }} • Adaptasi WHODAS: Pilih kondisi yang paling menggambarkan aktivitas penyintas 3 hari terakhir.
        </p>
      </div>

      <div class="space-y-5">
        <div
          v-for="d in domains"
          :key="d.code"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
        >
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-900 text-sm">
              {{ d.code }}. {{ d.title }}
            </h3>
            <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              Skor: {{ functions[d.code] ?? 0 }}
            </span>
          </div>

          <div class="space-y-2">
            <button
              v-for="opt in d.options"
              :key="opt.level"
              type="button"
              @click="functions[d.code] = opt.level"
              class="w-full text-left p-3.5 rounded-xl border-2 transition text-xs font-medium flex items-center justify-between"
              :class="functions[d.code] === opt.level
                ? (opt.level === 3 ? 'border-red-600 bg-red-50 text-red-950 font-bold' : 'border-teal-700 bg-teal-50 text-teal-950 font-bold ring-1 ring-teal-500/20')
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'"
            >
              <span>{{ opt.label }}</span>
              <span class="font-bold ml-2">({{ opt.level }} Poin)</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Functional Impairment Safety Warning if >= 6 -->
      <div
        v-if="functionScore >= 6"
        class="bg-orange-50 border-2 border-orange-400 p-4 rounded-xl text-orange-950 text-xs font-semibold space-y-1"
      >
        <span class="text-base">⚠️</span>
        <p>
          Skor disabilitas fungsi harian penyintas mencapai {{ functionScore }} poin (≥ 6). Sistem akan merekomendasikan kategori <strong>T1 (Prioritas Pemeriksaan Dokter / Tenaga Medis)</strong>.
        </p>
      </div>

      <!-- Sticky Bottom Navigation Bar -->
      <div class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 shadow-xl z-20 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <Link
            :href="`/relawan/assessment/${assessment.id}/risk`"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            ← Kembali
          </Link>
          <button
            type="button"
            @click="saveAndNext"
            class="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition"
          >
            Tinjau & Ringkasan Asesmen →
          </button>
        </div>
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
  functions?: Record<string, number>;
}>();

const functions = ref<Record<string, number>>({
  F1: 0,
  F2: 0,
  F3: 0,
  ...(props.functions || {}),
});

const domains = [
  {
    code: 'F1',
    title: 'Perawatan Diri (Self-Care)',
    options: [
      { level: 0, label: '0 — Mandiri merawat diri, makan, minum, dan ganti pakaian tanpa dorongan.' },
      { level: 1, label: '1 — Butuh diingatkan / diarahkan berulang kali oleh keluarga/relawan.' },
      { level: 3, label: '3 — Menolak total / tidak mampu merawat diri sama sekali.' },
    ],
  },
  {
    code: 'F2',
    title: 'Fungsi Peran & Sosial',
    options: [
      { level: 0, label: '0 — Mampu berinteraksi wajar dan membantu keluarga/sesama pengungsi.' },
      { level: 1, label: '1 — Menarik diri, mengurung diri di tenda, enggan diajak bicara.' },
      { level: 3, label: '3 — Memusuhi, agresif, atau mutisme total (tidak merespons orang).' },
    ],
  },
  {
    code: 'F3',
    title: 'Akses Kebutuhan & Bantuan',
    options: [
      { level: 0, label: '0 — Aktif dan mampu mengurus kebutuhan posko / antre logistik.' },
      { level: 1, label: '1 — Pasif, hanya menunggu orang lain membawakan logistik.' },
      { level: 3, label: '3 — Bingung total / linglung parah, tersesat di sekitar posko.' },
    ],
  },
];

const functionScore = computed(() => {
  return (functions.value.F1 || 0) + (functions.value.F2 || 0) + (functions.value.F3 || 0);
});

function saveAndNext() {
  fetch(`/relawan/assessment/${props.assessment.id}/function`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
    },
    body: JSON.stringify({ functions: functions.value }),
  }).finally(() => {
    router.visit(`/relawan/assessment/${props.assessment.id}/review`);
  });
}
</script>
