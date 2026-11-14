# Tema demo karhutla Palangka Raya

## Hasil

Seeder baru dan data demo localhost memakai tiga rujukan posko karhutla Palangka Raya berikut. Nama mengikuti penyebutan dalam laporan resmi; bukan verifikasi status operasional saat ini.

| Posko | Latitude | Longitude |
| --- | --- | --- |
| Posko Patdu Kel. Menteng | -2.270258 | 113.89232 |
| Posko Patdu Kel. Palangka | -2.23158 | 113.86185 |
| Posko Patdu Kel. Petuk Katimpun | -2.14536 | 113.8443 |

Sumber historis nama dan koordinat: [Laporan Harian Pos Komando, PPID Kemendagri](https://ppid.kemendagri.go.id/storage/dokumen/4N0Kyt8xKK5WfyDhPGXtaY5dX5QLILmiAHxEdDwc.pdf), bagian Kota Palangka Raya, Posko Patdu Kecamatan Jekan Raya. Fakta tersedia dalam indeks teks publik; unduhan penuh sumber melalui alat browsing mengalami timeout. Tanggal persis dan status aktif saat ini tidak diklaim. Penggunaan titik untuk kasus demo merupakan keputusan simulasi, bukan lokasi pasien nyata. [InfoPublik](https://infopublik.id/kategori/nusantara/767312/index.html) juga mendokumentasikan pengaktifan posko karhutla Petuk Katimpun pada 2023, bukan bukti bahwa layanan tersebut aktif sekarang.

Pasien, asesmen, faskes dan kejadian tetap sintetis. Alamat posko menyatakan konteks simulasi dan rujukan historis. Faskes A/B tetap bernama sintetis; koordinatnya ilustratif di sekitar wilayah demo, bukan koordinat fasilitas kesehatan nyata. Geometri region adalah envelope demonstrasi, bukan batas administratif resmi. Tidak menambahkan nomor bantuan atau klaim pengiriman eksternal.

## File yang diubah pada checkpoint ini

Path relatif terhadap `/home/daffa77/rapid-mind`:

- `database/seeders/Competition/FixtureDefinition.php`: nama, koordinat, catatan simulasi, versi geografis, envelope dan lokasi faskes ilustratif.
- `database/seeders/Competition/FixtureOrganizations.php`: instalasi fixture baru mengambil definisi geografis tersebut.
- `database/seeders/Competition/FixtureCases.php`: kejadian sintetis baru mengikuti titik posko pemiliknya.
- `database/seeders/Competition/FixtureAccountRoster.php`: kompatibilitas nama fixture lama dan nama geografis baru, tetap memverifikasi marker, ID, role dan penugasan.
- `database/seeders/CompetitionKarhutlaGeographySeeder.php`: pembaruan eksplisit data demo yang sudah ada, dalam transaksi, tanpa membuat ulang kasus.
- `resources/js/Pages/Admin/Map.vue`: pusat awal mengikuti lokasi posko dari server; penyesuaian bounds langsung tanpa perjalanan animasi dari Yogyakarta.
- `resources/js/Pages/Admin/Summary.vue`: perbaikan pusat/bounds yang sama pada peta ringkasan.
- `tests/Feature/CompetitionFixtureSeederTest.php`: nama baru, pelestarian data nongeografis, idempotensi dan rollback ketika kepemilikan kasus tidak cocok.
- `tests/Browser/karhutlaGeography.browser.mjs`: pemeriksaan browser kandidat/publikasi dengan profil Chrome baru dan akun demo yang sudah ada.
- `docs/ui/karhutla-geography-2026-11-13.md`: laporan ini.

Perubahan UI sebelumnya tetap berada pada working tree; tidak dibatalkan atau di-commit.

## Pelestarian dan backup

Backup penuh PostgreSQL sebelum pembaruan: `storage/app/private/karhutla-20261113/database-before.dump`, SHA-256 `55f0ffb678ff2ee129ab774be8224350e0eca934c0b30ac4376ebbab54a4b2c4`. `pg_restore --list` berhasil membaca 299 baris daftar arsip. Tidak melakukan uji restore atau menimpa database untuk mengujinya.

Pembaruan terbatas pada satu region, tiga posko, dua koordinat faskes sintetis dan lima koordinat kejadian fixture. ID, nama akun, password, penugasan, kepemilikan, status klinis, waktu, jawaban SRQ, skor, rujukan, dispatch dan riwayat keputusan tetap dipertahankan. Tidak menafsirkan ulang klinis akibat perubahan tema.

Snapshot hash/count sebelum dan sesudah disimpan privat sebagai `before-fingerprints.json` dan `after-fingerprints.json`. Dua puluh tiga tabel di luar tabel geografis/audit tetap identik; pada `emergency_events`, hash seluruh kolom selain latitude/longitude juga identik. Jumlah baris seluruh tabel yang diperiksa tetap sama kecuali penambahan audit geografis. Tabel operasional sementara seperti session/cache/job dikecualikan dari pembandingan karena dapat berubah secara independen.

Audit `COMPETITION_GEOGRAPHY_UPDATED` menyimpan geografi lama tanpa menimpa audit klinis terdahulu. Seeder ulang tidak mengubah data lagi. Tidak menjalankan reset, truncate, penghapusan data, perubahan schema, migrasi kunci atau pembersihan IndexedDB. Snapshot terenkripsi lama pada perangkat tidak dimigrasikan; label posko offline yang telah tercache mungkin tetap menampilkan nama lama sampai penyegaran server yang didukung aplikasi.

## Verifikasi dan publikasi

- Docker PHP: `php artisan test --filter='CompetitionFixtureSeederTest|CompetitionDemoAccountsTest' --compact`, 28 tes lulus, 523 assertions. Database `rapid_mind_testing`, transaksi rollback per tes; tidak memakai reset.
- TypeScript `vue-tsc --noEmit` dan build Vite/PWA kandidat lulus.
- Seeder geografis dijalankan pada PostgreSQL demo `rapid_mind` dengan opt-in console/local dan transport inert, sesudah backup. Snapshot integritas dan pengulangan tanpa perubahan lulus.
- Browser Chrome kandidat dan Nginx: nama ketiga posko, data koordinat Palangka Raya dari server, marker di dalam viewport serta akun Relawan yang masih terhubung ke Menteng lulus, tanpa exception aplikasi.
- Bukti final: `C:/Users/daffa/AppData/Local/Temp/rapid-mind-karhutla-ru28so/results.json` dan dua gambar dalam direktori yang sama. Salinan bukti disimpan pada direktori backup privat.
- Profil proxy tertutup memblokir tile eksternal OpenStreetMap. Screenshot membuktikan marker/nama, bukan ketersediaan penyedia basemap atau ketepatan posisi lapangan saat ini. Tidak mengklaim pengujian perangkat fisik atau offline/realtime baru pada checkpoint geografis ini.
- `git diff --check` lulus. Tidak mengubah dependensi atau lockfile, tidak commit/push.

URL aktif `http://localhost:8080/admin/map`; ringkasan `http://localhost:8080/admin/summary`. Entry build `assets/app-B0JHBJpf.js`, SHA-256 manifest `46b9180885c094927d3b6e9846e4321841b41a2c9796617d097053005d591042`. Seluruh 69 file kandidat cocok byte demi byte dengan respons Nginx. Aset sebelum perubahan disimpan pada `storage/app/private/karhutla-20261113/assets-before`; chunk lama tetap tersedia. Tidak perlu menghapus data situs untuk memuat pembaruan.

Langkah berikutnya: review nama/lokasi pada kedua halaman setelah refresh. Jangan memakai titik demo atau label aktif aplikasi sebagai petunjuk layanan darurat nyata. Bila pemilik memilih wilayah karhutla lain, tentukan sumber geografisnya dahulu dan lakukan checkpoint pembaruan terpisah.
