<template>
  <AdminLayout>
    <div class="space-y-8">
      <div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight">
          {{ $t('admin.analytics.title', 'Tren & Analitik Longitudinal 30 Hari') }}
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          {{ $t('admin.analytics.subtitle', 'Evolusi kondisi distres mental penyintas bencana dari Fase Akut (Hari 1–3) ke Fase Lanjutan (Hari 4–30).') }}
        </p>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Triage Category Breakdown Pie Chart -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 class="font-bold text-slate-900 text-sm">
            {{ $t('admin.analytics.triageProportion', 'Distribusi Proporsi Triase') }}
          </h3>
          <div v-if="hasDistributionData" ref="pieChartRef" class="w-full h-64"></div>
          <div v-else class="flex h-64 items-center justify-center rounded-2xl bg-slate-50 px-6 text-center text-xs font-medium text-slate-500">
            {{ $t('admin.analytics.noTriageData', 'Belum ada data triase untuk ditampilkan.') }}
          </div>
        </div>

        <!-- 30-Day Longitudinal Trend Line Chart -->
        <div class="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-slate-900 text-sm">
              {{ $t('admin.analytics.trendTitle', 'Tren Kasus Harian (30 Hari Terakhir)') }}
            </h3>
            <span class="text-xs text-slate-400 font-medium">
              {{ $t('admin.analytics.trendSubtitle', 'Fase Akut & Lanjutan') }}
            </span>
          </div>
          <div ref="lineChartRef" class="w-full h-64"></div>
        </div>
      </div>

      <!-- Aggregate Posko & Regional Distribution Table (Strictly Zero Patient PII) -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">
              {{ $t('admin.analytics.regionalSummary', 'Rekapitulasi Sebaran Wilayah & Posko') }}
            </h3>
            <p class="text-xs text-slate-500">
              {{ $t('admin.analytics.regionalSubtitle', 'Distribusi agregat kasus terkonfirmasi per posko penanggulangan bencana.') }}
            </p>
          </div>
          <span class="text-xs font-bold text-slate-500">
            {{ $t('admin.analytics.activeSheltersCount', { count: shelters?.length || 0 }, '{count} posko aktif') }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th class="py-4 px-6">{{ $t('admin.analytics.columns.shelter', 'Nama Posko') }}</th>
                <th class="py-4 px-6">{{ $t('admin.analytics.columns.region', 'Wilayah / Lokasi') }}</th>
                <th class="py-4 px-6">{{ $t('admin.analytics.columns.recordedSurvivors', 'Penyintas Terdata') }}</th>
                <th class="py-4 px-6">{{ $t('admin.analytics.columns.t0EmergencyLabel', 'T0 (Darurat)') }}</th>
                <th class="py-4 px-6">{{ $t('admin.analytics.columns.t1HighLabel', 'T1 (Tinggi)') }}</th>
                <th class="py-4 px-6">{{ $t('admin.analytics.columns.t2ModerateLabel', 'T2 (Sedang)') }}</th>
                <th class="py-4 px-6">{{ $t('admin.analytics.columns.t3StableLabel', 'T3 (Stabil)') }}</th>
                <th class="py-4 px-6">{{ $t('admin.analytics.columns.totalCases', 'Total Kasus') }}</th>
                <th class="py-4 px-6 text-right">{{ $t('admin.analytics.columns.actions', 'Aksi') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
              <tr v-if="!shelters?.length">
                <td colspan="9" class="py-8 text-center text-slate-400 font-normal">
                  {{ $t('admin.summary.emptyShelters', 'Belum ada posko terdata.') }}
                </td>
              </tr>
              <tr v-for="s in shelters" :key="s.id" class="hover:bg-slate-50/70 transition">
                <td class="py-4 px-6 font-bold text-slate-900">
                  {{ s.name }}
                </td>
                <td class="py-4 px-6 text-slate-500">
                  {{ s.address || $t('admin.summary.defaultShelterArea', 'Kawasan Posko Bencana') }}
                </td>
                <td class="py-4 px-6 font-medium text-slate-700">
                  {{ $t('admin.analytics.survivorCount', { count: s.patient_count || 0 }, '{count} jiwa') }}
                </td>
                <td class="py-4 px-6">
                  <span v-if="s.t0_count > 0" class="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                    {{ s.t0_count }}
                  </span>
                  <span v-else class="text-slate-400">0</span>
                </td>
                <td class="py-4 px-6">
                  <span v-if="s.t1_count > 0" class="inline-flex items-center gap-1 text-xs font-bold text-orange-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0"></span>
                    {{ s.t1_count }}
                  </span>
                  <span v-else class="text-slate-400">0</span>
                </td>
                <td class="py-4 px-6">
                  <span v-if="s.t2_count > 0" class="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0"></span>
                    {{ s.t2_count }}
                  </span>
                  <span v-else class="text-slate-400">0</span>
                </td>
                <td class="py-4 px-6">
                  <span v-if="s.t3_count > 0" class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                    {{ s.t3_count }}
                  </span>
                  <span v-else class="text-slate-400">0</span>
                </td>
                <td class="py-4 px-6 font-bold text-slate-900">
                  {{ s.total_cases ?? ((s.t0_count || 0) + (s.t1_count || 0) + (s.t2_count || 0) + (s.t3_count || 0)) }}
                </td>
                <td class="py-4 px-6 text-right">
                  <Link
                    :href="`/admin/operations/posko/${s.id}`"
                    class="font-semibold text-teal-700 hover:text-teal-900 transition text-xs"
                  >
                    {{ $t('admin.analytics.shelterDetail', 'Detail Posko →') }}
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { Link } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
import * as echarts from 'echarts';
import { t as $t, useI18n } from '@/i18n';

const { locale } = useI18n();

const props = defineProps<{
  distribution: { T0: number; T1: number; T2: number; T3: number };
  trendData: Array<{ date: string; t1: number; t2: number; t3: number }>;
  shelters: any[];
}>();

const pieChartRef = ref<HTMLElement | null>(null);
const lineChartRef = ref<HTMLElement | null>(null);
const hasDistributionData = computed(() => Object.values(props.distribution).some((value) => value > 0));
let pieChart: echarts.ECharts | null = null;
let lineChart: echarts.ECharts | null = null;

function renderCharts() {
  if (pieChartRef.value) {
    pieChart ??= echarts.init(pieChartRef.value);
    pieChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: '0%', textStyle: { fontSize: 11 } },
      series: [
        {
          name: $t('admin.analytics.chartTriageName', 'Triase'),
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { value: props.distribution.T0, name: $t('admin.analytics.chartT0', 'T0 Darurat'), itemStyle: { color: '#991B1B' } },
            { value: props.distribution.T1, name: $t('admin.analytics.chartT1', 'T1 Berat'), itemStyle: { color: '#C2410C' } },
            { value: props.distribution.T2, name: $t('admin.analytics.chartT2', 'T2 Sedang'), itemStyle: { color: '#A16207' } },
            { value: props.distribution.T3, name: $t('admin.analytics.chartT3', 'T3 Resilien'), itemStyle: { color: '#15803D' } },
          ],
        },
      ],
    });
  }

  if (lineChartRef.value) {
    lineChart ??= echarts.init(lineChartRef.value);
    const dates = props.trendData?.map((d) => d.date) || [];
    const t1Values = props.trendData?.map((d) => d.t1) || [];
    const t2Values = props.trendData?.map((d) => d.t2) || [];
    const t3Values = props.trendData?.map((d) => d.t3) || [];
    const t1Label = $t('admin.analytics.chartT1', 'T1 Berat');
    const t2Label = $t('admin.analytics.chartT2', 'T2 Sedang');
    const t3Label = $t('admin.analytics.chartT3', 'T3 Resilien');

    lineChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: [t1Label, t2Label, t3Label], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: dates },
      yAxis: { type: 'value' },
      series: [
        { name: t1Label, type: 'line', data: t1Values, smooth: true, itemStyle: { color: '#C2410C' } },
        { name: t2Label, type: 'line', data: t2Values, smooth: true, itemStyle: { color: '#A16207' } },
        { name: t3Label, type: 'line', data: t3Values, smooth: true, itemStyle: { color: '#15803D' } },
      ],
    });
  }
}

function handleResize() {
  pieChart?.resize();
  lineChart?.resize();
}

watch(locale, () => {
  renderCharts();
});

onMounted(() => {
  renderCharts();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  pieChart?.dispose();
  lineChart?.dispose();
  pieChart = null;
  lineChart = null;
});
</script>
