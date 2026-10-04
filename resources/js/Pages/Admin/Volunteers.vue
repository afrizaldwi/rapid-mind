<template>
  <AdminLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Manajemen Relawan Lapangan
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Penugasan relawan ke posko pengungsian aktif dan pemantauan asesmen.
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th class="py-4 px-6">Nama Relawan</th>
              <th class="py-4 px-6">Email / Kontak</th>
              <th class="py-4 px-6">Posko Ditugaskan</th>
              <th class="py-4 px-6">Total Asesmen Dilakukan</th>
              <th class="py-4 px-6 text-right">Aksi Penugasan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
            <tr v-for="v in volunteers" :key="v.id" class="hover:bg-slate-50/70 transition">
              <td class="py-4 px-6 font-bold text-slate-900">
                {{ v.name }}
              </td>
              <td class="py-4 px-6 text-slate-500">
                {{ v.email }}
              </td>
              <td class="py-4 px-6 font-semibold">
                {{ v.shelter?.name || 'Belum Ditugaskan' }}
              </td>
              <td class="py-4 px-6">
                <span class="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {{ v.assessments_count }} Asesmen
                </span>
              </td>
              <td class="py-4 px-6 text-right">
                <button
                  type="button"
                  @click="openAssign(v)"
                  class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Ubah Posko
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Assign Shelter Modal -->
      <div v-if="assignVolunteerModal" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4">
        <div class="bg-white w-full max-w-sm rounded-xl p-6 space-y-4 shadow-xl border border-slate-200">
          <h3 class="font-bold text-slate-900 text-sm">
            Tugaskan Posko untuk {{ selectedVol?.name }}
          </h3>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Pilih Posko Pengungsian:
            </label>
            <select
              v-model="targetShelterId"
              class="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-teal-700 focus:outline-none"
            >
              <option v-for="s in shelters" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.address }})
              </option>
            </select>
          </div>

          <div class="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              @click="assignVolunteerModal = false"
              class="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
            >
              Batal
            </button>
            <button
              type="button"
              @click="submitAssign"
              class="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Simpan Penugasan
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';

const props = defineProps<{
  volunteers: any[];
  shelters: any[];
}>();

const assignVolunteerModal = ref(false);
const selectedVol = ref<any>(null);
const targetShelterId = ref<number | null>(null);

function openAssign(v: any) {
  selectedVol.value = v;
  targetShelterId.value = v.shelter_id || props.shelters?.[0]?.id || null;
  assignVolunteerModal.value = true;
}

function submitAssign() {
  if (!selectedVol.value) return;
  router.post(`/admin/volunteers/${selectedVol.value.id}/assign`, {
    shelter_id: targetShelterId.value,
  }, {
    onFinish: () => {
      assignVolunteerModal.value = false;
    },
  });
}
</script>
