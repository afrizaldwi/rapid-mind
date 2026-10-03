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
            Posko Pengungsian: <strong class="text-slate-700">{{ patient.shelter?.name || 'Posko tidak diketahui' }}</strong>
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
      <section class="space-y-3">
        <h3 class="font-extrabold text-slate-900 text-sm">Rujukan ({{ patient.referrals?.length || 0 }})</h3>
        <div v-for="r in patient.referrals" :key="r.id" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-sm space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-bold text-slate-900">{{ r.facility?.name || 'Faskes tidak tersedia' }} <span v-if="r.facility && !r.facility.is_active" class="text-amber-800 text-xs">(Nonaktif saat ini)</span></p>
              <p class="text-slate-600">Status: {{ formatReferralStatus(r.status) }} • Dibuat: {{ formatDate(r.created_at) }}</p>
            </div>
          </div>
          <p class="text-slate-600">Sumber: {{ r.emergency_event_id ? 'Darurat T0' : r.clinical_validation_id ? 'Validasi Asesmen' : 'Sumber historis tidak tercatat' }}<span v-if="r.clinical_validation?.assessment?.triage_result"> (Rekomendasi Sistem {{ r.clinical_validation.assessment.triage_result.system_recommendation }})</span></p>
          <p class="text-slate-600">Diterbitkan oleh: {{ r.referrer?.name || 'Tidak tercatat' }}</p>
          <div v-if="r.status_history?.length" class="border-t border-slate-100 pt-2 space-y-1">
            <p class="font-bold text-slate-800">Riwayat Status</p>
            <p v-for="h in r.status_history" :key="h.id" class="text-slate-600">{{ formatDate(h.created_at) }} • {{ formatReferralStatus(h.status) }} • {{ h.changer?.name || 'Tidak tercatat' }}<span v-if="h.notes"> — {{ h.notes }}</span></p>
          </div>
        </div>
        <p v-if="!patient.referrals?.length" class="p-6 bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">Belum ada riwayat rujukan.</p>
      </section>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import Badge from '@/components/ui/Badge.vue';
import { formatReferralStatus } from '@/lib/referralStatus';

defineProps<{
  patient: any;
}>();

function formatDate(value: string) { return new Date(value).toLocaleString('id-ID'); }

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
