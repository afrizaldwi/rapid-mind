# RAPID-MIND

RAPID-MIND adalah prototipe pendukung keputusan untuk respons kesehatan jiwa saat bencana. Satu aplikasi Laravel melayani tiga pengalaman berbasis peran: **RELAWAN**, **HEALTHCARE**, dan **ADMIN**. Rekomendasi triase sistem bukan diagnosis; keputusan klinis tetap pada Healthcare.

## Implementasi saat ini

**Baseline dokumentasi:** 7 November 2026, source `demo` pada `e85b981`.
Lihat [implementasi D1](docs/CURRENT_IMPLEMENTATION.md) untuk kontrak terperinci.

Relawan memiliki alur PFA, asesmen dan T0-Suspect dengan penyimpanan lokal/outbox.
Healthcare memiliki penanganan darurat, verifikasi klinis, serta integrasi
UI/backend Referral dan Dispatch yang terpisah. Kontrol baru memerlukan skema
pendukung; kompatibilitas lama, cutover akhir dan penerimaan runtime tetap memiliki
batas bukti. Admin memiliki ringkasan agregat, peta marker, analitik, logistik dan
provisioning; heatmap kepadatan dan langganan agregat realtime belum tersedia.

Prioritas saat ini adalah **P0 privasi/enkripsi dan keselamatan T0**, **P1 observasi
non-verbal**, serta **P2 SRQ empat keadaan**. Jawaban YES/NO/UNCLEAR/UNANSWERED
harus dibedakan; respons wajib yang belum definitif tidak menghasilkan skor
definitif. Q17 Ya memerlukan konfirmasi manusia sebelum disimpan; pengiriman T0
memerlukan tindakan eksplisit terpisah. Relawan melihat T0-Suspect dan status
pengiriman saja, bukan keputusan klinis atau progres rujukan/Dispatch.

| Checkpoint | Status dan batas bukti |
|---|---|
| B4.4 | Enrollment lokal terkontrol tercatat lulus pada profil dummy; bukan migrasi umum pengguna riil atau aktivasi produksi. Migrasi dan pembersihan plaintext tetap tujuan P0. Pemeriksaan retensi tidak menghapus data otomatis. |
| November Safety C1 | **IMPLEMENTED — ACCEPTANCE PENDING**; Chromium tercatat **18 PASS / 1 NOT TESTED**. Autentikasi/server sintetis; lock background/foreground alami belum teruji. |
| November Safety C2 / C3 | Integrasi lokal dan penerimaan keselamatan akhir **PENDING**; tidak disimpulkan selesai dari source atau hasil October STT C1/C2 yang berbeda. |

Hasil uji tercatat bukan pengujian ulang dalam penyelarasan dokumentasi ini. Aset
production-built yang diuji di localhost tidak membuktikan kesiapan deployment
produksi. Baca [ledger dan batas pengujian](docs/workflow-verification.md#november-safety-evidence)
serta [desain keamanan offline](docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md).

**Keputusan tim — 7 November 2026:** Healthcare dapat menurunkan T0-Suspect
secara eksplisit dan teraudit ke T1/T2/T3; batas lama T1/T2 telah digantikan,
bukan sertifikasi protokol klinis eksternal. Detail kasus tetap tunduk pada izin
kasus/fasilitas. Penugasan Dispatch internal bukan bukti kendaraan dihubungi atau
pasien dijemput. Laporan resmi Admin harus memakai hasil validasi Healthcare tanpa
identitas pasien; [query dan gap implementasi](docs/RAPID_MIND_ADMIN_WORKSPACE.md)
belum memenuhi seluruh kontrak tersebut. Tiga pilihan SRQ diperbolehkan dengan
unanswered terpisah; UI sekarang menampilkan empat kontrol. Status C1/C2/C3 di
atas tidak berubah.

## Teknologi

- Laravel 13, Vue 3, Inertia.js, TypeScript, Tailwind CSS 4
- PostgreSQL 17 + PostGIS melalui Docker Compose
- Laravel Reverb + Echo, queue, scheduler, Nginx
- IndexedDB + Dexie, PWA/service worker, MapLibre, ECharts

Navigasi web memakai sesi Laravel berbatas versi. Rute API memerlukan bearer JWT dengan pemeriksaan pengguna, versi token dan keluarga refresh; sesi web saja tidak mengautentikasi API. Membuka data terenkripsi offline memakai passphrase/recovery tersendiri, bukan sekadar login.

## Menjalankan lingkungan pengembangan

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
