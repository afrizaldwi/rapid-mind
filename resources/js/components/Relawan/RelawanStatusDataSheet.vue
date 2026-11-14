<template>
  <div v-if="show" class="rm-app rm-overlay fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50"
    @click.self="$emit('close')">
    <section ref="panel" role="dialog" aria-modal="true" aria-labelledby="status-data-title" tabindex="-1"
      class="rm-dialog w-full max-w-lg overflow-y-auto bg-white p-4 sm:p-5 pb-8 shadow-xl" @keydown="keydown">
      <div class="mb-5 flex items-center justify-between">
        <h2 id="status-data-title" class="text-lg font-bold text-slate-900">
          {{ isEn ? 'Data Status' : 'Status Data' }}
        </h2>
        <button ref="closeButton" type="button" class="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          @click="$emit('close')">
          {{ isEn ? 'Close' : 'Tutup' }}
        </button>
      </div>
      <p class="rounded-xl border p-3 text-sm font-semibold"
        :class="kind === 'local-failure' ? 'border-slate-700 bg-slate-100 text-slate-900' : kind === 'failed' || kind === 'unqueued' || kind === 'reauthentication-required' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-800'">
        {{ label }}
      </p>
      <dl class="mt-4 space-y-3 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-slate-600">{{ isEn ? 'Pending synchronization' : 'Menunggu sinkronisasi' }}</dt>
          <dd class="font-bold">{{ pendingCount }} {{ isEn ? 'records' : 'data' }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-600">{{ isEn ? 'Unsuccessful attempts' : 'Percobaan belum berhasil' }}</dt>
          <dd class="font-bold">{{ failedCount }} {{ isEn ? 'records' : 'data' }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-600">{{ isEn ? 'Sync process' : 'Proses sinkronisasi' }}</dt>
          <dd class="font-bold">{{ isSyncing ? (isEn ? 'Running' : 'Berjalan') : (isEn ? 'Idle' : 'Tidak berjalan') }}</dd>
        </div>
        <div v-if="unfinishedCount > 0" class="flex justify-between gap-3">
          <dt class="text-slate-600">{{ isEn ? 'Drafts saved on device' : 'Pekerjaan tersimpan di perangkat' }}</dt>
          <dd class="font-bold">{{ unfinishedCount }} {{ isEn ? 'assessments' : 'asesmen' }}</dd>
        </div>
      </dl>
      <p v-if="kind === 'local-failure'" class="mt-4 text-sm font-semibold text-slate-900">
        {{ isEn ? 'Last save did not succeed. Review this work before leaving the page.' : 'Penyimpanan terakhir belum berhasil. Periksa pekerjaan ini sebelum meninggalkan halaman.' }}
      </p>
      <p v-else-if="!ready" class="mt-4 text-sm text-slate-700">
        {{ isEn ? 'Local storage status cannot be read yet. Do not assume data has synced.' : 'Status penyimpanan lokal belum dapat dibaca. Jangan menganggap data telah tersinkron.' }}
      </p>
      <p v-else-if="!online && pendingCount > 0" class="mt-4 text-sm text-slate-700">
        {{ isEn ? 'Data is saved on device and will retry when a connection is available.' : 'Data tersimpan di perangkat dan akan dicoba kembali saat koneksi tersedia.' }}
      </p>
      <p v-if="failedCount > 0" class="mt-3 text-sm text-amber-900">
        {{ isEn ? 'Previous synchronization did not succeed. Data stored on device remains available.' : 'Sinkronisasi sebelumnya belum berhasil. Data yang tersimpan di perangkat tetap tersedia.' }}
      </p>
      <p v-if="kind === 'reauthentication-required'" class="mt-3 text-sm text-amber-900">
        {{ isEn ? 'Data remains safe on device. Sign in again before retrying synchronization.' : 'Data tetap aman di perangkat. Masuk kembali sebelum mencoba sinkronisasi lagi.' }}
      </p>
      <p v-if="failedCount > 0 && online && !canRetry" class="mt-2 text-xs text-amber-900">
        {{ isEn ? 'Some data requires review before retrying.' : 'Sebagian data perlu diperiksa sebelum dicoba kembali.' }}
      </p>
      <p v-if="unqueuedCompletedCount > 0" class="mt-3 text-sm text-amber-900">
        {{
          isEn
            ? `${unqueuedCompletedCount} completed assessments are not queued for sync. Open Data to prepare them.`
            : `${unqueuedCompletedCount} asesmen selesai belum masuk antrean sinkronisasi. Buka Data untuk menyiapkannya kembali.`
        }}
      </p>
      <p v-if="actionError" role="alert" class="mt-3 text-sm font-semibold text-slate-900">{{ actionError }}</p>
      <button type="button" :disabled="!canRetry"
        class="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        @click="$emit('retry')">
        {{ isEn ? 'Try Synchronizing' : 'Coba Sinkronkan' }}
      </button>
      <p v-if="pendingCount > 0 && !online" class="mt-2 text-center text-xs text-slate-500">
        {{ isEn ? 'Retry when a connection is available.' : 'Coba lagi saat koneksi tersedia.' }}
      </p>
      <p class="mt-4 text-xs text-slate-500">
        {{ isEn ? 'Server receipt does not mean Healthcare has validated or dispatched support.' : 'Diterima server belum berarti Healthcare telah memvalidasi atau mengirim bantuan.' }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { OperationalKind } from '@/composables/useRelawanOperationalStatus';
import { useI18n } from '@/i18n';
import { useDialogFocus } from '@/composables/useDialogFocus';

const { isEn } = useI18n();
const props = defineProps<{
  show: boolean;
  label: string;
  kind: OperationalKind;
  ready: boolean;
  online: boolean;
  pendingCount: number;
  failedCount: number;
  unfinishedCount: number;
  unqueuedCompletedCount: number;
  isSyncing: boolean;
  canRetry: boolean;
  actionError: string;
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'retry'): void }>();
const panel = ref<HTMLElement | null>(null);
const { keydown } = useDialogFocus(panel, () => props.show, () => emit('close'));
const closeButton = ref<HTMLButtonElement | null>(null);
watch(() => props.show, async show => {
  if (show) {
    await nextTick();
    closeButton.value?.focus();
  }
});
</script>
