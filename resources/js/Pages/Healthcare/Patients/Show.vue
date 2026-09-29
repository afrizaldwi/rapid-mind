<template>
  <HealthcareLayout>
    <div class="space-y-6 max-w-4xl">
      <div class="flex items-center justify-between">
        <Link
          href="/healthcare/patients"
          class="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center space-x-1"
        >
          <span>← Kembali ke Daftar Pasien</span>
        </Link>
      </div>

      <!-- Patient Profile Header -->
      <div class="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex items-start justify-between">
        <div class="space-y-1">
          <span class="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
            Rekam Medis Pasien
          </span>
          <h2 class="text-2xl font-black text-slate-900 mt-1">
            {{ patient.name }}
          </h2>
          <p class="text-xs text-slate-500">
            NIK: {{ patient.nik || 'Tidak Terdata' }} • Usia: {{ patient.age || '-' }} tahun • {{ patient.gender || '-' }}
          </p>
          <p class="text-xs text-slate-500">
            Posko Pengungsian: <strong class="text-slate-700">{{ patient.shelter?.name || 'Posko Candi' }}</strong>
          </p>
        </div>
      </div>

      <!-- Assessment History List -->
      <div class="space-y-3">
        <h3 class="font-extrabold text-slate-900 text-sm">
          Riwayat Asesmen Lapangan ({{ patient.assessments?.length || 0 }})
        </h3>

        <div
          v-for="a in patient.assessments"
          :key="a.id"
          class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <Badge :variant="badgeVariant(a.triage_result?.system_recommendation)">
                Triase: {{ a.triage_result?.system_recommendation || 'T3' }}
              </Badge>
              <span class="text-xs text-slate-500">
                Total Skor: <strong>{{ a.triage_result?.total_score || 0 }} / 37</strong>
              </span>
            </div>
            <span class="text-xs text-slate-400">
              {{ new Date(a.created_at).toLocaleDateString('id-ID') }}
            </span>
          </div>

          <div v-if="a.clinical_validation" class="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-xs text-teal-950 space-y-1">
            <p><strong>Validasi Dokter:</strong> {{ a.clinical_validation.clinical_result }}</p>
            <p><strong>Catatan:</strong> {{ a.clinical_validation.diagnosis_notes || '-' }}</p>
          </div>
        </div>

        <div v-if="!patient.assessments || patient.assessments.length === 0" class="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
          Belum ada riwayat asesmen terstruktur.
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
  patient: any;
}>();

function badgeVariant(category?: string) {
  switch (category) {
    case 'T0_SUSPECT':
    case 'T0_CONFIRMED':
      return 't0';
    case 'T1':
      return 't1';
    case 'T2':
      return 't2';
    default:
      return 't3';
  }
}
</script>
