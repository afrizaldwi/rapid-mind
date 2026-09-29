<template>
  <RelawanLayout>
    <div class="space-y-6 pb-20">
      <!-- Incident Header Banner -->
      <div class="bg-red-800 text-white rounded-3xl p-6 shadow-xl border border-red-700 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🚨</span>
            <span class="text-xs font-black uppercase tracking-wider bg-red-900/80 px-2.5 py-1 rounded-md">
              Insiden T0 Darurat Aktif
            </span>
          </div>
          <Badge variant="t0">{{ emergency.status }}</Badge>
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
            T0-Suspect (Menunggu Validasi Dokter)
          </span>
        </div>

        <!-- Axis 2: Transmisi Server -->
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span class="text-slate-600 font-semibold">2. Transmisi Sistem:</span>
          <span class="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            ✓ Diterima Server Pusat
          </span>
        </div>

        <!-- Axis 3: Respons Faskes -->
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span class="text-slate-600 font-semibold">3. Respons Faskes:</span>
          <span
            class="font-bold px-2 py-0.5 rounded-md border"
            :class="emergency.status === 'PENDING' ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-teal-800 bg-teal-50 border-teal-200'"
          >
            {{ emergency.status === 'PENDING' ? 'Belum Diakui Nakes' : 'Sudah Diakui / Ditangani Nakes' }}
          </span>
        </div>
      </div>

      <!-- Safety Protocol Guidelines -->
      <div class="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-xs text-amber-950 space-y-2">
        <div class="flex items-center space-x-2 font-bold text-amber-900 text-sm">
          <span>🛡️</span>
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
          <strong>Posko:</strong> {{ emergency.shelter?.name || 'Posko Candi, Sleman' }}
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
          <span>📱</span>
          <span>Buka SMS Cadangan (Jika Sinyal Data Terputus)</span>
        </a>
        <p class="text-[11px] text-slate-500 text-center">
          Format SMS SOS otomatis terisi untuk dikirimkan langsung ke nomor pos komando darurat.
        </p>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import Badge from '@/components/ui/Badge.vue';

const props = defineProps<{
  emergency: any;
}>();

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
  const patient = props.emergency.patient?.name || 'Tanpa Nama';
  const posko = props.emergency.shelter?.name || 'Posko Candi';
  const text = encodeURIComponent(
    `[SOS RAPID-MIND T0] ${props.emergency.red_flag_type}. Pasien: ${patient}. Posko: ${posko}. Butuh evakuasi segera PSC 119.`
  );
  return `sms:119?body=${text}`;
});
</script>
