<template>
  <AdminLayout>
    <div class="space-y-8">
      <div>
        <h2 class="text-xl font-black text-slate-900 tracking-tight">
          Ringkasan Operasional Lapangan
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Distribusi kondisi kesehatan jiwa penyintas di seluruh posko pengungsian aktif.
        </p>
      </div>

      <!-- Macro KPI Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Total -->
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Terdata</span>
          <span class="text-3xl font-black text-slate-900">{{ kpis.totalSurvivors }}</span>
          <span class="text-[11px] text-slate-400 block">Penyintas</span>
        </div>

        <!-- T0 -->
        <div class="bg-red-50 p-5 rounded-3xl border border-red-300 shadow-xs space-y-1">
          <span class="text-xs font-bold text-red-800 uppercase tracking-wider block">🚨 T0 Darurat</span>
          <span class="text-3xl font-black text-red-900">{{ kpis.countT0 }}</span>
          <span class="text-[11px] text-red-700 block">Kasus Krisis</span>
        </div>

        <!-- T1 -->
        <div class="bg-orange-50 p-5 rounded-3xl border border-orange-300 shadow-xs space-y-1">
          <span class="text-xs font-bold text-orange-800 uppercase tracking-wider block">🟠 T1 Berat</span>
          <span class="text-3xl font-black text-orange-900">{{ kpis.countT1 }}</span>
          <span class="text-[11px] text-orange-700 block">Butuh Medis</span>
        </div>

        <!-- T2 -->
        <div class="bg-amber-50 p-5 rounded-3xl border border-amber-300 shadow-xs space-y-1">
          <span class="text-xs font-bold text-amber-800 uppercase tracking-wider block">🟡 T2 Sedang</span>
          <span class="text-3xl font-black text-amber-900">{{ kpis.countT2 }}</span>
          <span class="text-[11px] text-amber-700 block">Dukungan PFA</span>
        </div>

        <!-- T3 -->
        <div class="bg-emerald-50 p-5 rounded-3xl border border-emerald-300 shadow-xs space-y-1">
          <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider block">🟢 T3 Resilien</span>
          <span class="text-3xl font-black text-emerald-900">{{ kpis.countT3 }}</span>
          <span class="text-[11px] text-emerald-700 block">Stabil</span>
        </div>
      </div>

      <!-- Shelter Operational Grid -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-extrabold text-slate-900 text-sm">
            Status Posko Pengungsian
          </h3>
          <span class="text-xs font-bold text-slate-500">
            {{ shelters?.length || 0 }} Posko Terdaftar
          </span>
        </div>

        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th class="py-4 px-6">Nama Posko</th>
              <th class="py-4 px-6">Lokasi</th>
              <th class="py-4 px-6">Penyintas Terdata</th>
              <th class="py-4 px-6">Relawan Ditugaskan</th>
              <th class="py-4 px-6">Status Operasional</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
            <tr v-for="s in shelters" :key="s.id" class="hover:bg-slate-50/70 transition">
              <td class="py-4 px-6 font-bold text-slate-900">
                {{ s.name }}
              </td>
              <td class="py-4 px-6 text-slate-500">
                {{ s.address || 'Kawasan Bencana' }}
              </td>
              <td class="py-4 px-6 font-bold">
                {{ s.patients_count }} orang
              </td>
              <td class="py-4 px-6">
                {{ s.volunteers_count }} personel
              </td>
              <td class="py-4 px-6">
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold" :class="s.is_active ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'">
                  {{ s.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/layouts/AdminLayout.vue';

defineProps<{
  kpis: {
    totalSurvivors: number;
    countT0: number;
    countT1: number;
    countT2: number;
    countT3: number;
  };
  shelters: any[];
}>();
</script>
