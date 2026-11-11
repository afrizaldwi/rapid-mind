<template>
  <AdminLayout>
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div><h2 class="text-xl font-black text-slate-900">{{ title }}</h2><p class="text-xs text-slate-500 mt-1">{{ $t('admin.people.subtitle', 'Akun dan penugasan operasional saat ini.') }}</p></div>
        <Link :href="base + '/create'" class="px-4 py-2 bg-teal-800 text-white font-bold text-xs rounded-xl">{{ kind === 'relawan' ? $t('admin.people.addRelawan', '+ Tambah Relawan') : $t('admin.people.addHealthcare', '+ Tambah Akun Healthcare') }}</Link>
      </div>
      <p v-if="message" class="rounded-xl bg-teal-50 text-teal-900 p-3 text-sm">{{ message }}</p>
      <div v-if="!users.length" class="bg-white rounded-2xl p-8 text-sm text-slate-600">{{ kind === 'relawan' ? $t('admin.people.emptyRelawan', 'Belum ada akun Relawan.') : $t('admin.people.emptyHealthcare', 'Belum ada akun Healthcare.') }}</div>
      <div v-else class="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-600"><tr><th class="p-4">{{ $t('admin.masterData.columns.name', 'Nama') }}</th><th class="p-4">{{ $t('admin.people.columns.email', 'Email') }}</th><th class="p-4">{{ $t('common.status', 'Status') }}</th><th class="p-4">{{ kind === 'relawan' ? $t('admin.people.columns.currentShelter', 'Posko saat ini') : $t('admin.people.columns.currentFacility', 'Faskes saat ini') }}</th><th v-if="kind === 'relawan'" class="p-4">{{ $t('nav.assessment', 'Asesmen') }}</th><th class="p-4">{{ $t('common.actions', 'Aksi') }}</th></tr></thead>
          <tbody><tr v-for="u in users" :key="u.id" class="border-t border-slate-100"><td class="p-4 font-bold">{{ u.name }}</td><td class="p-4">{{ u.email }}</td><td class="p-4" :class="u.is_active ? 'text-teal-800' : 'text-slate-500'">{{ u.is_active ? $t('common.active', 'Aktif') : $t('common.inactive', 'Nonaktif') }}</td><td class="p-4">{{ kind === 'relawan' ? u.shelter?.name || $t('admin.people.unassigned', 'Belum ditugaskan') : u.facility?.name || $t('admin.people.unassigned', 'Belum ditugaskan') }}</td><td v-if="kind === 'relawan'" class="p-4">{{ u.assessments_count }}</td><td class="p-4"><Link :href="base + '/' + u.id" class="text-teal-800 font-bold">{{ $t('admin.masterData.viewEdit', 'Lihat / Ubah') }}</Link></td></tr></tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { t as $t, useI18n } from '@/i18n';
import { localizeMessage } from '@/i18n/localizeMessage';
const { locale } = useI18n();
const props = defineProps<{ kind: 'relawan' | 'healthcare'; users: any[] }>();
const base = computed(() => props.kind === 'relawan' ? '/admin/volunteers' : '/admin/facilities/users');
const title = computed(() => props.kind === 'relawan' ? $t('admin.people.titleRelawan', 'Manajemen Relawan') : $t('admin.people.titleHealthcare', 'Akun Healthcare'));
const page = usePage();
const message = computed(() => localizeMessage((page.props.flash as any)?.message, locale.value));
</script>
