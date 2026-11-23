# Unlock UX dan bantuan darurat, 13 November 2026

## Root cause dan audit

Formulir sebelumnya menempatkan recovery sebagai metode setara melalui dropdown dan bantuan darurat berupa paragraf panjang. Kunci memori sudah bertahan selama navigasi same-document yang sah; permintaan berulang setelah hidden/pagehide/reload berasal dari batas penguncian yang disengaja, bukan alasan untuk menyimpan rahasia persisten. Tidak ada perubahan durasi atau kebijakan kunci.

Sumber: AGENTS.md; docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md; docs/workflow.md; docs/workflow-verification.md; docs/CURRENT_IMPLEMENTATION.md; clinicalKeyEnrollment, offlineCrypto, encryptedClinicalStorage, clinicalStorageInitialization, clinicalAccessFence, emergencyWorkflow, syncManager, RelawanLayout dan bootstrap/navigasi offline; route dan boundary autentikasi yang telah diaudit pada checkpoint P0 sebelumnya. Bukti historis tetap historis, bukan hasil uji baru.

## Architecture decision

Dua jalur pada gate yang sama:

- Clinical access: passphrase utama, recovery lewat tindakan sekunder. Pergantian metode mengosongkan input rahasia dan error. Enrollment, konfirmasi recovery, AES-256-GCM, owner, key-generation fence, invalidation dan sinkronisasi tetap memakai modul semula.
- Emergency assistance: tombol native yang membuka panel independen dari form dan DEK. Tidak membaca repository, menulis penyimpanan, memanggil backend, mengirim T0, atau membuka data. Panel tersedia juga pada gate enrollment/legacy/inconsistent. Status navigator.onLine diberi label jaringan perangkat, bukan bukti server terhubung. Panduan aman dan keterbatasan pengiriman tampil jelas.

Pemilik mengonfirmasi tidak ada kontak terverifikasi. Karena itu UI menyatakan kontak belum tersedia, tanpa nomor fiktif, asumsi nomor nasional, tautan tel kosong, atau klaim petugas dapat dihubungi. Tidak menambahkan konfigurasi kontak spekulatif. Nomor dan kewenangan publikasinya perlu diverifikasi sebelum fitur panggilan dapat diisi.

T0 online tanpa DEK tidak diimplementasikan. Jalur kini memakai createLocalEmergency untuk menyimpan event dan outbox prioritas 1 secara atomik melalui repository terenkripsi sebelum delivery. Melewati DEK akan memerlukan jalur transaksi/durability baru serta desain idempotensi, auth/ownership, kegagalan respons dan verifikasi manusia tersendiri. Browser online bukan bukti sesi server valid. Tidak ada plaintext outbox atau bypass sementara. Pelaporan offline tanpa DEK tetap pekerjaan kriptografi terpisah.

## Files changed

- resources/js/components/Relawan/OfflineEncryptionGate.vue: judul dan penjelasan singkat, passphrase utama, recovery sekunder, kontrol fokus/area tekan dan jarak mobile.
- resources/js/components/Relawan/LockedEmergencyGuidance.vue: panel bantuan toggle, status jaringan reaktif, daftar tindakan singkat, empty state kontak, penegasan tidak ada laporan terkirim.
- tests/Node/offlineGatePreservation.test.ts: penyesuaian judul dan regresi perpindahan metode tanpa perubahan storage/unlock.
- tests/Node/lockedEmergencyAssistance.test.ts: komponen bantuan sebenarnya, toggle/aria, online/offline dan tiadanya form/tautan nomor.
- tests/Browser/p0ExplicitUnlock.browser.mjs: recovery sekunder, bantuan terkunci melalui Space, viewport390, overflow, tap target, ciphertext tetap utuh/pasien tersembunyi dan screenshot.
- docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md dan docs/CURRENT_IMPLEMENTATION.md: adendum bertanggal, tanpa menimpa evidence lama.
- Dokumen ini.

## User flow

Online/locked: buka dengan passphrase, atau pilih pemulihan. Bantuan bisa dibuka tanpa unlock; status jaringan tidak mengklaim autentikasi/receipt server.
Offline/locked: gate dan bantuan tersedia setelah shell PWA tersimpan; unlock memakai kunci yang sudah terdaftar dan continuity yang sah. Enrollment baru tetap membutuhkan server. Tidak ada T0 yang dikirim oleh panel.
Unlocked: navigasi sah mempertahankan sesi kunci memori tanpa prompt baru. Hidden/pagehide/reload/logout/pergantian owner tetap membatalkan akses; tidak ada perubahan untuk memperpanjang sesi secara diam-diam.

