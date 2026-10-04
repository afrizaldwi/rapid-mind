<template>
  <div class="min-h-screen bg-[#F7F8FA] flex flex-col text-slate-900 font-sans antialiased">
    <!-- Top Global Header (64px high, crisp white, minimal enterprise style) -->
    <header class="h-16 bg-white border-b border-slate-200/80 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <!-- Left: Understated Brand & Context -->
      <div class="flex items-center space-x-3">
        <!-- Mobile hamburger -->
        <button
          type="button"
          @click="sidebarOpen = !sidebarOpen"
          class="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          aria-label="Buka navigasi"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <!-- Brand Identifier -->
        <Link href="/admin/summary" class="flex items-center gap-2.5 group">
          <img src="/logo.png?v=3" alt="RAPID-MIND Logo" class="w-8 h-8 object-contain shrink-0" />
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-sm font-bold tracking-tight text-slate-900 leading-none">
                RAPID-MIND
              </span>
              <span class="text-[11px] font-bold text-teal-800 uppercase tracking-wider leading-none">Pusat Komando</span>
            </div>
            <span class="text-[11px] text-slate-400 font-normal leading-tight block mt-0.5">
              Disaster Response Monitoring
            </span>
          </div>
        </Link>
      </div>

      <!-- Right: Realtime Connection & Identity -->
      <div class="flex items-center space-x-3">
        <!-- Canonical Connection Status (plain dot + text, no container pill) -->
        <div
          class="hidden sm:flex items-center gap-1.5 text-xs font-medium"
          :class="isOnline ? 'text-slate-600' : 'text-slate-500'"
        >
          <span
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="isOnline ? 'bg-emerald-500' : 'bg-slate-400'"
          ></span>
          <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
        </div>

        <!-- User Profile Pill / Dropdown -->
        <div class="relative">
          <button
            type="button"
            @click="profileOpen = !profileOpen"
            class="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-slate-50 transition"
          >
            <div class="w-8 h-8 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
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
            class="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs"
            @click="profileOpen = false"
          >
            <div class="px-3.5 py-2 border-b border-slate-100">
              <p class="font-bold text-slate-800">{{ userDisplayName }}</p>
              <p class="text-[11px] text-slate-500 truncate">{{ user?.email }}</p>
            </div>
            <Link
              href="/admin/summary"
              class="block px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-800 font-medium"
            >
              Pusat Komando
            </Link>
            <button
              type="button"
              @click="logout"
              class="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-semibold"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Shell: Sidebar + Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Mobile Backdrop -->
      <div
        v-if="sidebarOpen"
        @click="sidebarOpen = false"
        class="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-xs"
      ></div>

      <!-- Left Sidebar Navigation (240px wide, quiet white background, enterprise grouped) -->
      <aside
        :class="[
          'fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200/80 flex flex-col shrink-0 transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <div class="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          <!-- Group 1: COMMAND CENTER -->
          <div>
            <div class="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              COMMAND CENTER
            </div>
            <div class="space-y-0.5">
              <Link
                href="/admin/summary"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/admin/summary') ? 'bg-teal-50 text-teal-800 font-bold border-l-2 border-teal-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/admin/summary') ? 'text-teal-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Pusat Komando</span>
              </Link>

              <Link
                href="/admin/analytics"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/admin/analytics') ? 'bg-teal-50 text-teal-800 font-bold border-l-2 border-teal-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/admin/analytics') ? 'text-teal-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Data Longitudinal</span>
              </Link>
            </div>
          </div>

          <!-- Group 2: OPERATIONS -->
          <div>
            <div class="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              OPERATIONS
            </div>
            <div class="space-y-0.5">
              <Link
                href="/admin/volunteers"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/admin/volunteers') ? 'bg-teal-50 text-teal-800 font-bold border-l-2 border-teal-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/admin/volunteers') ? 'text-teal-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Manajemen Relawan</span>
              </Link>

              <Link
                href="/admin/operations/posko"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/admin/operations/posko') ? 'bg-teal-50 text-teal-800 font-bold border-l-2 border-teal-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/admin/operations/posko') ? 'text-teal-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Posko & Sumber Daya</span>
              </Link>

              <Link
                href="/admin/logistics"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/admin/logistics') ? 'bg-teal-50 text-teal-800 font-bold border-l-2 border-teal-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/admin/logistics') ? 'text-teal-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Kebutuhan Logistik</span>
              </Link>
            </div>
          </div>

          <!-- Group 3: HEALTHCARE NETWORK -->
          <div>
            <div class="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              HEALTHCARE NETWORK
            </div>
            <div class="space-y-0.5">
              <Link
                href="/admin/facilities/organizations"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/admin/facilities/organizations') ? 'bg-teal-50 text-teal-800 font-bold border-l-2 border-teal-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/admin/facilities/organizations') ? 'text-teal-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Organisasi Faskes</span>
              </Link>

              <Link
                href="/admin/facilities/users"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/admin/facilities/users') ? 'bg-teal-50 text-teal-800 font-bold border-l-2 border-teal-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/admin/facilities/users') ? 'text-teal-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Akun Healthcare</span>
              </Link>
            </div>
          </div>

          <!-- Group 4: SPATIAL -->
          <div>
            <div class="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              SPATIAL
            </div>
            <div class="space-y-0.5">
              <Link
                href="/admin/map"
                class="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition"
                :class="isRoute('/admin/map') ? 'bg-teal-50 text-teal-800 font-bold border-l-2 border-teal-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'"
              >
                <svg class="w-4 h-4 shrink-0" :class="isRoute('/admin/map') ? 'text-teal-700' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>Peta Geospasial</span>
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Scrollable Content Area -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Link, usePage, router } from '@inertiajs/vue3';

const page = usePage();
const user = computed(() => (page.props.auth as any)?.user);
const sidebarOpen = ref(false);
const profileOpen = ref(false);

// Canonical network connection status
const isOnline = ref(typeof window !== 'undefined' ? window.navigator.onLine : true);

function handleOnline() {
  isOnline.value = true;
}

function handleOffline() {
  isOnline.value = false;
}

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});

// Role-correct identity (Section 42: Admin BPBD / Dinkes with actual authenticated data)
const userDisplayName = computed(() => {
  return user.value?.name || 'Admin BPBD / Dinkes';
});

const userRoleLabel = computed(() => {
  return 'Admin BPBD / Dinkes';
});

const userInitials = computed(() => {
  const name = userDisplayName.value;
  const parts = name.replace(/^(dr\.|drg\.|prof\.|apt\.)\s+/i, '').trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

function isRoute(path: string): boolean {
  return page.url === path || page.url.startsWith(path + '/') || page.url.startsWith(path + '?');
}

function logout() {
  router.post('/logout');
}
</script>
