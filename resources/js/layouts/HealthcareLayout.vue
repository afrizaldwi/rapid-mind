<template>
  <div class="min-h-screen bg-slate-100 flex text-slate-900 font-sans">
    <!-- Desktop Sidebar Navigation -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800">
      <!-- App Brand & Facility -->
      <div class="p-6 border-b border-slate-800">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-teal-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
            RM
          </div>
          <div>
            <h1 class="text-sm font-bold tracking-tight text-white leading-tight">
              RAPID-MIND
            </h1>
            <span class="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">
              Workspace Medis
            </span>
          </div>
        </div>
        <div class="mt-4 p-3 bg-slate-800/80 rounded-xl text-xs text-slate-300 border border-slate-700/60">
          <p class="font-bold text-white text-xs">{{ user?.facility?.name || 'RS Rujukan Sleman' }}</p>
          <p class="text-[11px] text-slate-400 mt-0.5">{{ user?.name }}</p>
        </div>
      </div>

      <!-- Navigation Links (4 Permanent Destinations) -->
      <nav class="flex-1 p-4 space-y-1.5 text-xs font-semibold">
        <Link
          href="/healthcare/emergencies"
          class="flex items-center justify-between px-3.5 py-3 rounded-xl transition"
          :class="isRoute('/healthcare/emergencies') ? 'bg-red-900/60 text-white font-bold border border-red-700/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
        >
          <div class="flex items-center space-x-2.5">
            <span class="text-base">🚨</span>
            <span class="text-sm">Darurat</span>
          </div>
          <span
            v-if="pendingT0Count > 0"
            class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white"
          >
            {{ pendingT0Count }}
          </span>
        </Link>

        <Link
          href="/healthcare/validations"
          class="flex items-center space-x-2.5 px-3.5 py-3 rounded-xl transition"
          :class="isRoute('/healthcare/validations') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
        >
          <span class="text-base">📋</span>
          <span class="text-sm">Validasi Klinis</span>
        </Link>

        <Link
          href="/healthcare/referrals"
          class="flex items-center space-x-2.5 px-3.5 py-3 rounded-xl transition"
          :class="isRoute('/healthcare/referrals') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
        >
          <span class="text-base">🚑</span>
          <span class="text-sm">Rujukan & Evakuasi</span>
        </Link>

        <Link
          href="/healthcare/patients"
          class="flex items-center space-x-2.5 px-3.5 py-3 rounded-xl transition"
          :class="isRoute('/healthcare/patients') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
        >
          <span class="text-base">👥</span>
          <span class="text-sm">Data Pasien</span>
        </Link>
      </nav>

      <!-- Connection & Logout Footer -->
      <div class="p-4 border-t border-slate-800 space-y-3 text-xs">
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium" :class="serverReachable !== false && realtimeConnected ? 'text-teal-300' : 'text-amber-200'">
            {{ serverReachable === false ? 'Koneksi ke server terputus' : realtimeConnected ? 'Realtime aktif' : 'Realtime terputus' }}
          </span>
          <button type="button" @click="logout" class="text-slate-400 hover:text-white">Keluar</button>
        </div>
        <p v-if="serverReachable === false || !realtimeConnected" class="text-slate-300 leading-relaxed" role="status">
          {{ serverReachable === false ? 'Data di layar mungkin tidak terbaru.' : 'Pembaruan otomatis sementara tidak tersedia. Data mungkin tidak terbaru.' }}
          <span class="block">Terakhir diperbarui {{ lastRefreshedLabel }}</span>
        </p>
      </div>
    </aside>

    <!-- Main Workspace Container -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <!-- Top Workspace Bar -->
      <header class="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-xs">
        <div>
          <h2 class="text-base font-extrabold text-slate-900 tracking-tight">
            Dashboard Respons Cepat Medis (Emergency First)
          </h2>
          <p class="text-xs text-slate-500">
            Pantau laporan darurat dan tindak lanjut dari posko pengungsian.
          </p>
        </div>

        <div class="flex items-center space-x-4">
          <div class="text-right">
            <span class="text-xs font-bold text-slate-800 block">{{ user?.name }}</span>
            <span class="text-[11px] text-slate-500 block">{{ user?.email }}</span>
          </div>
          <div class="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm border border-teal-200">
            dr
          </div>
        </div>
      </header>

      <!-- Dynamic Page Content -->
      <main class="flex-1 p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Link, usePage, router } from '@inertiajs/vue3';
