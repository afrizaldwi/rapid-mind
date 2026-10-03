<template>
  <div class="min-h-screen bg-[#F5F7FA] flex flex-col text-slate-900 font-sans antialiased">
    <!-- Top Global Header (60-64px high, crisp white, full-width matching Admin) -->
    <header class="h-16 bg-white border-b border-slate-200/80 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0">
      <!-- Left Brand & Operational Context -->
      <div class="flex items-center space-x-3 lg:space-x-4">
        <!-- Mobile hamburger -->
        <button
          type="button"
          @click="sidebarOpen = !sidebarOpen"
          class="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          aria-label="Toggle navigation"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <!-- Brand Icon -->
        <Link href="/healthcare/emergencies" class="flex items-center gap-3 group">
          <div class="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:bg-teal-700 transition">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-black tracking-tight text-slate-900 leading-none">
                RAPID-MIND
              </span>
              <span class="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 px-2 py-0.5 rounded-full leading-none tracking-wide">
                PSC 119 / HEALTHCARE
              </span>
            </div>
            <span class="text-[11px] text-slate-400 font-normal leading-tight block mt-0.5">
              Clinical Triage & Response
            </span>
          </div>
        </Link>

        </div>

      <!-- Right Controls & User Profile -->
      <div class="flex items-center space-x-3">
        <!-- Canonical Connection Status Badge -->
        <div
          class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          :class="connectionStatus.classes"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="connectionStatus.dotClass"
          ></span>
          <span>{{ connectionStatus.label }}</span>
        </div>

        <!-- User Profile Pill / Dropdown -->
        <div class="relative">
          <button
            type="button"
            @click="profileOpen = !profileOpen"
            class="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-50 transition"
          >
            <div class="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {{ userInitials }}
            </div>
            <div class="hidden md:block text-left">
              <span class="text-xs font-bold text-slate-800 block leading-tight">
                {{ userDisplayName }}
              </span>
              <span class="text-[10px] text-slate-400 font-medium block leading-tight">
                {{ userRoleLabel }}
              </span>
            </div>
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="profileOpen"
            class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs"
            @click="profileOpen = false"
          >
            <div class="px-3.5 py-2 border-b border-slate-100">
              <p class="font-bold text-slate-800">{{ userDisplayName }}</p>
              <p class="text-[11px] text-slate-400">{{ userFacilityName }}</p>
              <span class="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                {{ userRoleLabel }}
              </span>
            </div>

            <div class="p-1.5 border-b border-slate-100">
              <div class="px-3 py-1.5 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Faskes Layanan:</span>
                <span class="font-bold text-slate-800 truncate max-w-[110px]">{{ userFacilityName }}</span>
              </div>
            </div>

            <div class="p-1.5">
              <button
                type="button"
                @click="logout"
                class="w-full flex items-center space-x-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition text-left"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

      <div v-if="connectionStatus.stale" role="status" class="border-b border-slate-300 bg-slate-100 px-4 py-2 text-center text-xs font-medium text-slate-700">
        Pembaruan otomatis sementara tidak tersedia. Data di layar mungkin tidak terbaru.
      </div>

      <!-- Main Shell: Sidebar + Content -->
    <div class="flex-1 flex min-h-0 relative">
      <!-- Mobile sidebar backdrop -->
      <div
        v-if="sidebarOpen"
        @click="sidebarOpen = false"
        class="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
      ></div>

      <!-- Unified Sidebar (Exact Same Design Foundation as Admin) -->
      <aside
        :class="[
          'w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 select-none transition-transform duration-200 ease-in-out z-40',
          'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0 top-16 h-[calc(100vh-4rem)]' : '-translate-x-full lg:translate-x-0'
        ]"
      >
        <!-- Nav Sections -->
        <div class="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          <!-- Group 1: CLINICAL OPERATIONS -->
          <div>
            <div class="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              CLINICAL OPERATIONS
            </div>
            <div class="space-y-0.5">
              <Link
                href="/healthcare/emergencies"
                class="flex items-center justify-between px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/healthcare/emergencies') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <div class="flex items-center space-x-2.5">
                  <svg class="w-4 h-4 shrink-0" :class="isRoute('/healthcare/emergencies') ? 'text-teal-600' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Triase & Kedaruratan</span>
                </div>
                <span
                  v-if="pendingT0Count > 0"
                  class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white"
                >
                  {{ pendingT0Count }}
                </span>
              </Link>

              <Link
                href="/healthcare/validations"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/healthcare/validations') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/healthcare/validations') ? 'text-teal-600' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Validasi Klinis</span>
              </Link>
            </div>
          </div>

          <!-- Group 2: RUJUKAN & TRANSPORT -->
          <div>
            <div class="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              RUJUKAN MEDIS
            </div>
            <div class="space-y-0.5">
              <Link
                href="/healthcare/referrals"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/healthcare/referrals') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/healthcare/referrals') ? 'text-teal-600' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Rujukan</span>
              </Link>
            </div>
          </div>

          <!-- Group 3: DATA PASIEN -->
          <div>
            <div class="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              REKAM MEDIS & DATA
            </div>
            <div class="space-y-0.5">
              <Link
                href="/healthcare/patients"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/healthcare/patients') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/healthcare/patients') ? 'text-teal-600' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Data Pasien & Riwayat</span>
              </Link>
            </div>
          </div>
        </div>

        <!-- Quiet Minimal System Status at bottom of sidebar per Section 10 -->
        <div class="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="connectionStatus.dotClass"
            ></span>
            <span class="text-[11px] font-medium text-slate-600">
              {{ connectionStatus.label }}
            </span>
          </div>
          <span class="text-[10px] text-slate-400 font-semibold tracking-wider">PSC 119</span>
        </div>
      </aside>

      <!-- Main Workspace Scrollable Body -->
      <main class="flex-1 p-4 lg:p-6 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { Link, usePage, router } from '@inertiajs/vue3';
