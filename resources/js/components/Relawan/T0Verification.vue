<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
    <div class="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-red-200 overflow-hidden flex flex-col max-h-[92vh]">
      <!-- Header -->
      <div class="bg-red-800 text-white px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <span class="text-2xl leading-none">🚨</span>
          <div>
            <h2 class="text-lg font-extrabold tracking-wide uppercase">
              Verifikasi T0 Darurat
            </h2>
            <p class="text-xs text-red-200">
              Sinyal Prioritas Tinggi ke PSC 119 & Tim Medis Faskes
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="$emit('close')"
          class="text-red-200 hover:text-white p-1 rounded-lg"
        >
          ✕
        </button>
      </div>

      <!-- Scrollable Form Body -->
      <div class="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
        <!-- Gate 1: Penyintas -->
        <div class="space-y-3">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            1. Identitas Penyintas
          </label>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div v-if="patientName" class="font-bold text-slate-800 text-base">
              {{ patientName }}
            </div>
            <div v-else class="text-sm font-semibold text-slate-700">
              Penyintas Tanpa Nama / Situasi Darurat Lapangan
            </div>
            <p class="text-xs text-slate-500">
              Jangan tinggalkan penyintas sendirian untuk mencari identitas. Bantuan darurat tetap dapat dikirimkan.
            </p>
          </div>
        </div>

        <!-- Gate 2: Alasan Red Flag -->
        <div class="space-y-3">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            2. Indikator Red Flag Utama *
          </label>
          <div class="grid grid-cols-1 gap-2.5">
            <button
              v-for="rf in redFlagOptions"
              :key="rf.type"
              type="button"
              @click="selectedRedFlag = rf.type"
              class="text-left p-3.5 rounded-xl border text-sm font-medium transition"
              :class="selectedRedFlag === rf.type ? 'border-red-600 bg-red-50 text-red-950 font-bold ring-2 ring-red-500/20' : 'border-slate-200 hover:border-slate-300 text-slate-700'"
            >
              <div class="flex items-center justify-between">
                <span>{{ rf.title }}</span>
                <span v-if="selectedRedFlag === rf.type" class="text-red-700 font-bold text-base">✓</span>
              </div>
              <p class="text-xs text-slate-500 mt-1 font-normal">
                {{ rf.desc }}
              </p>
            </button>
          </div>
        </div>

        <!-- Gate 3: Catatan & Lokasi -->
        <div class="space-y-3">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            3. Catatan Lapangan & Lokasi Penjemputan
          </label>
          <textarea
            v-model="notes"
            rows="2"
            placeholder="Tuliskan tanda bahaya fisik, lokasi tenda spesifik, atau kondisi penyintas saat ini..."
            class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          ></textarea>

          <div class="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div class="flex items-center space-x-2">
              <span>📍</span>
              <span v-if="coordinates">Koordinat GPS Terkunci</span>
              <span v-else>Menggunakan Lokasi Posko Lapangan</span>
            </div>
            <button
              type="button"
              @click="acquireGps"
              class="font-semibold text-teal-700 hover:text-teal-900"
            >
              {{ coordinates ? 'Perbarui GPS' : 'Cari GPS' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          @click="$emit('close')"
          class="sm:flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition"
        >
          Batalkan
        </button>
        <button
          type="button"
          :disabled="!selectedRedFlag || isSubmitting"
          @click="submitEmergency"
          class="sm:flex-2 py-3.5 px-6 rounded-xl bg-red-800 hover:bg-red-900 text-white font-extrabold text-sm tracking-wide shadow-md transition disabled:opacity-50"
        >
          <span v-if="isSubmitting">Mengirim Sinyal SOS…</span>
          <span v-else>KIRIM SINYAL T0 DARURAT</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';

const props = defineProps<{
  show: boolean;
  patientId?: string;
  patientName?: string;
  assessmentId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const selectedRedFlag = ref('SUICIDAL_IDEATION');
const notes = ref('');
const isSubmitting = ref(false);
const coordinates = ref<{ lat: number; lng: number } | null>(null);

const redFlagOptions = [
  {
    type: 'SUICIDAL_IDEATION',
    title: 'Ideasi / Perilaku Bunuh Diri',
    desc: 'Ungkapan ingin mengakhiri hidup (SRQ #17) atau tindakan melukai diri aktif.',
  },
  {
    type: 'PSYCHOSIS',
    title: 'Gejala Psikosis Akut / Disosiasi Berat',
    desc: 'Halusinasi, delusi paranoid, mutisme total/katatonia pascabencana.',
  },
  {
    type: 'SEVERE_AGITATION',
    title: 'Amuk / Agitasi Fisik Parah',
    desc: 'Perilaku merusak, membahayakan keselamatan diri dan orang lain di posko.',
  },
  {
    type: 'MEDICAL_CRISIS',
    title: 'Kegawatdaruratan Medis & Somatik',
    desc: 'Pingsan berulang, hiperventilasi parah, atau nyeri dada psikosomatik krisis.',
  },
];

function acquireGps() {
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordinates.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      },
      () => {
        // Fallback silently if GPS denied or offline
      },
      { timeout: 5000 }
    );
  }
}

onMounted(() => {
  acquireGps();
});

function submitEmergency() {
  isSubmitting.value = true;

  router.post(
    '/relawan/emergencies',
    {
      patient_id: props.patientId || null,
      assessment_id: props.assessmentId || null,
      red_flag_type: selectedRedFlag.value,
      notes: notes.value,
      latitude: coordinates.value?.lat || null,
      longitude: coordinates.value?.lng || null,
    },
    {
      onFinish: () => {
        isSubmitting.value = false;
        emit('close');
      },
    }
  );
}
</script>