import { echo, useConnectionStatus } from '@laravel/echo-vue';

const page = usePage();
const user = computed(() => (page.props.auth as any)?.user);
const pendingT0Count = computed(() => Number(page.props.pendingT0Count ?? 0));
const connectionStatus = useConnectionStatus();
const subscriptionReady = ref(false);
const realtimeConnected = computed(() => connectionStatus.value === 'connected' && subscriptionReady.value);
const serverReachable = ref<boolean | null>(null);
const lastRefreshedAt = ref<Date | null>(null);
const lastRefreshedLabel = computed(() => lastRefreshedAt.value?.toLocaleTimeString('id-ID') ?? 'belum diketahui');
const seenIds = new Set<string>();
const seenOrder: string[] = [];
let reloadInFlight = false;
let reloadRequested = false;
let healthTimer: ReturnType<typeof setInterval> | undefined;
let healthProbeInFlight = false;
let mounted = false;

function isRoute(path: string) {
  return page.url.startsWith(path);
}

function logout() {
  router.post('/logout');
}

function requestReconciliation() {
  reloadRequested = true;
  if (reloadInFlight || !mounted) return;
  reloadInFlight = true;
  reloadRequested = false;
  router.reload({
    only: page.component === 'Healthcare/Emergencies/Index'
      ? ['pendingT0Count', 'emergencies']
      : ['pendingT0Count'],
    onSuccess: () => {
      lastRefreshedAt.value = new Date();
      serverReachable.value = true;
    },
    onFinish: () => {
      reloadInFlight = false;
      if (reloadRequested) requestReconciliation();
    },
  });
}

function onEmergencyCreated(payload: { emergency?: { id?: string } }) {
  const id = payload?.emergency?.id;
  if (typeof id !== 'string' || !id || seenIds.has(id)) return;
  seenIds.add(id);
  seenOrder.push(id);
  if (seenOrder.length > 100) seenIds.delete(seenOrder.shift()!);
  playAudioNotification();
  requestReconciliation();
}

async function probeServer() {
  if (healthProbeInFlight) return;
  healthProbeInFlight = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('/up', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
    const wasUnavailable = serverReachable.value === false;
    serverReachable.value = response.ok;
    if (response.ok && wasUnavailable) requestReconciliation();
  } catch {
    serverReachable.value = false;
  } finally {
    clearTimeout(timeout);
    healthProbeInFlight = false;
  }
}

watch(connectionStatus, (current) => {
  if (current !== 'connected') {
    subscriptionReady.value = false;
    void probeServer();
  }
});

onMounted(() => {
  mounted = true;
  lastRefreshedAt.value = new Date(); // Initial Inertia page was served by Laravel.
  echo().private('emergencies')
    .listen('EmergencyCreated', onEmergencyCreated)
    .subscribed(() => {
      subscriptionReady.value = true;
      serverReachable.value = true;
      requestReconciliation();
    })
    .error(() => {
      subscriptionReady.value = false;
      void probeServer();
    });
  void probeServer();
  healthTimer = setInterval(() => { void probeServer(); }, 15000);
});

onUnmounted(() => {
  mounted = false;
  if (healthTimer) clearInterval(healthTimer);
  echo().private('emergencies').stopListening('EmergencyCreated', onEmergencyCreated);
  echo().leave('emergencies');
});

function playAudioNotification() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}
</script>
