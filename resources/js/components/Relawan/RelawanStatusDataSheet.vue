<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50"
    @click.self="$emit('close')">
    <section role="dialog" aria-modal="true" aria-labelledby="status-data-title"
      class="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8 shadow-2xl" @keydown.esc="$emit('close')">
      <div class="mb-5 flex items-center justify-between">
        <h2 id="status-data-title" class="text-lg font-bold text-slate-900">Status Data</h2>
        <button ref="closeButton" type="button" class="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          @click="$emit('close')">Tutup</button>
      </div>
      <p class="rounded-xl border p-3 text-sm font-semibold"
        :class="kind === 'local-failure' ? 'border-slate-700 bg-slate-100 text-slate-900' : kind === 'failed' || kind === 'unqueued' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-800'">
        {{ label }}
      </p>
      <dl class="mt-4 space-y-3 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-slate-600">Menunggu sinkronisasi</dt>
          <dd class="font-bold">{{ pendingCount }} data</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-600">Percobaan belum berhasil</dt>
          <dd class="font-bold">{{ failedCount }} data</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-600">Proses sinkronisasi</dt>
          <dd class="font-bold">{{ isSyncing ? 'Berjalan' : 'Tidak berjalan' }}</dd>
        </div>
        <div v-if="unfinishedCount > 0" class="flex justify-between gap-3">
          <dt class="text-slate-600">Pekerjaan tersimpan di perangkat</dt>
          <dd class="font-bold">{{ unfinishedCount }} asesmen</dd>
        </div>
      </dl>
      <p v-if="kind === 'local-failure'" class="mt-4 text-sm font-semibold text-slate-900">Penyimpanan terakhir belum berhasil. Periksa
        pekerjaan ini sebelum meninggalkan halaman.</p>
      <p v-else-if="!ready" class="mt-4 text-sm text-slate-700">Status penyimpanan lokal belum dapat dibaca. Jangan
        menganggap data telah tersinkron.</p>
      <p v-else-if="!online && pendingCount > 0" class="mt-4 text-sm text-slate-700">Data tersimpan di perangkat dan
        akan dicoba kembali saat koneksi tersedia.</p>
      <p v-if="failedCount > 0" class="mt-3 text-sm text-amber-900">Sinkronisasi sebelumnya belum berhasil. Data yang
        tersimpan di perangkat tetap tersedia.</p>
      <p v-if="failedCount > 0 && online && !canRetry" class="mt-2 text-xs text-amber-900">Sebagian data perlu diperiksa sebelum dicoba kembali.</p>
      <p v-if="unqueuedCompletedCount > 0" class="mt-3 text-sm text-amber-900">{{ unqueuedCompletedCount }} asesmen
        selesai belum masuk antrean sinkronisasi. Buka Data untuk menyiapkannya kembali.</p>
      <p v-if="actionError" role="alert" class="mt-3 text-sm font-semibold text-slate-900">{{ actionError }}</p>
      <button type="button" :disabled="!canRetry"
        class="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        @click="$emit('retry')">Coba Sinkronkan</button>
      <p v-if="pendingCount > 0 && !online" class="mt-2 text-center text-xs text-slate-500">Coba lagi saat koneksi
        tersedia.</p>
      <p class="mt-4 text-xs text-slate-500">Diterima server belum berarti Healthcare telah memvalidasi atau mengirim
        bantuan.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { OperationalKind } from '@/composables/useRelawanOperationalStatus';

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
defineEmits<{ (e: 'close'): void; (e: 'retry'): void }>();
const closeButton = ref<HTMLButtonElement | null>(null);
watch(() => props.show, async show => {
  if (show) {
    await nextTick();
    closeButton.value?.focus();
  }
});
</script>
