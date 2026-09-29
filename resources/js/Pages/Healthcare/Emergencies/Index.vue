<template>
  <HealthcareLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Antrean Kasus Kegawatdaruratan T0
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Prioritas tertinggi: Kasus belum diakui dan indikasi ancaman nyawa langsung.
          </p>
        </div>

        <div class="flex items-center space-x-2 text-xs">
          <span class="font-bold text-slate-700">Total Kasus Masuk:</span>
          <span class="bg-red-100 text-red-900 font-extrabold px-3 py-1 rounded-full border border-red-300">
            {{ emergencies?.length || 0 }} Insiden
          </span>
        </div>
      </div>

      <!-- 3 Queue Columns: Perlu Respons | Sedang Ditangani | Tindak Lanjut -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 1. PERLU RESPONS (PENDING) -->
        <div class="space-y-3">
          <div class="bg-red-800 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs">
            <div class="flex items-center space-x-2">
              <span>🚨</span>
              <h3 class="text-xs font-black uppercase tracking-wider">Perlu Respons Segera</h3>
            </div>
            <span class="bg-red-900 px-2 py-0.5 rounded-full text-xs font-bold">
              {{ needResponse.length }}
            </span>
          </div>

          <div class="space-y-3">
            <div
              v-for="e in needResponse"
              :key="e.id"
              class="bg-white p-5 rounded-2xl border-2 border-red-400 shadow-md space-y-3 hover:border-red-600 transition"
            >
              <div class="flex items-start justify-between">
                <div>
                  <Badge variant="t0">{{ formatRedFlag(e.red_flag_type) }}</Badge>
                  <h4 class="text-base font-extrabold text-slate-900 mt-2">
                    {{ e.patient?.name || 'Penyintas Tanpa Nama' }}
                  </h4>
                  <p class="text-xs text-slate-500">
                    Posko: <strong class="text-slate-700">{{ e.shelter?.name || 'Posko Candi' }}</strong>
                  </p>
                </div>
                <span class="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded-lg">
                  {{ timeAgo(e.created_at) }}
                </span>
              </div>

              <p v-if="e.notes" class="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                "{{ e.notes }}"
              </p>

              <div class="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                <span class="text-slate-500">Relawan: {{ e.user?.name || 'Relawan' }}</span>
                <Link
                  :href="`/healthcare/emergencies/${e.id}`"
                  class="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg shadow-xs transition"
                >
                  Tinjau & Akui →
                </Link>
              </div>
            </div>

            <div v-if="needResponse.length === 0" class="p-8 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400 bg-white">
              Tidak ada kasus darurat baru yang menunggu respons.
            </div>
          </div>
        </div>

        <!-- 2. SEDANG DITANGANI (ACKNOWLEDGED / REVIEWING) -->
        <div class="space-y-3">
          <div class="bg-amber-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs">
            <div class="flex items-center space-x-2">
              <span>🩺</span>
              <h3 class="text-xs font-black uppercase tracking-wider">Sedang Diverifikasi Medis</h3>
            </div>
            <span class="bg-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {{ inProgress.length }}
            </span>
          </div>

          <div class="space-y-3">
            <div
              v-for="e in inProgress"
              :key="e.id"
              class="bg-white p-5 rounded-2xl border border-amber-300 shadow-xs space-y-3 hover:border-amber-400 transition"
            >
              <div class="flex items-start justify-between">
                <div>
                  <Badge variant="t2">{{ e.status }}</Badge>
                  <h4 class="text-base font-extrabold text-slate-900 mt-2">
                    {{ e.patient?.name || 'Penyintas Tanpa Nama' }}
                  </h4>
                  <p class="text-xs text-slate-500">
                    Posko: <strong class="text-slate-700">{{ e.shelter?.name || 'Posko Candi' }}</strong>
                  </p>
                </div>
                <span class="text-xs text-slate-400 font-medium">
                  {{ timeAgo(e.created_at) }}
                </span>
              </div>

              <div class="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                <span class="text-amber-800 font-semibold">Dalam Peninjauan</span>
                <Link
                  :href="`/healthcare/emergencies/${e.id}`"
                  class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition"
                >
                  Klasifikasikan →
                </Link>
              </div>
            </div>

            <div v-if="inProgress.length === 0" class="p-8 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400 bg-white">
              Tidak ada kasus yang sedang diverifikasi saat ini.
            </div>
          </div>
        </div>

        <!-- 3. TINDAK LANJUT / TERSELESAIKAN (CONFIRMED / DOWNGRADED) -->
        <div class="space-y-3">
          <div class="bg-slate-700 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs">
            <div class="flex items-center space-x-2">
              <span>✅</span>
              <h3 class="text-xs font-black uppercase tracking-wider">Tindak Lanjut & Selesai</h3>
            </div>
            <span class="bg-slate-800 px-2 py-0.5 rounded-full text-xs font-bold">
              {{ resolved.length }}
            </span>
          </div>

          <div class="space-y-3">
            <div
              v-for="e in resolved"
              :key="e.id"
              class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
            >
              <div class="flex items-start justify-between">
                <div>
                  <Badge :variant="e.status === 'CONFIRMED' ? 't0' : 'success'">
                    {{ e.status === 'CONFIRMED' ? 'T0 Terkonfirmasi' : 'Diturunkan' }}
                  </Badge>
                  <h4 class="text-base font-extrabold text-slate-900 mt-2">
                    {{ e.patient?.name || 'Penyintas Tanpa Nama' }}
                  </h4>
                  <p class="text-xs text-slate-500">
                    {{ e.shelter?.name }}
                  </p>
                </div>
                <span class="text-xs text-slate-400">
                  {{ timeAgo(e.created_at) }}
                </span>
              </div>

              <div class="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                <span class="text-slate-500">Status Selesai</span>
                <Link
                  :href="`/healthcare/emergencies/${e.id}`"
                  class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                >
                  Detail
                </Link>
              </div>
            </div>

            <div v-if="resolved.length === 0" class="p-8 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400 bg-white">
              Belum ada riwayat kasus yang selesai.
            </div>
          </div>
        </div>
      </div>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import Badge from '@/components/ui/Badge.vue';

const props = defineProps<{
  emergencies: any[];
  facility?: any;
}>();

const needResponse = computed(() => {
  return props.emergencies?.filter((e) => e.status === 'PENDING') || [];
});

const inProgress = computed(() => {
  return props.emergencies?.filter((e) => ['ACKNOWLEDGED', 'REVIEWING'].includes(e.status)) || [];
});

const resolved = computed(() => {
  return props.emergencies?.filter((e) => ['CONFIRMED', 'DOWNGRADED', 'RESOLVED'].includes(e.status)) || [];
});

function formatRedFlag(rf?: string) {
  switch (rf) {
    case 'SUICIDAL_IDEATION':
      return 'Ideasi Bunuh Diri';
    case 'PSYCHOSIS':
      return 'Psikosis Akut';
    case 'SEVERE_AGITATION':
      return 'Amuk / Agitasi';
    default:
      return 'Kegawatdaruratan Medis';
  }
}

function timeAgo(dateStr: string) {
  const diffMinutes = Math.round((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} jam lalu`;
}
</script>
