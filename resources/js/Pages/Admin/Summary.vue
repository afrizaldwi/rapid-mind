<template>
  <AdminLayout>
    <div class="space-y-6">
      <!-- 1. Editorial Page Header (Section 9) -->
      <div>
        <h1 class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          Ringkasan Operasional Lapangan
        </h1>
        <p class="text-xs text-slate-500 mt-1 font-normal">
          Distribusi kondisi kesehatan jiwa penyintas di seluruh posko aktif.
        </p>
      </div>

      <!-- 2. Radically Simplified KPI Metrics (4 Cards Maximum, Section 10 & 11) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: TOTAL PENYINTAS -->
        <div class="bg-white p-4.5 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Penyintas
          </span>
          <div>
            <div class="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              {{ kpis.totalSurvivors }}
            </div>
            <span class="text-xs text-slate-400 font-normal block mt-0.5">
              penyintas aktif
            </span>
          </div>
        </div>

        <!-- Card 2: T0 AKTIF -->
        <div class="bg-white p-4.5 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              T0 Aktif
            </span>
            <span v-if="kpis.countT0 > 0" class="w-2 h-2 rounded-full bg-rose-600"></span>
          </div>
          <div>
            <div class="text-2xl lg:text-3xl font-bold tracking-tight" :class="kpis.countT0 > 0 ? 'text-rose-600' : 'text-slate-900'">
              {{ kpis.countT0 }}
            </div>
            <span class="text-xs text-slate-400 font-normal block mt-0.5">
              kasus darurat
            </span>
          </div>
        </div>

        <!-- Card 3: POSKO AKTIF -->
        <div class="bg-white p-4.5 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Posko Aktif
          </span>
          <div>
            <div class="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              {{ activeSheltersCount }}
            </div>
            <span class="text-xs text-slate-400 font-normal block mt-0.5">
              posko penanggulangan
            </span>
          </div>
        </div>

        <!-- Card 4: RELAWAN AKTIF -->
        <div class="bg-white p-4.5 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Relawan Aktif
          </span>
          <div>
            <div class="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              {{ activeVolunteersCount }}
            </div>
            <span class="text-xs text-slate-400 font-normal block mt-0.5">
              personel bertugas
            </span>
          </div>
        </div>
      </div>

      <!-- 3. Operational Focus: T0 Early Warning + Geospatial Sebaran Kasus (Section 12, 13, 14, 15, 16, 17) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <!-- T0 Early Warning (Left, Section 14 & 15) -->
        <div class="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                <div>
                  <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider leading-tight">
                    PERINGATAN DINI · T0 AKTIF
                  </h2>
                  <span class="text-[11px] text-slate-400 font-normal block leading-tight mt-0.5">
                    Kedaruratan memerlukan koordinasi
                  </span>
                </div>
              </div>
              <span v-if="activeT0List.length > 0" class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
                {{ activeT0List.length }} Kasus
              </span>
            </div>

            <!-- Compact Cases List -->
            <div v-if="activeT0List.length === 0" class="py-10 text-center space-y-1">
              <p class="text-xs font-medium text-slate-700">Tidak ada kedaruratan aktif (T0)</p>
              <p class="text-[11px] text-slate-400">Seluruh posko terpantau aman dan terkendali.</p>
            </div>
            <div v-else class="divide-y divide-slate-100 mt-1">
              <div
                v-for="e in activeT0List"
                :key="e.id"
                class="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition px-1 rounded-lg"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 text-xs truncate">
                      {{ e.patient?.name || 'Penyintas' }}
                    </span>
                    <span
                      class="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wide"
                      :class="e.status === 'CONFIRMED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
                    >
                      {{ e.status === 'CONFIRMED' ? 'T0-CONFIRMED' : 'T0-SUSPECT' }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span class="truncate">{{ e.shelter?.name || 'Posko' }}</span>
                    <span>·</span>
                    <span>{{ formatTime(e.created_at) }}</span>
                  </div>
                </div>

                <Link
                  :href="e.shelter_id ? `/admin/operations/posko/${e.shelter_id}` : '/admin/operations/posko'"
                  class="shrink-0 text-[11px] font-semibold text-teal-700 hover:text-teal-900 transition flex items-center gap-0.5"
                >
                  Posko →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <!-- Sebaran Kasus Geospasial Map (Right, Section 16 & 17) -->
        <div class="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider leading-tight">
                  SEBARAN KASUS
                </h2>
                <span class="text-[11px] text-slate-400 font-normal block leading-tight mt-0.5">
                  Posko penanggulangan bencana
                </span>
              </div>
              <Link
                href="/admin/map"
                class="text-xs font-semibold text-teal-700 hover:text-teal-900 transition flex items-center gap-1"
              >
                Peta Penuh →
              </Link>
            </div>

            <!-- Compact Map Container -->
            <div class="mt-3 relative h-64 sm:h-72 w-full rounded-lg overflow-hidden border border-slate-200/80">
              <div ref="mapContainer" class="w-full h-full"></div>

              <!-- Quiet Minimal Legend -->
              <div class="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs text-[10px] flex items-center gap-3 z-10 font-medium text-slate-600">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>T0 Darurat</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-teal-700"></span>
                  <span>Posko Terpantau</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Operational Analytics: Max 2 Modules (Section 18, 19, 20, 45) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Distribusi Tingkat Triase (Donut + Clear Breakdown, Section 19) -->
        <div class="bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <div class="pb-3 border-b border-slate-100">
              <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider leading-tight">
                DISTRIBUSI TINGKAT TRIASE
              </h2>
              <span class="text-[11px] text-slate-400 font-normal block leading-tight mt-0.5">
                Akumulasi status kesehatan jiwa penyintas
              </span>
            </div>

            <div class="py-5 flex flex-col sm:flex-row items-center justify-around gap-6">
              <!-- Subtle Donut Graphic -->
              <div class="relative w-28 h-28 shrink-0">
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
                    class="text-rose-600"
                    stroke-width="4.5"
                    :stroke-dasharray="`${t0Dash}, 100`"
                    :stroke-dashoffset="`-${t3Dash + t2Dash + t1Dash}`"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span class="text-xl font-bold text-slate-900 leading-none">{{ totalTriageCount }}</span>
                  <span class="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">kasus</span>
                </div>
              </div>

              <!-- Primary Values Breakdown -->
              <div class="grid grid-cols-2 gap-x-6 gap-y-3.5 w-full max-w-xs text-xs">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                    <span class="font-medium text-slate-600">T0 Darurat</span>
                  </div>
                  <span class="font-bold text-slate-900">
                    {{ kpis.countT0 }}
                    <span class="text-[10px] text-slate-400 font-normal">({{ percentage(kpis.countT0) }}%)</span>
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span class="font-medium text-slate-600">T1 Tinggi</span>
                  </div>
                  <span class="font-bold text-slate-900">
                    {{ kpis.countT1 }}
                    <span class="text-[10px] text-slate-400 font-normal">({{ percentage(kpis.countT1) }}%)</span>
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span class="font-medium text-slate-600">T2 Sedang</span>
                  </div>
                  <span class="font-bold text-slate-900">
                    {{ kpis.countT2 }}
                    <span class="text-[10px] text-slate-400 font-normal">({{ percentage(kpis.countT2) }}%)</span>
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span class="font-medium text-slate-600">T3 Stabil</span>
                  </div>
                  <span class="font-bold text-slate-900">
                    {{ kpis.countT3 }}
                    <span class="text-[10px] text-slate-400 font-normal">({{ percentage(kpis.countT3) }}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tren Kasus 30 Hari (Section 20) -->
        <div class="bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider leading-tight">
                  TREN KASUS 30 HARI
                </h2>
                <span class="text-[11px] text-slate-400 font-normal block leading-tight mt-0.5">
                  Dinamika triase 30 hari terakhir
                </span>
              </div>
              <div v-if="hasTrendData" class="flex items-center gap-2.5 text-[10px] font-medium text-slate-500">
                <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>T0</span>
                <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>T1</span>
                <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>T2</span>
                <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>T3</span>
              </div>
            </div>

            <!-- Dynamic Trend Line Chart or Quiet Empty State (Section 20) -->
            <div class="pt-3 pb-1">
              <div class="h-36 w-full relative flex items-center justify-center">
                <div v-if="!hasTrendData" class="text-center text-slate-400 text-xs font-medium py-10">
                  Belum cukup data untuk menampilkan tren
                </div>
                <svg v-else class="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <!-- Subtle horizontal baseline -->
                  <line x1="0" y1="25" x2="300" y2="25" stroke="#F1F5F9" stroke-width="1" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#F1F5F9" stroke-width="1" />
                  <line x1="0" y1="75" x2="300" y2="75" stroke="#F1F5F9" stroke-width="1" />

                  <!-- Trend T3 line (green) -->
                  <path
                    :d="trendPathT3"
                    fill="none"
                    stroke="#10B981"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <!-- Trend T2 line (amber) -->
                  <path
                    :d="trendPathT2"
                    fill="none"
                    stroke="#F59E0B"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <!-- Trend T1 line (orange) -->
                  <path
                    :d="trendPathT1"
                    fill="none"
                    stroke="#F97316"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <!-- Trend T0 line (red) -->
                  <path
                    :d="trendPathT0"
                    fill="none"
                    stroke="#DC2626"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </div>

              <!-- Time axis labels -->
              <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                <span>30 hari lalu</span>
                <span>15 hari lalu</span>
                <span>Hari ini</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Link } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface KPIProps {
  totalSurvivors: number;
  countT0: number;
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

const activeVolunteersCount = computed(() => {
  if (props.kpis.activeVolunteers !== undefined) return props.kpis.activeVolunteers;
  return (props.shelters || []).reduce((acc: number, s: any) => acc + Number(s.volunteers_count || 0), 0);
});

const totalTriageCount = computed(() => {
  return (props.kpis.countT0 || 0) + (props.kpis.countT1 || 0) + (props.kpis.countT2 || 0) + (props.kpis.countT3 || 0);
});

function percentage(val: number): number {
  if (!totalTriageCount.value) return 0;
  return Math.round(((val || 0) / totalTriageCount.value) * 100);
}

const t0Dash = computed(() => percentage(props.kpis.countT0));
const t1Dash = computed(() => percentage(props.kpis.countT1));
const t2Dash = computed(() => percentage(props.kpis.countT2));
const t3Dash = computed(() => percentage(props.kpis.countT3));

// Emergency T0 cards list (Strictly real data only — NO fake mock objects)
const activeT0List = computed(() => {
  return props.t0Emergencies || [];
});

function formatTime(iso: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WIB`;
  } catch {
    return '-';
  }
}

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
      center: [110.42, -7.70], // Sleman / Merapi
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    const points = props.mapShelters || props.shelters || [];
    for (const s of points) {
      const rawLng = s.longitude !== null && s.longitude !== undefined ? Number(s.longitude) : null;
      const rawLat = s.latitude !== null && s.latitude !== undefined ? Number(s.latitude) : null;

      if (rawLng === null || rawLat === null || isNaN(rawLng) || isNaN(rawLat)) {
        continue;
      }

      const el = document.createElement('div');
      el.className = 'w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold cursor-pointer';

      const hasT0 = Number(s.t0_count || 0) > 0;
      el.style.backgroundColor = hasT0 ? '#DC2626' : '#0F766E';
      el.style.color = '#FFFFFF';
      el.innerText = s.name ? s.name.charAt(0) : 'P';

      new maplibregl.Marker(el)
        .setLngLat([rawLng, rawLat])
        .addTo(map);
    }
  } catch (err) {
    console.warn('Map initialization note:', err);
  }
});
</script>
