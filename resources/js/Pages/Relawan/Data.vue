<template>
  <RelawanLayout>
    <div class="space-y-6 pb-20">
      <header class="rounded-2xl border border-slate-200 bg-white p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900">Data Lapangan</h2>
            <p class="mt-1 text-xs text-slate-600">Pekerjaan di perangkat dan data yang telah diterima server.</p>
          </div>
          <button type="button" :disabled="busy || !online" @click="triggerSync"
            class="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-800 disabled:opacity-50">
            {{ busy ? 'Menyinkronkan…' : 'Coba Sinkronkan' }}
          </button>
        </div>
      </header>

      <p v-if="workspace.error.value" role="alert" class="rounded-xl border border-slate-700 bg-slate-100 p-3 text-sm font-semibold text-slate-900">{{ workspace.error.value }}</p>
      <p v-if="actionError" role="alert" class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{{ actionError }}</p>

      <section class="space-y-3">
        <h3 class="text-sm font-extrabold text-slate-800">Sedang Dikerjakan / Belum Selesai ({{ workspace.groups.value.inProgress.length }})</h3>
        <div v-if="workspace.groups.value.inProgress.length === 0" class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Belum ada asesmen yang sedang dikerjakan.</div>
        <article v-for="item in workspace.groups.value.inProgress" :key="item.key" class="rounded-xl border border-amber-200 bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h4 class="font-bold text-slate-900">{{ item.patientName }}</h4>
              <p class="mt-1 text-xs text-slate-600">{{ item.label }} • {{ formatDate(item.date) }}</p>
              <p v-if="item.source === 'server'" class="mt-1 text-xs text-amber-800">{{ workspace.ready.value ? 'Buka saat online untuk menyalin pekerjaan ini ke perangkat.' : 'Status penyimpanan perangkat belum dapat diperiksa.' }}</p>
            </div>
            <span class="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">Asesmen</span>
          </div>
          <Link v-if="item.resumeUrl" :href="item.resumeUrl" class="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white">{{ item.status || 'Lanjutkan' }} →</Link>
        </article>
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-extrabold text-slate-800">Menunggu Sinkronisasi ({{ workspace.groups.value.pending.length }})</h3>
        <div v-if="workspace.groups.value.pending.length === 0" class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Belum ada data menunggu sinkronisasi.</div>
        <article v-for="item in workspace.groups.value.pending" :key="item.key"
          class="rounded-xl border bg-white p-4" :class="item.type === 'EMERGENCY' ? 'border-red-300' : 'border-amber-200'">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h4 class="font-bold text-slate-900">{{ item.patientName }}</h4>
              <p class="mt-1 text-xs font-semibold" :class="item.type === 'EMERGENCY' ? 'text-red-800' : 'text-amber-800'">{{ item.type === 'EMERGENCY' ? 'T0-Suspect' : 'Asesmen selesai' }} • {{ item.label }}</p>
              <p class="mt-1 text-xs text-slate-600">{{ formatDate(item.date) }} • Tersimpan di perangkat</p>
            </div>
            <span v-if="item.type === 'EMERGENCY'" class="shrink-0 rounded-full bg-red-800 px-2 py-1 text-xs font-bold text-white">Prioritas T0</span>
          </div>
          <details v-if="item.type === 'EMERGENCY'" class="mt-3 text-xs text-slate-700">
            <summary class="cursor-pointer font-bold">Lihat rincian T0</summary>
            <p class="mt-2">Indikator: {{ redFlagLabel(item.redFlagType) }}</p>
            <p v-if="item.notes" class="mt-1">Catatan: {{ item.notes }}</p>
            <p class="mt-2 font-semibold">Belum ada konfirmasi penerimaan server pada perangkat ini. Tetap dampingi penyintas dan gunakan jalur bantuan darurat yang tersedia.</p>
          </details>
          <div class="mt-3 flex flex-wrap gap-2">
            <Link v-if="item.resultUrl" :href="item.resultUrl" class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Lihat hasil</Link>
            <button v-if="item.unqueued" type="button" :disabled="busy" @click="prepareAssessment(item.id)"
              class="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Siapkan sinkronisasi</button>
            <button v-else-if="item.retryable" type="button" :disabled="busy || !online" @click="triggerSync"
              class="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Coba sinkronkan kembali</button>
            <p v-else class="text-xs text-amber-900">Data perlu diperiksa sebelum percobaan berikutnya.</p>
          </div>
        </article>
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-extrabold text-slate-800">Tersinkron ({{ workspace.groups.value.synchronized.length }})</h3>
        <div v-if="workspace.groups.value.synchronized.length === 0" class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Belum ada riwayat yang tersinkron.</div>
        <article v-for="item in workspace.groups.value.synchronized" :key="item.key" class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h4 class="font-bold text-slate-900">{{ item.patientName }}</h4>
              <p class="mt-1 text-xs text-slate-600">{{ item.type === 'EMERGENCY' ? 'T0-Suspect' : 'Asesmen' }} • {{ item.label }} • {{ formatDate(item.date) }}</p>
            </div>
            <Badge v-if="item.type === 'ASSESSMENT' && item.triage" :variant="badgeVariant(item.triage.system_recommendation)">{{ item.triage.system_recommendation }}</Badge>
          </div>
          <p v-if="item.type === 'ASSESSMENT'" class="mt-2 text-xs text-slate-600">
            Rekomendasi Sistem: {{ item.triage?.system_recommendation || 'Belum tersedia' }} •
            Total Skor: {{ item.triage ? item.triage.total_score + '/37' : 'Belum tersedia' }}
          </p>
          <p v-if="item.type === 'EMERGENCY'" class="mt-2 text-xs text-slate-600">Respons Healthcare: {{ healthcareLabel(item.status) }}</p>
          <Link v-if="item.resultUrl || item.emergencyUrl" :href="(item.resultUrl || item.emergencyUrl)!" class="mt-3 inline-block rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Lihat detail →</Link>
        </article>
      </section>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Link, router, usePage } from '@inertiajs/vue3';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import Badge from '@/components/ui/Badge.vue';
