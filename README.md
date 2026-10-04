# RAPID-MIND
> **Rapid Assessment & Psychosocial Intervention Delivery - Mental Health In Disaster**

RAPID-MIND adalah platform triase dan respons intervensi kesehatan jiwa darurat bencana multi-peran terpadu (*3-Tier Multi-Role Architecture*) berbasis Progressive Web Application (PWA) Offline-First, Realtime WebSockets, dan Desktop Command Center.

---

## 📚 Dokumentasi Lengkap Proyek

Dokumentasi sistem komprehensif yang memuat seluruh alur operasional, arsitektur, mesin triase, skema database, rute API, dan panduan instalasi telah didokumentasikan secara terperinci pada:

👉 **[RAPID_MIND_DOKUMENTASI_SISTEM.md](./RAPID_MIND_DOKUMENTASI_SISTEM.md)** (atau di folder [docs/RAPID_MIND_DOKUMENTASI_SISTEM.md](./docs/RAPID_MIND_DOKUMENTASI_SISTEM.md))

---

## 👥 Tiga Pilar Peran Sistem

1. **Role 1: Relawan Garda Depan (Frontline Volunteer)**
   - Akses: Mobile PWA (`/relawan/...`)
   - Fitur: Offline-First PWA Shell, Modul Psychological First Aid (PFA Hari 1–3), Penapisan Terstruktur SRQ-20 + Faktor Risiko + Keberfungsian (Hari 4–30), Floating Red Flag SOS (<0.5s), dan sinkronisasi otomatis Outbox IndexedDB.
2. **Role 2: Healthcare (Tenaga Medis: Puskesmas / RSUD / Psikiater)**
   - Akses: Desktop Workspace (`/healthcare/...`)
   - Fitur: Notifikasi audio-visual gawat darurat T0, verifikasi & downgrade T0, validasi klinis asesmen T1-T3, penetapan diagnosis klinis & rencana terapi, serta manajemen rujukan evakuasi medis (Referral Lifecycle).
3. **Role 3: Admin Makro (BPBD / Dinas Kesehatan / PSC 119)**
   - Akses: Desktop Command Center (`/admin/...`)
   - Fitur: Geospatial Heatmap sebaran distres mental bencana, Pemantauan Longitudinal 30 Hari (Fase Akut, Peak Distress, Kronisitas), manajemen posko pengungsian & faskes, serta provisioning akun pengguna.

---

## 🛠️ Tech Stack

- **Backend:** Laravel 11.x (PHP 8.2+) + Inertia.js
- **Frontend:** Vue 3 (Composition API, `<script setup lang="ts">`) + Tailwind CSS + Lucide Icons
- **Realtime:** Pusher / Laravel Echo / WebSockets
- **Offline Engine:** Service Worker, Workbox, IndexedDB (`idb`), Background Sync API
- **Database:** MySQL 8.0 (UUID v4 Primary Keys)
- **Autentikasi:** JWT HttpOnly Cookies dengan Role-Based Access Control (RBAC)

---

## ⚡ Panduan Menjalankan Cepat

```bash
# 1. Clone & Masuk Direktori
git clone https://github.com/afrizaldwi/rapid-mind.git
cd rapid-mind

# 2. Instal Dependensi
composer install
npm install

# 3. Setup Environment
cp .env.example .env
php artisan key:generate
php artisan jwt:secret

# 4. Migrasi & Seed Database Demo
php artisan migrate:fresh --seed

# 5. Build Aset Frontend
npm run build   # atau npm run dev

# 6. Jalankan Server
php artisan serve
```

Akses aplikasi di `http://localhost:8000`.

### Kredensial Pengguna Demo Bawaan:
- **Relawan:** `relawan_demo` / `password`
- **Healthcare:** `dokter_demo` / `password`
- **Admin:** `admin_demo` / `password`
