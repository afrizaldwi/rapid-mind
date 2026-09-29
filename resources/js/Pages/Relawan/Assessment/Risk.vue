<template>
  <RelawanLayout>
    <div class="space-y-6 pb-24">
      <div class="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
          Bagian A: Faktor Risiko
        </span>
        <h2 class="text-lg font-extrabold text-slate-900 mt-1">
          Penilaian Kerentanan Latar Belakang
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          {{ patient?.name }} • Centang kondisi yang sesuai berdasarkan observasi atau cerita penyintas.
        </p>
      </div>

      <div class="space-y-3">
        <div
          v-for="item in riskItems"
          :key="item.code"
          @click="toggleRisk(item.code)"
          class="p-4 rounded-2xl border-2 transition cursor-pointer flex items-start space-x-3.5"
          :class="risks[item.code] ? 'bg-amber-50/70 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'"
        >
          <div
            class="w-6 h-6 rounded-lg border-2 mt-0.5 flex items-center justify-center font-bold text-sm transition"
            :class="risks[item.code] ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'"
          >
            <span v-if="risks[item.code]">✓</span>
          </div>

          <div class="flex-1 space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-900 uppercase">
                {{ item.code }} • {{ item.category }}
              </span>
              <span class="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                +{{ item.weight }} Poin
              </span>
            </div>
            <h3 class="text-sm font-bold text-slate-900 leading-snug">
              {{ item.title }}
            </h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              {{ item.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Current Risk Subtotal Indicator -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold">
        <span class="text-slate-600">Subtotal Skor Risiko:</span>
        <span class="text-sm text-amber-800 bg-amber-100 px-3 py-1 rounded-lg">
          {{ riskScore }} / 8 Poin
        </span>
      </div>

      <!-- Sticky Bottom Navigation Bar -->
      <div class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 shadow-xl z-20 max-w-lg mx-auto">
        <div class="flex items-center justify-between space-x-3">
          <Link
            :href="`/relawan/assessment/${assessment.id}/srq`"
            class="py-3 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            ← Kembali
          </Link>
          <button
            type="button"
            @click="saveAndNext"
            class="flex-1 py-3 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition"
          >
            Lanjut: Fungsi Harian →
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
  risks?: Record<string, boolean>;
}>();

const risks = ref<Record<string, boolean>>({
  R1: false,
  R2: false,
  R3: false,
  R4: false,
  R5: false,
  ...(props.risks || {}),
});

const riskItems = [
  {
    code: 'R1',
    category: 'Duka Cita / Kerugian Materi Akut',
    weight: 2,
    title: 'Kehilangan Berat',
    description: 'Penyintas kehilangan anggota keluarga inti (meninggal/hilang) ATAU rumah hancur total.',
  },
  {
    code: 'R2',
    category: 'Ancaman Nyawa Langsung',
    weight: 2,
    title: 'Pengalaman Traumatik Langsung',
    description: 'Sempat tertimbun, hanyut, terjebak, atau menyaksikan langsung kematian orang lain saat bencana.',
  },
  {
    code: 'R3',
    category: 'Kerentanan Biologis/Sosial',
    weight: 1,
    title: 'Kelompok Rentan',
    description: 'Penyintas adalah Lansia (>60 th), Ibu Hamil/Menyusui, Disabilitas, atau Anak Tanpa Orang Tua.',
  },
  {
    code: 'R4',
    category: 'Pre-existing Condition',
    weight: 2,
    title: 'Riwayat Gangguan Jiwa',
    description: 'Sebelum bencana pernah berobat rutin ke poli jiwa/Puskesmas atau minum obat penenang/jiwa.',
  },
  {
    code: 'R5',
    category: 'Komorbiditas Medis',
    weight: 1,
    title: 'Terputus Obat Kronis',
    description: 'Memiliki penyakit fisik kronis (Diabetes, Hipertensi, Epilepsi, dll.) dan obatnya habis/hilang.',
  },
];

const riskScore = computed(() => {
  let total = 0;
  for (const item of riskItems) {
    if (risks.value[item.code]) {
      total += item.weight;
    }
  }
  return total;
});

function toggleRisk(code: string) {
  risks.value[code] = !risks.value[code];
}

function saveAndNext() {
  fetch(`/relawan/assessment/${props.assessment.id}/risk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
    },
    body: JSON.stringify({ risks: risks.value }),
  }).finally(() => {
    router.visit(`/relawan/assessment/${props.assessment.id}/function`);
  });
}
</script>
