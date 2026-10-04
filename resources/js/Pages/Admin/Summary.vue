<template>
  <AdminLayout>
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- 1. Editorial Header & Metric Baseline (Flat, No Card Clutter) -->
      <div class="border-b border-slate-200 pb-5">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
              Pusat Komando & Pemantauan Kebijakan
            </span>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
              Ringkasan Operasional Lapangan
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">
              Agregasi kasus terverifikasi klinis di seluruh posko penanggulangan bencana
            </p>
          </div>

          <!-- Total Confirmed Primary Statistic -->
          <div class="flex items-center gap-2.5 shrink-0 bg-white border border-slate-200 p-4 rounded-md shadow-2xs">
            <span class="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {{ totalConfirmedCases }}
            </span>
            <div class="text-left">
              <span class="text-xs font-bold text-slate-800 block leading-tight">
                Kasus Terkonfirmasi
              </span>
              <span class="text-[10px] text-slate-400 font-normal leading-tight">
                total terverifikasi faskes
              </span>
            </div>
          </div>
        </div>

        <!-- Horizontal Metric Baseline (Flat, Single Row, Semantic Accents Only) -->
        <div class="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <!-- T0 Stat -->
          <div class="flex items-baseline gap-1.5">
            <span class="text-slate-500 font-medium">T0 Gawat Darurat:</span>
            <span class="text-sm font-bold tabular-nums" :class="kpis.countT0 > 0 ? 'text-red-600' : 'text-slate-800'">
              {{ kpis.countT0 }}
            </span>
          </div>

          <span class="text-slate-200 select-none hidden sm:inline">|</span>

          <!-- T1 Stat -->
          <div class="flex items-baseline gap-1.5">
            <span class="text-slate-500 font-medium">T1 Distres Tinggi:</span>
            <span class="text-sm font-bold text-orange-600 tabular-nums">
              {{ kpis.countT1 }}
            </span>
          </div>

          <span class="text-slate-200 select-none hidden sm:inline">|</span>

          <!-- T2 Stat -->
          <div class="flex items-baseline gap-1.5">
            <span class="text-slate-500 font-medium">T2 Distres Sedang:</span>
            <span class="text-sm font-bold text-amber-600 tabular-nums">
              {{ kpis.countT2 }}
            </span>
          </div>

          <span class="text-slate-200 select-none hidden sm:inline">|</span>

          <!-- T3 Stat -->
          <div class="flex items-baseline gap-1.5">
            <span class="text-slate-500 font-medium">T3 Stabil:</span>
            <span class="text-sm font-bold text-emerald-600 tabular-nums">
              {{ kpis.countT3 }}
            </span>
          </div>

          <span class="text-slate-200 select-none hidden sm:inline">|</span>

          <!-- Posko Terpantau Stat -->
          <div class="flex items-baseline gap-1.5">
            <span class="text-slate-500 font-medium">Posko Terpantau:</span>
            <span class="text-sm font-bold text-slate-800 tabular-nums">
              {{ activeSheltersCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. Operational Workspace Grid: Data Table (Left) + Geospatial Map (Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <!-- Sebaran Kasus per Posko (Dense Table View, 7 Cols) -->
        <div class="lg:col-span-7 space-y-2">
          <div class="flex items-center justify-between pb-1">
            <div>
              <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sebaran Kasus Terkonfirmasi per Posko
              </h2>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Klik baris posko untuk memfokuskan tampilan lokasi pada peta
              </p>
            </div>
            <span class="text-[11px] font-semibold text-slate-500 tabular-nums">
              {{ sheltersList.length }} posko
            </span>
          </div>

          <!-- Structured Operational Table (Zero pills, Zero nested cards) -->
          <div class="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <tr>
                  <th class="py-2.5 px-3.5 font-bold text-slate-700">Posko</th>
                  <th class="py-2.5 px-3 text-right text-rose-700 font-bold w-14">T0</th>
                  <th class="py-2.5 px-3 text-right text-orange-700 font-bold w-14">T1</th>
                  <th class="py-2.5 px-3 text-right text-amber-700 font-bold w-14">T2</th>
                  <th class="py-2.5 px-3 text-right text-emerald-700 font-bold w-14">T3</th>
                  <th class="py-2.5 px-3.5 text-right font-extrabold text-slate-900 w-16">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-if="sheltersList.length === 0">
                  <td colspan="6" class="py-8 text-center text-slate-400 font-normal">
                    Belum ada posko terdata.
                  </td>
                </tr>
                <tr
                  v-for="s in sheltersList"
                  :key="s.id"
                  @click="focusShelter(s)"
                  class="cursor-pointer transition hover:bg-slate-50 select-none"
                  :class="selectedShelterId === s.id ? 'bg-teal-50/70 ring-1 ring-inset ring-teal-600/30' : ''"
                >
                  <td class="py-2.5 px-3.5">
                    <div class="flex items-center gap-2">
                      <span
                        v-if="s.t0_count > 0"
                        class="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"
                        title="Terdapat kasus T0 aktif"
                      ></span>
                      <span class="font-bold text-slate-900 text-xs">
                        {{ s.name }}
                      </span>
                    </div>
                    <span class="text-[10px] text-slate-400 block truncate max-w-xs mt-0.5">
                      {{ s.address || 'Kawasan Wilayah Bencana' }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-right tabular-nums">
                    <span :class="s.t0_count > 0 ? 'font-bold text-red-600' : 'text-slate-300 font-normal'">
                      {{ s.t0_count || 0 }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-right tabular-nums">
                    <span :class="s.t1_count > 0 ? 'font-semibold text-orange-600' : 'text-slate-300 font-normal'">
                      {{ s.t1_count || 0 }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-right tabular-nums">
                    <span :class="s.t2_count > 0 ? 'font-semibold text-amber-600' : 'text-slate-300 font-normal'">
                      {{ s.t2_count || 0 }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-right tabular-nums">
                    <span :class="s.t3_count > 0 ? 'font-semibold text-emerald-600' : 'text-slate-300 font-normal'">
                      {{ s.t3_count || 0 }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3.5 text-right tabular-nums font-bold text-slate-900">
                    {{ s.total_cases ?? ((s.t0_count || 0) + (s.t1_count || 0) + (s.t2_count || 0) + (s.t3_count || 0)) }}
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="sheltersList.length > 0" class="bg-slate-50/80 border-t border-slate-200 text-xs font-bold text-slate-800">
                <tr>
                  <td class="py-2 px-3.5 uppercase tracking-wider text-[10px] text-slate-500">
                    Total Keseluruhan
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums font-bold" :class="kpis.countT0 > 0 ? 'text-red-600' : 'text-slate-800'">
                    {{ kpis.countT0 }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums font-bold text-orange-600">
                    {{ kpis.countT1 }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums font-bold text-amber-600">
                    {{ kpis.countT2 }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums font-bold text-emerald-600">
                    {{ kpis.countT3 }}
                  </td>
                  <td class="py-2 px-3.5 text-right tabular-nums font-extrabold text-slate-900">
                    {{ totalConfirmedCases }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Sebaran Posko Geospasial Map (Right, 5 Cols) -->
        <div class="lg:col-span-5 space-y-2">
          <div class="flex items-center justify-between pb-1">
            <div>
              <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Peta Sebaran Posko
              </h2>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Visualisasi lokasi posko dan status kedaruratan
              </p>
            </div>
            <Link
              href="/admin/map"
              class="text-xs font-medium text-teal-700 hover:text-teal-900 transition flex items-center gap-1"
            >
              Peta penuh →
            </Link>
          </div>

          <div class="relative h-[330px] w-full rounded-md overflow-hidden border border-slate-200 bg-white shadow-2xs">
            <div ref="mapContainer" class="w-full h-full"></div>

            <!-- Minimal Inline Legend Overlay -->
            <div
              class="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-sm border border-slate-200 shadow-2xs text-[10px] flex items-center gap-3 z-10 select-none pointer-events-auto"
              aria-label="Legenda Peta"
            >
              <span class="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                <span class="w-2 h-2 rounded-full bg-red-600 border border-white shrink-0"></span>
                T0 Aktif
              </span>
              <span class="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                <span class="w-2 h-2 rounded-full bg-teal-700 border border-white shrink-0"></span>
                Posko Normal
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Operational Analytics: Flat Side-by-Side (Distribution + 30-Day Trend) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-200">
        <!-- Proporsi Kasus Terkonfirmasi (5 Cols) -->
        <div class="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
          <div class="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Proporsi Kasus Terkonfirmasi
              </h2>
              <span class="text-[11px] text-slate-400 mt-0.5 block">
                Rasio agregat tingkat kedaruratan & distres
              </span>
            </div>
            <span class="text-xs font-bold text-slate-800 tabular-nums">
              {{ totalTriageCount }} kasus
            </span>
          </div>

          <div class="py-4 flex items-center justify-center gap-6">
            <!-- Donut Graphic -->
            <div class="relative w-24 h-24 shrink-0">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  class="text-slate-100"
                  stroke-width="4.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="text-emerald-500"
                  stroke-width="4.5"
                  :stroke-dasharray="`${t3Dash}, 100`"
                  stroke-dashoffset="0"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="text-amber-500"
                  stroke-width="4.5"
                  :stroke-dasharray="`${t2Dash}, 100`"
                  :stroke-dashoffset="`-${t3Dash}`"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="text-orange-500"
                  stroke-width="4.5"
                  :stroke-dasharray="`${t1Dash}, 100`"
                  :stroke-dashoffset="`-${t3Dash + t2Dash}`"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="text-red-600"
                  stroke-width="4.5"
                  :stroke-dasharray="`${t0Dash}, 100`"
                  :stroke-dashoffset="`-${t3Dash + t2Dash + t1Dash}`"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>

            <!-- Breakdown Legend -->
            <div class="space-y-1.5 text-xs flex-1 max-w-[200px]">
              <div class="flex items-center justify-between">
                <span class="text-slate-600 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-xs bg-red-600 shrink-0"></span>
                  T0 Darurat
                </span>
                <span class="font-bold text-slate-900 tabular-nums">
                  {{ kpis.countT0 }} <span class="text-[10px] text-slate-400 font-normal">({{ percentage(kpis.countT0) }}%)</span>
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-600 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-xs bg-orange-500 shrink-0"></span>
                  T1 Tinggi
                </span>
                <span class="font-bold text-slate-900 tabular-nums">
                  {{ kpis.countT1 }} <span class="text-[10px] text-slate-400 font-normal">({{ percentage(kpis.countT1) }}%)</span>
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-600 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-xs bg-amber-500 shrink-0"></span>
                  T2 Sedang
                </span>
                <span class="font-bold text-slate-900 tabular-nums">
                  {{ kpis.countT2 }} <span class="text-[10px] text-slate-400 font-normal">({{ percentage(kpis.countT2) }}%)</span>
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-600 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-xs bg-emerald-500 shrink-0"></span>
                  T3 Stabil
                </span>
                <span class="font-bold text-slate-900 tabular-nums">
                  {{ kpis.countT3 }} <span class="text-[10px] text-slate-400 font-normal">({{ percentage(kpis.countT3) }}%)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tren Kasus 30 Hari (7 Cols) -->
        <div class="lg:col-span-7 bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Tren Kasus Harian (30 Hari Terakhir)
              </h2>
              <span class="text-[11px] text-slate-400 mt-0.5 block">
                Dinamika kasus terkonfirmasi harian
              </span>
            </div>
            <div v-if="hasTrendData" class="flex items-center gap-3 text-[10px] font-medium text-slate-500">
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-600"></span>T0</span>
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>T1</span>
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>T2</span>
              <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>T3</span>
            </div>
          </div>

          <div class="pt-3 pb-1">
            <div class="h-28 w-full relative flex items-center justify-center">
              <div v-if="!hasTrendData" class="text-center text-slate-400 text-xs font-medium py-8">
                Belum cukup data untuk menampilkan tren harian
              </div>
              <svg v-else class="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="300" y2="25" stroke="#F1F5F9" stroke-width="1" />
                <line x1="0" y1="50" x2="300" y2="50" stroke="#F1F5F9" stroke-width="1" />
                <line x1="0" y1="75" x2="300" y2="75" stroke="#F1F5F9" stroke-width="1" />

                <path :d="trendPathT3" fill="none" stroke="#10B981" stroke-width="1.75" stroke-linecap="round" />
                <path :d="trendPathT2" fill="none" stroke="#F59E0B" stroke-width="1.75" stroke-linecap="round" />
                <path :d="trendPathT1" fill="none" stroke="#F97316" stroke-width="1.75" stroke-linecap="round" />
                <path :d="trendPathT0" fill="none" stroke="#DC2626" stroke-width="1.75" stroke-linecap="round" />
              </svg>
            </div>

            <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100">
              <span>30 hari lalu</span>
              <span>15 hari lalu</span>
              <span>Hari ini</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Link } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
import * as maplibregl from '@/lib/maplibre';

interface KPIProps {
  totalConfirmed?: number;
  totalSurvivors: number;
  countT0: number;
  countT0Confirmed?: number;
  countT1: number;
  countT2: number;
  countT3: number;
  totalAssessments?: number;
  activeShelters?: number;
  activeVolunteers?: number;
}

const props = defineProps<{
  kpis: KPIProps;
  kpiTrends?: {
    t0Change?: number;
    t1Change?: number;
    t2Change?: number;
    t3Change?: number;
  };
  shelters: any[];
  mapShelters?: any[];
  t0Emergencies?: any[];
  distribution?: Record<string, number>;
  trendData?: any[];
}>();

const mapContainer = ref<HTMLElement | null>(null);

const activeSheltersCount = computed(() => {
  if (props.kpis.activeShelters !== undefined) return props.kpis.activeShelters;
  return (props.shelters || []).filter((s: any) => s.is_active).length;
});

const totalTriageCount = computed(() => {
  return (props.kpis.countT0 || 0) + (props.kpis.countT1 || 0) + (props.kpis.countT2 || 0) + (props.kpis.countT3 || 0);
});

const totalConfirmedCases = computed(() => {
  if (props.kpis.totalConfirmed !== undefined) {
    return props.kpis.totalConfirmed;
  }
  return totalTriageCount.value;
});

const sheltersList = computed(() => {
  const coordsMap = new Map<number, { lng: number; lat: number }>();
  for (const m of (props.mapShelters || [])) {
    if (m.longitude !== null && m.latitude !== null) {
      coordsMap.set(m.id, { lng: Number(m.longitude), lat: Number(m.latitude) });
    }
  }

  return [...(props.shelters || [])].map((s: any) => {
    const coords = coordsMap.get(s.id);
    return {
      ...s,
      longitude: s.longitude ?? coords?.lng ?? null,
      latitude: s.latitude ?? coords?.lat ?? null,
    };
  }).sort((a: any, b: any) => {
    const aTotal = a.total_cases ?? ((a.t0_count || 0) + (a.t1_count || 0) + (a.t2_count || 0) + (a.t3_count || 0));
    const bTotal = b.total_cases ?? ((b.t0_count || 0) + (b.t1_count || 0) + (b.t2_count || 0) + (b.t3_count || 0));
    if ((b.t0_count || 0) !== (a.t0_count || 0)) return (b.t0_count || 0) - (a.t0_count || 0);
    return bTotal - aTotal;
  });
});

function percentage(val: number): number {
  if (!totalTriageCount.value) return 0;
  return Math.round(((val || 0) / totalTriageCount.value) * 100);
}

const t0Dash = computed(() => percentage(props.kpis.countT0));
const t1Dash = computed(() => percentage(props.kpis.countT1));
const t2Dash = computed(() => percentage(props.kpis.countT2));
const t3Dash = computed(() => percentage(props.kpis.countT3));

// Dynamic Trend Chart derived from props.trendData
const hasTrendData = computed(() => {
  if (!props.trendData || props.trendData.length === 0) return false;
  return props.trendData.some((d: any) => (d.t0 || 0) + (d.t1 || 0) + (d.t2 || 0) + (d.t3 || 0) > 0);
});

const maxTrendVal = computed(() => {
  if (!props.trendData || props.trendData.length === 0) return 1;
  let max = 1;
  for (const d of props.trendData) {
    max = Math.max(max, d.t0 || 0, d.t1 || 0, d.t2 || 0, d.t3 || 0);
  }
  return max;
});

function buildTrendPath(category: 't0' | 't1' | 't2' | 't3'): string {
  if (!props.trendData || props.trendData.length === 0) return '';
  const totalPoints = props.trendData.length;
  const max = maxTrendVal.value;

  const points = props.trendData.map((d: any, idx: number) => {
    const x = Math.round((idx / (totalPoints - 1 || 1)) * 300);
    const val = Number(d[category] || 0);
    const y = Math.round(95 - (val / max) * 75);
    return `${x},${y}`;
  });

  return `M${points.join(' L')}`;
}

const trendPathT0 = computed(() => buildTrendPath('t0'));
const trendPathT1 = computed(() => buildTrendPath('t1'));
const trendPathT2 = computed(() => buildTrendPath('t2'));
const trendPathT3 = computed(() => buildTrendPath('t3'));

const selectedShelterId = ref<number | null>(null);
const mapInstance = shallowRef<maplibregl.Map | null>(null);
const markersMap = new Map<number, { marker: maplibregl.Marker; popup: maplibregl.Popup; visualEl: HTMLElement; hasT0: boolean }>();

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function focusShelter(s: any) {
  selectedShelterId.value = s.id;
  const rawLng = Number(s.longitude);
  const rawLat = Number(s.latitude);
  if (mapInstance.value && !isNaN(rawLng) && !isNaN(rawLat)) {
    mapInstance.value.flyTo({
      center: [rawLng, rawLat],
      zoom: 13,
      essential: true,
    });
    const entry = markersMap.get(s.id);
    if (entry && !entry.popup.isOpen()) {
      entry.popup.addTo(mapInstance.value as any);
    }
  }
}

function updateMarkerHighlight(entry: { visualEl: HTMLElement; hasT0: boolean; marker: maplibregl.Marker }, isSelected: boolean) {
  const visual = entry.visualEl;
  const wrapper = entry.marker.getElement();

  if (isSelected) {
    visual.classList.add('scale-125');
    if (entry.hasT0) {
      visual.classList.add('ring-4', 'ring-red-600/35');
    } else {
      visual.classList.add('ring-4', 'ring-teal-700/35');
    }
    wrapper.style.zIndex = '30';
  } else {
    visual.classList.remove('scale-125', 'ring-4', 'ring-red-600/35', 'ring-teal-700/35');
    wrapper.style.zIndex = '1';
  }
}

watch(selectedShelterId, (newId, oldId) => {
  if (oldId !== null) {
    const prev = markersMap.get(oldId);
    if (prev) updateMarkerHighlight(prev, false);
  }
  if (newId !== null) {
    const next = markersMap.get(newId);
    if (next) updateMarkerHighlight(next, true);
  }
});

onMounted(() => {
  if (!mapContainer.value) return;

  try {
    const map = new maplibregl.Map({
      container: mapContainer.value,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [110.42, -7.70],
      zoom: 11,
    });

    mapInstance.value = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('click', () => {
      selectedShelterId.value = null;
    });

    const points = (props.mapShelters || props.shelters || []).filter((s: any) => {
      const rawLng = s.longitude !== null && s.longitude !== undefined ? Number(s.longitude) : null;
      const rawLat = s.latitude !== null && s.latitude !== undefined ? Number(s.latitude) : null;
      return rawLng !== null && rawLat !== null && !isNaN(rawLng) && !isNaN(rawLat);
    });

    for (const s of points) {
      const rawLng = Number(s.longitude);
      const rawLat = Number(s.latitude);
      const hasT0 = Number(s.t0_count || 0) > 0;

      // Hit area wrapper
      const hitArea = document.createElement('div');
      hitArea.className = 'w-8 h-8 flex items-center justify-center cursor-pointer pointer-events-auto select-none';
      hitArea.setAttribute('role', 'button');
      hitArea.setAttribute('tabindex', '0');
      hitArea.setAttribute('aria-label', `${s.name} - ${hasT0 ? s.t0_count + ' T0 Aktif' : 'Posko'}`);
      hitArea.setAttribute('title', `${s.name} (${hasT0 ? s.t0_count + ' T0 Aktif' : 'Posko'})`);

      // Inner visual marker
      const visualMarker = document.createElement('div');
      visualMarker.className = `w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all duration-150 ${hasT0 ? 'bg-red-600' : 'bg-teal-700'}`;

      const innerDot = document.createElement('div');
      innerDot.className = 'w-1 h-1 rounded-full bg-white shrink-0';
      visualMarker.appendChild(innerDot);

      hitArea.appendChild(visualMarker);

      const totalKasus = s.total_cases ?? s.t0_count;
      const popupHTML = `
        <div style="font-family: inherit; padding: 2px; min-width: 160px;">
          <div style="font-weight: 700; font-size: 12px; color: #0F172A; margin-bottom: 2px;">${escapeHtml(s.name)}</div>
          <div style="font-size: 10px; color: #64748B; margin-bottom: 6px;">${escapeHtml(s.address || 'Kawasan Posko Bencana')}</div>
          <div style="font-size: 10px; color: #334155; line-height: 1.4; border-top: 1px solid #F1F5F9; padding-top: 4px;">
            ${hasT0 ? `<div style="color: #DC2626; font-weight: 700; margin-bottom: 2px;">● ${s.t0_count} Kasus T0 Terkonfirmasi</div>` : '<div style="color: #0F766E; font-weight: 600; margin-bottom: 2px;">● Bebas Kasus T0</div>'}
            <div style="color: #64748B;">Total: <strong style="color: #0F172A;">${totalKasus}</strong> kasus terkonfirmasi</div>
          </div>
          <div style="margin-top: 6px; border-top: 1px solid #F1F5F9; padding-top: 4px; text-align: right;">
            <a href="/admin/map" style="font-size: 10px; font-weight: 600; color: #0F766E; text-decoration: none;">Peta penuh &rarr;</a>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 14 }).setHTML(popupHTML);

      const onMarkerClick = (event: Event) => {
        event.stopPropagation();
        selectedShelterId.value = s.id;
        map.flyTo({
          center: [rawLng, rawLat],
          zoom: 12.5,
          essential: true,
        });
        if (!popup.isOpen()) {
          popup.addTo(map);
        }
      };

      hitArea.addEventListener('click', onMarkerClick);
      hitArea.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onMarkerClick(event);
        }
      });

      const marker = new maplibregl.Marker({ element: hitArea, anchor: 'center' })
        .setLngLat([rawLng, rawLat])
        .setPopup(popup)
        .addTo(map);

      markersMap.set(s.id, { marker, popup, visualEl: visualMarker, hasT0 });
    }

    if (points.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const s of points) {
        bounds.extend([Number(s.longitude), Number(s.latitude)]);
      }
      map.fitBounds(bounds, { padding: 36, maxZoom: 13 });
    }
  } catch (err) {
    console.warn('Map initialization note:', err);
  }
});

onBeforeUnmount(() => {
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }
});
</script>
