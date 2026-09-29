<template>
  <div class="min-h-screen bg-slate-100 flex text-slate-900 font-sans">
    <!-- Desktop Sidebar Navigation -->
    <aside class="w-64 bg-slate-950 text-white flex flex-col shrink-0 border-r border-slate-800">
      <!-- App Brand & Command Center Header -->
      <div class="p-6 border-b border-slate-800">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center text-sm shadow-md">
            RM
          </div>
          <div>
            <h1 class="text-sm font-bold tracking-tight text-white leading-tight">
              RAPID-MIND
            </h1>
            <span class="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
              Komando BPBD / Dinkes
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 p-4 space-y-1 text-xs font-semibold">
        <Link
          href="/admin/summary"
          class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl transition"
          :class="isRoute('/admin/summary') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-850'"
        >
          <span class="text-base">📊</span>
          <span class="text-sm">Ringkasan</span>
        </Link>

        <Link
          href="/admin/map"
          class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl transition"
          :class="isRoute('/admin/map') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-850'"
        >
          <span class="text-base">🗺️</span>
          <span class="text-sm">Peta Geospasial</span>
        </Link>

        <Link
          href="/admin/analytics"
          class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl transition"
          :class="isRoute('/admin/analytics') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-850'"
        >
          <span class="text-base">📈</span>
          <span class="text-sm">Tren & Analitik</span>
        </Link>

        <Link
          href="/admin/volunteers"
          class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl transition"
          :class="isRoute('/admin/volunteers') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-850'"
        >
          <span class="text-base">🤝</span>
          <span class="text-sm">Manajemen Relawan</span>
        </Link>

        <Link
          href="/admin/logistics"
          class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl transition"
          :class="isRoute('/admin/logistics') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-850'"
        >
          <span class="text-base">📦</span>
          <span class="text-sm">Kebutuhan Logistik</span>
        </Link>

        <Link
          href="/admin/facilities"
          class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl transition"
          :class="isRoute('/admin/facilities') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-850'"
        >
          <span class="text-base">🏥</span>
          <span class="text-sm">Organisasi Faskes</span>
        </Link>

        <Link
          href="/admin/accounts"
          class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl transition"
          :class="isRoute('/admin/accounts') ? 'bg-teal-800 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-850'"
        >
          <span class="text-base">⚙️</span>
          <span class="text-sm">Kelola Akun</span>
        </Link>
      </nav>

      <!-- Logout Footer -->
      <div class="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span class="text-[11px] text-slate-400">{{ user?.name }}</span>
        <button
          type="button"
          @click="logout"
          class="text-xs text-slate-400 hover:text-red-400 transition"
        >
          Keluar
        </button>
      </div>
    </aside>

    <!-- Main Command Body -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header class="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-xs">
        <div>
          <h2 class="text-base font-extrabold text-slate-900 tracking-tight">
            Pusat Komando Operasional Kesehatan Jiwa Bencana
          </h2>
          <p class="text-xs text-slate-500">
            Pemantauan agregat regional, alokasi sumber daya, dan integrasi lintas posko.
          </p>
        </div>

        <div class="flex items-center space-x-3 text-xs">
          <span class="px-3 py-1 rounded-full font-bold bg-amber-50 text-amber-900 border border-amber-200">
            Mode Komando Regional
          </span>
        </div>
      </header>

      <main class="flex-1 p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Link, usePage, router } from '@inertiajs/vue3';

const page = usePage();
const user = computed(() => (page.props.auth as any)?.user);

function isRoute(path: string) {
  return page.url.startsWith(path);
}

function logout() {
  router.post('/logout');
}
</script>
