<template>
  <div v-if="loggedOutLocally || checkingContinuity" class="min-h-screen bg-slate-100 p-6 text-slate-900">
    <div class="mx-auto mt-16 max-w-md rounded-xl bg-white p-6 shadow">
      <h1 class="text-lg font-bold">{{ checkingContinuity ? 'Memeriksa akses perangkat…' : 'Akses lokal dikunci' }}</h1>
      <p v-if="!checkingContinuity" class="mt-3">Data di perangkat tetap tersimpan. Masuk kembali untuk mengaksesnya.</p>
      <p v-if="logoutError" class="mt-3 text-sm text-amber-800">{{ logoutError }}</p>
      <button v-if="!checkingContinuity" type="button" class="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-white" @click="retryServerLogout">Selesaikan keluar</button>
    </div>
  </div>
  <div v-else class="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans selection:bg-teal-500 selection:text-white"
    :class="isFocusedAssessment ? 'pb-0' : 'pb-20'">
    <!-- Top Application Bar -->
    <header class="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
          RM
        </div>
        <div>
          <h1 class="text-sm font-bold tracking-tight text-slate-900 leading-tight">
            RAPID-MIND
          </h1>
          <p class="text-xs text-slate-500 font-medium leading-none">
            {{ user?.shelter?.name || 'Posko Relawan' }}
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <StatusIndicator :kind="status.kind.value" :label="status.label.value" @open="showStatusSheet = true" />
        <button
          type="button"
          @click="logout"
          title="Keluar"
          class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
        >
          <span class="text-sm font-medium">Keluar</span>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6">
      <p v-if="logoutError" role="alert" class="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{{ logoutError }}</p>
      <LocalEmergencyActive v-if="activeLocalId && currentOwner && !isDataRoute" :key="String(currentOwner) + activeLocalId" :owner="currentOwner" :id="activeLocalId" @close="activeLocalId = null" />
      <slot v-else />
    </main>

    <!-- Persistent Floating Red Flag Button -->
    <T0Button :focused="isFocusedAssessment" @trigger="showEmergencyModal = true" />

    <!-- T0 Verification Task Sheet Modal -->
    <T0Verification
      :show="showEmergencyModal"
      :patient-id="t0AssessmentContext?.patientId"
      :patient-name="t0AssessmentContext?.patientName"
      :assessment-id="t0AssessmentContext?.assessmentId"
      @close="showEmergencyModal = false"
    />

    <RelawanStatusDataSheet
      :show="showStatusSheet"
      :kind="status.kind.value"
      :label="status.label.value"
      :ready="status.ready.value"
      :online="status.online.value"
      :pending-count="status.pendingCount.value"
      :failed-count="status.failedCount.value"
      :unfinished-count="status.unfinishedCount.value"
      :unqueued-completed-count="status.unqueuedCompletedCount.value"
      :is-syncing="status.isSyncing.value"
      :can-retry="status.canRetry.value"
      :action-error="status.actionError.value"
      @close="showStatusSheet = false"
      @retry="status.retry"
    />

    <!-- Bottom Navigation Bar (4 items) -->
    <nav v-if="!isFocusedAssessment" class="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-lg max-w-md mx-auto sm:max-w-lg">
      <div class="grid grid-cols-4 h-16">
        <Link
          href="/relawan/home"
          class="flex flex-col items-center justify-center text-xs font-semibold transition"
          :class="isRoute('/relawan/home') ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'"
        >
          <span class="text-lg leading-none mb-1">🏠</span>
          <span>Beranda</span>
        </Link>

        <Link
          href="/relawan/pfa"
          class="flex flex-col items-center justify-center text-xs font-semibold transition"
          :class="isRoute('/relawan/pfa') ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'"
        >
          <span class="text-lg leading-none mb-1">📖</span>
          <span>PFA</span>
        </Link>

        <Link
          href="/relawan/assessment"
          class="flex flex-col items-center justify-center text-xs font-semibold transition"
          :class="isRoute('/relawan/assessment') ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'"
        >
          <span class="text-lg leading-none mb-1">📋</span>
          <span>Asesmen</span>
        </Link>

        <Link
          href="/relawan/data"
          class="flex flex-col items-center justify-center text-xs font-semibold transition relative"
          :class="isRoute('/relawan/data') ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'"
        >
          <span class="text-lg leading-none mb-1">📂</span>
          <span>Data</span>
          <span
            v-if="status.pendingCount.value > 0"
            class="absolute top-2 right-6 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs"
          >
            {{ status.pendingCount.value }}
          </span>
        </Link>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Link, usePage, router } from '@inertiajs/vue3';
import StatusIndicator from '@/components/ui/StatusIndicator.vue';
import T0Button from '@/components/Relawan/T0Button.vue';
import T0Verification from '@/components/Relawan/T0Verification.vue';
import LocalEmergencyActive from '@/components/Relawan/LocalEmergencyActive.vue';
import { emergencyRepository } from '@/offline/emergencyRepository';
import RelawanStatusDataSheet from '@/components/Relawan/RelawanStatusDataSheet.vue';
import { useRelawanOperationalStatus } from '@/composables/useRelawanOperationalStatus';
import { lockRelawanContinuity, recordVerifiedRelawan, resolveRelawanContinuity } from '@/offline/relawanContinuity';
import { registerRelawanServiceWorker } from '@/pwa/register';

