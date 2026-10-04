<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4">
    <div class="bg-white w-full max-w-md rounded-xl shadow-2xl border border-rose-300 overflow-hidden text-center p-6 space-y-4">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-50 text-rose-700">
        <TriangleAlert class="h-8 w-8" aria-hidden="true" />
      </div>

      <h3 class="text-xl font-bold text-slate-900">
        {{ reviewOnly ? 'Ucapan Q17 Perlu Ditinjau' : 'Indikator Red Flag Terdeteksi' }}
      </h3>

      <div class="bg-red-50 text-red-900 rounded-xl p-4 text-sm text-left space-y-2 border border-red-200">
        <p v-if="reviewOnly" class="font-bold">
          Ucapan terkait Q17 memerlukan peninjauan manual. Jawaban tersimpan tidak diubah otomatis.
        </p>
        <p v-else class="font-bold">
          Penyintas mengindikasikan pikiran mengakhiri hidup (SRQ #17) atau kondisi krisis jiwa akut.
        </p>
        <p class="text-xs text-red-800">
          <strong>Protokol Etik & Keselamatan:</strong>
          {{ reviewOnly
            ? 'Periksa jawaban Q17 langsung dengan penyintas. STT tidak membuat atau mengirim T0.'
            : 'JANGAN tinggalkan penyintas sendirian. Tetap dampingi secara fisik dan picu sinyal darurat T0 ke fasilitas kesehatan terdekat.' }}
        </p>
      </div>

      <div class="pt-2 flex flex-col gap-2.5">
        <button
          v-if="!reviewOnly"
          type="button"
          @click="$emit('escalate')"
          class="w-full py-3.5 px-4 rounded-xl bg-red-800 hover:bg-red-900 text-white font-bold text-xs shadow-md transition"
        >
          BUKA VERIFIKASI T0 DARURAT
        </button>
        <button
          type="button"
          @click="$emit('dismiss')"
          class="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
        >
          {{ reviewOnly ? 'Tutup dan Periksa Q17 Manual' : 'Lanjutkan Asesmen Manual' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';

defineProps<{
  show: boolean;
  reviewOnly?: boolean;
}>();

defineEmits<{
  (e: 'escalate'): void;
  (e: 'dismiss'): void;
}>();
</script>
