<template>
  <AdminLayout>
    <div class="command-center space-y-5 max-w-7xl mx-auto">
      <header class="command-header">
        <div>
          <span class="command-context">{{ $t('admin.summary.headerTag') }}</span>
          <h1>{{ $t('admin.summary.headerTitle') }}</h1>
          <p>{{ $t('admin.summary.headerSubtitle') }}</p>
        </div>
        <Link href="/admin/map" class="map-action"><MapIcon :size="17" aria-hidden="true" />{{ $t('admin.summary.fullMapLink') }}</Link>
      </header>

      <div class="metric-grid">
        <div v-for="metric in metrics" :key="metric.label" class="metric" :style="{ '--accent': metric.color }">
          <div class="metric-label"><component :is="metric.icon" :size="17" aria-hidden="true" />{{ $t(metric.label) }}</div>
          <strong>{{ metric.value }}</strong>
          <p>{{ $t(metric.detail) }}</p>
        </div>
        <div class="metric paired">
          <div class="metric-label"><Layers :size="17" aria-hidden="true" />{{ $t('admin.summary.otherRecommendations') }}</div>
          <div class="pair">
            <div><strong class="text-amber-800">{{ kpis.countT2 }}</strong><p>{{ $t('admin.summary.legendT2') }}</p></div>
            <div><strong class="text-green-800">{{ kpis.countT3 }}</strong><p>{{ $t('admin.summary.legendT3') }}</p></div>
          </div>
        </div>
        <div class="metric" style="--accent:#0f766e">
          <div class="metric-label"><MapPin :size="17" aria-hidden="true" />{{ $t('admin.summary.monitoredShelters') }}</div>
          <strong>{{ activeSheltersCount }}</strong><p>{{ $t('admin.summary.monitoredDetail') }}</p>
        </div>
      </div>


      <div class="operations-grid">

        <div class="workspace-panel">
          <div class="panel-heading">
            <div>
              <h2 class="panel-title">
                {{ $t('admin.summary.tableTitle', 'Sebaran Laporan T0 dan Rekomendasi per Posko') }}
              </h2>
              <p class="text-[11px] text-slate-500 mt-0.5">
                {{ $t('admin.summary.tableSubtitle', 'Klik baris posko untuk memfokuskan tampilan lokasi pada peta') }}
              </p>
            </div>
            <span class="text-[11px] font-semibold text-slate-500 tabular-nums">
              {{ $t('admin.summary.sheltersCount', { count: sheltersList.length }, '{count} posko') }}
            </span>
          </div>

          <div class="table-scroll" tabindex="0" role="region" :aria-label="$t('admin.summary.tableTitle')">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <tr>
                  <th class="py-2.5 px-3.5 font-bold text-slate-700">{{ $t('admin.summary.colShelter', 'Posko') }}</th>
                  <th class="py-2.5 px-3 text-right text-rose-700 font-bold w-14">T0</th>
                  <th class="py-2.5 px-3 text-right text-orange-700 font-bold w-14">T1</th>
                  <th class="py-2.5 px-3 text-right text-amber-700 font-bold w-14">T2</th>
                  <th class="py-2.5 px-3 text-right text-emerald-700 font-bold w-14">T3</th>
                  <th class="py-2.5 px-3.5 text-right font-extrabold text-slate-900 w-16">{{ $t('admin.summary.colTotal', 'Total') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-if="sheltersList.length === 0">
                  <td colspan="6" class="py-8 text-center text-slate-400 font-normal">
                    {{ $t('admin.summary.emptyShelters', 'Belum ada posko terdata.') }}
                  </td>
                </tr>
                <tr
                  v-for="s in sheltersList"
                  :key="s.id"
                  @click="focusShelter(s)"
                  class="shelter-row cursor-pointer"
                  :class="{ selected: selectedShelterId === s.id }"
                >
                  <td class="py-2.5 px-3.5">
                    <div class="flex items-center gap-2">
                      <span
                        v-if="s.t0_count > 0"
                        class="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"
                        :title="$t('admin.summary.hasActiveT0Title', 'Terdapat laporan T0 aktif')"
                      ></span>
                      <button type="button" class="shelter-name" :aria-pressed="selectedShelterId === s.id" @click.stop="focusShelter(s)">
                        {{ s.name }}
                      </button>
                    </div>
                    <span class="shelter-address">
                      {{ s.address || $t('admin.summary.defaultDisasterArea', 'Kawasan Wilayah Bencana') }}
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
                    {{ $t('admin.summary.overallTotal', 'Total Keseluruhan') }}
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
                    {{ totalTriageCount }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="workspace-panel map-panel">
          <div class="panel-heading">
            <div>
              <h2 class="panel-title">
                {{ $t('admin.summary.mapTitle', 'Peta Sebaran Posko') }}
              </h2>
              <p class="text-[11px] text-slate-500 mt-0.5">
                {{ $t('admin.summary.mapSubtitle', 'Visualisasi lokasi posko dan status kedaruratan') }}
              </p>
            </div>
            <Link
              href="/admin/map"
              class="text-xs font-medium text-teal-700 hover:text-teal-900 transition flex items-center gap-1"
            >
              {{ $t('admin.summary.fullMapLink', 'Peta penuh →') }}
            </Link>
          </div>

            <div
              class="map-legend"
              :aria-label="$t('admin.summary.mapLegendAria', 'Legenda Peta')"
            >
              <span class="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                <span class="w-2 h-2 rounded-full bg-red-600 border border-white shrink-0"></span>
                {{ $t('admin.summary.legendActiveT0', 'T0 Aktif') }}
              </span>
              <span class="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                <span class="w-2 h-2 rounded-full bg-teal-700 border border-white shrink-0"></span>
                {{ $t('admin.summary.popupNoActiveT0', 'Tanpa T0 aktif') }}
              </span>
            </div>
          <div class="map-body">
            <div ref="mapContainer" class="map-canvas"></div>
          </div>
        </div>
      </div>

      <div class="analytics-grid">
        <section class="analytics-panel" :aria-label="$t('admin.summary.proportionTitle')">
          <div class="analytics-heading">
            <h2>{{ $t('admin.summary.proportionTitle') }}</h2>
            <p>{{ $t('admin.summary.proportionSubtitle') }}</p>
          </div>
          <div class="distribution-total"><strong>{{ totalTriageCount }}</strong><span>{{ $t('admin.summary.popupReportsAndRecs') }}</span></div>
          <div v-for="category in chartCategories" :key="category.key" class="distribution-row">
            <button
              type="button"
              class="distribution-hit"
              :aria-label="$t(category.label) + ', ' + kpis[category.count] + ', ' + percentage(kpis[category.count]) + '%'"
              :aria-describedby="activeDistribution === category.key ? 'summary-distribution-tooltip' : undefined"
              @pointerenter="activeDistribution = category.key"
              @pointerleave="activeDistribution = null"
              @focus="activeDistribution = category.key"
              @blur="activeDistribution = null"
              @click="activeDistribution = category.key"
              @keydown.esc="activeDistribution = null"
            >
            <div class="distribution-label">
              <span><i :style="{ background: category.color }"></i>{{ $t(category.label) }}</span>
              <span><b>{{ kpis[category.count] }}</b><small>{{ percentage(kpis[category.count]) }}%</small></span>
            </div>
            <div class="distribution-track"><span :style="{ width: percentage(kpis[category.count]) + '%', background: category.color }"></span></div>
            </button>
            <div v-if="activeDistribution === category.key" id="summary-distribution-tooltip" role="tooltip" class="chart-tooltip distribution-tooltip">
              <strong>{{ $t(category.label) }}</strong>
              <span>{{ kpis[category.count] }} · {{ percentage(kpis[category.count]) }}%</span>
            </div>
          </div>
        </section>
        <section class="analytics-panel trend-panel" :aria-label="$t('admin.summary.trendTitle')">
          <div class="analytics-heading">
            <h2>{{ $t('admin.summary.trendTitle') }}</h2>
            <p>{{ $t('admin.summary.trendSubtitle') }}</p>
          </div>
          <div class="chart-legend"><span v-for="category in chartCategories" :key="category.key"><i :style="{ background: category.color }"></i>{{ $t(category.label) }}</span></div>
          <div v-if="!hasTrendData" class="chart-empty">{{ $t('admin.summary.insufficientTrendData') }}</div>
          <div v-else class="trend-plot">
            <div class="y-axis"><span>{{ maxTrendVal }}</span><span>{{ maxTrendVal / 2 }}</span><span>0</span></div>
            <svg
              viewBox="0 0 300 100" preserveAspectRatio="none"
              tabindex="0" role="slider"
              :aria-label="$t('admin.summary.trendTitle')"
              :aria-valuemin="0" :aria-valuemax="(trendData?.length || 1) - 1"
              :aria-valuenow="activeTrendIndex ?? 0"
              :aria-valuetext="trendSummary"
              @pointermove="showTrendDetail"
              @pointerdown="showTrendDetail"
              @pointerleave="$event.pointerType !== 'touch' && (activeTrendIndex = null)"
              @focus="activeTrendIndex ??= 0"
              @blur="activeTrendIndex = null"
              @keydown="navigateTrend"
            >
              <defs>
                <linearGradient v-for="category in chartCategories" :id="'summary-area-' + category.key" :key="category.key" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" :stop-color="category.color" stop-opacity=".16" />
                  <stop offset="100%" :stop-color="category.color" stop-opacity=".01" />
                </linearGradient>
              </defs>
              <line v-for="y in [20, 57.5, 95]" :key="y" x1="0" :y1="y" x2="300" :y2="y" stroke="#dce3e8" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
              <template v-for="category in chartCategories" :key="category.key">
                <path :d="buildTrendPath(category.key) + ' L300,95 L0,95 Z'" :fill="'url(#summary-area-' + category.key + ')'" />
                <path :d="buildTrendPath(category.key)" fill="none" :stroke="category.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
              </template>
              <line v-if="activeTrendIndex !== null" :x1="activeTrendX" :x2="activeTrendX" y1="0" y2="100" stroke="#64748b" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" />
            </svg>
            <div v-if="activeTrend" class="chart-tooltip trend-tooltip" role="tooltip">
              <strong>{{ trendDate }}</strong>
              <div v-for="category in chartCategories" :key="category.key" class="tooltip-value">
                <span><i :style="{ background: category.color }"></i>{{ $t(category.label) }}</span>
                <b>{{ activeTrend[category.key] }}</b>
              </div>
            </div>
            <div class="x-axis"><span>{{ $t('admin.summary.daysAgo30') }}</span><span>{{ $t('admin.summary.daysAgo15') }}</span><span>{{ $t('admin.summary.today') }}</span></div>
          </div>
        </section>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Link } from '@inertiajs/vue3';
import { CircleCheck, Siren, Activity, Layers, MapPin, Map as MapIcon } from 'lucide-vue-next';
import AdminLayout from '@/layouts/AdminLayout.vue';
import * as maplibregl from '@/lib/maplibre';
import { t as $t, useI18n } from '@/i18n';

const { locale } = useI18n();

interface KPIProps {
  totalConfirmed: number;
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
  return props.kpis.totalConfirmed;
});

const metrics = computed(() => [
  { label: 'admin.summary.confirmedCases', detail: 'admin.summary.confirmedSubtitle', value: totalConfirmedCases.value, icon: CircleCheck, color: '#1e3650' },
  { label: 'admin.summary.activeT0', detail: 'admin.summary.t0Detail', value: props.kpis.countT0, icon: Siren, color: '#991b1b' },
  { label: 'admin.summary.recommendationT1', detail: 'admin.summary.t1Detail', value: props.kpis.countT1, icon: Activity, color: '#c2410c' },
]);

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

const chartCategories = [
  { key: 't0', count: 'countT0', label: 'admin.summary.legendT0', color: '#991B1B' },
  { key: 't1', count: 'countT1', label: 'admin.summary.legendT1', color: '#C2410C' },
  { key: 't2', count: 'countT2', label: 'admin.summary.legendT2', color: '#A16207' },
  { key: 't3', count: 'countT3', label: 'admin.summary.legendT3', color: '#15803D' },
] as const;

const activeDistribution = ref<string | null>(null);
const activeTrendIndex = ref<number | null>(null);
const activeTrend = computed(() => activeTrendIndex.value === null ? null : props.trendData?.[activeTrendIndex.value]);
const activeTrendX = computed(() => Math.round((activeTrendIndex.value ?? 0) / Math.max(1, (props.trendData?.length ?? 1) - 1) * 300));
const trendDate = computed(() => {
  if (!activeTrend.value) return '';
  return new Intl.DateTimeFormat(locale.value === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(activeTrend.value.date + 'T00:00:00'));
});
const trendSummary = computed(() => activeTrend.value
  ? [trendDate.value, ...chartCategories.map(category => `${$t(category.label)} ${activeTrend.value[category.key]}`)].join(', ')
  : '');

function showTrendDetail(event: PointerEvent) {
  const bounds = (event.currentTarget as SVGElement).getBoundingClientRect();
  const position = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  activeTrendIndex.value = Math.round(position * Math.max(0, (props.trendData?.length ?? 1) - 1));
}

function navigateTrend(event: KeyboardEvent) {
  const last = Math.max(0, (props.trendData?.length ?? 1) - 1);
  const current = activeTrendIndex.value ?? 0;
  switch (event.key) {
    case 'ArrowRight': activeTrendIndex.value = Math.min(last, current + 1); break;
    case 'ArrowLeft': activeTrendIndex.value = Math.max(0, current - 1); break;
    case 'Home': activeTrendIndex.value = 0; break;
    case 'End': activeTrendIndex.value = last; break;
    case 'Escape': activeTrendIndex.value = null; break;
    default: return;
  }
  event.preventDefault();
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


const selectedShelterId = ref<number | null>(null);
const mapInstance = shallowRef<maplibregl.Map | null>(null);
const markersMap = new Map<number, { marker: maplibregl.Marker; popup: maplibregl.Popup; hitArea: HTMLElement; visualEl: HTMLElement; hasT0: boolean; shelter: any }>();

function buildMarkerLabels(s: any) {
  const hasT0 = Number(s.t0_count || 0) > 0;
  const activeStatus = hasT0
    ? $t('admin.summary.markerActiveT0Count', { count: s.t0_count }, '{count} T0 Aktif')
    : $t('admin.summary.colShelter', 'Posko');
  const ariaLabel = `${s.name} - ${activeStatus}`;
  const title = `${s.name} (${activeStatus})`;
  const totalKasus = s.total_cases ?? s.t0_count;
  const addressText = escapeHtml(s.address || $t('admin.summary.defaultShelterArea', 'Kawasan Posko Bencana'));
  const statusLine = hasT0
    ? `<div style="color: #DC2626; font-weight: 700; margin-bottom: 2px;">● ${escapeHtml($t('admin.summary.popupActiveT0Reports', { count: s.t0_count }, '{count} Laporan T0 aktif'))}</div>`
    : `<div style="color: #0F766E; font-weight: 600; margin-bottom: 2px;">● ${escapeHtml($t('admin.summary.popupNoActiveT0', 'Tanpa T0 aktif'))}</div>`;
  const totalLabel = $t('admin.summary.colTotal', 'Total');
  const reportsSuffix = escapeHtml($t('admin.summary.popupReportsAndRecs', 'laporan dan rekomendasi'));
  const fullMapText = escapeHtml($t('admin.summary.fullMapPopupLink', 'Peta penuh'));

  const popupHTML = `
    <div style="font-family: inherit; padding: 2px; min-width: 160px;">
      <div style="font-weight: 700; font-size: 12px; color: #0F172A; margin-bottom: 2px;">${escapeHtml(s.name)}</div>
      <div style="font-size: 10px; color: #64748B; margin-bottom: 6px;">${addressText}</div>
      <div style="font-size: 10px; color: #334155; line-height: 1.4; border-top: 1px solid #F1F5F9; padding-top: 4px;">
        ${statusLine}
        <div style="color: #64748B;">${escapeHtml(totalLabel)}: <strong style="color: #0F172A;">${totalKasus}</strong> ${reportsSuffix}</div>
      </div>
      <div style="margin-top: 6px; border-top: 1px solid #F1F5F9; padding-top: 4px; text-align: right;">
        <a href="/admin/map" style="font-size: 10px; font-weight: 600; color: #0F766E; text-decoration: none;">${fullMapText} &rarr;</a>
      </div>
    </div>
  `;

  return { ariaLabel, title, popupHTML };
}

watch(locale, () => {
  for (const entry of markersMap.values()) {
    const { ariaLabel, title, popupHTML } = buildMarkerLabels(entry.shelter);
    entry.hitArea.setAttribute('aria-label', ariaLabel);
    entry.hitArea.setAttribute('title', title);
    entry.popup.setHTML(popupHTML);
  }
});

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showOnlyPopup(target: maplibregl.Popup, map: maplibregl.Map) {
  for (const entry of markersMap.values()) {
    if (entry.popup !== target && entry.popup.isOpen()) {
      entry.popup.remove();
    }
  }

  if (!target.isOpen()) {
    target.addTo(map);
  }
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
    if (entry) {
      showOnlyPopup(entry.popup, mapInstance.value);
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
    const initialPoint = (props.mapShelters || props.shelters || []).find((s: any) => Number.isFinite(Number(s.longitude)) && Number.isFinite(Number(s.latitude)) && s.longitude != null && s.latitude != null);
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
      center: initialPoint ? [Number(initialPoint.longitude), Number(initialPoint.latitude)] : [118, -2],
      zoom: 11,
      attributionControl: { compact: true },
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
      const { ariaLabel, title, popupHTML } = buildMarkerLabels(s);

      // Hit area wrapper
      const hitArea = document.createElement('div');
      hitArea.className = 'w-8 h-8 flex items-center justify-center cursor-pointer pointer-events-auto select-none';
      hitArea.setAttribute('role', 'button');
      hitArea.setAttribute('tabindex', '0');
      hitArea.setAttribute('aria-label', ariaLabel);
      hitArea.setAttribute('title', title);

      // Inner visual marker
      const visualMarker = document.createElement('div');
      visualMarker.className = `w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all duration-150 ${hasT0 ? 'bg-red-600' : 'bg-teal-700'}`;

      const innerDot = document.createElement('div');
      innerDot.className = hasT0 ? 'text-white text-xs font-bold leading-none' : 'w-1.5 h-1.5 rounded-full bg-white';
      if (hasT0) innerDot.textContent = '!';
      visualMarker.appendChild(innerDot);

      hitArea.appendChild(visualMarker);

      const popup = new maplibregl.Popup({ offset: 14 })
        .setLngLat([rawLng, rawLat])
        .setHTML(popupHTML);

      const onMarkerClick = (event: Event) => {
        event.stopPropagation();
        selectedShelterId.value = s.id;
        map.flyTo({
          center: [rawLng, rawLat],
          zoom: 12.5,
          essential: true,
        });
        showOnlyPopup(popup, map);
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
        .addTo(map);

      markersMap.set(s.id, { marker, popup, hitArea, visualEl: visualMarker, hasT0, shelter: s });
    }

    if (points.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const s of points) {
        bounds.extend([Number(s.longitude), Number(s.latitude)]);
      }
      map.fitBounds(bounds, { padding: 36, maxZoom: 13, duration: 0 });
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

<style scoped>
.distribution-row { position: relative; }
.distribution-hit { width: 100%; text-align: left; cursor: pointer; }
.chart-tooltip { z-index: 10; padding: .7rem .85rem; border: 1px solid #d8e1e6; border-radius: .5rem; background: #fff; box-shadow: 0 4px 16px rgb(15 23 42 / 12%); font-size: .78rem; color: #0f172a; pointer-events: none; }
.chart-tooltip strong { display: block; margin-bottom: .3rem; }
.distribution-tooltip { position: absolute; bottom: calc(100% + .3rem); right: 0; }
.trend-tooltip { position: absolute; top: 0; right: 0; max-width: calc(100% - 2rem); min-width: 10rem; }
.tooltip-value, .tooltip-value span { display: flex; align-items: center; gap: .5rem; }
.tooltip-value { justify-content: space-between; margin-top: .3rem; }
.tooltip-value b { font-variant-numeric: tabular-nums; }
.tooltip-value i { width: .5rem; height: .5rem; border-radius: 50%; }
.trend-plot svg { cursor: crosshair; }
.trend-plot svg:focus-visible, .distribution-hit:focus-visible { outline: 2px solid #0f766e; outline-offset: 3px; }
.analytics-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
.analytics-panel { min-width: 0; padding: 1.25rem; border: 1px solid #d8e1e6; border-radius: .75rem; background: white; }
.analytics-heading h2 { font-size: 1rem; font-weight: 700; line-height: 1.4; }
.analytics-heading p { margin-top: .3rem; font-size: .8rem; color: #475569; }
.distribution-total { display: flex; align-items: baseline; gap: .65rem; margin: 1.25rem 0; }
.distribution-total strong { font-size: 2rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.distribution-total span { font-size: .8rem; color: #475569; }
.distribution-row + .distribution-row { margin-top: 1rem; }
.distribution-label, .distribution-label > span { display: flex; align-items: center; gap: .5rem; }
.distribution-label { justify-content: space-between; font-size: .8rem; margin-bottom: .4rem; }
.distribution-label b, .distribution-label small { font-variant-numeric: tabular-nums; }
.distribution-label small { min-width: 2.5rem; text-align: right; font-size: .75rem; color: #475569; }
.distribution-label i, .chart-legend i { display: inline-block; width: .5rem; height: .5rem; border-radius: 50%; flex: none; }
.distribution-track { height: .5rem; border-radius: .25rem; background: #edf1f3; overflow: hidden; }
.distribution-track span { display: block; height: 100%; border-radius: inherit; }
.chart-legend { display: flex; flex-wrap: wrap; gap: .6rem 1rem; margin-top: 1.25rem; font-size: .75rem; color: #334155; }
.chart-legend span { display: inline-flex; align-items: center; gap: .4rem; }
.trend-plot { position: relative; height: 15rem; padding: 0 0 1.6rem 2rem; margin-top: .8rem; }
.trend-plot svg { display: block; width: 100%; height: 100%; overflow: visible; }
.y-axis { position: absolute; inset: 0 auto 1.6rem 0; width: 1.5rem; font-size: .72rem; color: #64748b; font-variant-numeric: tabular-nums; }
.y-axis span { position: absolute; right: 0; transform: translateY(-50%); }
.y-axis span:nth-child(1) { top: 20%; }
.y-axis span:nth-child(2) { top: 57.5%; }
.y-axis span:nth-child(3) { top: 95%; }
.x-axis { display: flex; justify-content: space-between; padding-top: .5rem; font-size: .72rem; color: #64748b; }
.chart-empty { display: grid; place-items: center; min-height: 15rem; text-align: center; color: #64748b; font-size: .875rem; }
@container (min-width: 48rem) { .analytics-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.65fr); } }
.command-center {
  container-type: inline-size;
  color: #0f172a;
}
.command-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: .5rem 0 1.4rem;
  border-bottom: 1px solid #d8e1e6;
}
.command-context {
  display: inline-block;
  background: #e7f2f0;
  color: #245c57;
  padding: .2rem .55rem;
  border-radius: .3rem;
  font-size: .75rem;
  font-weight: 600;
}
.command-header h1 {
  margin: .5rem 0 .35rem;
  font-size: clamp(1.6rem, 3.2cqi, 2.45rem);
  line-height: 1.12;
  letter-spacing: -.035em;
  font-weight: 750;
}
.command-header p, .metric p, .shelter-address { color: #475569; }
.command-header p { font-size: .9rem; }
.map-action {
  display: inline-flex;
  align-items: center;
  gap: .55rem;
  padding: .6rem .9rem;
  background: #19334b;
  color: white;
  border-radius: .5rem;
  font-weight: 600;
  font-size: .875rem;
}
.map-action:hover { background: #24465f; }
.metric-grid, .operations-grid { display: grid; gap: .85rem; }
.metric, .workspace-panel {
  min-width: 0;
  background: white;
  border: 1px solid #d8e1e6;
  border-radius: .75rem;
  box-shadow: 0 2px 4px rgb(15 23 42 / 4%);
}
.metric { padding: 1rem; }
.metric-label { display: flex; align-items: center; gap: .45rem; font-size: .8rem; font-weight: 650; }
.metric-label svg { flex: none; color: var(--accent, #526477); }
.metric strong {
  display: block;
  margin: .65rem 0 .25rem;
  font-size: 2.15rem;
  line-height: 1;
  letter-spacing: -.045em;
  font-variant-numeric: tabular-nums;
}
.metric > strong { color: var(--accent); }
.metric p { font-size: .78rem; }
.pair { display: grid; grid-template-columns: 1fr 1fr; }
.pair > div + div { border-left: 1px solid #d8e1e6; padding-left: .7rem; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: 1rem; }
.panel-heading > :last-child:not(:first-child) { flex: none; }
.panel-title { font-size: 1rem; font-weight: 700; line-height: 1.3; }
.table-scroll { overflow-x: auto; border-radius: 0 0 .75rem .75rem; }
.table-scroll table { min-width: 32rem; }
.table-scroll thead { border-top: 1px solid #e2e8f0; }
.shelter-name { text-align: left; font-weight: 700; font-size: .9rem; cursor: pointer; }
.shelter-address { display: block; font-size: .78rem; line-height: 1.45; }
.shelter-row:hover, .shelter-row:focus-within { background: #f0f7f6; }
.shelter-row.selected { background: #e3f2ee; box-shadow: inset 3px 0 #0f766e; }
.table-scroll tfoot { background: #eaf0f4; }
.table-scroll tfoot td { padding-block: .8rem; }
.map-panel, .map-body { display: flex; flex-direction: column; }
.map-body { flex: 1; position: relative; min-height: 19rem; overflow: hidden; border-radius: 0 0 .75rem .75rem; }
.map-canvas { position: absolute; inset: 0; }
.map-legend {
  display: flex; flex-wrap: wrap; gap: .65rem;
  padding: 0 1rem .75rem; font-size: .76rem;
}
.map-body :deep(.maplibregl-ctrl-group button) { width: 40px; height: 40px; }
.map-body :deep(.maplibregl-ctrl-attrib-button) { min-block-size: 0; }
@container (max-width: 33.99rem) {
  .metric { display: grid; grid-template-columns: 1fr auto; column-gap: 1rem; align-items: center; padding: .8rem 1rem; }
  .metric > strong { grid-column: 2; grid-row: 1 / 3; margin: 0; font-size: 1.8rem; }
  .metric > p { grid-column: 1; margin-left: 1.5rem; }
  .paired .pair { gap: .65rem; }
  .paired strong { margin: 0 0 .2rem; font-size: 1.55rem; }
}
@container (min-width: 34rem) { .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@container (min-width: 57rem) {
  .metric-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .operations-grid { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); }
}
</style>
