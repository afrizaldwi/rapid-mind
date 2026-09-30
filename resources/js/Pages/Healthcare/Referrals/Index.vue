<template>
  <HealthcareLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Pemantauan Rujukan & Evakuasi Medis
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Pelacakan alur rujukan dari posko pengungsian ke faskes rujukan sekunder.
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="r in referrals"
          :key="r.id"
          class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-lg">🚑</span>
                <h3 class="text-base font-extrabold text-slate-900">
                  {{ r.patient?.name }}
                </h3>
                <Badge :variant="r.status === 'COMPLETED' ? 'success' : 'warning'">
                  {{ formatReferralStatus(r.status) }}
                </Badge>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Faskes Tujuan: <strong class="text-slate-800">{{ r.facility?.name }}</strong> • Perujuk: {{ r.referrer?.name }}
              </p>
            </div>
            <span class="text-xs text-slate-400">
              {{ new Date(r.created_at).toLocaleString('id-ID') }}
            </span>
          </div>

          <p v-if="r.notes" class="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            "{{ r.notes }}"
          </p>

          <!-- Step Progression Buttons -->
          <div class="pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center">
            <span class="text-xs font-bold text-slate-500 mr-2">Ubah Status Alur:</span>
            <button
              v-for="step in referralSteps"
              :key="step.key"
              type="button"
              @click="updateStatus(r.id, step.key)"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
              :class="r.status === step.key ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            >
              {{ step.label }}
            </button>
          </div>
        </div>

        <div v-if="!referrals || referrals.length === 0" class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
          Belum ada data rujukan aktif saat ini.
        </div>
      </div>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import Badge from '@/components/ui/Badge.vue';
import { formatReferralStatus } from '@/lib/referralStatus';

defineProps<{
  referrals: any[];
}>();

const referralSteps = [
  { key: 'ACTIVE', label: '1. Aktif' },
  { key: 'EN_ROUTE', label: '2. Menuju Lokasi' },
  { key: 'ON_SITE', label: '3. Tiba di Posko' },
  { key: 'TRANSPORT', label: '4. Transportasi ke RS' },
  { key: 'COMPLETED', label: '5. Selesai Diterima' },
];

function updateStatus(referralId: string, newStatus: string) {
  router.post(`/healthcare/referrals/${referralId}/status`, {
    status: newStatus,
    notes: `Status diubah menjadi ${newStatus}`,
  });
}
</script>
