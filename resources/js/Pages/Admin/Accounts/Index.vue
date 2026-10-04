<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Manajemen Akun Pengguna
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Pemberian akses akun resmi untuk Relawan Lapangan dan Tenaga Kesehatan.
          </p>
        </div>

        <button
          type="button"
          @click="showCreateModal = true"
          class="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          + Buat Akun Baru
        </button>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th class="py-4 px-6">Nama Pengguna</th>
              <th class="py-4 px-6">Email / Username</th>
              <th class="py-4 px-6">Peran (Role)</th>
              <th class="py-4 px-6">Penugasan Organisasi</th>
              <th class="py-4 px-6">Status Akun</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
            <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50/70 transition">
              <td class="py-4 px-6 font-bold text-slate-900">
                {{ u.name }}
              </td>
              <td class="py-4 px-6 text-slate-500">
                {{ u.email }}
              </td>
              <td class="py-4 px-6">
                <span
                  class="text-xs font-semibold"
                  :class="{
                    'text-teal-800': u.role === 'RELAWAN',
                    'text-indigo-800': u.role === 'HEALTHCARE',
                    'text-amber-800': u.role === 'ADMIN',
                  }"
                >
                  {{ u.role }}
                </span>
              </td>
              <td class="py-4 px-6 text-slate-600">
                {{ u.shelter?.name || u.facility?.name || 'Komando Pusat' }}
              </td>
              <td class="py-4 px-6">
                <span class="text-emerald-700 font-bold">● Aktif</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create Account Modal -->
      <div v-if="showCreateModal" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4">
        <div class="bg-white w-full max-w-md rounded-xl p-6 space-y-4 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="font-bold text-slate-900 text-base">
              Buat Akun Petugas Baru
            </h3>
            <button type="button" @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <form @submit.prevent="submitCreate" class="space-y-3.5 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Peran Akun *</label>
              <select
                v-model="createForm.role"
                class="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-700 focus:outline-none"
              >
                <option value="RELAWAN">RELAWAN (Mobile PWA Pendamping Posko)</option>
                <option value="HEALTHCARE">HEALTHCARE (Tenaga Medis Faskes / Dokter)</option>
                <option value="ADMIN">ADMIN (Pusat Komando Regional)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Nama Lengkap *</label>
              <input
                v-model="createForm.name"
                type="text"
                required
                placeholder="Contoh: dr. Ahmad Fauzi"
                class="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Email / Username *</label>
              <input
                v-model="createForm.email"
                type="email"
                required
                placeholder="nama@rapidmind.id"
                class="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Kata Sandi Awal *</label>
              <input
                v-model="createForm.password"
                type="password"
                required
                placeholder="Minimal 6 karakter"
                class="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div v-if="createForm.role === 'RELAWAN'">
              <label class="block font-bold text-slate-700 mb-1">Penugasan Posko Pengungsian</label>
              <select
                v-model="createForm.shelter_id"
                class="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-700 focus:outline-none"
              >
                <option :value="null">-- Belum Ditugaskan --</option>
                <option v-for="s in shelters" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div v-if="createForm.role === 'HEALTHCARE'">
              <label class="block font-bold text-slate-700 mb-1">Penugasan Faskes / Rumah Sakit</label>
              <select
                v-model="createForm.facility_id"
                class="w-full rounded-xl border border-slate-300 p-2.5 focus:border-teal-700 focus:outline-none"
              >
                <option :value="null">-- Belum Ditugaskan --</option>
                <option v-for="f in facilities" :key="f.id" :value="f.id">{{ f.name }}</option>
              </select>
            </div>

            <div class="flex justify-end space-x-2 pt-3">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                class="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-xs transition"
              >
                Terbitkan Akun
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';

defineProps<{
  users: any[];
  shelters?: any[];
  facilities?: any[];
}>();

const showCreateModal = ref(false);
const createForm = ref({
  name: '',
  email: '',
  password: 'password',
  role: 'RELAWAN',
  shelter_id: null as number | null,
  facility_id: null as number | null,
});

function submitCreate() {
  router.post('/admin/accounts', createForm.value, {
    onFinish: () => {
      showCreateModal.value = false;
      createForm.value = {
        name: '',
        email: '',
        password: 'password',
        role: 'RELAWAN',
        shelter_id: null,
        facility_id: null,
      };
    },
  });
}
</script>
