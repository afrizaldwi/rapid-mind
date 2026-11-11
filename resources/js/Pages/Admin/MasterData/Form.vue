<template>
  <AdminLayout>
    <div class="max-w-2xl space-y-5">
      <Link :href="base" class="text-teal-800 text-sm font-bold">{{ $t('admin.masterData.backToList', '← Kembali ke daftar') }}</Link>
      <div>
        <h2 class="text-xl font-black text-slate-900">{{ formHeading }}</h2>
        <p class="text-sm text-slate-500 mt-1">{{ $t('admin.masterData.inactiveNotice', 'Status nonaktif mencegah penugasan dan rujukan baru.') }}</p>
      </div>
      <p v-if="message" class="rounded-xl bg-teal-50 text-teal-900 p-3 text-sm">{{ message }}</p>
      <form class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4" @submit.prevent="submit">
        <div><label class="block text-sm font-bold mb-1">{{ $t('admin.masterData.columns.name', 'Nama') }} *</label><input v-model="form.name" required class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.name" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.name, locale) }}</p></div>
        <div v-if="kind === 'posko'">
          <label class="block text-sm font-bold mb-1">{{ $t('admin.masterData.columns.region', 'Wilayah') }} *</label>
          <select v-model="form.region_id" required class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none"><option :value="null" disabled>{{ $t('admin.masterData.selectRegion', 'Pilih wilayah') }}</option><option v-for="r in regions" :key="r.id" :value="r.id">{{ r.name }}</option></select>
          <p v-if="!regions?.length" class="text-sm text-amber-700 mt-1">{{ $t('admin.masterData.noRegions', 'Belum ada Wilayah bootstrap. Hubungi pengelola deployment.') }}</p>
          <p v-if="form.errors.region_id" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.region_id, locale) }}</p>
        </div>
        <div v-else><label class="block text-sm font-bold mb-1">{{ $t('admin.masterData.facilityTypeLabel', 'Jenis Faskes *') }}</label><input v-model="form.type" required class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" :placeholder="$t('admin.masterData.facilityTypePlaceholder', 'Contoh: Puskesmas')" /><p v-if="form.errors.type" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.type, locale) }}</p></div>
        <div v-if="kind === 'posko'">
          <label class="block text-sm font-bold mb-1">{{ $t('admin.masterData.primaryFacilityLabel', 'Faskes penanggung jawab utama') }}</label>
          <select v-model="form.primary_facility_id" :disabled="!routingAvailable" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm"><option :value="null">{{ $t('admin.masterData.notAssignedFacility', 'Belum ditetapkan') }}</option><option v-for="facility in facilities" :key="facility.id" :value="facility.id">{{ facility.name }}</option></select>
          <p class="text-sm text-slate-500 mt-1">{{ $t('admin.masterData.primaryFacilityHint', 'Berlaku untuk kasus baru. Kasus lama tidak dipindahkan otomatis.') }}</p>
          <p v-if="!routingAvailable" class="text-sm text-amber-800">{{ $t('admin.masterData.routingUnavailable', 'Skema penugasan Faskes belum tersedia.') }}</p>
          <p v-if="form.errors.primary_facility_id" class="text-sm text-red-800">{{ localizeMessage(form.errors.primary_facility_id, locale) }}</p>
        </div>
        <div><label class="block text-sm font-bold mb-1">{{ $t('admin.masterData.columns.address', 'Alamat') }}{{ kind === 'faskes' ? ' *' : '' }}</label><input v-model="form.address" :required="kind === 'faskes'" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.address" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.address, locale) }}</p></div>
        <div v-if="kind === 'posko'" class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-bold mb-1">{{ $t('admin.masterData.latitude', 'Lintang') }}</label><input v-model="form.latitude" type="number" step="any" min="-90" max="90" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.latitude" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.latitude, locale) }}</p></div>
          <div><label class="block text-sm font-bold mb-1">{{ $t('admin.masterData.longitude', 'Bujur') }}</label><input v-model="form.longitude" type="number" step="any" min="-180" max="180" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.longitude" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.longitude, locale) }}</p></div>
        </div>
        <label class="flex items-center gap-2 text-sm font-bold"><input v-model="form.is_active" type="checkbox" /> {{ $t('common.active', 'Aktif') }}</label>
        <p v-if="form.errors.is_active" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.is_active, locale) }}</p>
        <div class="flex gap-3 pt-2"><button :disabled="form.processing || (kind === 'posko' && !regions?.length)" class="bg-teal-800 text-white rounded-xl px-5 py-2 font-bold text-sm disabled:opacity-50">{{ form.processing ? $t('admin.logistics.saving', 'Menyimpan…') : $t('common.save', 'Simpan') }}</button></div>
      </form>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Link, useForm, usePage } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { t as $t, useI18n } from '@/i18n';
import { localizeMessage } from '@/i18n/localizeMessage';
const { locale } = useI18n();
const props = defineProps<{ kind: 'posko' | 'faskes'; item: any | null; regions?: {id:number;name:string}[]; facilities?: {id:number;name:string}[]; routingAvailable?: boolean }>();
const base = computed(() => props.kind === 'posko' ? '/admin/operations/posko' : '/admin/facilities/organizations');
const formHeading = computed(() => {
  if (props.kind === 'posko') {
    return props.item ? $t('admin.masterData.editPosko', 'Ubah Posko') : $t('admin.masterData.createPosko', 'Tambah Posko');
  }
  return props.item ? $t('admin.masterData.editFaskes', 'Ubah Faskes') : $t('admin.masterData.createFaskes', 'Tambah Faskes');
});
const page = usePage();
const message = computed(() => localizeMessage((page.props.flash as any)?.message, locale.value));
const form = useForm({
  name: props.item?.name ?? '',
  region_id: props.item?.region_id ?? null as number | null,
  primary_facility_id: props.item?.primary_facility_id ?? null as number | null,
  type: props.item?.type ?? '',
  address: props.item?.address ?? '',
  latitude: props.item?.latitude ?? '',
  longitude: props.item?.longitude ?? '',
  is_active: props.item?.is_active ?? true,
});
function submit() {
  const url = props.item ? base.value + '/' + props.item.id : base.value;
  if (props.item) form.put(url, { preserveScroll: true });
  else form.post(url);
}
</script>
