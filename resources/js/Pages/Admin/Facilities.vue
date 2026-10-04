<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Organisasi Fasilitas Pelayanan Kesehatan (Faskes)
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Daftar Rumah Sakit Rujukan, Puskesmas Penyangga, dan PSC 119 siaga bencana.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="f in facilities"
          :key="f.id"
          class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3"
        >
          <div class="flex items-start justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {{ f.type }}
            </span>
            <span class="text-xs font-bold text-emerald-700">● Aktif</span>
          </div>

          <div>
            <h3 class="font-extrabold text-base text-slate-900">
              {{ f.name }}
            </h3>
            <p class="text-xs text-slate-500 mt-1">
              {{ f.address }}
            </p>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Tenaga Medis Terdaftar:</span>
            <span class="font-bold text-slate-900">{{ f.users_count || 1 }} Personel</span>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/layouts/AdminLayout.vue';

defineProps<{
  facilities: any[];
}>();
</script>
