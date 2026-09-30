<template>
  <AdminLayout>
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div><h2 class="text-xl font-black text-slate-900">{{ title }}</h2><p class="text-xs text-slate-500 mt-1">Akun dan penugasan operasional saat ini.</p></div>
        <Link :href="base + '/create'" class="px-4 py-2 bg-teal-800 text-white font-bold text-xs rounded-xl">+ Tambah {{ kind === 'relawan' ? 'Relawan' : 'Akun Healthcare' }}</Link>
      </div>
      <p v-if="message" class="rounded-xl bg-teal-50 text-teal-900 p-3 text-sm">{{ message }}</p>
      <div v-if="!users.length" class="bg-white rounded-2xl p-8 text-sm text-slate-600">Belum ada akun {{ kind === 'relawan' ? 'Relawan' : 'Healthcare' }}.</div>
      <div v-else class="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-600"><tr><th class="p-4">Nama</th><th class="p-4">Email</th><th class="p-4">Status</th><th class="p-4">{{ kind === 'relawan' ? 'Posko saat ini' : 'Faskes saat ini' }}</th><th v-if="kind === 'relawan'" class="p-4">Asesmen</th><th class="p-4">Aksi</th></tr></thead>
          <tbody><tr v-for="u in users" :key="u.id" class="border-t border-slate-100"><td class="p-4 font-bold">{{ u.name }}</td><td class="p-4">{{ u.email }}</td><td class="p-4" :class="u.is_active ? 'text-teal-800' : 'text-slate-500'">{{ u.is_active ? 'Aktif' : 'Nonaktif' }}</td><td class="p-4">{{ kind === 'relawan' ? u.shelter?.name || 'Belum ditugaskan' : u.facility?.name || 'Belum ditugaskan' }}</td><td v-if="kind === 'relawan'" class="p-4">{{ u.assessments_count }}</td><td class="p-4"><Link :href="base + '/' + u.id" class="text-teal-800 font-bold">Lihat / Ubah</Link></td></tr></tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
const props = defineProps<{ kind: 'relawan' | 'healthcare'; users: any[] }>();
const base = computed(() => props.kind === 'relawan' ? '/admin/volunteers' : '/admin/facilities/users');
const title = computed(() => props.kind === 'relawan' ? 'Manajemen Relawan' : 'Akun Healthcare');
const page = usePage();
const message = computed(() => (page.props.flash as any)?.message);
</script>
