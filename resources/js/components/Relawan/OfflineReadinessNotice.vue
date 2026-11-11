<template>
    <aside
        role="status"
        class="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700"
    >
        <p>{{ messages[offlineReadiness.state] }}</p>
        <p v-if="offlineReadiness.updateWaiting" class="mt-1">
            {{
                isEn
                    ? "Update available. Ensure drafts are saved, then close all RAPID-MIND tabs before reopening."
                    : "Pembaruan tersedia. Pastikan draf tersimpan, lalu tutup semua tab RAPID-MIND sebelum membuka kembali."
            }}
        </p>
        <button
            v-if="['ERROR', 'INCOMPLETE'].includes(offlineReadiness.state)"
            type="button"
            class="mt-1 font-semibold underline"
            @click="registerRelawanServiceWorker"
        >
            {{ isEn ? "Check offline readiness" : "Periksa kesiapan offline" }}
        </button>
    </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { offlineReadiness, registerRelawanServiceWorker } from "@/pwa/register";
import { useI18n } from "@/i18n";

const { isEn } = useI18n();

const messages = computed(() =>
    isEn.value
        ? {
              DEVELOPMENT:
                  "Development mode: offline reopen readiness has not been verified.",
              UNSUPPORTED:
                  "This browser does not yet support offline application storage.",
              INSTALLING: "Preparing application for offline use…",
              CHECKING: "Checking offline application completeness…",
              READY:
                  "Application is ready for offline use. Data requires device key; voice models are checked separately.",
              INCOMPLETE:
                  "Offline application completeness not verified yet. Connect and recheck.",
              ERROR: "Offline app preparation failed. Local data remains preserved.",
          }
        : {
              DEVELOPMENT:
                  "Mode pengembangan: kesiapan buka ulang offline belum diverifikasi.",
              UNSUPPORTED:
                  "Browser ini belum mendukung penyimpanan aplikasi offline.",
              INSTALLING: "Menyiapkan aplikasi untuk dibuka offline…",
              CHECKING: "Memeriksa kelengkapan aplikasi offline…",
              READY:
                  "Aplikasi siap dibuka offline. Data memerlukan kunci perangkat; model suara diperiksa terpisah.",
              INCOMPLETE:
                  "Kelengkapan aplikasi offline belum terverifikasi. Sambungkan lalu periksa kembali.",
              ERROR: "Persiapan aplikasi offline gagal. Data lokal tetap dipertahankan.",
          },
);
</script>
