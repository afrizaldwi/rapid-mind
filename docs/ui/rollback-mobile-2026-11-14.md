# Rollback koreksi mobile, 14 November 2026

## Batas dan dasar identifikasi

Pemilik membatalkan task `MOBILE UI/UX REDESIGN CORRECTION`, attachment `5a9a8608-a769-4785-8c53-97f4ade30556`. Rollback ini tidak membatalkan refinement UI sebelumnya atau tema karhutla.

`git status`, `git diff`, dan `git log` diperiksa. HEAD tetap `b2e6d889f634aadcd67b38d560cbd027c41be6ec`; redesign terakhir belum di-commit. Karena sudah ada perubahan belum di-commit sebelum task mobile, HEAD saja tidak digunakan sebagai target pemulihan.

Riwayat tool sesi digunakan untuk mengidentifikasi patch task mobile dan membaliknya secara selektif melalui patch, tanpa Git restore/reset/clean. Sebagai pemeriksaan independen, snapshot sebelum task mobile direkonstruksi dari arsip HEAD ditambah patch sesi sebelum attachment tersebut. Sebanyak 37 patch sebelumnya berhasil direkonstruksi; dua percobaan patch yang memang gagal pada saat pengerjaan juga ditolak pada rekonstruksi. Snapshot audit: `/tmp/rapid-mind-before-mobile-audit`.

Perbandingan setiap file snapshot terhadap workspace menunjukkan **nol perbedaan** sebelum laporan rollback ini ditambahkan. Audit menangkap sisa penempatan ikon Beranda dari pembalikan patch dan memperbaikinya sebelum verifikasi akhir. Tidak ada bagian source yang ditebak dari bundle hasil build.

## File existing yang dikembalikan ke versi sebelum task mobile

Path relatif terhadap `/home/daffa77/rapid-mind`:

- `resources/css/app.css`
- `resources/views/app.blade.php`
- `resources/js/layouts/RelawanLayout.vue`
- `resources/js/layouts/HealthcareLayout.vue`
- `resources/js/layouts/AdminLayout.vue`
- `resources/js/components/ui/StatusIndicator.vue`
- `resources/js/components/Relawan/OfflineReadinessNotice.vue`
- `resources/js/components/Relawan/T0Button.vue`
- `resources/js/components/Relawan/RelawanStatusDataSheet.vue`
- `resources/js/components/Relawan/LockedEmergencyGuidance.vue`
- `resources/js/components/Relawan/OfflineEncryptionGate.vue`
- `resources/js/Pages/Relawan/Home.vue`
- `resources/js/Pages/Relawan/Pfa.vue`
- `resources/js/Pages/Relawan/Assessment/Index.vue`
- `resources/js/Pages/Relawan/Data.vue`
- `resources/js/Pages/Healthcare/Emergencies/Index.vue`
- `resources/js/Pages/Admin/Summary.vue`
- `tests/Node/clinicalDomLock.test.ts`
- `tests/Browser/p0ExplicitUnlock.browser.mjs`
- `tests/Browser/uiRefinement.browser.mjs`
- `DESIGN.md`

File baru khusus task mobile berikut dihapus secara terarah melalui patch, bukan pembersihan direktori:

- `resources/js/components/Relawan/RelawanAccountSheet.vue`
- `resources/js/composables/useFieldViewport.ts`
- `tests/Node/fieldViewport.test.ts`
- `tests/Browser/mobileCorrection.browser.mjs`
- `tests/Browser/mobileBuildUpgrade.browser.mjs`
- `docs/ui/mobile-correction-2026-11-13.md`
- `docs/ui/mobile-comparison-2026-11-13.md`

Bukti gambar/log task yang dibatalkan tetap tersimpan privat di `storage/app/private/mobile-correction-20261113-m7hwrluv/evidence`; tidak dihapus.

## Perubahan yang sengaja dipertahankan

Perubahan sebelum task mobile pada file yang sama tetap ada, sehingga file-file tersebut masih dapat tampil modified di Git. Ini diharapkan, bukan sisa task mobile.

Dipertahankan: clinical unlock spesifik operasi, keamanan/DEK offline, Bantuan Darurat dan verifikasi T0, assessment/SRQ, sync/PWA, otorisasi, fokus dialog/drawer dan refinement UI yang sudah ada sebelum koreksi mobile.