import { echo } from '@laravel/echo-vue';

const page = usePage();
const user = computed(() => (page.props.auth as any)?.user);
const userDisplayName = computed(() => user.value?.name || 'Tenaga Medis');
const userRoleLabel = computed(() => {
  if (user.value?.role === 'HEALTHCARE') return 'Tenaga Medis • PSC 119';
  return user.value?.role || 'Layanan Medis';
});
const userFacilityName = computed(() => user.value?.facility?.name || 'Faskes Rujukan PSC 119');
const pendingT0Count = computed(() => Number((page.props as any).pendingT0Count ?? 0));

const sidebarOpen = ref(false);
const profileOpen = ref(false);

const userInitials = computed(() => {
  const n = user.value?.name || 'TM';
  return n.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
});

// Canonical network connection status (shared logic with Admin)
const isOnline = ref(typeof window !== 'undefined' ? window.navigator.onLine : true);

function handleOnline() {
  isOnline.value = true;
}

function handleOffline() {
  isOnline.value = false;
}

const serverReachable = ref<boolean | null>(null);
const subscriptionReady = ref(false);
const connectionStatus = computed(() => {
  if (!isOnline.value) {
    return { label: 'Offline', stale: true, classes: 'bg-slate-100 text-slate-700 border border-slate-300', dotClass: 'bg-slate-400' };
  }
  if (serverReachable.value === false) {
    return { label: 'Server tidak terjangkau', stale: true, classes: 'bg-slate-100 text-slate-700 border border-slate-300', dotClass: 'bg-slate-500' };
  }
  if (!subscriptionReady.value) {
    return { label: 'Realtime menghubungkan ulang', stale: true, classes: 'bg-slate-100 text-slate-700 border border-slate-300', dotClass: 'bg-slate-500' };
  }
  return { label: 'Realtime aktif', stale: false, classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80', dotClass: 'bg-emerald-500' };
});

let healthTimer: ReturnType<typeof setInterval> | null = null;
let healthProbeInFlight = false;
let mounted = false;

function isRoute(path: string) {
  return page.url.startsWith(path);
}

function logout() {
  router.post('/logout');
}

function onEmergencyCreated(event: { emergency: { id: string } }) {
  if (!event.emergency?.id) return;
  playAudioNotification();
  router.reload({
    only: ['emergencies', 'pendingT0Count'],
  });
}

function requestReconciliation() {
  router.reload({
    only: ['emergencies', 'pendingT0Count'],
  });
}

async function probeServer() {
  if (!mounted || healthProbeInFlight) return;
  healthProbeInFlight = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

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

onMounted(() => {
  mounted = true;
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

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
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
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
