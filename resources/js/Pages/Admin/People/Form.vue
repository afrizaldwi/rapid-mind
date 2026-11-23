<template>
  <AdminLayout>
    <div class="max-w-2xl space-y-5">
      <Link :href="base" class="inline-flex items-center text-teal-800 text-sm font-semibold">{{ $t('admin.masterData.backToList', '← Kembali ke daftar') }}</Link>
      <h1 class="rm-page-heading text-slate-900">{{ formHeading }}</h1>
      <p v-if="message" role="status" class="rounded-lg bg-teal-50 text-teal-900 p-3 text-sm">{{ message }}</p>
      <form class="rm-panel p-4 sm:p-6 space-y-5" @submit.prevent="submit">
        <div>
          <label for="person-name" class="block text-sm font-semibold mb-2">{{ $t('admin.masterData.columns.name', 'Nama') }} *</label>
          <input id="person-name" v-model="form.name" required :aria-invalid="!!form.errors.name" aria-describedby="person-name-error" class="w-full border border-slate-300 p-2.5 text-sm focus:border-teal-700" />
          <p v-if="form.errors.name" id="person-name-error" role="alert" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.name, locale) }}</p>
        </div>
        <div>
          <label for="person-email" class="block text-sm font-semibold mb-2">{{ $t('admin.people.columns.email', 'Email') }} *</label>
          <input id="person-email" v-model="form.email" type="email" required autocomplete="email" :aria-invalid="!!form.errors.email" aria-describedby="person-email-error" class="w-full border border-slate-300 p-2.5 text-sm focus:border-teal-700" />
          <p v-if="form.errors.email" id="person-email-error" role="alert" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.email, locale) }}</p>
        </div>
        <div v-if="kind === 'relawan'">
          <label class="block text-sm font-bold mb-1" for="phone_number">{{ $t('admin.people.phoneNumberLabel', 'Nomor telepon *') }}</label>
          <input id="phone_number" v-model="form.phone_number" type="tel" required autocomplete="tel" placeholder="081234567890" class="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-teal-700 focus:outline-none" />
          <p v-if="form.errors.phone_number" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.phone_number, locale) }}</p>
        </div>
        <template v-if="!user">
          <div><label for="person-password" class="block text-sm font-semibold mb-2">{{ $t('admin.accounts.passwordLabel', 'Kata sandi awal *') }}</label><input id="person-password" v-model="form.password" type="password" minlength="8" required autocomplete="new-password" :aria-invalid="!!form.errors.password" aria-describedby="person-password-error" class="w-full border border-slate-300 p-2.5 text-sm focus:border-teal-700" /><p v-if="form.errors.password" id="person-password-error" role="alert" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.password, locale) }}</p></div>
          <div><label for="person-password-confirmation" class="block text-sm font-semibold mb-2">{{ $t('admin.people.confirmPasswordLabel', 'Konfirmasi kata sandi *') }}</label><input id="person-password-confirmation" v-model="form.password_confirmation" type="password" minlength="8" required autocomplete="new-password" class="w-full border border-slate-300 p-2.5 text-sm focus:border-teal-700" /></div>
        </template>
        <div>
          <label for="person-assignment" class="block text-sm font-semibold mb-2">{{ kind === 'relawan' ? $t('admin.people.shelterAssignmentRequired', 'Posko penugasan *') : $t('admin.people.facilityAssignmentRequired', 'Faskes penugasan *') }}</label>
          <select id="person-assignment" v-model="form.assignment_id" required :aria-invalid="!!assignmentError" aria-describedby="person-assignment-error" class="w-full border border-slate-300 p-2.5 text-sm focus:border-teal-700">
            <option :value="null" disabled>{{ kind === 'relawan' ? $t('admin.people.selectActiveShelter', 'Pilih Posko aktif') : $t('admin.people.selectActiveFacility', 'Pilih Faskes aktif') }}</option>
            <option v-if="currentInactiveAssignment" :value="currentInactiveAssignment.id">{{ $t('admin.people.inactiveAssignmentOption', { name: currentInactiveAssignment.name }, '{name} — Nonaktif (penugasan saat ini)') }}</option>
            <option v-for="a in assignments" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
          <p v-if="!assignments.length" class="text-sm text-amber-700 mt-1">
            {{ kind === 'relawan' ? $t('admin.people.noActiveShelterPrefix', 'Belum ada Posko aktif.') : $t('admin.people.noActiveFacilityPrefix', 'Belum ada Faskes aktif.') }}
            <Link :href="kind === 'relawan' ? '/admin/operations/posko' : '/admin/facilities/organizations'" class="underline">{{ kind === 'relawan' ? $t('admin.people.manageSheltersLink', 'Kelola Posko') : $t('admin.people.manageFacilitiesLink', 'Kelola Faskes') }}</Link>
            {{ $t('admin.people.firstSuffix', 'terlebih dahulu.') }}
          </p>
          <p v-if="assignmentError" id="person-assignment-error" role="alert" class="text-sm text-red-800 mt-1">{{ assignmentError }}</p>
          <p v-if="retainingInactiveAssignment" class="text-sm text-amber-700 mt-1">{{ $t('admin.people.retainingInactiveWarning', 'Penugasan nonaktif dapat dipertahankan selama akun tetap nonaktif. Pilih lokasi aktif sebelum mengaktifkan akun.') }}</p>
        </div>
        <label class="flex items-center gap-2 text-sm font-bold"><input v-model="form.is_active" type="checkbox" /> {{ $t('admin.people.accountActiveLabel', 'Akun aktif') }}</label>
        <p v-if="form.errors.is_active" class="text-sm text-red-800 mt-1">{{ localizeMessage(form.errors.is_active, locale) }}</p>
        <button :disabled="form.processing || (!assignments.length && !currentInactiveAssignment) || (form.is_active && retainingInactiveAssignment)" class="bg-teal-800 text-white rounded-xl px-5 py-2 font-bold text-sm disabled:opacity-50">{{ form.processing ? $t('admin.logistics.saving', 'Menyimpan…') : $t('common.save', 'Simpan') }}</button>
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
const props = defineProps<{ kind: 'relawan' | 'healthcare'; user: any | null; assignments: {id:number;name:string}[]; currentInactiveAssignment: {id:number;name:string} | null }>();
const base = computed(() => props.kind === 'relawan' ? '/admin/volunteers' : '/admin/facilities/users');
const formHeading = computed(() => {
  if (props.kind === 'relawan') {
    return props.user ? $t('admin.people.editRelawan', 'Ubah Relawan') : $t('admin.people.createRelawan', 'Tambah Relawan');
  }
  return props.user ? $t('admin.people.editHealthcare', 'Ubah Akun Healthcare') : $t('admin.people.createHealthcare', 'Tambah Akun Healthcare');
});
const page = usePage();
const message = computed(() => localizeMessage((page.props.flash as any)?.message, locale.value));
const initialAssignment = props.kind === 'relawan' ? props.user?.shelter_id : props.user?.facility_id;
const retainingInactiveAssignment = computed(() => props.currentInactiveAssignment?.id === form.assignment_id);
const form = useForm({
  name: props.user?.name ?? '',
  email: props.user?.email ?? '',
  phone_number: props.user?.phone_number ?? '',
  password: '',
  password_confirmation: '',
  assignment_id: initialAssignment ?? null as number | null,
  is_active: props.user?.is_active ?? true,
});
const assignmentError = computed(() => localizeMessage(props.kind === 'relawan' ? (form.errors as Record<string, string>).shelter_id : (form.errors as Record<string, string>).facility_id, locale.value));
function submit() {
  const payload = { name: form.name, email: form.email, is_active: form.is_active,
    ...(props.kind === 'relawan' ? { shelter_id: form.assignment_id, phone_number: form.phone_number } : { facility_id: form.assignment_id }),
    ...(!props.user ? { password: form.password, password_confirmation: form.password_confirmation } : {}) };
  form.transform(() => payload);
  if (props.user) form.put(base.value + '/' + props.user.id, { preserveScroll: true });
  else form.post(base.value);
}
</script>