File task sebelumnya yang tidak menjadi target rollback:

- `database/seeders/Competition/FixtureAccountRoster.php`
- `database/seeders/Competition/FixtureCases.php`
- `database/seeders/Competition/FixtureDefinition.php`
- `database/seeders/Competition/FixtureOrganizations.php`
- `database/seeders/CompetitionKarhutlaGeographySeeder.php`
- `tests/Feature/CompetitionFixtureSeederTest.php`
- `tests/Browser/karhutlaGeography.browser.mjs`
- `resources/js/Pages/Admin/Map.vue`
- `resources/js/Pages/Admin/MasterData/Index.vue`
- `resources/js/Pages/Admin/People/Form.vue`
- `resources/js/Pages/Admin/People/Index.vue`
- `resources/js/Pages/Auth/Login.vue`
- `resources/js/Pages/Healthcare/Patients/Index.vue`
- `resources/js/Pages/Healthcare/Referrals/Index.vue`
- `resources/js/components/Healthcare/Emergencies/EmergencyQueuePanel.vue`
- `resources/js/components/Healthcare/Emergencies/EmergencySummaryStrip.vue`
- `resources/js/components/Relawan/Assessment/SrqResponseControl.vue`
- `resources/js/components/Relawan/Assessment/SrqSafetyDialog.vue`
- `resources/js/components/Relawan/T0Verification.vue`
- `resources/js/components/ui/LanguageSwitcher.vue`
- `resources/js/composables/useWorkspaceNavigation.ts`
- `resources/js/relawan/OfflineRelawanShell.vue`
- `tests/Browser/helpers/liveLaravelProxy.mjs`
- Laporan audit/refinement/karhutla di `docs/ui` yang sudah ada sebelumnya.

Tidak mengubah database, migration, `.env`, IndexedDB, data klinis atau dependensi. Tidak melakukan mutasi Git atau memanggil seeder. Browser verifikasi menggunakan profil sintetis baru; login hanya menimbulkan aktivitas sesi biasa, tanpa workflow klinis atau administratif.

## Aset dan verifikasi

Aset dipulihkan dari `storage/app/private/mobile-correction-20261113-m7hwrluv/assets-before`, yaitu cadangan yang dibuat tepat sebelum publikasi koreksi mobile. File hasil build lain tetap disimpan agar tab yang sedang berjalan tidak kehilangan chunk; tidak dilakukan penghapusan massal atau pembersihan storage.

Build aktif kembali `assets/app-B0JHBJpf.js`, SHA-256 manifest `46b9180885c094927d3b6e9846e4321841b41a2c9796617d097053005d591042`. Manifest, worker dan entry JavaScript melalui localhost/ngrok cocok dengan cadangan. URL `http://localhost:8080` dan `https://snack-reproduce-sublet.ngrok-free.dev`.

- `git diff --check`: PASS.
- TypeScript `vue-tsc --noEmit`: PASS.
- Rebuild frontend/PWA: PASS, output `/tmp/rapid-mind-c1-pwa-XP51qq/build`.
- Setiap file hasil rebuild dan manifest cocok byte demi byte dengan cadangan sebelum mobile.
- Tes frontend: 279 PASS, 0 FAIL; log `/tmp/rapid-mind-mobile-rollback-tests.log`.
- Pengulangan pada source final setelah koreksi posisi ikon: 279 PASS, 0 FAIL; log `/tmp/rapid-mind-rollback-final.log`.
- Browser terhadap aset hasil pemulihan: 21 tampilan tiga role dan interaksi perwakilan PASS, 0 exception. Bukti `C:/Users/daffa/AppData/Local/Temp/rapid-mind-ui-rollback-9CPAgF/results.json`.

Tidak ada source yang belum dapat dipulihkan secara pasti setelah rekonstruksi dan pembandingan tersebut. Tampilan pada Android pemilik belum diperiksa langsung. Tab/PWA lama mungkin masih memakai bundle yang sudah dimuat; setelah pekerjaan tersimpan, tutup semua jendela RAPID-MIND lalu buka kembali. Jangan menghapus data situs untuk memperbarui tampilan.

Laporan rollback ini merupakan satu file dokumentasi baru setelah pemulihan. Tidak commit/push.
