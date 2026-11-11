<template>
  <AdminLayout>
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900">{{ title }}</h2>
          <p class="text-xs text-slate-500 mt-1">{{ kind === 'posko' ? $t('admin.masterData.subtitlePosko', 'Kelola data dan status operasional Posko.') : $t('admin.masterData.subtitleFaskes', 'Kelola data dan status operasional Faskes.') }}</p>
        </div>
        <Link :href="base + '/create'" class="px-4 py-2 bg-teal-800 text-white font-bold text-xs rounded-xl">{{ kind === 'posko' ? $t('admin.masterData.addPosko', '+ Tambah Posko') : $t('admin.masterData.addFaskes', '+ Tambah Faskes') }}</Link>
      </div>
      <p v-if="message" class="rounded-xl bg-teal-50 text-teal-900 p-3 text-sm">{{ message }}</p>
      <div v-if="!items.length" class="bg-white rounded-2xl p-8 text-sm text-slate-600">{{ kind === 'posko' ? $t('admin.masterData.emptyPosko', 'Belum ada Posko. Tambahkan data untuk memulai penugasan.') : $t('admin.masterData.emptyFaskes', 'Belum ada Faskes. Tambahkan data untuk memulai penugasan.') }}</div>
      <div v-else class="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-600"><tr>
            <th class="p-4">{{ $t('admin.masterData.columns.name', 'Nama') }}</th><th class="p-4">{{ kind === 'posko' ? $t('admin.masterData.columns.region', 'Wilayah') : $t('admin.masterData.columns.type', 'Jenis') }}</th>
            <th class="p-4">{{ $t('admin.masterData.columns.address', 'Alamat') }}</th><th class="p-4">{{ $t('common.status', 'Status') }}</th><th class="p-4">{{ kind === 'posko' ? $t('common.volunteer', 'Relawan') : $t('admin.masterData.columns.healthcareAccounts', 'Akun Healthcare') }}</th><th class="p-4">{{ $t('common.actions', 'Aksi') }}</th>
          </tr></thead>
          <tbody><tr v-for="item in items" :key="item.id" class="border-t border-slate-100">
            <td class="p-4 font-bold">{{ item.name }}</td>
            <td class="p-4">{{ kind === 'posko' ? item.region?.name : item.type }}</td>
            <td class="p-4">{{ item.address || '—' }}</td>
            <td class="p-4"><span :class="item.is_active ? 'text-teal-800' : 'text-slate-500'">{{ item.is_active ? $t('common.active', 'Aktif') : $t('common.inactive', 'Nonaktif') }}</span></td>
            <td class="p-4">{{ kind === 'posko' ? item.volunteers_count : item.users_count }}</td>
            <td class="p-4"><Link :href="base + '/' + item.id" class="text-teal-800 font-bold">{{ $t('admin.masterData.viewEdit', 'Lihat / Ubah') }}</Link></td>
          </tr></tbody>
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
const props = defineProps<{ kind: 'posko' | 'faskes'; items: any[] }>();
const base = computed(() => props.kind === 'posko' ? '/admin/operations/posko' : '/admin/facilities/organizations');
const title = computed(() => props.kind === 'posko' ? $t('admin.masterData.titlePosko', 'Manajemen Posko') : $t('admin.masterData.titleFaskes', 'Organisasi Faskes'));
const page = usePage();
const message = computed(() => localizeMessage((page.props.flash as any)?.message, locale.value));
</script>
