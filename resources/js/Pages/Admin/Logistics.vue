<template>
  <AdminLayout>
    <div class="space-y-5 max-w-5xl">
      <!-- Editorial Page Header -->
      <div class="space-y-1">
        <h1 class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          Kebutuhan & Bantuan Psikososial
        </h1>
        <p class="text-xs text-slate-500 font-normal">
          Pantau kebutuhan bantuan psikososial di setiap posko.
        </p>

        <!-- Compact Summary Metadata -->
        <div v-if="shelters?.length" class="flex items-center gap-2 text-xs text-slate-500 pt-1 font-medium">
          <span>{{ activeSheltersCount }} posko aktif</span>
          <span class="text-slate-300">·</span>
          <span class="text-amber-800 font-semibold">{{ shortageCount }} posko membutuhkan penambahan obat kronis</span>
        </div>
      </div>

      <!-- Unified Resource Monitoring Surface -->
      <div class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <!-- Table Column Headers (Desktop) -->
        <div class="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <div class="sm:col-span-4">Posko Lapangan</div>
          <div class="sm:col-span-2">Populasi</div>
          <div class="sm:col-span-6">Kebutuhan & Ketersediaan</div>
        </div>

        <!-- Shelter List Rows -->
        <div v-if="shelters && shelters.length > 0" class="divide-y divide-slate-100">
          <div
            v-for="s in shelters"
            :key="s.id"
            class="p-5 sm:grid sm:grid-cols-12 gap-4 items-start hover:bg-slate-50/50 transition"
          >
            <!-- Col 1: Posko Identity -->
            <div class="sm:col-span-4 space-y-0.5 pb-2 sm:pb-0">
              <h2 class="text-xs font-bold text-slate-900 leading-snug">
                {{ s.name }}
              </h2>
              <p class="text-[11px] text-slate-400 font-normal truncate">
                {{ s.address || 'Kawasan Posko Bencana' }}
              </p>
            </div>

            <!-- Col 2: Population -->
            <div class="sm:col-span-2 pb-3 sm:pb-0 text-xs">
              <span class="sm:hidden text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Populasi:</span>
              <span class="font-medium text-slate-700">
                {{ (s.patients?.length ?? 0) > 0 ? `${s.patients.length} penyintas` : '0 penyintas' }}
              </span>
            </div>

            <!-- Col 3: Resource Inventory & Shortage Status -->
            <div class="sm:col-span-6 space-y-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-xs">
              <!-- Item 1: Kit Ramah Anak -->
              <div class="flex items-center justify-between gap-2">
                <span class="text-slate-600 font-medium">Kit Ramah Anak</span>
                <div class="flex items-center gap-1.5 text-[11px]">
                  <span class="text-slate-400">20 paket</span>
                  <span class="text-slate-200">·</span>
                  <span class="inline-flex items-center gap-1 font-semibold text-teal-800">
                    <span class="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                    Tersedia
                  </span>
                </div>
              </div>

              <!-- Item 2: Paket Sanitasi Lansia -->
              <div class="flex items-center justify-between gap-2">
                <span class="text-slate-600 font-medium">Paket Sanitasi Lansia</span>
                <div class="flex items-center gap-1.5 text-[11px]">
                  <span class="text-slate-400">15 paket</span>
                  <span class="text-slate-200">·</span>
                  <span class="inline-flex items-center gap-1 font-semibold text-teal-800">
                    <span class="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                    Tersedia
                  </span>
                </div>
              </div>

              <!-- Item 3: Obat Kronis Esensial (Priority Shortage) -->
              <div class="flex items-center justify-between gap-2 pt-0.5">
                <span class="text-slate-800 font-semibold">Obat Kronis Esensial</span>
                <span class="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  Perlu penambahan
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="p-8 text-center text-xs text-slate-400">
          Belum ada data posko atau kebutuhan.
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AdminLayout from '@/layouts/AdminLayout.vue';

const props = defineProps<{
  shelters: any[];
}>();

const activeSheltersCount = computed(() => {
  return (props.shelters || []).filter((s: any) => s.is_active !== false).length;
});

const shortageCount = computed(() => {
  return activeSheltersCount.value;
});
</script>
