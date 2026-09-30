<template>
  <HealthcareLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-900 tracking-tight">
            Pemantauan Rujukan
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Pantau status operasional rujukan ke faskes tujuan.
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <div v-if="conflict" class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          <p>{{ conflict }}</p>
          <button v-if="reconciling" type="button" disabled class="mt-2 font-bold">Memuat data terbaru…</button>
          <button v-else-if="needsRefresh" type="button" @click="refreshReferrals" class="mt-2 font-bold underline">Muat data terbaru</button>
        </div>

        <div
          v-for="r in referrals"
          :key="r.id"
          class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-lg" aria-hidden="true">↗</span>
                <h3 class="text-base font-extrabold text-slate-900">
                  {{ r.patient?.name }}
                </h3>
                <Badge :variant="r.status === 'COMPLETED' ? 'success' : 'warning'">
                  {{ formatReferralStatus(r.status) }}
                </Badge>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Faskes Tujuan: <strong class="text-slate-800">{{ r.facility?.name }}</strong> • Perujuk: {{ r.referrer?.name }}
              </p>
            </div>
            <span class="text-xs text-slate-400">
              {{ new Date(r.created_at).toLocaleString('id-ID') }}
            </span>
          </div>

          <p v-if="r.notes" class="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            "{{ r.notes }}"
          </p>

          <div class="pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center">
            <span class="text-xs font-bold text-slate-500 mr-2">Status: {{ formatReferralStatus(r.status) }}</span>
            <button
              v-for="action in nextReferralActions(r.status)"
              :key="action.status"
              type="button"
              :disabled="busyId !== null || reconciling || needsRefresh"
              @click="chooseAction(r, action.status)"
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-50"
            >
              {{ action.label }}
            </button>
          </div>
        </div>

        <div v-if="!referrals || referrals.length === 0" class="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
          Belum ada data rujukan aktif saat ini.
        </div>
      </div>
      <div v-if="terminalAction" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
        <div role="dialog" aria-modal="true" aria-labelledby="complete-title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h3 id="complete-title" class="text-lg font-bold text-slate-900">Selesaikan rujukan?</h3>
          <p class="mt-2 text-sm text-slate-600">{{ terminalAction.patient?.name || 'Pasien ini' }} akan ditandai selesai dan keluar dari pekerjaan aktif. Pastikan tindak lanjut operasional telah selesai.</p>
          <div class="mt-5 flex justify-end gap-3">
            <button type="button" :disabled="busyId !== null" @click="terminalAction = null" class="rounded-lg px-4 py-2 text-sm font-bold text-slate-700">Batal</button>
            <button type="button" :disabled="busyId !== null" @click="submitStatus(terminalAction!, 'COMPLETED')" class="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Ya, selesaikan</button>
          </div>
        </div>
      </div>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import Badge from '@/components/ui/Badge.vue';
import { formatReferralStatus, nextReferralActions, type ReferralStatus } from '@/lib/referralStatus';

type ReferralRow = { id: string; status: ReferralStatus; patient?: { name?: string }; facility?: { name?: string }; referrer?: { name?: string }; created_at: string; notes?: string | null };
defineProps<{ referrals: ReferralRow[] }>();

const busyId = ref<string | null>(null);
const reconciling = ref(false);
const needsRefresh = ref(false);
const conflict = ref<string | null>(null);
const terminalAction = ref<ReferralRow | null>(null);
let reloadAfterPost = false;

function chooseAction(referral: ReferralRow, status: ReferralStatus) {
  if (busyId.value || reconciling.value || needsRefresh.value) return;
  if (status === 'COMPLETED') {
    terminalAction.value = referral;
    return;
  }
  submitStatus(referral, status);
}

function refreshReferrals() {
  if (reconciling.value) return;
  reconciling.value = true;
  router.reload({
    only: ['referrals'],
    onSuccess: () => {
      reconciling.value = false;
      needsRefresh.value = false;
      if (conflict.value) conflict.value = 'Data telah diperbarui oleh pengguna lain. Data terbaru sudah dimuat. Pilih tindakan kembali.';
    },
    onError: () => { reconciling.value = false; },
    onCancel: () => { reconciling.value = false; },
  });
}

function submitStatus(referral: ReferralRow, status: ReferralStatus) {
  if (busyId.value || reconciling.value || needsRefresh.value) return;
  busyId.value = referral.id;
  terminalAction.value = null;
  reloadAfterPost = false;
  router.post(`/healthcare/referrals/${referral.id}/status`, {
    expected_status: referral.status,
    status,
  }, {
    preserveScroll: true,
    onSuccess: () => { conflict.value = null; },
    onError: (errors) => {
      if (errors.conflict) {
        conflict.value = errors.conflict;
        needsRefresh.value = true;
        reloadAfterPost = true;
      } else {
        conflict.value = errors.status || 'Perubahan status belum tersimpan. Coba lagi.';
      }
    },
    onFinish: () => {
      busyId.value = null;
      if (reloadAfterPost) refreshReferrals();
    },
  });
}
</script>
