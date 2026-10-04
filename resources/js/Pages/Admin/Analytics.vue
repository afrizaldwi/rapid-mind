<template>
  <AdminLayout>
    <div class="space-y-8">
      <div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight">
          Tren & Analitik Longitudinal 30 Hari
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Evolusi kondisi distres mental penyintas bencana dari Fase Akut (Hari 1–3) ke Fase Lanjutan (Hari 4–30).
        </p>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Triage Category Breakdown Pie Chart -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 class="font-bold text-slate-900 text-sm">
            Distribusi Proporsi Triase
          </h3>
          <div v-if="hasDistributionData" ref="pieChartRef" class="w-full h-64"></div>
          <div v-else class="flex h-64 items-center justify-center rounded-2xl bg-slate-50 px-6 text-center text-xs font-medium text-slate-500">
            Belum ada data triase untuk ditampilkan.
          </div>
        </div>

        <!-- 30-Day Longitudinal Trend Line Chart -->
        <div class="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-900 text-sm">
              Tren Kasus Harian (30 Hari Terakhir)
            </h3>
            <span class="text-xs text-slate-400 font-medium">
              Fase Akut & Lanjutan
            </span>
          </div>
          <div ref="lineChartRef" class="w-full h-64"></div>
        </div>
      </div>

      <!-- Master Patient Records Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">
              Data Agregat Penyintas Terdata
            </h3>
            <p class="text-xs text-slate-500">
              Menampilkan 50 penyintas terbaru dengan hasil skrining awal.
            </p>
          </div>
          <span class="text-xs font-bold text-slate-500">
            {{ patients?.length || 0 }} rekam data
          </span>
        </div>

        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th class="py-4 px-6">Nama Penyintas</th>
              <th class="py-4 px-6">NIK</th>
              <th class="py-4 px-6">Posko</th>
              <th class="py-4 px-6">Kategori Rekomendasi</th>
              <th class="py-4 px-6">Total Skor</th>
              <th class="py-4 px-6">Waktu Skrining</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
            <tr v-for="p in patients" :key="p.id" class="hover:bg-slate-50/70 transition">
              <td class="py-4 px-6 font-bold text-slate-900">
                {{ p.name }}
              </td>
              <td class="py-4 px-6 text-slate-500">
                {{ p.nik || '-' }}
              </td>
              <td class="py-4 px-6">
                {{ p.shelter?.name || 'Posko tidak diketahui' }}
              </td>
              <td class="py-4 px-6">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-bold"
                  :class="triageTextColor(p.latest_triage_result?.system_recommendation)"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="triageDotColor(p.latest_triage_result?.system_recommendation)"
                  ></span>
                  {{ p.latest_triage_result?.system_recommendation || 'Belum ada hasil' }}
                </span>
              </td>
              <td class="py-4 px-6 font-bold">
                {{ p.latest_triage_result ? `${p.latest_triage_result.total_score} / 37` : '-' }}
              </td>
              <td class="py-4 px-6 text-slate-400">
                {{ p.latest_triage_completed_at ? new Date(p.latest_triage_completed_at).toLocaleDateString('id-ID') : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import * as echarts from 'echarts';

const props = defineProps<{
  distribution: { T0: number; T1: number; T2: number; T3: number };
  trendData: Array<{ date: string; t1: number; t2: number; t3: number }>;
  patients: any[];
}>();

const pieChartRef = ref<HTMLElement | null>(null);
const lineChartRef = ref<HTMLElement | null>(null);
const hasDistributionData = computed(() => Object.values(props.distribution).some((value) => value > 0));

onMounted(() => {
  // 1. Pie Chart
  if (pieChartRef.value) {
    const pie = echarts.init(pieChartRef.value);
    pie.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: '0%', textStyle: { fontSize: 11 } },
      series: [
        {
          name: 'Triase',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { value: props.distribution.T0, name: 'T0 Darurat', itemStyle: { color: '#991B1B' } },
            { value: props.distribution.T1, name: 'T1 Berat', itemStyle: { color: '#C2410C' } },
            { value: props.distribution.T2, name: 'T2 Sedang', itemStyle: { color: '#A16207' } },
            { value: props.distribution.T3, name: 'T3 Resilien', itemStyle: { color: '#15803D' } },
          ],
        },
      ],
    });
  }

  // 2. Line Chart (30-day longitudinal trend)
  if (lineChartRef.value) {
    const line = echarts.init(lineChartRef.value);
    const dates = props.trendData?.map((d) => d.date) || [];
    const t1Values = props.trendData?.map((d) => d.t1) || [];
    const t2Values = props.trendData?.map((d) => d.t2) || [];
    const t3Values = props.trendData?.map((d) => d.t3) || [];

    line.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['T1 Berat', 'T2 Sedang', 'T3 Resilien'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: dates },
      yAxis: { type: 'value' },
      series: [
        { name: 'T1 Berat', type: 'line', data: t1Values, smooth: true, itemStyle: { color: '#C2410C' } },
        { name: 'T2 Sedang', type: 'line', data: t2Values, smooth: true, itemStyle: { color: '#A16207' } },
        { name: 'T3 Resilien', type: 'line', data: t3Values, smooth: true, itemStyle: { color: '#15803D' } },
      ],
    });
  }
});

function triageTextColor(value?: string): string {
  if (value?.startsWith('T0')) return 'text-rose-700';
  if (value === 'T1') return 'text-orange-700';
  if (value === 'T2') return 'text-amber-700';
  if (value === 'T3') return 'text-emerald-700';
  return 'text-slate-500';
}

function triageDotColor(value?: string): string {
  if (value?.startsWith('T0')) return 'bg-rose-600';
  if (value === 'T1') return 'bg-orange-600';
  if (value === 'T2') return 'bg-amber-600';
  if (value === 'T3') return 'bg-emerald-600';
  return 'bg-slate-400';
}
</script>
