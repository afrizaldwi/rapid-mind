<template>
  <RelawanLayout>
    <div class="space-y-6">
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
          Hari 4–30 Pascabencana
        </span>
        <h2 class="text-xl font-extrabold text-slate-900 mt-1">
          Penapisan Terstruktur
        </h2>
        <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">
          Kuesioner SRQ-20, evaluasi faktor risiko trauma, dan tingkat keberfungsian harian penyintas.
        </p>
      </div>

      <!-- In Progress / Resume Cards -->
      <div v-if="inProgressAssessments && inProgressAssessments.length > 0" class="space-y-3">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Asesmen Belum Selesai ({{ inProgressAssessments.length }})
        </h3>
        <div class="space-y-2">
          <div
            v-for="a in inProgressAssessments"
            :key="a.id"
            class="bg-amber-50/70 border border-amber-300/80 p-4 rounded-xl flex items-center justify-between shadow-xs"
          >
            <div>
              <h4 class="font-bold text-sm text-slate-900">
                {{ a.patient?.name || 'Penyintas' }}
              </h4>
              <p class="text-xs text-slate-500">
                NIK: {{ a.patient?.nik || 'Tanpa NIK' }} • Mode: {{ a.mode }}
              </p>
            </div>
            <RelawanLink
              :href="a.resume_url"
              class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              {{ a.resume_label }} →
            </RelawanLink>
          </div>
        </div>
      </div>

      <!-- Start New Assessment Form -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div class="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <span class="text-xl">👤</span>
          <h3 class="font-extrabold text-slate-900 text-base">
            Mulai Asesmen Baru
          </h3>
        </div>

        <form @submit.prevent="startNew" class="space-y-4">
          <p v-if="localError" role="alert" class="text-xs font-semibold text-red-800">{{ localError }}</p>
          <!-- Existing Patient Selector -->
          <div v-if="patients && patients.length > 0">
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Pilih dari Pasien Terdata di Posko:
            </label>
            <select
              v-model="form.patient_id"
              class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option :value="''">-- Buat Profil Pasien Baru --</option>
              <option v-for="p in patients" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.nik || 'Tanpa NIK' }})
              </option>
            </select>
          </div>

          <!-- New Patient Input fields (if no existing patient selected) -->
          <div v-if="!form.patient_id" class="space-y-3 pt-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap / Panggilan *
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="Contoh: Ibu Siti Aminah"
                class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">
                NIK (Nomor Induk Kependudukan)
              </label>
              <input
                v-model="form.nik"
                type="text"
                maxlength="16"
                placeholder="16 digit angka NIK (opsional jika hilang)"
                class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Usia (Tahun)
                </label>
                <input
                  v-model.number="form.age"
                  type="number"
                  min="0"
                  max="120"
                  placeholder="Contoh: 35"
                  class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Kelamin
                </label>
                <select
                  v-model="form.gender"
                  class="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
                >
                  <option value="Perempuan">Perempuan</option>
                  <option value="Laki-laki">Laki-laki</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Mode Selection -->
          <div class="pt-2">
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              Pilihan Mode Wawancara:
            </label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="form.mode = 'VERBAL'"
                class="p-3.5 rounded-xl border text-left transition flex flex-col justify-between"
                :class="form.mode === 'VERBAL' ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-500/20' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
              >
                <span class="text-sm">🗣️ Mode Verbal</span>
                <span class="text-[11px] font-normal text-slate-500 mt-1">Interaksi dialogis + Bantuan Voice/STT</span>
              </button>
              <button
                type="button"
                @click="form.mode = 'NON_VERBAL'"
                class="p-3.5 rounded-xl border text-left transition flex flex-col justify-between"
                :class="form.mode === 'NON_VERBAL' ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-500/20' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
              >
                <span class="text-sm">🤝 Mode Adaptif</span>
                <span class="text-[11px] font-normal text-slate-500 mt-1">Isyarat visual untuk mutisme/syok</span>
              </button>
            </div>
          </div>

          <div class="pt-4">
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-60"
            >
              <span v-if="loading">Menyiapkan Asesmen…</span>
              <span v-else>Mulai Asesmen →</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { assessmentRepository } from '@/offline/assessmentRepository';
