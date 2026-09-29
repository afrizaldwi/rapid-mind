<template>
  <AdminLayout>
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight">
          Pemantauan Kebutuhan & Bantuan Psikososial
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Kebutuhan logistik pendukung kesehatan jiwa dan kelompok rentan di posko.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="s in shelters"
          :key="s.id"
          class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-extrabold text-base text-slate-900">
                {{ s.name }}
              </h3>
              <p class="text-xs text-slate-500">
                Populasi: {{ s.patients?.length || 0 }} Penyintas Terdaftar
              </p>
            </div>
            <span class="text-xl">⛺</span>
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-slate-700 font-semibold">🧸 Kit Ramah Anak</span>
              <span class="font-bold text-teal-800">Tersedia (20 Paket)</span>
            </div>
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-slate-700 font-semibold">👵 Paket Sanitasi Lansia</span>
              <span class="font-bold text-teal-800">Tersedia (15 Paket)</span>
            </div>
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-slate-700 font-semibold">💊 Obat Kronis Esensial</span>
              <span class="font-bold text-amber-700">Perlu Penambahan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/layouts/AdminLayout.vue';

defineProps<{
  shelters: any[];
}>();
</script>
