<template>
    <aside
        role="status"
        class="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700"
    >
        <p>{{ messages[offlineReadiness.state] }}</p>
        <p v-if="offlineReadiness.updateWaiting" class="mt-1">
            Pembaruan tersedia. Pastikan draf tersimpan, lalu tutup semua tab
            RAPID-MIND sebelum membuka kembali.
        </p>
        <button
            v-if="['ERROR', 'INCOMPLETE'].includes(offlineReadiness.state)"
            type="button"
            class="mt-1 font-semibold underline"
            @click="registerRelawanServiceWorker"
        >
            Periksa kesiapan offline
        </button>
    </aside>
</template>

<script setup lang="ts">
import { offlineReadiness, registerRelawanServiceWorker } from "@/pwa/register";

const messages = {
    DEVELOPMENT:
        "Mode pengembangan: kesiapan buka ulang offline belum diverifikasi.",
    UNSUPPORTED: "Browser ini belum mendukung penyimpanan aplikasi offline.",
    INSTALLING: "Menyiapkan aplikasi untuk dibuka offline…",
    CHECKING: "Memeriksa kelengkapan aplikasi offline…",
    READY: "Aplikasi siap dibuka offline. Data memerlukan kunci perangkat; model suara diperiksa terpisah.",
    INCOMPLETE:
        "Kelengkapan aplikasi offline belum terverifikasi. Sambungkan lalu periksa kembali.",
    ERROR: "Persiapan aplikasi offline gagal. Data lokal tetap dipertahankan.",
};
</script>
