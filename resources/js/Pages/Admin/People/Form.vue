<template>
  <AdminLayout>
    <div class="max-w-2xl space-y-5">
      <Link :href="base" class="text-teal-800 text-sm font-bold">← Kembali ke daftar</Link>
      <h2 class="text-xl font-black text-slate-900">{{ user ? 'Ubah' : 'Tambah' }} {{ kind === 'relawan' ? 'Relawan' : 'Akun Healthcare' }}</h2>
      <p v-if="message" class="rounded-xl bg-teal-50 text-teal-900 p-3 text-sm">{{ message }}</p>
      <form class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4" @submit.prevent="submit">
        <div><label class="block text-sm font-bold mb-1">Nama *</label><input v-model="form.name" required class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.name" class="text-sm text-red-800 mt-1">{{ form.errors.name }}</p></div>
        <div><label class="block text-sm font-bold mb-1">Email *</label><input v-model="form.email" type="email" required autocomplete="email" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.email" class="text-sm text-red-800 mt-1">{{ form.errors.email }}</p></div>
        <template v-if="!user">
          <div><label class="block text-sm font-bold mb-1">Kata sandi awal *</label><input v-model="form.password" type="password" minlength="8" required autocomplete="new-password" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /><p v-if="form.errors.password" class="text-sm text-red-800 mt-1">{{ form.errors.password }}</p></div>
          <div><label class="block text-sm font-bold mb-1">Konfirmasi kata sandi *</label><input v-model="form.password_confirmation" type="password" minlength="8" required autocomplete="new-password" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" /></div>
        </template>
        <div>
          <label class="block text-sm font-bold mb-1">{{ kind === 'relawan' ? 'Posko penugasan *' : 'Faskes penugasan *' }}</label>
          <select v-model="form.assignment_id" required class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none">
            <option :value="null" disabled>Pilih {{ kind === 'relawan' ? 'Posko' : 'Faskes' }} aktif</option>
            <option v-if="currentInactiveAssignment" :value="currentInactiveAssignment.id">{{ currentInactiveAssignment.name }} — Nonaktif (penugasan saat ini)</option>
            <option v-for="a in assignments" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
          <p v-if="!assignments.length" class="text-sm text-amber-700 mt-1">Belum ada {{ kind === 'relawan' ? 'Posko' : 'Faskes' }} aktif. <Link :href="kind === 'relawan' ? '/admin/operations/posko' : '/admin/facilities/organizations'" class="underline">Kelola {{ kind === 'relawan' ? 'Posko' : 'Faskes' }}</Link> terlebih dahulu.</p>
          <p v-if="assignmentError" class="text-sm text-red-800 mt-1">{{ assignmentError }}</p>
          <p v-if="retainingInactiveAssignment" class="text-sm text-amber-700 mt-1">Penugasan nonaktif dapat dipertahankan selama akun tetap nonaktif. Pilih lokasi aktif sebelum mengaktifkan akun.</p>
        </div>
        <label class="flex items-center gap-2 text-sm font-bold"><input v-model="form.is_active" type="checkbox" /> Akun aktif</label>
        <p v-if="form.errors.is_active" class="text-sm text-red-800 mt-1">{{ form.errors.is_active }}</p>
        <button :disabled="form.processing || (!assignments.length && !currentInactiveAssignment) || (form.is_active && retainingInactiveAssignment)" class="bg-teal-800 text-white rounded-xl px-5 py-2 font-bold text-sm disabled:opacity-50">{{ form.processing ? 'Menyimpan…' : 'Simpan' }}</button>
      </form>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Link, useForm, usePage } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
const props = defineProps<{ kind: 'relawan' | 'healthcare'; user: any | null; assignments: {id:number;name:string}[]; currentInactiveAssignment: {id:number;name:string} | null }>();
const base = computed(() => props.kind === 'relawan' ? '/admin/volunteers' : '/admin/facilities/users');
const page = usePage();
const message = computed(() => (page.props.flash as any)?.message);
const initialAssignment = props.kind === 'relawan' ? props.user?.shelter_id : props.user?.facility_id;
const retainingInactiveAssignment = computed(() => props.currentInactiveAssignment?.id === form.assignment_id);
const form = useForm({
  name: props.user?.name ?? '',
  email: props.user?.email ?? '',
  password: '',
  password_confirmation: '',
  assignment_id: initialAssignment ?? null as number | null,
  is_active: props.user?.is_active ?? true,
});
const assignmentError = computed(() => props.kind === 'relawan' ? (form.errors as Record<string, string>).shelter_id : (form.errors as Record<string, string>).facility_id);
function submit() {
  const payload = { name: form.name, email: form.email, is_active: form.is_active,
    ...(props.kind === 'relawan' ? { shelter_id: form.assignment_id } : { facility_id: form.assignment_id }),
    ...(!props.user ? { password: form.password, password_confirmation: form.password_confirmation } : {}) };
  form.transform(() => payload);
  if (props.user) form.put(base.value + '/' + props.user.id, { preserveScroll: true });
  else form.post(base.value);
}
</script>
