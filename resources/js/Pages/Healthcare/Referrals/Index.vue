<template>
  <HealthcareLayout>
    <div class="space-y-5 max-w-5xl">
      <!-- Page Header -->
      <div>
        <h1 class="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          {{ $t('healthcare.referrals.title', 'Pemantauan Rujukan') }}
        </h1>
        <p class="text-xs text-slate-500 mt-1 font-normal">
          {{ $t('healthcare.referrals.subtitle', 'Keputusan rujukan klinis dan pekerjaan internal; status respons lapangan ditampilkan terpisah.') }}
        </p>
      </div>

      <!-- Conflict & Reconciliation Notification -->
      <div v-if="conflict" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
        <p class="font-semibold">{{ conflict }}</p>
        <button v-if="reconciling" type="button" disabled class="mt-1.5 font-bold text-[11px] text-amber-800">
          {{ $t('common.loading', 'Memuat data terbaru…') }}
        </button>
        <button v-else-if="needsRefresh" type="button" @click="refreshReferrals" class="mt-1.5 font-bold text-[11px] text-amber-800 hover:underline">
          {{ $t('common.refresh', 'Muat data terbaru') }}
        </button>
      </div>

      <label class="block text-xs">{{ $t('healthcare.referrals.filterLabel', 'Tampilkan rujukan') }}
        <select v-model="filter" class="ml-2 rounded-lg border border-slate-300 p-2">
          <option value="ALL">{{ $t('common.all', 'Semua') }}</option>
          <option value="ACTIVE">{{ $t('common.active', 'Aktif') }}</option>
          <option value="COMPLETED">{{ $t('common.completed', 'Selesai') }}</option>
          <option value="LEGACY">{{ $t('healthcare.referrals.legacy', 'Alur lama') }}</option>
        </select>
      </label>
      <p v-if="!operationsAvailable" role="status" class="text-xs text-amber-800">{{ $t('healthcare.referrals.dispatchUnavailableCompat', 'Skema Dispatch belum siap. Alur kompatibilitas rujukan tetap tersedia.') }}</p>
      <!-- Referrals surface -->
      <div class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div v-if="visibleReferrals.length > 0" class="divide-y divide-slate-100">
          <div
            v-for="r in visibleReferrals"
            :key="r.id"
            class="p-4 sm:p-5 space-y-2.5 hover:bg-slate-50/50 transition text-xs"
          >
            <!-- Row 1: Patient Name, Status Badge, Time -->
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <h2 class="font-bold text-slate-900 text-xs sm:text-sm">
                  {{ r.patient?.name || $t('healthcare.referrals.unrecordedPatient', 'Pasien tidak tercatat') }}
                </h2>
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-semibold"
                  :class="r.status === 'COMPLETED' ? 'text-teal-800' : 'text-amber-800'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="r.status === 'COMPLETED' ? 'bg-teal-600' : 'bg-amber-500'"
                  ></span>
                  {{ clinicalLabel(r.status, locale) }}
                </span>
              </div>
              <span class="text-[11px] text-slate-400 shrink-0">
                {{ formatDate(r.created_at) }}
              </span>
            </div>

            <!-- Row 2: Target Facility & Referrer Info -->
            <div class="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
              <span>{{ $t('common.destination', 'Tujuan') }}: <strong class="text-slate-800 font-semibold">{{ r.facility?.name || $t('healthcare.referrals.targetFacility', 'Faskes tidak tersedia') }}</strong></span>
              <span v-if="r.referrer?.name">•</span>
              <span v-if="r.referrer?.name">{{ $t('healthcare.referrals.referrer', 'Perujuk') }}: {{ r.referrer.name }}</span>
            </div>

            <!-- Row 3: Referral Notes (if available) -->
            <p v-if="r.notes" class="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
              "{{ r.notes }}"
            </p>

            <p class="text-slate-500">
              {{ $t('common.source', 'Sumber') }}:
              {{
                r.emergency_event_id
                  ? $t('healthcare.operations.sourceT0Confirmed', 'T0 terkonfirmasi')
                  : r.clinical_validation_id
                    ? $t('healthcare.operations.sourceValidatedAssessment', 'Asesmen tervalidasi')
                    : $t('healthcare.operations.sourceUnrecorded', 'Sumber tidak tercatat')
              }}
              • {{ $t('healthcare.referrals.updatedLabel', 'Diperbarui') }}: {{ formatDate(r.updated_at || r.created_at) }}
            </p>
            <p v-if="operationsAvailable" class="text-slate-600">
              {{ $t('healthcare.operations.fieldResponseTitle', 'Respons Lapangan') }}:
              {{
                r.dispatch
                  ? `${r.dispatch.response_unit?.name || $t('healthcare.referrals.responseUnitFallback', 'Unit respons')} — ${dispatchLabel(r.dispatch.status, locale)}`
                  : $t('healthcare.operations.notLinkedToReferral', 'Tidak terhubung ke respons')
              }}
            </p>
            <ClinicalReferralCard v-if="operationsAvailable" :referral="clinicalRow(r)" :available="true" />
            <p v-if="legacyActions(r).length" class="text-amber-800">{{ $t('healthcare.referrals.legacyCompatNotice', 'Kontrol kompatibilitas pergerakan lama; bukan tahapan baru rujukan klinis.') }}</p>
            <!-- Row 4: Compatibility controls -->
            <div class="pt-1 flex flex-wrap items-center justify-between gap-2">
              <span class="text-[11px] text-slate-400">
                {{ $t('healthcare.referrals.currentStage', 'Tahapan saat ini:') }} <strong class="text-slate-700 font-medium">{{ clinicalLabel(r.status, locale) }}</strong>
              </span>

              <div class="flex items-center gap-2">
                <button
                  v-for="action in legacyActions(r)"
                  :key="action.status"
                  type="button"
                  :disabled="r.can_manage === false || busyId !== null || reconciling || needsRefresh"
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
          {{ $t('healthcare.referrals.noData', 'Tidak ada rujukan yang sesuai dengan filter.') }}
        </div>
      </div>

      <!-- Complete Referral Modal -->
      <div v-if="terminalAction" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" role="presentation">
        <div role="dialog" aria-modal="true" aria-labelledby="complete-title" class="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg border border-slate-200 space-y-3">
          <h3 id="complete-title" class="text-sm font-bold text-slate-900">
            {{ $t('healthcare.referrals.completeModalTitle', 'Selesaikan Rujukan Medis?') }}
          </h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            {{
              $t(
                'healthcare.referrals.completeModalBody',
                { patient: terminalAction.patient?.name || $t('healthcare.referrals.thisPatient', 'pasien ini') },
                `Pekerjaan alur lama untuk ${terminalAction.patient?.name || 'pasien ini'} akan ditandai selesai. Ini tidak berarti Faskes menerima atau menyelesaikan perawatan pasien, dan tidak mengubah status Dispatch.`,
              )
            }}
          </p>
          <div class="pt-2 flex justify-end gap-2">
            <button
              type="button"
              :disabled="busyId !== null"
              @click="terminalAction = null"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              {{ $t('common.cancel', 'Batal') }}
            </button>
            <button
              type="button"
              :disabled="busyId !== null"
              @click="submitStatus(terminalAction!, 'COMPLETED')"
              class="rounded-lg bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition"
            >
              {{ $t('common.confirm', 'Ya, Selesaikan') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </HealthcareLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { t as $t, useI18n } from '@/i18n';
import ClinicalReferralCard from '@/components/Healthcare/Operations/ClinicalReferralCard.vue';
import { clinicalLabel, dispatchLabel, type ClinicalReferral } from '@/lib/healthcareOperations';
import { router } from '@inertiajs/vue3';
import HealthcareLayout from '@/layouts/HealthcareLayout.vue';
import { nextReferralActions, type ReferralStatus } from '@/lib/referralStatus';

const { locale } = useI18n();

type ReferralRow = {
  can_manage?: boolean;
  id: string;
  status: ReferralStatus;
  patient?: { name?: string };
  facility?: { name: string };
  referrer?: { name?: string };
  created_at: string;
  notes?: string | null;
  updated_at?: string;
  emergency_event_id?: string | null;
  clinical_validation_id?: number | null;
  status_history?: any[];
  dispatch?: { status: string; response_unit?: { name: string } } | null;
};

import { localizeMessage } from "@/i18n/localizeMessage";

const props = defineProps<{ referrals: ReferralRow[]; operationsAvailable?: boolean }>();
const filter = ref('ALL');
const visibleReferrals = computed(() => props.referrals.filter(row => filter.value === 'ALL' || (filter.value === 'LEGACY' ? !['ACTIVE', 'COMPLETED'].includes(row.status) : row.status === filter.value)));
function legacyActions(row: ReferralRow) {
  return props.operationsAvailable && ['ACTIVE', 'COMPLETED'].includes(row.status) ? [] : nextReferralActions(row.status, locale.value);
}
function clinicalRow(row: ReferralRow): ClinicalReferral {
  return { ...row, updated_at: row.updated_at || row.created_at, source: row.emergency_event_id ? 'T0_CONFIRMED' : row.clinical_validation_id ? 'VALIDATED_ASSESSMENT' : 'UNKNOWN', history: row.status_history || [] };
}

const busyId = ref<string | null>(null);
const reconciling = ref(false);
const needsRefresh = ref(false);
const rawConflict = ref<string | null>(null);
const conflict = computed(() => {
  if (!rawConflict.value) return null;
  if (rawConflict.value === '__CONFLICT_RELOADED__') {
    return $t('healthcare.referrals.conflictReloaded', 'Data telah diperbarui oleh pengguna lain. Data terbaru sudah dimuat. Pilih tindakan kembali.');
  }
  return localizeMessage(rawConflict.value, locale.value);
});
const terminalAction = ref<ReferralRow | null>(null);
let reloadAfterPost = false;

function formatDate(value: string): string {
  if (!value) return '';
  return new Date(value).toLocaleString(locale.value === 'en' ? 'en-US' : 'id-ID', {
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
      if (rawConflict.value) {
        rawConflict.value = '__CONFLICT_RELOADED__';
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
    onSuccess: () => { rawConflict.value = null; },
    onError: (errors) => {
      if (errors.conflict) {
        rawConflict.value = errors.conflict;
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
