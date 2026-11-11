<template>
    <aside
        aria-labelledby="locked-emergency-title"
        class="mt-6 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
    >
        <h2 id="locked-emergency-title" class="font-bold">
            {{
                isEn
                    ? "Need emergency help while data is locked?"
                    : "Butuh bantuan darurat saat data terkunci?"
            }}
        </h2>
        <p>
            {{
                isEn
                    ? "If there is immediate danger, seek help directly from healthcare staff or fellow volunteers at the shelter. Use your phone to contact local emergency services at a verified number."
                    : "Jika ada bahaya segera, minta bantuan langsung kepada petugas medis atau relawan lain di posko. Gunakan telepon untuk menghubungi layanan darurat setempat melalui nomor yang telah Anda pastikan benar."
            }}
        </p>
        <p>
            {{
                isEn
                    ? "Stay with the survivor if safe and follow staff instructions. Do not wait for data to unlock before seeking help."
                    : "Tetap dampingi penyintas bila aman dan ikuti arahan petugas. Jangan menunggu data terbuka untuk mencari bantuan."
            }}
        </p>
        <p>
            {{
                isEn
                    ? "This guidance does not unlock data, create a T0 report, or transmit an emergency request. Use the unlock process above to access this account's reports."
                    : "Panduan ini tidak membuka data, membuat laporan T0, atau mengirim permintaan bantuan. Gunakan proses pembukaan data di atas untuk mengakses laporan akun ini."
            }}
        </p>
    </aside>
</template>

<script setup lang="ts">
import { useI18n } from "@/i18n";

const { isEn } = useI18n();
</script>
