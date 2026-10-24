# RAPID-MIND

RAPID-MIND adalah prototipe pendukung keputusan untuk respons kesehatan jiwa saat bencana. Satu aplikasi Laravel melayani tiga pengalaman berbasis peran: **RELAWAN**, **HEALTHCARE**, dan **ADMIN**. Rekomendasi triase sistem bukan diagnosis; keputusan klinis tetap pada Healthcare.

## Implementasi saat ini

Relawan memiliki alur PFA, asesmen SRQ-20, faktor risiko, fungsi harian, rekomendasi triase, serta pembuatan T0-Suspect dengan penyimpanan lokal dan sinkronisasi. Healthcare memiliki antrean darurat, penerimaan Reverb/Echo, pengakuan, verifikasi sekunder, klasifikasi klinis, dan tindakan rujukan eksplisit. Fondasi serta perintah backend Dispatch sudah terpisah dari Referral, tetapi UI Dispatch dan cutover UI Referral masih menunggu checkpoint berikutnya. Admin memiliki ringkasan operasional, peta marker, analitik, logistik, dan pengelolaan akun/organisasi. Cakupan dan batas verifikasi tiap alur dicatat dalam [referensi implementasi saat ini](docs/CURRENT_IMPLEMENTATION.md) dan [ledger verifikasi](docs/workflow-verification.md); keberadaan layar atau endpoint tidak menjamin semua skenario luring, browser, realtime, atau produksi telah diuji.

## Teknologi

- Laravel 13, Vue 3, Inertia.js, TypeScript, Tailwind CSS 4
- PostgreSQL 17 + PostGIS melalui Docker Compose
- Laravel Reverb + Echo, queue, scheduler, Nginx
- IndexedDB + Dexie, PWA/service worker, MapLibre, ECharts

Autentikasi web memakai sesi Laravel untuk navigasi Inertia. Login juga membuat JWT dan refresh token untuk respons API; middleware `auth.jwt` menerima bearer token atau sesi web yang masih aktif. Jadi aplikasi bukan hanya JWT ataupun hanya sesi.

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

- [Alur produk final](docs/workflow.md) — kebutuhan fungsional dan produk.
- [Handoff layar](docs/RAPID_MIND_FINAL_SCREEN_INVENTORY_IMPLEMENTATION_HANDOFF.md) — rancangan interaksi terperinci.
- [Rencana teknis](docs/RAPID_MIND_TECHNICAL_PLAN.md) — arsitektur, status, dan kesenjangan implementasi.
- [Implementasi saat ini](docs/CURRENT_IMPLEMENTATION.md) — inventaris ringkas route, layar, backend-only, dan batas bukti.
- [Dokumentasi sistem](docs/RAPID_MIND_DOKUMENTASI_SISTEM.md) — ikhtisar sistem dan formula triase.
- [Ledger verifikasi](docs/workflow-verification.md) dan [catatan perubahan](docs/changes-notes.md) — bukti serta riwayat checkpoint.
- [Instruksi agen](AGENTS.md) — aturan kerja dan prioritas sumber.