## Security invariants / threat model

Perangkat dipinjam saat locked: panel bantuan tidak memuat identitas/riwayat klinis. DOM klinis tetap ditutup; pengujian browser memastikan nama pasien tidak tampak dan ciphertext tidak berubah.
Recovery disangka login: tetap metode membuka DEK lokal, bukan autentikasi server. Tidak ada endpoint baru.
Koneksi palsu/putus: navigator.onLine tidak dijadikan status server/receipt; panel secara eksplisit tidak mengirim apa pun.
Stale state, logout, owner switch dan reload: mekanisme invalidasi/generation yang ada dipertahankan dan regresi navigasinya diuji kembali.
Nomor salah/kedaluwarsa: saat tidak tersedia kontak terverifikasi, tidak menampilkan nomor/tombol telepon. Penyiapan daftar kontak dan governance verifikasinya menunggu input nyata.
Tidak ada rahasia baru di IndexedDB, local/sessionStorage, cache atau history. Komponen bantuan hanya ref expanded/online di memori dan listener jaringan yang dilepas saat unmount. Kriptografi, storage schema, backend, dependensi dan lockfiles tidak diubah.

## Test results

Automated Node: 55 PASS. Sebelas pada offlineGatePreservation dan lockedEmergencyAssistance; 44 pada offlineCrypto, offlineNavigation, offlineRelawanLink, offlineRecoveryConfirmation, offlineAssessmentRegression, emergencyDelivery, localEmergencyDetail. Meliputi navigasi satu unlock, simulated hidden/pagehide, logout/owner switch, race, assessment/outbox/sync retry, enkripsi dan status delivery.

TypeScript vue-tsc --noEmit: PASS. Build produksi terisolasi: PASS, /tmp/rapid-mind-c1-pwa-kSBEhl/build. Public build/hot tidak berubah.

Browser: 11 skenario PASS di Chrome nyata/IndexedDB/service worker dengan profil sintetis baru, mock HTTP tertutup (bukan Laravel live), zero uncaught exceptions. Run akhir C:/Users/daffa/AppData/Local/Temp/rapid-mind-p0-browser-OBawlt/results.json. Screenshot 02a-locked-assistance-mobile.png diperiksa visual. Bantuan diaktifkan dengan Space pada390px, aria-expanded true, target>=44px, tanpa overflow. Bukti tes membandingkan storage saat bantuan terkunci, tidak ada tel dan pasien tidak tampak. Recovery tetap membuka kunci yang sama setelah reload offline. Run pertama m2Q24g juga dipertahankan; bukan tambahan jumlah skenario unik.

Mechanical UI detector: [] pada dua komponen. Diff-check file checkpoint: PASS. Diff-check seluruh repo: whitespace pada design-system.html dan public/design-system.html di luar lingkup, tidak diperbaiki. Tidak ada edit kedua file tersebut oleh pekerjaan ini.

Belum dilakukan: manual lapangan, native mobile background/foreground, seluruh kombinasi keyboard/screen reader/browser, telepon/SMS karena tidak ada kontak, integrasi Laravel/Reverb ulang pada UI baru, full C2/C3/produksi. PHP tidak diubah dan suite PHP tidak dijalankan ulang. Simulasi lifecycle Node bukan bukti natural native locking.

## Remaining risks dan next steps

Bantuan komunikasi belum memiliki nomor nyata. Tidak ada jaminan keselamatan operasional dari panel semata. Penguncian background sengaja tetap ketat dan beban unlock setelah background belum dihilangkan. PWA first install/offline cold load tanpa shell tidak dijamin. Aset kandidat belum dipublikasikan ke localhost. Lanjut hanya setelah review: verifikasi kontak operasional, publikasi kandidat yang disetujui, pengujian field/native background dan integrasi live sesuai checkpoint baru.

Tidak ada reset, penghapusan data/profil, migrasi kunci lama, dependensi baru, mutasi Git, atau perubahan triage. Berhenti untuk review.