import { patientRepository } from '@/offline/patientRepository';
import { loadAssessmentContext, relawanOwner, resumeStage, startLocalAssessment } from '@/offline/assessmentWorkflow';
import type { LocalPatient } from '@/offline/db';
import type { ServerAssessment } from '@/offline/assessmentWorkflow';

const props = defineProps<{
  inProgressAssessments?: ServerAssessment[];
  patients?: Array<{ id: string; name: string; nik?: string; age?: number; gender?: string; shelter_id?: number; created_by?: number }>;
}>();
const runtime = useRelawanRuntime();
const owner = relawanOwner();
const shelterId = runtime.shelterId;
const localError = ref('');
const drafts = ref<Array<{ id: string; patient: { name: string; nik?: string }; mode: string; resume_url: string; resume_label: string }>>([]);
const inProgressAssessments = computed(() => drafts.value);
const localPatients = ref<LocalPatient[]>([]);
const patients = computed(() => {
  const byId = new Map(localPatients.value.map(patient => [patient.id, patient]));
  for (const patient of props.patients ?? []) if (!byId.has(patient.id)) byId.set(patient.id, { ...patient, owner_user_id: owner, sync_state: 'SYNCED' });
  return [...byId.values()];
});
const labels: Record<string, string> = { srq: 'Lanjutkan SRQ-20', risk: 'Lanjutkan Faktor Risiko', function: 'Lanjutkan Fungsi Harian', review: 'Tinjau Asesmen' };

async function refreshDrafts() {
  for (const server of props.inProgressAssessments ?? []) {
    try { await loadAssessmentContext(owner, server, server.patient); }
    catch { localError.value = 'Sebagian asesmen server belum dapat disalin ke perangkat ini.'; }
  }
  localPatients.value = await patientRepository.list(owner);
  const rows = await assessmentRepository.list(owner);
  drafts.value = (await Promise.all(rows.filter(a => a.status === 'IN_PROGRESS').map(async a => {
    const patient = await patientRepository.get(owner, a.patient_id);
    const stage = resumeStage(a);
    return { id: a.id, patient: { name: patient?.name ?? 'Penyintas', nik: patient?.nik }, mode: a.mode, resume_url: `/relawan/assessment/${a.id}/${stage}`, resume_label: labels[stage] };
  }))).sort((a, b) => a.id.localeCompare(b.id));
}
onMounted(() => { void refreshDrafts().catch(() => { localError.value = 'Daftar asesmen lokal belum dapat dibaca.'; }); });

const loading = ref(false);
const form = ref({
  patient_id: '',
  name: '',
  nik: '',
  age: undefined as number | undefined,
  gender: 'Perempuan',
  mode: 'VERBAL',
});

async function startNew() {
  if (loading.value) return;
  loading.value = true;
  localError.value = '';
  try {
    const selected = patients.value.find(p => p.id === form.value.patient_id);
    const patient = selected
      ? { id: selected.id, name: selected.name, nik: selected.nik, age: selected.age, gender: selected.gender, shelter_id: selected.shelter_id, serverKnown: selected.sync_state === 'SYNCED' }
      : { name: form.value.name.trim(), nik: form.value.nik || undefined, age: form.value.age, gender: form.value.gender, shelter_id: shelterId ?? undefined };
    if (!patient.name) throw new Error('Nama penyintas harus diisi.');
    const id = await startLocalAssessment(owner, patient, form.value.mode as 'VERBAL' | 'NON_VERBAL');
    runtime.navigate(`/relawan/assessment/${id}/identity`);
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Asesmen belum tersimpan pada perangkat ini.';
  } finally {
    loading.value = false;
  }
}
</script>
