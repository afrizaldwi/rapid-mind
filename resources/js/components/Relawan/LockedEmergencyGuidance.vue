<template>
    <aside aria-labelledby="locked-emergency-title" class="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-800">
        <h2 id="locked-emergency-title" class="font-bold">{{ isEn ? 'Help without opening patient data' : 'Bantuan tanpa membuka data pasien' }}</h2>
        <button type="button" :aria-expanded="expanded" aria-controls="locked-emergency-panel"
            class="mt-3 min-h-11 w-full rounded-lg bg-red-800 px-4 py-3 font-bold text-white hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
            @click="expanded = !expanded">{{ isEn ? 'Emergency Assistance' : 'Bantuan Darurat' }}</button>
        <div v-if="expanded" id="locked-emergency-panel" class="mt-4 space-y-3">
            <p role="status" class="font-semibold">{{ online
                ? (isEn ? 'Device network available. Server connection has not been verified.' : 'Jaringan perangkat tersedia. Koneksi server belum dipastikan.')
                : (isEn ? 'Device offline. Assistance information remains available.' : 'Perangkat offline. Informasi bantuan tetap tersedia.') }}</p>
            <p>{{ isEn ? 'No verified assistance contacts are configured. Ask healthcare staff or fellow volunteers at the shelter for help directly.' : 'Kontak bantuan terverifikasi belum tersedia. Minta bantuan langsung kepada petugas medis atau relawan lain di posko.' }}</p>
            <ul class="list-disc space-y-2 pl-5">
                <li>{{ isEn ? 'Stay with the survivor if safe and follow staff instructions.' : 'Dampingi penyintas bila aman dan ikuti arahan petugas.' }}</li>
                <li>{{ isEn ? 'Use your phone if you have a verified local assistance number. Telephone service depends on the device and cellular network.' : 'Gunakan telepon jika Anda memiliki nomor bantuan setempat yang sudah dipastikan benar. Panggilan bergantung pada perangkat dan jaringan seluler.' }}</li>
                <li>{{ isEn ? 'Do not wait for patient data to unlock before seeking help.' : 'Jangan menunggu data pasien terbuka untuk mencari bantuan.' }}</li>
            </ul>
            <p class="font-medium">{{ isEn ? 'This panel does not create or send a T0 report or call anyone automatically. No request has been sent through this panel.' : 'Panel ini tidak membuat atau mengirim laporan T0 dan tidak menelepon otomatis. Tidak ada permintaan yang dikirim melalui panel ini.' }}</p>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '@/i18n';
const { isEn } = useI18n();
const expanded = ref(false);
const online = ref(typeof navigator !== 'undefined' && navigator.onLine);
function updateNetwork() { online.value = navigator.onLine; }
onMounted(() => {
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
});
onUnmounted(() => {
    window.removeEventListener('online', updateNetwork);
    window.removeEventListener('offline', updateNetwork);
});
</script>
