<template>
  <AdminLayout>
    <div class="space-y-6 max-w-5xl">
      <!-- Page Header -->
      <div class="space-y-1">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Kebutuhan & Bantuan Psikososial
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 font-normal">
          Pantau kebutuhan bantuan psikososial di setiap posko.
        </p>

        <!-- Concise Contextual Summary -->
        <div v-if="shelters?.length" class="flex items-center gap-2 text-xs text-slate-500 pt-1 font-normal">
          <span>{{ activeSheltersCount }} posko aktif</span>
          <span class="text-slate-300">·</span>
          <span class="text-amber-800 font-medium">{{ shortageCount }} membutuhkan tambahan obat kronis</span>
        </div>
      </div>

      <!-- Operational Resource Matrix / Table Container -->
      <div class="bg-white rounded-lg border border-slate-200/80 overflow-hidden shadow-none">
        <!-- Desktop Matrix Table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <colgroup>
              <col class="w-[40%]" />
              <col class="w-[12%]" />
              <col class="w-[16%]" />
              <col class="w-[16%]" />
              <col class="w-[16%]" />
            </colgroup>
            <thead>
              <tr class="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                <th scope="col" class="py-3 px-5">POSKO</th>
                <th scope="col" class="py-3 px-4">PENYINTAS</th>
                <th scope="col" class="py-3 px-4">KIT ANAK</th>
                <th scope="col" class="py-3 px-4">SANITASI</th>
                <th scope="col" class="py-3 px-5">OBAT KRONIS</th>
              </tr>
            </thead>
            <tbody v-if="shelters && shelters.length > 0" class="divide-y divide-slate-100">
              <tr
                v-for="s in shelters"
                :key="s.id"
                class="hover:bg-slate-50/40 transition-colors"
              >
                <!-- Posko Name & Location -->
                <td class="py-3.5 px-5 align-middle">
                  <div class="space-y-0.5">
                    <div class="text-sm font-semibold text-slate-900 leading-snug">
                      {{ s.name }}
                    </div>
                    <div class="text-xs text-slate-400 font-normal truncate max-w-sm">
                      {{ s.address || 'Kawasan Posko Bencana' }}
                    </div>
                  </div>
                </td>

                <!-- Population Count -->
                <td class="py-3.5 px-4 align-middle text-xs text-slate-600">
                  <span class="font-semibold text-slate-800">{{ s.patients?.length ?? 0 }}</span>
                  <span class="text-slate-500 font-normal"> penyintas</span>
                </td>

                <!-- Kit Ramah Anak -->
                <td class="py-3.5 px-4 align-middle">
                  <div class="flex items-center gap-1.5 text-xs text-slate-600">
                    <span class="font-medium text-slate-700">20 paket</span>
                    <span class="text-slate-300">·</span>
                    <span class="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                      <span class="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                      Tersedia
                    </span>
                  </div>
                </td>

                <!-- Paket Sanitasi Lansia -->
                <td class="py-3.5 px-4 align-middle">
                  <div class="flex items-center gap-1.5 text-xs text-slate-600">
                    <span class="font-medium text-slate-700">15 paket</span>
                    <span class="text-slate-300">·</span>
                    <span class="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                      <span class="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                      Tersedia
                    </span>
                  </div>
                </td>

                <!-- Obat Kronis Esensial (Shortage Priority) -->
                <td class="py-3.5 px-5 align-middle">
                  <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                    Perlu penambahan
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="5" class="py-10 text-center text-xs text-slate-400">
                  Belum ada data posko.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Responsive Stacked Presentation -->
        <div class="md:hidden">
          <div v-if="shelters && shelters.length > 0" class="divide-y divide-slate-100">
            <div
              v-for="s in shelters"
              :key="s.id"
              class="p-4 space-y-3"
            >
              <!-- Posko Header & Survivor count -->
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-0.5">
                  <h2 class="text-sm font-semibold text-slate-900 leading-snug">
                    {{ s.name }}
                  </h2>
                  <p class="text-xs text-slate-400 font-normal">
                    {{ s.address || 'Kawasan Posko Bencana' }}
                  </p>
                </div>
                <div class="text-xs text-slate-600 shrink-0 text-right pt-0.5">
                  <span class="font-semibold text-slate-800">{{ s.patients?.length ?? 0 }}</span>
                  <span class="text-slate-500 font-normal"> penyintas</span>
                </div>
              </div>

              <!-- Compact Stacked Resource List -->
              <div class="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <!-- Kit Anak -->
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-600 font-medium">Kit Ramah Anak</span>
                  <div class="flex items-center gap-1.5 text-xs text-slate-600">
                    <span class="font-medium text-slate-700">20 paket</span>
                    <span class="text-slate-300">·</span>
                    <span class="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                      <span class="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                      Tersedia
                    </span>
                  </div>
                </div>

                <!-- Sanitasi Lansia -->
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-600 font-medium">Paket Sanitasi Lansia</span>
                  <div class="flex items-center gap-1.5 text-xs text-slate-600">
                    <span class="font-medium text-slate-700">15 paket</span>
                    <span class="text-slate-300">·</span>
                    <span class="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                      <span class="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
                      Tersedia
                    </span>
                  </div>
                </div>

                <!-- Obat Kronis -->
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-700 font-medium">Obat Kronis Esensial</span>
                  <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                    Perlu penambahan
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile Empty State -->
          <div v-else class="p-8 text-center text-xs text-slate-400">
            Belum ada data posko.
          </div>
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