const page = usePage();
const user = computed(() => (page.props.auth as any)?.user);
const currentOwner = computed(() => !loggedOutLocally.value && !checkingContinuity.value && user.value?.role === 'RELAWAN' ? Number(user.value.id) || null : null);
const activeLocalId = ref<string | null>(null);
const showStatusSheet = ref(false);
const loggedOutLocally = ref(false);
const checkingContinuity = ref(true);
const logoutError = ref('');
let continuityCheck = 0;
const status = useRelawanOperationalStatus(currentOwner);
const isDataRoute = computed(() => page.url.split('?')[0] === '/relawan/data');
const isFocusedAssessment = computed(() => /^\/relawan\/assessment\/[^/]+(?:\/|$)/.test(page.url.split('?')[0]));

const t0AssessmentContext = computed(() => {
  const route = page.url.split('?')[0].match(/^\/relawan\/assessment\/([^/]+)\/(?:identity|srq|risk|function|review|result)\/?$/);
  const assessment = page.props.assessment as { id?: unknown; patient_id?: unknown; user_id?: unknown } | undefined;
  const patient = page.props.patient as { id?: unknown; name?: unknown } | undefined;

  if (!route || assessment?.user_id !== currentOwner.value || typeof assessment?.id !== 'string' || assessment.id !== route[1]
    || typeof patient?.id !== 'string' || assessment.patient_id !== patient.id) {
    return null;
  }

  return {
    assessmentId: assessment.id,
    patientId: patient.id,
    patientName: typeof patient.name === 'string' ? patient.name : undefined,
  };
});

const showEmergencyModal = ref(false);
function isRoute(path: string) {
  return page.url.startsWith(path);
}

function retryServerLogout() {
  if (!navigator.onLine) {
    logoutError.value = 'Hubungkan perangkat untuk menyelesaikan logout server.';
    return;
  }
  router.post('/logout', {}, {
    onError: () => { logoutError.value = 'Logout server belum berhasil. Akses lokal tetap dikunci.'; },
  });
}

async function logout() {
  const check = ++continuityCheck;
  checkingContinuity.value = true;
  try {
    await lockRelawanContinuity(user.value);
  } catch {
    if (check === continuityCheck) {
      checkingContinuity.value = false;
      logoutError.value = 'Perangkat belum dapat mencatat permintaan keluar. Coba lagi.';
    }
    return;
  }
  loggedOutLocally.value = true;
  checkingContinuity.value = false;
  if (navigator.onLine) {
    retryServerLogout();
  } else {
    logoutError.value = 'Logout server tertunda hingga perangkat terhubung kembali.';
  }
}

function onEmergencyCreated(event: Event) {
  const detail = (event as CustomEvent<{ owner: number; id: string }>).detail;
  if (detail.owner === currentOwner.value) activeLocalId.value = detail.id;
}

watch(currentOwner, owner => {
  activeLocalId.value = null;
  showStatusSheet.value = false;
  if (!owner || /^\/relawan\/emergencies\//.test(page.url)) return;
  void emergencyRepository.list(owner).then(items => {
    if (owner !== currentOwner.value || activeLocalId.value) return;
    const pending = items.filter(item => item.status === 'PENDING' && item.sync_state !== 'SYNCED');
    pending.sort((a, b) => b.created_at.localeCompare(a.created_at));
    activeLocalId.value = pending[0]?.id ?? null;
  }).catch(() => { /* T0 submission surfaces local storage failures. */ });
}, { immediate: true });
async function checkContinuity() {
  const check = ++continuityCheck;
  try {
    // The server-authenticated owner refreshes continuity before this layout reads it.
    // recordVerifiedRelawan() leaves logout_pending intact outside explicit login.
    if (user.value?.role === 'RELAWAN') await recordVerifiedRelawan(user.value);
    const result = await resolveRelawanContinuity();
    if (check !== continuityCheck) return;
    loggedOutLocally.value = result.state !== 'ELIGIBLE'
      || result.context.owner_user_id !== Number(user.value?.id);
    if (result.state === 'STORAGE_UNAVAILABLE') {
      logoutError.value = 'Akses perangkat belum dapat diperiksa. Coba lagi saat penyimpanan tersedia.';
    }
  } catch {
    if (check !== continuityCheck) return;
    // If the local store cannot be checked, a previous logout intent is unknown.
    loggedOutLocally.value = true;
    logoutError.value = 'Akses perangkat belum dapat diperiksa. Coba lagi saat penyimpanan tersedia.';
  } finally {
    if (check === continuityCheck) checkingContinuity.value = false;
  }
}
function onVerifiedLogin() { void checkContinuity(); }
onMounted(() => {
  void checkContinuity();
  registerRelawanServiceWorker();
  window.addEventListener('rapid-mind:verified-login', onVerifiedLogin);
  window.addEventListener('rapid-mind:emergency-created', onEmergencyCreated);
});
onUnmounted(() => {
  window.removeEventListener('rapid-mind:emergency-created', onEmergencyCreated);
  window.removeEventListener('rapid-mind:verified-login', onVerifiedLogin);
});
</script>
