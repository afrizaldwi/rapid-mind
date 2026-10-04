<template>
  <AdminLayout>
    <div class="space-y-5">
      <!-- Minimalist Page Header -->
      <div class="space-y-1">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Peta Geospasial Posko & Faskes
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 font-normal">
          Visualisasi lokasi Posko, fasilitas kesehatan, dan kondisi triase di wilayah operasional.
        </p>
      </div>

      <!-- Geospatial Workspace Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[640px]">
        <!-- Primary Interactive Map Canvas -->
        <div class="lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-slate-200/80 overflow-hidden relative shadow-none h-full min-h-[460px]">
          <div ref="mapContainer" class="w-full h-full"></div>

          <!-- Minimal Inline Legend Overlay: Placed in Top-Left to avoid map attribution & navigation controls -->
          <div
            class="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-md border border-slate-200/80 shadow-xs text-[11px] flex items-center gap-3 z-10 select-none pointer-events-auto"
            aria-label="Legenda Peta"
          >
            <span class="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Indikator</span>
            <span class="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <span class="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shrink-0"></span>
              T0 Aktif
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <span class="w-2.5 h-2.5 rounded-full bg-teal-700 border border-white shrink-0"></span>
              Posko
            </span>
            <span v-if="facilitiesWithCoords.length > 0" class="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <span class="w-2.5 h-2.5 rounded-xs bg-slate-800 border border-white shrink-0"></span>
              Faskes / RS
            </span>
          </div>

          <!-- Empty Map State Overlay -->
          <div
            v-if="!shelters?.length"
            class="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-xs z-20 text-xs text-slate-500 font-medium pointer-events-none"
          >
            Belum ada lokasi untuk ditampilkan.
          </div>
        </div>

        <!-- Lightweight Operational Posko Directory -->
        <aside class="lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-slate-200/80 flex flex-col overflow-hidden shadow-none h-full">
          <!-- Sidebar Header -->
          <div class="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Daftar Posko
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5 font-normal">
                {{ shelters?.length || 0 }} lokasi
              </p>
            </div>
            <span v-if="totalT0Count > 0" class="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
              <span class="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
              {{ totalT0Count }} T0
            </span>
          </div>

          <!-- Posko List -->
          <div v-if="shelters?.length" class="divide-y divide-slate-100 overflow-y-auto flex-1">
            <button
              v-for="s in shelters"
              :key="s.id"
              :id="`shelter-row-${s.id}`"
              type="button"
              class="w-full text-left p-3.5 transition-colors block hover:bg-slate-50/70"
              :class="selectedShelterId === s.id ? 'bg-teal-50/50 border-l-2 border-teal-700' : ''"
              @click="selectShelter(s)"
            >
              <div class="space-y-0.5 min-w-0">
                <div class="text-xs font-semibold text-slate-900 leading-snug truncate">
                  {{ s.name }}
                </div>
                <div class="text-[11px] text-slate-400 font-normal truncate">
                  {{ s.address || 'Kawasan Posko Bencana' }}
                </div>
              </div>

              <div class="mt-2.5 flex items-center justify-between text-xs">
                <span class="text-[11px] text-slate-500 font-normal">
                  <span class="font-semibold text-slate-700">{{ s.patient_count || 0 }}</span> penyintas
                </span>

                <span v-if="Number(s.t0_count) > 0" class="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
                  <span class="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                  {{ s.t0_count }} T0 aktif
                </span>
                <span v-else-if="!s.longitude || !s.latitude" class="text-[11px] text-slate-400 font-normal">
                  Lokasi peta belum ada
                </span>
                <span v-else class="inline-flex items-center gap-1 text-[11px] font-normal text-slate-500">
                  <span class="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                  Aktif
                </span>
              </div>
            </button>
          </div>

          <!-- Empty Posko List State -->
          <div v-else class="p-8 text-center text-xs text-slate-400">
            Belum ada data posko.
          </div>
        </aside>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import * as maplibregl from '@/lib/maplibre';

interface MarkerEntry {
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
  visualEl: HTMLElement;
  hasT0: boolean;
}

const props = defineProps<{
  shelters: any[];
  facilities?: any[];
}>();

const mapContainer = ref<HTMLElement | null>(null);
const mapInstance = ref<maplibregl.Map | null>(null);
const selectedShelterId = ref<number | null>(null);
const markersMap = new Map<number, MarkerEntry>();

const totalT0Count = computed(() => {
  return (props.shelters || []).reduce((acc: number, s: any) => acc + (Number(s.t0_count) || 0), 0);
});

