<template>
  <AdminLayout>
    <div class="max-w-2xl space-y-5">
      <Link :href="base" class="text-teal-800 text-sm font-bold">← Kembali ke daftar</Link>
      <div>
        <h2 class="text-xl font-black text-slate-900">{{ item ? 'Ubah' : 'Tambah' }} {{ label }}</h2>
        <p class="text-sm text-slate-500 mt-1">Status nonaktif mencegah penugasan dan rujukan baru.</p>
      </div>
      <p v-if="message" class="rounded-xl bg-teal-50 text-teal-900 p-3 text-sm">{{ message }}</p>
      <form class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4" @submit.prevent="submit">
        <div><label class="block text-sm font-bold mb-1">Nama *</label><input v-model="form.name" required class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.name" class="text-sm text-red-800 mt-1">{{ form.errors.name }}</p></div>
        <div v-if="kind === 'posko'">
          <label class="block text-sm font-bold mb-1">Wilayah *</label>
          <select v-model="form.region_id" required class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none"><option :value="null" disabled>Pilih wilayah</option><option v-for="r in regions" :key="r.id" :value="r.id">{{ r.name }}</option></select>
          <p v-if="!regions?.length" class="text-sm text-amber-700 mt-1">Belum ada Wilayah bootstrap. Hubungi pengelola deployment.</p>
          <p v-if="form.errors.region_id" class="text-sm text-red-800 mt-1">{{ form.errors.region_id }}</p>
        </div>
        <div v-else><label class="block text-sm font-bold mb-1">Jenis Faskes *</label><input v-model="form.type" required class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" placeholder="Contoh: Puskesmas" /><p v-if="form.errors.type" class="text-sm text-red-800 mt-1">{{ form.errors.type }}</p></div>
        <div><label class="block text-sm font-bold mb-1">Alamat{{ kind === 'faskes' ? ' *' : '' }}</label><input v-model="form.address" :required="kind === 'faskes'" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.address" class="text-sm text-red-800 mt-1">{{ form.errors.address }}</p></div>
        <div v-if="kind === 'posko'" class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-bold mb-1">Lintang</label><input v-model="form.latitude" type="number" step="any" min="-90" max="90" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.latitude" class="text-sm text-red-800 mt-1">{{ form.errors.latitude }}</p></div>
          <div><label class="block text-sm font-bold mb-1">Bujur</label><input v-model="form.longitude" type="number" step="any" min="-180" max="180" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.longitude" class="text-sm text-red-800 mt-1">{{ form.errors.longitude }}</p></div>
        </div>
        <label class="flex items-center gap-2 text-sm font-bold"><input v-model="form.is_active" type="checkbox" /> Aktif</label>
        <p v-if="form.errors.is_active" class="text-sm text-red-800 mt-1">{{ form.errors.is_active }}</p>
        <div class="flex gap-3 pt-2"><button :disabled="form.processing || (kind === 'posko' && !regions?.length)" class="bg-teal-800 text-white rounded-xl px-5 py-2 font-bold text-sm disabled:opacity-50">{{ form.processing ? 'Menyimpan…' : 'Simpan' }}</button></div>
      </form>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Link, useForm, usePage } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
const props = defineProps<{ kind: 'posko' | 'faskes'; item: any | null; regions?: {id:number;name:string}[] }>();
const base = computed(() => props.kind === 'posko' ? '/admin/operations/posko' : '/admin/facilities/organizations');
const label = computed(() => props.kind === 'posko' ? 'Posko' : 'Faskes');
const page = usePage();
const message = computed(() => (page.props.flash as any)?.message);
const form = useForm({
  name: props.item?.name ?? '',
  region_id: props.item?.region_id ?? null as number | null,
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
