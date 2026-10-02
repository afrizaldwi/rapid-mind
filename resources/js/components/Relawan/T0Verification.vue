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
            <div v-if="selectedPatientName" class="font-bold text-slate-800 text-base">
              {{ selectedPatientName }}
            </div>
            <div v-else class="text-sm font-semibold text-slate-700">
              Penyintas Tanpa Nama / Situasi Darurat Lapangan
            </div>
            <select v-if="!assessmentId" v-model="chosenPatientId" class="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm">
              <option value="">Penyintas belum diketahui</option>
              <option v-for="patient in selectablePatients" :key="patient.id" :value="patient.id">{{ patient.name }}</option>
            </select>
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
              @click="selectRedFlag(rf.type)"
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
              <span v-if="coordinates">Koordinat GPS tersedia</span>
              <span v-else>GPS belum tersedia; T0 tetap dapat disimpan</span>
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

      <div v-if="submissionError" role="alert" class="mx-4 mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
        {{ submissionError }}
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
          <span v-if="isSubmitting">Menyimpan T0-Suspect…</span>
          <span v-else>KIRIM T0-SUSPECT</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { patientRepository } from '@/offline/patientRepository';
import type { LocalPatient } from '@/offline/db';
import { relawanOwner } from '@/offline/assessmentWorkflow';
import { useRelawanRuntime } from '@/relawan/runtime';
import { createLocalEmergency } from '@/offline/emergencyWorkflow';
import { syncManager } from '@/offline/syncManager';

const props = defineProps<{
  show: boolean;
  patientId?: string;
  patientName?: string;
  assessmentId?: string;
  suggestedRedFlag?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const owner = relawanOwner();
const runtime = useRelawanRuntime();
const chosenPatientId = ref('');
const availablePatients = ref<LocalPatient[]>([]);
const serverPatients = computed(() => (runtime.pageProps.patients as Array<{ id: string; name: string; nik?: string; age?: number; gender?: string; shelter_id?: number }> | undefined) ?? []);
const selectablePatients = computed(() => {
  const byId = new Map(availablePatients.value.map(patient => [patient.id, patient]));
  for (const patient of serverPatients.value) if (!byId.has(patient.id)) byId.set(patient.id, { ...patient, owner_user_id: owner, sync_state: 'SYNCED' });
  return [...byId.values()];
});
const selectedPatientName = computed(() => selectablePatients.value.find(patient => patient.id === chosenPatientId.value)?.name || (chosenPatientId.value === props.patientId ? props.patientName : undefined));
const selectedRedFlag = ref('');
const notes = ref('');
const isSubmitting = ref(false);
const submissionError = ref('');
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

watch(() => props.show, (show) => {
  if (!show) return;
  selectedRedFlag.value = props.suggestedRedFlag === 'SUICIDAL_IDEATION' ? props.suggestedRedFlag : '';
  notes.value = '';
  chosenPatientId.value = props.patientId ?? '';
  void patientRepository.list(owner).then(patients => { if (props.show) availablePatients.value = patients; }).catch(() => { availablePatients.value = []; });
  coordinates.value = null;
  submissionError.value = '';
  acquireGps();
});

function selectRedFlag(type: string) {
  selectedRedFlag.value = type;
  submissionError.value = '';
}

async function submitEmergency() {
  if (isSubmitting.value || !selectedRedFlag.value) return;
  submissionError.value = '';
  isSubmitting.value = true;
  let id: string;
  try {
    if (chosenPatientId.value && !await patientRepository.get(owner, chosenPatientId.value)) {
      const serverPatient = serverPatients.value.find(patient => patient.id === chosenPatientId.value);
      if (serverPatient) await patientRepository.saveServerSnapshot(owner, serverPatient);
    }
    id = await createLocalEmergency(owner, {
      patientId: chosenPatientId.value || null,
      assessmentId: props.assessmentId,
      redFlagType: selectedRedFlag.value,
      shelterId: runtime.shelterId,
      notes: notes.value,
      latitude: coordinates.value?.lat ?? null,
      longitude: coordinates.value?.lng ?? null,
    });
  } catch (error) {
    submissionError.value = `T0 BELUM TERSIMPAN. ${error instanceof Error ? error.message : 'Coba simpan kembali.'}`;
    isSubmitting.value = false;
    return;
  }
  isSubmitting.value = false;
  window.dispatchEvent(new CustomEvent('rapid-mind:emergency-created', { detail: { owner, id } }));
  emit('close');
  await nextTick();
  if (runtime.mode === 'ONLINE_SERVER') void syncManager.sync(owner);
}
</script>
