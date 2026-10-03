<template>
  <HealthcareLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Data Rekam Medis Pasien Terdata
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Riwayat skrining dan status tindak lanjut klinis penyintas bencana.
          </p>
        </div>
      </div>

      <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th class="py-4 px-6">Nama Pasien</th>
              <th class="py-4 px-6">NIK</th>
              <th class="py-4 px-6">Posko Asal</th>
              <th class="py-4 px-6">Triase Terakhir</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
            <tr v-for="p in patients" :key="p.id" class="hover:bg-slate-50/70 transition">
              <td class="py-4 px-6 font-bold text-slate-900">
                {{ p.name }}
              </td>
              <td class="py-4 px-6 text-slate-500">
                {{ p.nik || '-' }}
              </td>
              <td class="py-4 px-6">
                {{ p.shelter?.name || 'Posko tidak diketahui' }}
              </td>
              <td class="py-4 px-6">
                <Badge :variant="latestBadge(p)">
                  {{ latestCategory(p) }}
                </Badge>
              </td>
              <td class="py-4 px-6 text-right">
                <Link
                  :href="`/healthcare/patients/${p.id}`"
                  class="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-bold rounded-lg transition"
                >
                  Detail Klinis →
                </Link>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!patients || patients.length === 0" class="p-8 text-center text-xs text-slate-400">
          Belum ada data pasien.
        </div>
      </div>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import Badge from '@/components/ui/Badge.vue';

defineProps<{
  patients: any[];
}>();

function latestCategory(patient: any): string {
  if (patient.emergency_events && patient.emergency_events.length > 0) {
    return 'T0 (Darurat)';
  }
  const lastAss = patient.assessments?.[patient.assessments.length - 1];
  return lastAss?.triage_result?.system_recommendation || 'T3';
}

function latestBadge(patient: any) {
  const cat = latestCategory(patient);
  if (cat.includes('T0')) return 't0';
  if (cat === 'T1') return 't1';
  if (cat === 'T2') return 't2';
  return 't3';
}
</script>
