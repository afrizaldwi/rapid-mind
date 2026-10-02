<template>
  <RelawanLayout>
    <div class="space-y-6 pb-20">
      <div v-if="broadcastWarning" role="alert" class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
        {{ broadcastWarning }}
      </div>

      <!-- Incident Header Banner -->
      <div class="bg-red-800 text-white rounded-3xl p-6 shadow-xl border border-red-700 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Siren class="h-6 w-6" aria-hidden="true" />
            <span class="text-xs font-black uppercase tracking-wider bg-red-900/80 px-2.5 py-1 rounded-md">
              Insiden T0 Darurat Aktif
            </span>
          </div>
          <Badge variant="t0">{{ localEmergency ? 'T0-Suspect' : emergency.status }}</Badge>
        </div>

        <div>
          <h2 class="text-2xl font-black tracking-tight">
            {{ emergency.patient?.name || 'Penyintas Tanpa Nama' }}
          </h2>
          <p class="text-xs text-red-200 mt-1">
            Indikator: <strong class="text-white">{{ formatRedFlag(emergency.red_flag_type) }}</strong>
          </p>
        </div>
      </div>

      <!-- 3 Separate State Axes (AGENTS.md Critical Rule) -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Status Multi-Dimensi Insiden
        </h3>

        <!-- Axis 1: Status Klinis -->
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span class="text-slate-600 font-semibold">1. Status Klinis:</span>
          <span class="font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
            {{ clinicalLabel }}
          </span>
        </div>

        <!-- Axis 2: Transmisi Server -->
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span class="text-slate-600 font-semibold">2. Transmisi Sistem:</span>
          <span class="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            {{ localEmergency ? transmissionLabel : 'Diterima server' }}
          </span>
        </div>

        <!-- Axis 3: Respons Faskes -->
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span class="text-slate-600 font-semibold">3. Respons Faskes:</span>
          <span
            class="font-bold px-2 py-0.5 rounded-md border"
            :class="emergency.status === 'PENDING' ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-teal-800 bg-teal-50 border-teal-200'"
          >
            {{ healthcareResponse }}
          </span>
        </div>
      </div>

      <!-- Safety Protocol Guidelines -->
      <div class="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-xs text-amber-950 space-y-2">
        <div class="flex items-center space-x-2 font-bold text-amber-900 text-sm">
          <ShieldAlert class="h-4 w-4" aria-hidden="true" />
          <h4>Protokol Keselamatan Relawan</h4>
        </div>
        <ul class="space-y-1.5 list-disc list-inside text-amber-900">
          <li><strong>Jangan tinggalkan penyintas sendirian.</strong> Minta relawan lain membantu menjaga.</li>
          <li>Jauhkan benda berbahaya atau tajam dari jangkauan penyintas.</li>
          <li>Gunakan nada suara tenang, jangan membantah atau mendebat keyakinan delusi penyintas.</li>
        </ul>
      </div>

      <!-- Incident Location & Details -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2.5">
        <h3 class="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
          Detail Lokasi & Kejadian
        </h3>
        <p class="text-slate-800">
          <strong>Posko:</strong> {{ emergency.shelter?.name || 'Tidak tercatat' }}
        </p>
        <p class="text-slate-800">
          <strong>Waktu Kejadian:</strong> {{ new Date(emergency.created_at).toLocaleString('id-ID') }}
        </p>
        <p v-if="emergency.notes" class="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2">
          "{{ emergency.notes }}"
        </p>
      </div>

      <!-- Native SMS Fallback Handoff Button -->
      <div class="space-y-2">
        <a
          :href="smsHref"
          class="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Smartphone class="h-4 w-4" aria-hidden="true" />
          <span>Buka SMS Cadangan (Jika Sinyal Data Terputus)</span>
        </a>
        <p class="text-[11px] text-slate-500 text-center">
          Periksa dan kirim pesan sendiri di aplikasi SMS.
        </p>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ShieldAlert, Siren, Smartphone } from 'lucide-vue-next';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import Badge from '@/components/ui/Badge.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import type { LocalEmergency } from '@/offline/db';

const props = defineProps<{
  emergency?: any;
  localEmergency?: LocalEmergency;
}>();
const runtime = useRelawanRuntime();
const localEmergency = computed(() => props.localEmergency);
const emergency = computed(() => props.localEmergency ? {
  ...props.localEmergency,
  patient: { name: props.localEmergency.patient_name },
  shelter: { name: props.localEmergency.shelter_id === runtime.shelterId ? runtime.shelterName : null },
} : props.emergency);
const broadcastWarning = computed(() => (runtime.pageProps.flash as { error?: string } | undefined)?.error);
const transmissionLabel = computed(() => ({
  LOCAL_SAVED: 'Tersimpan di perangkat',
  PENDING_SYNC: 'Menunggu sinkronisasi',
  SYNCING: 'Menunggu sinkronisasi',
  SYNC_FAILED: 'Sinkronisasi belum berhasil',
  SYNCED: 'Diterima server',
})[props.localEmergency?.sync_state ?? 'LOCAL_SAVED']);
const clinicalLabel = computed(() => props.localEmergency ? 'T0-Suspect (menunggu validasi Healthcare)'
  : emergency.value.status === 'CONFIRMED' ? 'T0 dikonfirmasi Healthcare'
  : emergency.value.status === 'DOWNGRADED' ? 'Klasifikasi diturunkan Healthcare'
  : 'T0-Suspect (menunggu validasi Healthcare)');
const healthcareResponse = computed(() => props.localEmergency ? 'Belum ada konfirmasi Healthcare' : ({
  PENDING: 'Belum diakui Healthcare',
  ACKNOWLEDGED: 'Diakui Healthcare',
  REVIEWING: 'Sedang ditinjau Healthcare',
  CONFIRMED: 'Dikonfirmasi Healthcare',
  DOWNGRADED: 'Klasifikasi diperbarui Healthcare',
  RESOLVED: 'Insiden selesai',
})[emergency.value.status as string] ?? 'Lihat pembaruan Healthcare');

function formatRedFlag(rf?: string) {
  switch (rf) {
    case 'SUICIDAL_IDEATION':
      return 'Ideasi / Perilaku Bunuh Diri (SRQ Q17)';
    case 'PSYCHOSIS':
      return 'Gejala Psikosis Akut / Disosiasi Berat';
    case 'SEVERE_AGITATION':
      return 'Agitasi Parah / Perilaku Amuk';
    default:
      return 'Kegawatdaruratan Medis & Somatik';
  }
}

const smsHref = computed(() => {
  const patient = emergency.value.patient?.name || 'Tanpa Nama';
  const posko = emergency.value.shelter?.name || 'Tidak tercatat';
  const text = encodeURIComponent(
    `[SOS RAPID-MIND T0] ${emergency.value.red_flag_type}. Pasien: ${patient}. Posko: ${posko}. Butuh evakuasi segera PSC 119.`
  );
  return `sms:119?body=${text}`;
});
</script>
