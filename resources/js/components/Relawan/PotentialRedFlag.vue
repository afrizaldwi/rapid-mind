<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4">
    <div class="bg-white w-full max-w-md rounded-xl shadow-2xl border border-rose-300 overflow-hidden text-center p-6 space-y-4">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-50 text-rose-700">
        <TriangleAlert class="h-8 w-8" aria-hidden="true" />
      </div>

      <h3 class="text-xl font-bold text-slate-900">
        {{
          reviewOnly
            ? (isEn ? 'Q17 Speech Requires Review' : 'Ucapan Q17 Perlu Ditinjau')
            : (isEn ? 'Red Flag Indicator Detected' : 'Indikator Red Flag Terdeteksi')
        }}
      </h3>

      <div class="bg-red-50 text-red-900 rounded-xl p-4 text-sm text-left space-y-2 border border-red-200">
        <p v-if="reviewOnly" class="font-bold">
          {{
            isEn
              ? 'Speech related to Q17 requires manual review. Saved answers were not changed automatically.'
              : 'Ucapan terkait Q17 memerlukan peninjauan manual. Jawaban tersimpan tidak diubah otomatis.'
          }}
        </p>
        <p v-else class="font-bold">
          {{
            isEn
              ? 'Survivor indicates thoughts of ending life (SRQ #17) or acute psychiatric crisis.'
              : 'Penyintas mengindikasikan pikiran mengakhiri hidup (SRQ #17) atau kondisi krisis jiwa akut.'
          }}
        </p>
        <p class="text-xs text-red-800">
          <strong>{{ isEn ? 'Ethics & Safety Protocol:' : 'Protokol Etik & Keselamatan:' }}</strong>
          {{
            reviewOnly
              ? (isEn
                  ? 'Verify Q17 response directly with the survivor. STT never creates or submits a T0 report.'
                  : 'Periksa jawaban Q17 langsung dengan penyintas. STT tidak membuat atau mengirim T0.')
              : (isEn
                  ? 'DO NOT leave the survivor alone. Stay with them physically and trigger a T0 emergency signal to the nearest health facility.'
                  : 'JANGAN tinggalkan penyintas sendirian. Tetap dampingi secara fisik dan picu sinyal darurat T0 ke fasilitas kesehatan terdekat.')
          }}
        </p>
      </div>

      <div class="pt-2 flex flex-col gap-2.5">
        <button
          v-if="!reviewOnly"
          type="button"
          @click="$emit('escalate')"
          class="w-full py-3.5 px-4 rounded-xl bg-red-800 hover:bg-red-900 text-white font-bold text-xs shadow-md transition"
        >
          {{ isEn ? 'OPEN T0 EMERGENCY VERIFICATION' : 'BUKA VERIFIKASI T0 DARURAT' }}
        </button>
        <button
          type="button"
          @click="$emit('dismiss')"
          class="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
        >
          {{
            reviewOnly
              ? (isEn ? 'Close and Check Q17 Manually' : 'Tutup dan Periksa Q17 Manual')
              : (isEn ? 'Continue Manual Assessment' : 'Lanjutkan Asesmen Manual')
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import { useI18n } from '@/i18n';

const { isEn } = useI18n();

defineProps<{
  show: boolean;
  reviewOnly?: boolean;
}>();

defineEmits<{
  (e: 'escalate'): void;
  (e: 'dismiss'): void;
}>();
</script>