const facilitiesWithCoords = computed(() => {
  return (props.facilities || []).filter((f: any) => f.longitude && f.latitude);
});

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateMarkerHighlight(entry: MarkerEntry, isSelected: boolean) {
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

function selectShelter(shelter: any) {
  selectedShelterId.value = shelter.id;
  if (!mapInstance.value || !shelter.longitude || !shelter.latitude) return;

  mapInstance.value.flyTo({
    center: [Number(shelter.longitude), Number(shelter.latitude)],
    zoom: 13,
    essential: true,
  });

  const entry = markersMap.get(shelter.id);
  if (entry) {
    if (!entry.popup.isOpen()) {
      entry.marker.togglePopup();
    }
  }

  const rowEl = document.getElementById(`shelter-row-${shelter.id}`);
  if (rowEl) {
    rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

onMounted(() => {
  if (!mapContainer.value) return;

  const map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
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
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

  // Background map click deselects active location
  map.on('click', () => {
    selectedShelterId.value = null;
  });

  const sheltersWithCoords = (props.shelters || []).filter((s: any) => s.longitude && s.latitude);

  // Add clean circular markers for shelters (T0: Red, Normal: Teal)
  for (const s of sheltersWithCoords) {
    const hasT0 = Number(s.t0_count) > 0;

    // Generous hit target wrapper (36x36px) ensuring easy click and tap on touch devices
    const hitArea = document.createElement('div');
    hitArea.className = 'w-9 h-9 flex items-center justify-center cursor-pointer pointer-events-auto select-none';
    hitArea.setAttribute('role', 'button');
    hitArea.setAttribute('tabindex', '0');
    hitArea.setAttribute('aria-label', `${s.name} - ${hasT0 ? s.t0_count + ' T0 Aktif' : 'Posko'}`);
    hitArea.setAttribute('title', `${s.name} (${hasT0 ? s.t0_count + ' T0 Aktif' : 'Posko'})`);

    // Inner visual marker (24x24px)
    const visualMarker = document.createElement('div');
    visualMarker.className = `w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all duration-150 ${hasT0 ? 'bg-red-600' : 'bg-teal-700'}`;

    const innerDot = document.createElement('div');
    innerDot.className = 'w-1.5 h-1.5 rounded-full bg-white shrink-0';
    visualMarker.appendChild(innerDot);

    hitArea.appendChild(visualMarker);

    const onMarkerClick = (event: Event) => {
      event.stopPropagation();
      selectShelter(s);
    };

    hitArea.addEventListener('click', onMarkerClick);
    hitArea.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onMarkerClick(event);
      }
    });

    const popupHTML = `
      <div style="font-family: inherit; padding: 4px; min-width: 180px;">
        <div style="font-weight: 700; font-size: 13px; color: #0F172A; margin-bottom: 2px;">${escapeHtml(s.name)}</div>
        <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">${escapeHtml(s.address || 'Kawasan Posko Bencana')}</div>
        <div style="font-size: 11px; color: #334155; line-height: 1.5; border-top: 1px solid #F1F5F9; padding-top: 6px;">
          <div><span style="font-weight: 600; color: #0F172A;">${s.patient_count || 0}</span> penyintas terdata</div>
          <div><span style="font-weight: 600; color: #0F172A;">${s.volunteer_count || 0}</span> relawan bertugas</div>
          ${hasT0 ? `<div style="color: #B91C1C; font-weight: 600; margin-top: 4px;">● ${s.t0_count} kasus darurat T0 aktif</div>` : '<div style="color: #0F766E; font-weight: 500; margin-top: 4px;">● Posko terkendali</div>'}
        </div>
      </div>
    `;

    const popup = new maplibregl.Popup({ offset: 18 }).setHTML(popupHTML);

    const marker = new maplibregl.Marker({ element: hitArea, anchor: 'center' })
      .setLngLat([Number(s.longitude), Number(s.latitude)])
      .setPopup(popup)
      .addTo(map);

    markersMap.set(s.id, { marker, popup, visualEl: visualMarker, hasT0 });
  }

  // Add square markers for facilities if coordinates are present
  for (const f of facilitiesWithCoords.value) {
    const hitArea = document.createElement('div');
    hitArea.className = 'w-9 h-9 flex items-center justify-center cursor-pointer pointer-events-auto select-none';
    hitArea.setAttribute('role', 'button');
    hitArea.setAttribute('tabindex', '0');
    hitArea.setAttribute('aria-label', `${f.name} - Fasilitas Kesehatan`);
    hitArea.setAttribute('title', `${f.name}`);

    const visualMarker = document.createElement('div');
    visualMarker.className = 'w-5 h-5 rounded-xs border-2 border-white shadow-md bg-slate-800 flex items-center justify-center transition-all duration-150';

    const innerDot = document.createElement('div');
    innerDot.className = 'w-1.5 h-1.5 rounded-xs bg-white shrink-0';
    visualMarker.appendChild(innerDot);

    hitArea.appendChild(visualMarker);

    const popupHTML = `
      <div style="font-family: inherit; padding: 4px; min-width: 160px;">
        <div style="font-weight: 700; font-size: 13px; color: #0F172A; margin-bottom: 2px;">${escapeHtml(f.name)}</div>
        <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">${escapeHtml(f.address || '')}</div>
        <div style="font-size: 11px; color: #475569; border-top: 1px solid #F1F5F9; padding-top: 4px;">
          <span style="font-weight: 600;">${escapeHtml(f.type || 'Fasilitas Kesehatan')}</span>
        </div>
      </div>
    `;

    const popup = new maplibregl.Popup({ offset: 16 }).setHTML(popupHTML);

    hitArea.addEventListener('click', (event) => {
      event.stopPropagation();
      map.flyTo({
        center: [Number(f.longitude), Number(f.latitude)],
        zoom: 14,
        essential: true,
      });
      popup.addTo(map);
    });

    new maplibregl.Marker({ element: hitArea, anchor: 'center' })
      .setLngLat([Number(f.longitude), Number(f.latitude)])
      .setPopup(popup)
      .addTo(map);
  }

  // Auto fit bounds to visible markers
  if (sheltersWithCoords.length > 0) {
    const bounds = new maplibregl.LngLatBounds();
    for (const s of sheltersWithCoords) {
      bounds.extend([Number(s.longitude), Number(s.latitude)]);
    }
    for (const f of facilitiesWithCoords.value) {
      bounds.extend([Number(f.longitude), Number(f.latitude)]);
    }
    map.fitBounds(bounds, { padding: 48, maxZoom: 13 });
  }
});

onBeforeUnmount(() => {
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }
});
</script>
