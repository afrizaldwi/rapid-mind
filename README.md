# RAPID-MIND

RAPID-MIND adalah prototipe pendukung keputusan untuk respons kesehatan jiwa saat bencana. Satu aplikasi Laravel melayani tiga pengalaman berbasis peran: **RELAWAN**, **HEALTHCARE**, dan **ADMIN**. Rekomendasi triase sistem bukan diagnosis; keputusan klinis tetap pada Healthcare.

## Implementasi saat ini

**Baseline dokumentasi:** 10 November 2026, source `demo` pada `7076e13`.
Lihat [implementasi saat ini](docs/CURRENT_IMPLEMENTATION.md) dan
[handoff P0](P0-HANDOFF.md) untuk kontrak serta batas bukti.

Relawan memiliki alur PFA, asesmen dan T0-Suspect dengan penyimpanan lokal/outbox.
Healthcare memiliki penanganan darurat, verifikasi klinis, serta Referral dan
Dispatch yang terpisah, dengan otorisasi kasus/fasilitas pada query, mutasi,
riwayat, counter dan audience realtime. Migrasi November dan provisioning sintetis
tercatat selesai; kompatibilitas lama dan penerimaan menyeluruh tetap terbatas.
Admin memiliki ringkasan agregat, peta marker, analitik, logistik dan
provisioning; heatmap kepadatan dan langganan agregat realtime belum tersedia.

Prioritas saat ini adalah **P0 privasi/enkripsi dan keselamatan T0**, **P1 observasi
non-verbal**, serta **P2 SRQ empat keadaan**. Jawaban YES/NO/UNCLEAR/UNANSWERED
harus dibedakan; respons wajib yang belum definitif tidak menghasilkan skor
definitif. Q17 Ya memerlukan konfirmasi manusia sebelum disimpan; pengiriman T0
memerlukan tindakan eksplisit terpisah. Relawan melihat T0-Suspect dan status
pengiriman saja, bukan keputusan klinis atau progres rujukan/Dispatch.

| Klasifikasi | Status |
| --- | --- |
| P0 IMPLEMENTED | YES |
| P0 CORE BROWSER VERIFIED | YES |
| P0 LOCAL DEMO ACCEPTANCE | CONDITIONAL PASS |
| Natural background/foreground privacy locking | NOT TESTED |
| Production security acceptance | NOT ESTABLISHED |

Tujuh hasil browser PASS historis dan enam uji keamanan runner dipertahankan.
P1/P2 telah banyak diimplementasikan dengan cakupan otomatis, tetapi penerimaan
lengkap masih pending. **C2 NOT ACCEPTED; C3 belum dimulai.** Uji native lock dan
penerimaan P1/P2 serta sisa C2/C3 menjadi tanggung jawab tim penerima.

Commit `7076e13` memisahkan navigasi Inertia online, bootstrap dokumen PWA offline,
dan navigasi dalam dokumen pada shell offline yang sudah dibuka kuncinya. Route
Relawan yang didukung tidak lagi reload setiap pindah halaman. Reload/pagehide,
visibility, logout, pergantian pemilik dan invalidasi worker tetap mengunci akses.
Pemilik melaporkan uji manual Chrome offline berhasil setelah aktivasi service
worker terkontrol; ini verifikasi terbatas, bukan suite penerimaan lengkap.
Bukti otomatis tercatat: 64 tes PASS, subset akhir 13 tes PASS lagi, type-check
PASS dan diff-check PASS; tidak dijalankan ulang dalam penyelarasan ini.

Password login dan passphrase enkripsi offline tetap terpisah. Perbaikan UX dua
prompt online **DEFERRED**. Revisi SRQ tiga tombol menjadi tugas tim penerima;
source masih memakai empat kontrol dan empat keadaan data tidak berubah.