import { useRelawanDataWorkspace, type ServerDataAssessment, type ServerDataEmergency } from '@/composables/useRelawanDataWorkspace';
import { completeLocalAssessment } from '@/offline/assessmentWorkflow';
import { syncManager } from '@/offline/syncManager';

const props = defineProps<{
  inProgress?: ServerDataAssessment[];
  completed?: ServerDataAssessment[];
  emergencies?: ServerDataEmergency[];
}>();
const page = usePage();
const owner = computed(() => {
  const user = (page.props.auth as { user?: { id?: number; role?: string } })?.user;
  return user?.role === 'RELAWAN' ? Number(user.id) || null : null;
});
const workspace = useRelawanDataWorkspace(
  owner,
  computed(() => props.inProgress ?? []),
  computed(() => props.completed ?? []),
  computed(() => props.emergencies ?? []),
);
const busy = ref(false);
const actionError = ref('');
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const onOnline = () => { online.value = true; };
const onOffline = () => { online.value = false; };
onMounted(() => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
});
onUnmounted(() => {
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
});

async function triggerSync() {
  if (!owner.value || busy.value || !online.value) return;
  busy.value = true;
  actionError.value = '';
  const active = owner.value;
  try {
    await syncManager.sync(active);
    if (owner.value === active) router.reload({ only: ['inProgress', 'completed', 'emergencies'] });
  } catch {
    actionError.value = 'Sinkronisasi belum berhasil. Data yang tersimpan di perangkat tetap tersedia.';
  } finally {
    busy.value = false;
  }
}
async function prepareAssessment(id: string) {
  if (!owner.value || busy.value) return;
  busy.value = true;
  actionError.value = '';
  try {
    await completeLocalAssessment(owner.value, id);
  } catch {
    actionError.value = 'Asesmen belum dapat disiapkan untuk sinkronisasi. Periksa data pada perangkat ini.';
  } finally {
    busy.value = false;
  }
}
function badgeVariant(category: string) {
  if (category === 'T0_SUSPECT' || category === 'T0_CONFIRMED') return 't0';
  if (category === 'T1') return 't1';
  if (category === 'T2') return 't2';
  return 't3';
}
function formatDate(value?: string) {
  if (!value) return 'Waktu tidak tersedia';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Waktu tidak tersedia' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
function healthcareLabel(status?: string) {
  return ({
    PENDING: 'Belum diakui Healthcare',
    ACKNOWLEDGED: 'Diakui Healthcare',
    REVIEWING: 'Sedang ditinjau Healthcare',
    CONFIRMED: 'Dikonfirmasi Healthcare',
    DOWNGRADED: 'Klasifikasi diperbarui Healthcare',
    RESOLVED: 'Insiden selesai',
  } as Record<string, string>)[status ?? ''] ?? 'Pembaruan belum tersedia';
}
function redFlagLabel(value?: string) {
  return ({
    SUICIDAL_IDEATION: 'Ideasi / perilaku bunuh diri',
    PSYCHOSIS: 'Gejala psikosis akut / disosiasi berat',
    SEVERE_AGITATION: 'Agitasi berbahaya',
    MEDICAL_CRISIS: 'Kegawatdaruratan medis',
  } as Record<string, string>)[value ?? ''] ?? 'Indikator Red Flag';
}
</script>
