<template>
  <HealthcareLayout>
    <div class="space-y-5 max-w-5xl">
      <!-- Page Header -->
      <div>
        <h1 class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          Pemantauan Rujukan
        </h1>
        <p class="text-xs text-slate-500 mt-1 font-normal">
          Pelacakan alur operasional rujukan dan tindak lanjut ke fasilitas kesehatan tujuan.
        </p>
      </div>

      <!-- Conflict & Reconciliation Notification -->
      <div v-if="conflict" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
        <p class="font-semibold">{{ conflict }}</p>
        <button v-if="reconciling" type="button" disabled class="mt-1.5 font-bold text-[11px] text-amber-800">
          Memuat data terbaru…
        </button>
        <button v-else-if="needsRefresh" type="button" @click="refreshReferrals" class="mt-1.5 font-bold text-[11px] text-amber-800 hover:underline">
          Muat data terbaru
        </button>
      </div>

      <!-- Unified Referrals Surface List -->
      <div class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div v-if="referrals && referrals.length > 0" class="divide-y divide-slate-100">
          <div
            v-for="r in referrals"
            :key="r.id"
            class="p-4 sm:p-5 space-y-2.5 hover:bg-slate-50/50 transition text-xs"
          >
            <!-- Row 1: Patient Name, Status Badge, Time -->
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <h2 class="font-bold text-slate-900 text-xs sm:text-sm">
                  {{ r.patient?.name || "Pasien tidak tercatat" }}
                </h2>
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-semibold"
                  :class="r.status === 'COMPLETED' ? 'text-teal-800' : 'text-amber-800'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="r.status === 'COMPLETED' ? 'bg-teal-600' : 'bg-amber-500'"
                  ></span>
                  {{ formatReferralStatus(r.status) }}
                </span>
              </div>
              <span class="text-[11px] text-slate-400 shrink-0">
                {{ formatDate(r.created_at) }}
              </span>
            </div>

            <!-- Row 2: Target Facility & Referrer Info -->
            <div class="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
              <span>Tujuan: <strong class="text-slate-800 font-semibold">{{ r.facility?.name || "Faskes tidak tersedia" }}</strong></span>
              <span v-if="r.referrer?.name">•</span>
              <span v-if="r.referrer?.name">Perujuk: {{ r.referrer.name }}</span>
            </div>

            <!-- Row 3: Referral Notes (if available) -->
            <p v-if="r.notes" class="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
              "{{ r.notes }}"
            </p>

            <!-- Row 4: Action Controls -->
            <div class="pt-1 flex flex-wrap items-center justify-between gap-2">
              <span class="text-[11px] text-slate-400">
                Tahapan saat ini: <strong class="text-slate-700 font-medium">{{ formatReferralStatus(r.status) }}</strong>
              </span>

              <div class="flex items-center gap-2">
                <button
                  v-for="action in nextReferralActions(r.status)"
                  :key="action.status"
                  type="button"
                  :disabled="busyId !== null || reconciling || needsRefresh"
                  @click="chooseAction(r, action.status)"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="p-8 text-center text-xs text-slate-400">
          Belum ada data rujukan aktif saat ini.
        </div>
      </div>

      <!-- Complete Referral Modal -->
      <div v-if="terminalAction" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" role="presentation">
        <div role="dialog" aria-modal="true" aria-labelledby="complete-title" class="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg border border-slate-200 space-y-3">
          <h3 id="complete-title" class="text-sm font-bold text-slate-900">
            Selesaikan Rujukan Medis?
          </h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Pasien <strong>{{ terminalAction.patient?.name || 'ini' }}</strong> akan ditandai selesai dan ditutup dari daftar aktif. Pastikan seluruh tindakan telah tuntas.
          </p>
          <div class="pt-2 flex justify-end gap-2">
            <button
              type="button"
              :disabled="busyId !== null"
              @click="terminalAction = null"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="button"
              :disabled="busyId !== null"
              @click="submitStatus(terminalAction!, 'COMPLETED')"
              class="rounded-lg bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition"
            >
              Ya, Selesaikan
            </button>
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
import { formatReferralStatus, nextReferralActions, type ReferralStatus } from '@/lib/referralStatus';

type ReferralRow = {
  id: string;
  status: ReferralStatus;
  patient?: { name?: string };
  facility?: { name?: string };
  referrer?: { name?: string };
  created_at: string;
  notes?: string | null;
};

defineProps<{ referrals: ReferralRow[] }>();

const busyId = ref<string | null>(null);
const reconciling = ref(false);
const needsRefresh = ref(false);
const conflict = ref<string | null>(null);
const terminalAction = ref<ReferralRow | null>(null);
let reloadAfterPost = false;

function formatDate(value: string): string {
  if (!value) return '';
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

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
      if (conflict.value) {
        conflict.value = 'Data telah diperbarui oleh pengguna lain. Data terbaru sudah dimuat. Pilih tindakan kembali.';
      }
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
      }
    },
    onFinish: () => {
      busyId.value = null;
      if (reloadAfterPost) {
        reloadAfterPost = false;
        refreshReferrals();
      }
    },
  });
}
</script>
