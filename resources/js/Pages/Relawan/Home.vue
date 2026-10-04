<template>
  <RelawanLayout>
    <div class="space-y-6">
      <!-- Greeting & Posko Context -->
      <div class="bg-white rounded-xl p-5 shadow-xs border border-slate-200">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Relawan Pendamping Lapangan
            </p>
            <h2 class="text-xl font-bold text-slate-900 mt-0.5">
              {{ userName }}
            </h2>
          </div>
        </div>
        <div class="mt-3 inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <MapPin class="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ shelter?.name || userShelterName || 'Posko belum ditetapkan' }}</span>
        </div>
      </div>

      <p v-if="runtime.mode === 'OFFLINE_FIELD_MODE'" class="rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-900">Mode lapangan offline · data tersedia dari perangkat ini</p>
      <p v-if="local.error.value" role="alert" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{{ local.error.value }}</p>
      <!-- Active Emergency Banner if any -->
      <div
        v-if="displayEmergency"
        class="bg-red-50 border-2 border-red-500 rounded-xl p-5 text-red-950 shadow-md space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Siren class="h-5 w-5" aria-hidden="true" />
            <span class="text-xs font-bold uppercase tracking-wider text-red-800">
              Sinyal Darurat T0 Aktif
            </span>
          </div>
          <span class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700"><span class="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>{{ runtime.mode === 'OFFLINE_FIELD_MODE' ? 'T0-Suspect' : displayEmergency?.status }}</span>
        </div>
        <div>
          <h3 class="font-bold text-base">
            {{ displayEmergency?.patient?.name || 'Penyintas Tanpa Nama' }}
          </h3>
          <p class="text-xs text-red-800 mt-1">
            {{ displayEmergency?.notes || (runtime.mode === 'OFFLINE_FIELD_MODE' ? 'Tersimpan di perangkat; menunggu sinkronisasi.' : 'Lihat status penerimaan server dan respons Healthcare secara terpisah.') }}
          </p>
        </div>
        <RelawanLink
          :href="`/relawan/emergencies/${displayEmergency?.id}`"
          class="block text-center py-2.5 px-4 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          Lihat Status T0 →
        </RelawanLink>
      </div>

      <!-- Resume Incomplete Draft Banner -->
      <div
        v-if="displayDraft"
        class="bg-amber-50 border border-amber-300 rounded-xl p-5 shadow-xs space-y-3"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-800 uppercase tracking-wider">
            Lanjutkan Asesmen
          </span>
          <span class="text-xs text-amber-700 font-medium">Sedang Dikerjakan</span>
        </div>
        <div>
          <h3 class="font-bold text-slate-900 text-base">
            {{ displayDraft?.name || 'Penyintas' }}
          </h3>
          <p class="text-xs text-slate-600 mt-0.5">
            {{ displayDraft?.local ? 'Tahap berikutnya mengikuti jawaban yang tersimpan di perangkat.' : local.ready.value ? 'Asesmen ini tersedia di server; buka saat online untuk menyalinnya ke perangkat.' : 'Asesmen tersedia di server. Status di perangkat belum dapat dipastikan.' }}
          </p>
        </div>
        <RelawanLink
          :href="displayDraft?.resumeUrl || '/relawan/assessment'"
          class="inline-flex items-center justify-center w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-xs transition"
        >
          {{ displayDraft?.resumeLabel }} →
        </RelawanLink>
      </div>

      <!-- Main Interaction Paths: PFA vs Structured Screening -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Pilihan Modul Operasional
        </h3>

        <!-- PFA Guidebook Card (Hari 1-3) -->
        <RelawanLink
          href="/relawan/pfa"
          class="block bg-white hover:bg-teal-50/40 p-5 rounded-xl border border-slate-200 shadow-xs transition hover:border-teal-300 group"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                Fase Akut · Hari 1–3
              </span>
              <h4 class="text-lg font-bold text-slate-900 group-hover:text-teal-800 transition">
                Buku Saku Digital PFA
              </h4>
              <p class="text-xs text-slate-600 max-w-xs leading-relaxed">
                Panduan humanis Look, Listen, Link tanpa beban input formulir, dan teknik relaksasi 5-4-3-2-1.
              </p>
            </div>
            <BookOpen class="h-8 w-8 text-teal-600 group-hover:scale-110 transition" aria-hidden="true" />
          </div>
        </RelawanLink>

        <!-- Structured SRQ-20 Screening Card (Hari 4-30) -->
        <RelawanLink
          href="/relawan/assessment"
          class="block bg-white hover:bg-teal-50/40 p-5 rounded-xl border border-slate-200 shadow-xs transition hover:border-teal-300 group"
        >
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
                Fase Lanjutan · Hari 4–30
              </span>
              <h4 class="text-lg font-bold text-slate-900 group-hover:text-teal-800 transition">
                Penapisan Terstruktur SRQ-20
              </h4>
              <p class="text-xs text-slate-600 max-w-xs leading-relaxed">
                Wawancara psikologis terstandarisasi, checklist faktor risiko, keberfungsian harian, dan rekomendasi triase sistem.
              </p>
            </div>
            <ClipboardList class="h-8 w-8 text-teal-600 group-hover:scale-110 transition" aria-hidden="true" />
          </div>
        </RelawanLink>
      </div>

      <!-- Quick Guidance -->
      <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5">
        <p class="font-bold text-slate-800 inline-flex items-center gap-1.5">
          <Info class="h-3.5 w-3.5" aria-hidden="true" />
          <span>Catatan Etik Garda Depan:</span>
        </p>
        <p>
          Prioritaskan keselamatan fisik dan kenyamanan emosional penyintas. Jika menemukan indikasi ideasi bunuh diri atau amuk, gunakan tombol <strong>T0 DARURAT</strong> di pojok kanan bawah.
        </p>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BookOpen, ClipboardList, Info, MapPin, Siren } from 'lucide-vue-next';