Hasil uji tercatat bukan pengujian ulang dalam penyelarasan dokumentasi ini. Aset
production-built yang diuji di localhost tidak membuktikan kesiapan deployment
produksi. Baca [ledger dan batas pengujian](docs/workflow-verification.md#november-10-handoff)
serta [desain keamanan offline](docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md).

**Keputusan tim — 7 November 2026:** Healthcare dapat menurunkan T0-Suspect
secara eksplisit dan teraudit ke T1/T2/T3; batas lama T1/T2 telah digantikan,
bukan sertifikasi protokol klinis eksternal. Detail kasus tetap tunduk pada izin
kasus/fasilitas. Penugasan Dispatch internal bukan bukti kendaraan dihubungi atau
pasien dijemput. Laporan resmi Admin harus memakai hasil validasi Healthcare tanpa
identitas pasien; [query dan gap implementasi](docs/RAPID_MIND_ADMIN_WORKSPACE.md)
belum memenuhi seluruh kontrak tersebut. Tiga pilihan SRQ diperbolehkan dengan
unanswered terpisah; UI sekarang menampilkan empat kontrol. Status penerimaan
terkini mengikuti tabel klasifikasi di atas.

## Teknologi

- Laravel 13, Vue 3, Inertia.js, TypeScript, Tailwind CSS 4
- PostgreSQL 17 + PostGIS melalui Docker Compose
- Laravel Reverb + Echo, queue, scheduler, Nginx
- IndexedDB + Dexie, PWA/service worker, MapLibre, ECharts

Navigasi web memakai sesi Laravel berbatas versi. Rute API memerlukan bearer JWT dengan pemeriksaan pengguna, versi token dan keluarga refresh; sesi web saja tidak mengautentikasi API. Membuka data terenkripsi offline memakai passphrase/recovery tersendiri, bukan sekadar login.

## Kebijakan handoff lokal

Keputusan SQL/history **RESOLVED**: repository `afrizaldwi/rapid-mind`, riwayat,
dan SQL backup sintetis historis tetap dipertahankan sesuai persetujuan pemilik.
Jangan sertakan kredensial lokal, recovery code, browser profile, capture debug
atau bukti privat dalam transfer. Persetujuan dummy historis tidak mencakup data
klinis riil atau kredensial pribadi yang dapat digunakan kembali.

DevTools lokal telah diverifikasi nonaktif. Setiap rekan harus mengatur
`INERTIA_DEVTOOLS_ENABLED=false` pada `.env` lokal yang Git-ignored dan memverifikasi
sendiri sebelum demo bersama. Jangan menyalin `.env` privat milik pemilik.

## Menjalankan lingkungan pengembangan

Perintah berikut untuk setup lingkungan baru oleh pemilik/tim, bukan instruksi
untuk mengulang backup, migrasi, seed atau publikasi pada development yang ada.
Prasyarat: Docker Compose dan Node/npm pada host. PHP, Composer, Laravel, dan PostgreSQL berjalan di container. Pemilik proyek memasang dependensi frontend dengan Node/npm. Tinjau `.env` dan tujuan database sebelum memulai; salin contoh hanya jika `.env` belum ada.

```bash
cp -n .env.example .env
docker compose build
docker compose up -d postgres app
docker compose exec -T app composer install
```

Untuk `.env` baru, jalankan masing-masing perintah berikut hanya jika nilai `APP_KEY` atau `JWT_SECRET` yang bersangkutan masih kosong. Jangan regenerasi kunci yang sudah dipakai lingkungan berjalan.

```bash
docker compose exec -T app php artisan key:generate
docker compose exec -T app php artisan jwt:secret
```

Setelah dependensi backend tersedia, pemilik proyek memasang dependensi frontend dan membangun aset. Kemudian mulai layanan lainnya:

```bash
npm ci
npm run build
docker compose up -d queue scheduler reverb nginx
```

**Migrasi mengubah state database.** Jalankan hanya setelah memastikan lingkungan dan database tujuan aman serta tindakan ini telah disetujui:

```bash
docker compose exec -T app php artisan migrate
```

Nginx melayani aplikasi di `http://localhost:8080` sesuai `compose.yaml`. Kredensial demo, bila diperlukan, bergantung pada data yang benar-benar disiapkan di lingkungan tersebut.

## Indeks dokumentasi

- [Baseline kebutuhan asli](docs/workflow.md) — dipertahankan; keputusan keselamatan yang disetujui kemudian berlaku atas asumsi lama yang bertentangan.
- [Handoff layar](docs/RAPID_MIND_FINAL_SCREEN_INVENTORY_IMPLEMENTATION_HANDOFF.md) — rancangan interaksi dan catatan supersesi November.
- [Rencana teknis](docs/RAPID_MIND_TECHNICAL_PLAN.md) — arsitektur, status, dan kesenjangan implementasi.
- [Implementasi saat ini](docs/CURRENT_IMPLEMENTATION.md) — kontrak P0–P2, inventaris implementasi dan batas bukti.
- [Keamanan offline](docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md) — enrollment, migrasi/retensi dan batas penerimaan.
- [Spesifikasi Relawan](docs/RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md), [Healthcare](docs/RAPID_MIND_HEALTHCARE_WORKSPACE.md), dan [Referral/Dispatch](docs/RAPID_MIND_REFERRAL_RESPONSE_INTERACTION.md).
- [Dokumentasi sistem](docs/RAPID_MIND_DOKUMENTASI_SISTEM.md) — ikhtisar sistem dan formula triase.
- [Ledger verifikasi](docs/workflow-verification.md) dan [catatan perubahan](docs/changes-notes.md) — bukti serta riwayat checkpoint.
- [Instruksi agen](AGENTS.md) — aturan kerja dan prioritas sumber.
