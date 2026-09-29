<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Peta Sebaran Geospasial Posko & Faskes
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Visualisasi spasial PostGIS untuk pemantauan kegawatdaruratan dan konsentrasi pengungsi.
          </p>
        </div>
      </div>

      <!-- Map & Sidebar Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[640px]">
        <!-- Interactive Map Container -->
        <div class="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden relative">
          <div ref="mapContainer" class="w-full h-full min-h-[500px]"></div>

          <!-- Map Legend Overlay -->
          <div class="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-md border border-slate-200 text-xs space-y-2 z-10">
            <span class="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">Indikator Peta</span>
            <div class="flex items-center space-x-2">
              <span class="w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow-xs"></span>
              <span class="text-slate-700">Posko dengan T0 Aktif</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white shadow-xs"></span>
              <span class="text-slate-700">Posko Terkendali</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-3.5 h-3.5 rounded-sm bg-indigo-600 border-2 border-white shadow-xs"></span>
              <span class="text-slate-700">Faskes / RS Rujukan</span>
            </div>
          </div>
        </div>

        <!-- Shelter Directory Sidebar -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col space-y-4 overflow-y-auto">
          <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Daftar Posko Lapangan ({{ shelters?.length || 0 }})
          </h3>

          <div class="space-y-3 flex-1 overflow-y-auto">
            <div
              v-for="s in shelters"
              :key="s.id"
              class="p-4 rounded-2xl border transition"
              :class="Number(s.t0_count) > 0 ? 'bg-red-50/60 border-red-300' : 'bg-slate-50 border-slate-200'"
            >
              <div class="flex items-start justify-between">
                <h4 class="font-extrabold text-sm text-slate-900">
                  {{ s.name }}
                </h4>
                <span
                  v-if="Number(s.t0_count) > 0"
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse"
                >
                  {{ s.t0_count }} T0
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                {{ s.address }}
              </p>
              <div class="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>👥 {{ s.patient_count || 0 }} Penyintas</span>
                <span>🤝 {{ s.volunteer_count || 0 }} Relawan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const props = defineProps<{
  shelters: any[];
  facilities?: any[];
}>();

const mapContainer = ref<HTMLElement | null>(null);

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
    center: [110.42, -7.70], // Centered around Merapi - Sleman, DIY
    zoom: 11,
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  // Add markers for shelters
  for (const s of props.shelters || []) {
    if (!s.longitude || !s.latitude) continue;

    const el = document.createElement('div');
    el.className = 'w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs font-black cursor-pointer';

    const hasT0 = Number(s.t0_count) > 0;
    el.style.backgroundColor = hasT0 ? '#991B1B' : '#0F766E';
    el.style.color = '#FFFFFF';
    el.innerHTML = hasT0 ? '🚨' : '⛺';

    const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
      <div style="font-family: sans-serif; padding: 4px;">
        <h4 style="font-weight: 800; font-size: 13px; margin: 0 0 4px 0;">${s.name}</h4>
        <p style="font-size: 11px; color: #64748B; margin: 0 0 6px 0;">${s.address || ''}</p>
        <p style="font-size: 11px; margin: 2px 0;">👥 <strong>${s.patient_count || 0}</strong> Penyintas Terdata</p>
        <p style="font-size: 11px; margin: 2px 0;">🤝 <strong>${s.volunteer_count || 0}</strong> Relawan Bertugas</p>
        ${hasT0 ? `<p style="font-size: 11px; color: #991B1B; font-weight: bold; margin: 4px 0 0 0;">🚨 ${s.t0_count} Kasus Darurat Aktif</p>` : ''}
      </div>
    `);

    new maplibregl.Marker(el)
      .setLngLat([Number(s.longitude), Number(s.latitude)])
      .setPopup(popup)
      .addTo(map);
  }
});
</script>
