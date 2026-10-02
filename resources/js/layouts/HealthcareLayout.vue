<template>
  <div class="min-h-screen bg-slate-50 flex text-slate-900 font-sans antialiased">
    <!-- Desktop Sidebar Navigation -->
    <aside class="w-60 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 select-none">
      <!-- App Brand & Facility -->
      <div class="p-5 border-b border-slate-800/80">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-teal-600 text-white font-black flex items-center justify-center text-xs tracking-wider shadow-xs">
            RM
          </div>
          <div>
            <h1 class="text-xs font-black tracking-tight text-white leading-none">
              RAPID-MIND
            </h1>
            <span class="text-[10px] font-semibold text-teal-400 tracking-wider block mt-1">
              Workspace Medis
            </span>
          </div>
        </div>
        <div class="mt-3.5 p-2.5 bg-slate-800/70 rounded-lg text-xs text-slate-300 border border-slate-700/50">
          <p class="font-bold text-white text-[11px] truncate">{{ user?.facility?.name || 'RSUD Candi' }}</p>
          <p class="text-[10px] text-slate-400 mt-0.5 truncate">{{ user?.name || 'dr. Rina Suryani, Sp.KJ' }}</p>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 p-3 space-y-1 text-xs font-semibold">
        <!-- 1. Triase & Darurat (Highlighted primary workspace) -->
        <Link
          href="/healthcare/emergencies"
          class="flex items-center justify-between px-3 py-2.5 rounded-lg transition"
          :class="isRoute('/healthcare/emergencies')
            ? 'bg-slate-800 text-white font-bold border-l-2 border-teal-500 shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
        >
          <div class="flex items-center space-x-2.5">
            <svg class="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span class="text-xs">Triase & Darurat</span>
          </div>
          <span
            v-if="pendingT0Count > 0"
            class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white"
          >
            {{ pendingT0Count }}
          </span>
        </Link>

        <!-- 2. Validasi Klinis -->
        <Link
          href="/healthcare/validations"
          class="flex items-center space-x-2.5 px-3 py-2.5 rounded-lg transition"
          :class="isRoute('/healthcare/validations')
            ? 'bg-slate-800 text-white font-bold border-l-2 border-teal-500 shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
        >
          <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span class="text-xs">Validasi Klinis</span>
        </Link>

        <!-- 3. Rujukan & Evakuasi -->
        <Link
          href="/healthcare/referrals"
          class="flex items-center space-x-2.5 px-3 py-2.5 rounded-lg transition"
          :class="isRoute('/healthcare/referrals')
            ? 'bg-slate-800 text-white font-bold border-l-2 border-teal-500 shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
        >
          <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span class="text-xs">Rujukan & Evakuasi</span>
        </Link>

        <!-- 4. Data Pasien -->
        <Link
          href="/healthcare/patients"
          class="flex items-center space-x-2.5 px-3 py-2.5 rounded-lg transition"
          :class="isRoute('/healthcare/patients')
            ? 'bg-slate-800 text-white font-bold border-l-2 border-teal-500 shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'"
        >
          <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span class="text-xs">Data Pasien</span>
        </Link>
      </nav>

      <!-- Connection & Logout Footer -->
      <div class="p-3.5 border-t border-slate-800 space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="serverReachable !== false && realtimeConnected ? 'bg-emerald-400' : 'bg-amber-400'"
            ></span>
            <span class="text-[11px] font-medium" :class="serverReachable !== false && realtimeConnected ? 'text-slate-300' : 'text-amber-200'">
              {{ serverReachable === false ? 'Terputus' : realtimeConnected ? 'Realtime aktif' : 'Reconnecting' }}
            </span>
          </div>
          <button type="button" @click="logout" class="text-[11px] text-slate-400 hover:text-white transition">Keluar</button>
        </div>
      </div>
    </aside>

    <!-- Main Workspace Container -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <!-- Top Workspace Bar (Clean, Operational, Polished) -->
      <header class="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-2xs shrink-0">
        <!-- Left: App Brand & Descriptor -->
        <div class="flex items-center space-x-3">
          <div>
            <div class="flex items-baseline space-x-2">
              <h2 class="text-sm font-black text-slate-900 tracking-tight leading-none">
                RAPID-MIND
              </h2>
              <span class="text-xs font-semibold text-slate-700">
                Workspace Triase Klinis
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5 leading-none">
              Emergency Psychological Triage
            </p>
          </div>
        </div>

        <!-- Right: Doctor profile & status badge -->
        <div class="flex items-center space-x-4">
          <!-- Compact status badge -->
          <div class="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>PSC 119 Siaga</span>
          </div>

          <!-- User info -->
          <div class="text-right">
            <span class="text-xs font-bold text-slate-900 block leading-tight">
              {{ user?.name || 'dr. Rina Suryani, Sp.KJ' }}
            </span>
            <span class="text-[11px] text-slate-500 block leading-tight mt-0.5">
              Dokter Jaga • PSC 119
            </span>
          </div>
        </div>
      </header>

      <!-- Dynamic Page Content -->
      <main class="flex-1 p-5 lg:p-6 bg-slate-50/70">
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
      ? ['pendingT0Count', 'emergencies', 'assessments']
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
  lastRefreshedAt.value = new Date();
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