import RelawanLink from '@/relawan/RelawanLink.vue';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { useRelawanRuntime } from '@/relawan/runtime';
import { useOwnedLocalRecords } from '@/composables/useRelawanDataWorkspace';
import { resumeStage } from '@/offline/assessmentWorkflow';

const props = defineProps<{
  activeDraft?: { id: string; user_id?: number; patient?: { name?: string }; resume_url?: string; resume_label?: string } | null;
  recentAssessments?: unknown[];
  activeEmergency?: { id: string; user_id?: number; status: string; notes?: string | null; patient?: { name?: string } } | null;
  shelter?: { name?: string } | null;
}>();
const runtime = useRelawanRuntime();
const userName = computed(() => runtime.name);
const userShelterName = computed(() => runtime.shelterName);
const owner = computed(() => runtime.owner);
const local = useOwnedLocalRecords(owner);
const displayEmergency = computed(() => {
  if (runtime.mode === 'OFFLINE_FIELD_MODE') {
    const item = local.records.value.emergencies.filter(e => e.sync_state !== 'SYNCED')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return item ? { ...item, patient: { name: item.patient_name } } : null;
  }
  return props.activeEmergency?.user_id === owner.value ? props.activeEmergency : null;
});
const stageLabels: Record<string, string> = {
  srq: 'Lanjutkan SRQ-20', risk: 'Lanjutkan Faktor Risiko',
  function: 'Lanjutkan Fungsi Harian', review: 'Tinjau Asesmen',
};
const displayDraft = computed(() => {
  const drafts = local.records.value.assessments.filter(item => item.status === 'IN_PROGRESS')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const latest = drafts[0];
  if (latest) {
    const patient = local.records.value.patients.find(item => item.id === latest.patient_id);
    const stage = resumeStage(latest);
    return {
      name: patient?.name || 'Penyintas', local: true,
      resumeUrl: `/relawan/assessment/${latest.id}/${stage}`,
      resumeLabel: stageLabels[stage],
    };
  }
  const server = props.activeDraft?.user_id === owner.value ? props.activeDraft : null;
  return server ? {
    name: server.patient?.name || 'Penyintas', local: false,
    resumeUrl: server.resume_url || `/relawan/assessment/${server.id}/srq`,
    resumeLabel: server.resume_label || 'Lanjutkan',
  } : null;
});
</script>
