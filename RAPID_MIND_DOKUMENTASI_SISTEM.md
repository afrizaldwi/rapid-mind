# DOKUMENTASI SISTEM LENGKAP: RAPID-MIND
**Rapid Assessment & Psychosocial Intervention Delivery - Mental Health In Disaster**

---

## DAFTAR ISI
1. [Ringkasan Eksekutif & Latar Belakang Proyek](#1-ringkasan-eksekutif--latar-belakang-proyek)
2. [Arsitektur Peran Pengguna (3-Tier Multi-Role)](#2-arsitektur-peran-pengguna-3-tier-multi-role)
3. [Tech Stack & Landasan Teknologi](#3-tech-stack--landasan-teknologi)
4. [Mesin Triase & Formula Skoring Terintegrasi](#4-mesin-triase--formula-skoring-terintegrasi)
5. [Alur Operasional Sistem Lengkap (End-to-End Workflows)](#5-alur-operasional-sistem-lengkap-end-to-end-workflows)
   - 5.1 [Alur Autentikasi & Sesi Offline-First](#51-alur-autentikasi--sesi-offline-first)
   - 5.2 [Alur Psychological First Aid (PFA) — Hari 1–3](#52-alur-psychological-first-aid-pfa--hari-13)
   - 5.3 [Alur Penapisan Terstruktur SRQ-20 — Hari 4–30](#53-alur-penapisan-terstruktur-srq-20--hari-430)
   - 5.4 [Alur Kedaruratan Kritis T0 & 3-Tier Alerting Strategy](#54-alur-kedaruratan-kritis-t0--3-tier-alerting-strategy)
   - 5.5 [Alur Triase & Validasi Klinis Faskes](#55-alur-triase--validasi-klinis-faskes)
   - 5.6 [Alur Siklus Hidup Rujukan Medis (Referral State Machine)](#56-alur-siklus-hidup-rujukan-medis-referral-state-machine)
   - 5.7 [Alur Sinkronisasi Offline-First & Replay Engine](#57-alur-sinkronisasi-offline-first--replay-engine)
   - 5.8 [Alur Monitoring Makro & Manajemen Bencana Admin](#58-alur-monitoring-makro--manajemen-bencana-admin)
6. [Skema Basis Data & Struktur Entitas](#6-skema-basis-data--struktur-entitas)
7. [Daftar Rute Web & API Endpoint](#7-daftar-rute-web--api-endpoint)
8. [Struktur Direktori Repositori](#8-struktur-direktori-repositori)
9. [Panduan Instalasi & Menjalankan Proyek](#9-panduan-instalasi--menjalankan-proyek)

---

## 1. Ringkasan Eksekutif & Latar Belakang Proyek

### 1.1 Permasalahan
Saat bencana alam terjadi di Indonesia (gempa bumi, banjir bandang, erupsi gunung berapi, tsunami), dampak psikologis sering kali diabaikan dibandingkan luka fisik. Reaksi trauma, kepanikan massal, histeria, hingga depresi berat dan ideasi bunuh diri mengancam para penyintas di tenda-tenda pengungsian. Namun, manajemen layanan kesehatan jiwa dan dukungan psikososial (*Mental Health and Psychosocial Support* / MHPSS) di daerah bencana menghadapi kendala kritis:
1. **Ketiadaan Tenaga Medis Spesialis di Garis Depan:** Jumlah psikiater dan psikolog klinis sangat terbatas dan terkonsentrasi di kota besar. Garda depan penanganan didominasi oleh relawan awam yang tidak memiliki instrumen penapisan ilmiah yang mudah digunakan.
2. **Krisis Infrastruktur & Blank Spot:** Jaringan internet dan listrik di pusat bencana sering terputus total. Aplikasi berbasis komputasi awan murni gagal berfungsi di medan kritis.
3. **Ketiadaan Triase Terpadu:** Penyintas trauma akut diperlakukan seragam tanpa stratifikasi risiko objektif, mengakibatkan faskes rujukan kewalahan (*overburdened*) oleh kasus ringan, sementara kasus kegawatdaruratan jiwa kritis (T0) terlambat ditangani hingga berakibat fatal.
4. **Ketiadaan Visibilitas Makro:** Pembuat kebijakan di tingkat BPBD dan Dinas Kesehatan tidak memiliki peta persebaran distres mental spasial (*geospatial mental health map*) dan tren waktu bencana untuk mendistribusikan logistik dan tim medis secara tepat sasaran.

### 1.2 Solusi: RAPID-MIND
**RAPID-MIND** adalah platform triase dan respons intervensi kesehatan jiwa darurat bencana multi-peran yang memadukan:
- **Mobile Progressive Web Application (PWA) Offline-First** untuk relawan lapangan dengan penyimpanan lokal terisolasi (*IndexedDB*) dan tombol pintas darurat (*Floating Red Flag*).
- **Desktop Clinical Workspace** untuk dokter umum, perawat terlatih, dan psikiater di Puskesmas / Rumah Sakit untuk memverifikasi kegawatdaruratan, memvalidasi hasil asesmen, dan mengelola rujukan evakuasi medis.
- **Desktop Command Center Dashboard** untuk BPBD, Dinas Kesehatan, dan PSC 119 guna memantau peta sebaran distres spasial secara realtime, kurva epidemiologi 30 hari pascabencana, serta manajemen posko, faskes, dan logistik obat jiwa.

---

## 2. Arsitektur Peran Pengguna (3-Tier Multi-Role)

RAPID-MIND menerapkan pembatasan hak akses berbasis peran (*Role-Based Access Control* / RBAC) yang tegas:

```
+-------------------------------------------------------------------------------+
|                                  RAPID-MIND                                   |
+-----------------------+-------------------------------+-----------------------+
|  ROLE 1: RELAWAN      |  ROLE 2: HEALTHCARE           |  ROLE 3: ADMIN        |
|  (Garda Depan)        |  (Klinis / Faskes)            |  (Makro / Kebijakan)  |
+-----------------------+-------------------------------+-----------------------+
| - Mobile PWA Shell    | - Desktop Web Workspace       | - Desktop Command Ctr |
| - Offline-First       | - Puskesmas / RSUD / RS Jiwa  | - BPBD / Dinkes / 119 |
| - Interaksi PFA       | - Verifikasi Darurat T0       | - Peta Spasial (Map)  |
| - Penapisan SRQ-20    | - Validasi Klinis T1/T2/T3    | - Tren Kurva 30 Hari  |
| - Checklist Risiko    | - Diagnosis & Rencana Terapi  | - Provisioning Akun   |
| - Trigger SOS Darurat | - Manajemen Rujukan/Ambulans  | - Manajemen Posko     |
| - Sinkronisasi Outbox | - Rekam Medis Pasien          | - Manajemen Logistik  |
+-----------------------+-------------------------------+-----------------------+
```

### Karakteristik Desain per Peran:
1. **Relawan (Mobile PWA):**
   - Dioptimalkan untuk layar ponsel dengan kondisi lapangan ekstrem (cahaya terik matahari, tangan lelah/gemetar).
   - Memenuhi standar WCAG AAA (kontras warna tajam), tombol sentuh minimal **56px** (*fat-finger friendly*).
   - Kemampuan berjalan penuh tanpa sinyal internet (*zero network dependency* saat input asesmen).
2. **Healthcare (Desktop Faskes):**
   - Menampilkan antrean terstruktur berdasarkan prioritas kegawatan klinis (**T0 -> T1 -> T2 -> T3**).
   - Sistem notifikasi audio-visual keras saat ada sinyal Red Flag masuk.
   - Antarmuka rujukan yang terhubung langsung dengan alur ambulans lapangan.
3. **Admin BPBD / Dinkes (Command Center):**
   - Dashboard makro dengan agregasi data real-time via WebSockets.
   - Peta sebaran spasial (*Geospatial Heatmap*) berbasis koordinat GPS posko dan penyintas.
   - Grafik kurva tren 30 hari pascabencana.

---

## 3. Tech Stack & Landasan Teknologi

| Layer | Teknologi / Library | Alasan Pemilihan & Fungsi |
|---|---|---|
| **Backend Framework** | **Laravel 11.x (PHP 8.2+)** | Framework enterprise yang kokoh, mendukung RESTful API, ORM Eloquent, Form Request Validation, dan pengelolaan Queue/Jobs. |
| **Frontend Framework** | **Vue 3 (Composition API) + Inertia.js** | Single Page Application (SPA) modern berbasis server-side routing tanpa lag reload, pengetikan ketat menggunakan **TypeScript**. |
| **Styling & Icons** | **Tailwind CSS + Lucide Icons** | Utility-first CSS untuk kontrol UI presisi, responsifitas tinggi, dan ikonografi standar medis/lapangan. |
| **Realtime Engine** | **Pusher / Laravel Echo / WebSockets** | Siaran instan tanpa refresh untuk event kedaruratan jiwa (`EmergencyEventCreated`) dari lapangan ke faskes. |
| **PWA & Offline** | **Service Worker + Cache Storage + IndexedDB (idb)** | Penyimpanan shell aplikasi, aset statis, dan penyimpanan data lokal relawan secara mandiri tanpa internet. |
| **Database** | **MySQL 8.0** | RDBMS transaksional ACID yang andal, menggunakan **UUID v4** untuk primary key entitas kritis demi sinkronisasi tanpa tabrakan ID. |
| **Autentikasi** | **JWT (JSON Web Token) via HttpOnly Cookies** | Autentikasi aman tanpa state sesi di server, mendukung *token refresh cycle* dan pembatasan isolasi sesi akun di peramban. |
| **Hardware Integration**| **HTML5 Geolocation API, SpeechRecognition** | Penangkapan otomatis titik GPS darurat dan asisten pengenalan suara (STT) untuk kata kunci trauma. |

---

## 4. Mesin Triase & Formula Skoring Terintegrasi

RAPID-MIND tidak hanya mengandalkan satu kuesioner, melainkan menggabungkan tiga dimensi penilaian objektif menjadi satu kesatuan:

$$\mathbf{Total\ Integrated\ Score} = \text{Skor SRQ-20 (0--20)} + \text{Skor Faktor Risiko (0--8)} + \text{Skor Fungsi Harian (0--9)}$$

**Rentang Total Skor:** $0 - 37\text{ Poin}$

```
+-----------------------------------------------------------------------------------+
|                           DIMENSI ASESMEN TERPADU                                 |
+-------------------------+-------------------------------+-------------------------+
| 1. SRQ-20               | 2. FAKTOR RISIKO (RISK)       | 3. KEBERFUNGSIAN (FUNC) |
| (0 - 20 Poin)           | (0 - 8 Poin)                  | (0 - 9 Poin)            |
+-------------------------+-------------------------------+-------------------------+
| 20 Pertanyaan Standar   | 5 Indikator Kerentanan:       | 3 Domain Kehidupan:     |
| WHO (Pilihan: Ya/Tidak) | R1: Kehilangan Berat (2 pt)   | F1: Perawatan Diri      |
| Khusus Nomor 17:        | R2: Trauma Langsung (2 pt)    | F2: Interaksi Sosial    |
| 'Ide Bunuh Diri'        | R3: Kelompok Rentan (1 pt)    | F3: Akses Kebutuhan     |
| Jika 'Ya' -> Override   | R4: Riwayat Jiwa (2 pt)       | Pilihan skor:           |
| Langsung ke Kategori T0 | R5: Terputus Obat Kronis (1)  | 0 (Baik), 1 (Sedang), 3 |
+-------------------------+-------------------------------+-------------------------+
```

### Matriks Klasifikasi Triase:

| Kategori | Ambang Batas Skor | Profil Kondisi Klinis | Rekomendasi Tindakan Sistem |
|---|---|---|---|
| **🚨 Triage T0 (Critical Emergency)** | **Override Red Flag** (SRQ #17 = "Ya" atau Tombol SOS ditekan) | Ancaman langsung terhadap nyawa (keinginan bunuh diri aktif, gaduh gelisah/amuk, psikosis akut, syok fisik). | **Bypass skoring**. Kirim alert darurat instan ke Faskes/PSC 119. Relawan wajib mendampingi fisik terus menerus. |
| **🔴 Triage T1 (Severe Distress)** | Total Skor >= 15 ATAU Skor Fungsi F >= 6 | Distres psikologis berat disertai kelumpuhan fungsi kehidupan dasar sehari-hari atau trauma bertumpuk masif. | Prioritas rujukan ke Faskes Tingkat 2 (Puskesmas/Dokter/Psikiater). Evaluasi farmakoterapi dan psikoterapi mendalam. |
| **🟡 Triage T2 (Moderate Distress)** | Total Skor 7 - 14 | Distres sedang (gejala kecemasan/somatisasi menonjol) atau gejala ringan yang diperberat oleh kerentanan tinggi. | Masuk ke **Daftar Pantau Utama Posko (Watchlist)**. Diberikan konseling kelompok, relaksasi, dan evaluasi ulang dalam 7 hari. |
| **🟢 Triage T3 (Mild / Resilient)** | Total Skor 0 - 6 | Gejala emosional wajar/adaptif pascabencana. Keberfungsian mandiri masih terjaga baik. | Dukungan psikososial komunitas (kegiatan sosial posko, pemenuhan logistik kebutuhan dasar, PFA lanjutan). |

*Catatan Sistem: Triase yang dihasilkan di HP relawan berstatus **Rekomendasi Awal Sistem (Decision Support)** dan bersifat tentatif hingga divalidasi resmi oleh tenaga medis profesional di Faskes.*

---

## 5. Alur Operasional Sistem Lengkap (End-to-End Workflows)

### 5.1 Alur Autentikasi & Sesi Offline-First
1. Pengguna membuka URL aplikasi.
2. Service Worker PWA mengecek ketersediaan jaringan (`navigator.onLine`).
3. **Kondisi Offline:**
   - Aplikasi membaca sesi yang telah tersimpan di IndexedDB terenkripsi akun lokal.
   - Jika pengguna sebelumnya adalah `RELAWAN`, shell PWA offline diaktifkan dan pengguna dapat langsung bekerja di posko tanpa sinyal.
   - Jika pengguna baru dan belum pernah login sama sekali, aplikasi menampilkan layar pemberitahuan bahwa inisialisasi awal memerlukan internet.
4. **Kondisi Online:**
   - Pengguna menginput Username dan Password pada `/login`.
   - Backend memverifikasi hash password, menerbitkan JWT Access Token dan Refresh Token via HttpOnly cookie.
   - Sesi disinkronkan ke cache lokal.
   - Router mengarahkan pengguna sesuai perannya:
     - Relawan -> `/relawan/home`
     - Healthcare -> `/healthcare/emergencies`
     - Admin -> `/admin/summary`

### 5.2 Alur Psychological First Aid (PFA) — Hari 1–3
Fase akut pascabencana (72 jam pertama) adalah fase kejut emosional (*acute shock phase*). Pada fase ini, wawancara formal klinis dilarang karena dapat memicu trauma ulang (*retraumatization*).
1. Relawan mengakses modul PFA di `/relawan/pfa`.
2. Antarmuka menampilkan panduan tindakan interaktif non-kuesioner:
   - **LOOK (Amati):** Panduan memeriksa keamanan lingkungan posko dan mendeteksi tanda bahaya fisik/jiwa ekstrem. Jika ada bahaya kritis, tombol *Floating Red Flag* dapat ditekan dalam < 0.5 detik.
   - **LISTEN (Dengarkan):** Panduan sapaan hangat, teknik mendengarkan aktif tanpa mendebat atau menghakimi, serta validasi perasaan takut penyintas. Tersedia **Modul Audio-Visual Relaksasi Grounding** (latihan pernapasan 4-7-8) untuk penyintas yang histeris atau mengalami serangan panik.
   - **LINK (Hubungkan):** Panduan menghubungkan penyintas dengan anggota keluarga yang terpisah, air bersih, tenda tidur, atau kebutuhan obat-obatan rutin.

### 5.3 Alur Penapisan Terstruktur SRQ-20 — Hari 4–30
Setelah fase syok akut mereda, penapisan formal dimulai guna mendeteksi penyintas yang rentan mengalami gangguan stres pascatrauma (PTSD) atau depresi.
1. **Registrasi Pasien:** Relawan menginput data NIK (16 digit), Nama, Usia, Gender, dan Posko penampungan.
2. **Pemilihan Moda Interaksi:**
   - *Moda Verbal:* Untuk penyintas yang dapat berkomunikasi lancar (didukung pengenal suara kata kunci STT).
   - *Moda Non-Verbal / Adaptif:* Untuk penyintas yang mengalami syok berat atau mutisme; relawan menggunakan ketukan layar, bahasa isyarat visual, dan observasi perilaku terpandu bersama keluarga.
3. **Pengisian Butir:**
   - Pengisian 20 butir SRQ-20 (Ya/Tidak). Jika pertanyaan #17 dijawab 'Ya', sistem langsung menandai *Red Flag Override*.
   - Pengisian 5 indikator Faktor Risiko.
   - Pengisian 3 domain Penilaian Keberfungsian Harian.
4. **Kalkulasi & Submission:**
   - Klien menghitung skor total integrasi (0–37).
   - Data disimpan ke IndexedDB lokal.
   - Jika ada internet, klien mengirim payload ke backend (`POST /relawan/assessment`), server melakukan validasi ulang (*dual-calculation*), dan data tersimpan di database MySQL.
   - Jika tidak ada internet, payload disimpan ke dalam antrean **Outbox IndexedDB** dengan status `PENDING_SYNC`.
   - Layar menampilkan hasil rekomendasi triase (T0/T1/T2/T3) dan instruksi penanganan.

### 5.4 Alur Kedaruratan Kritis T0 & 3-Tier Alerting Strategy
Jika terdeteksi bahaya jiwa (keinginan bunuh diri, amuk massal, psikosis berat, atau gawat darurat medis), sistem menerapkan strategi transmisi sinyal 3-lapis:
1. **Pemicu Darurat:** Relawan menekan tombol melayang *Floating Red Flag* atau menjawab 'Ya' pada SRQ #17.
2. Klien membaca koordinat GPS perangkat secara otomatis (`latitude`, `longitude`).
3. Relawan memilih jenis Red Flag (`SUICIDAL_IDEATION`, `PSYCHOSIS`, `SEVERE_AGITATION`, `MEDICAL_CRISIS`).
4. **Transmisi 3-Tier:**
   - **Tier 1 (Internet Normal):** Data dikirim via HTTP POST. Server mem-broadcast event `EmergencyEventCreated` lewat WebSockets. Monitor Faskes dan Command Center membunyikan alarm audio-visual merah berfrekuensi tinggi secara realtime.
   - **Tier 2 (Internet Mati, Sinyal Seluler 2G/GSM Aktif):** Sistem secara otomatis membuka tautan SMS dengan payload terenkripsi standar yang memuat identitas relawan, tipe bahaya, dan titik koordinat GPS untuk dikirim ke nomor Call Center PSC 119.
   - **Tier 3 (Offline Murni / Blank Spot Total):** Data dikunci di prioritas teratas IndexedDB. HP relawan bergetar panjang dan menampilkan instruksi darurat: *"JARINGAN TERPUTUS: Segera lakukan penanganan fisik PFA dan bawa/dampingi penyintas langsung ke Tenda Medis Posko!"* Sinyal akan otomatis terkirim saat HP mendeteksi sinyal kembali (*Background Sync*).

### 5.5 Alur Triase & Validasi Klinis Faskes
1. **Penanganan Darurat T0 (`/healthcare/emergencies`):**
   - Tenaga medis Faskes menerima notifikasi darurat.
   - Menekan tombol **Acknowledge** -> status menjadi `ACKNOWLEDGED`.
   - Melakukan kontak verifikasi via telepon/video/tim lapangan -> status menjadi `REVIEWING`.
   - Menentukan keputusan:
     - Jika terbukti darurat jiwa: Status diubah menjadi `CONFIRMED` dan diterbitkan tiket Rujukan/Dispatch Medis.
     - Jika reaksi panik biasa/salah tekan: Status diturunkan (*downgraded*) ke `T1` atau `T2`.
2. **Validasi Asesmen Masuk (`/healthcare/validations`):**
   - Tenaga medis membuka antrean pasien yang terurut berdasarkan prioritas (**T1 -> T2 -> T3**).
   - Memeriksa rekam jejak jawaban butir SRQ-20, faktor risiko, dan skor fungsi.
   - Mengisi formulir validasi: Diagnosis Klinis Profesional, Catatan Diagnosis, Rencana Intervensi, dan mencentang apakah memerlukan rujukan lanjutan ke Rumah Sakit Jiwa / Spesialis (`referral_required`).
   - Menyimpan validasi ke database (`clinical_validations`) dan status asesmen pasien ditutup (`COMPLETED`).

### 5.6 Alur Siklus Hidup Rujukan Medis (Referral State Machine)
Untuk menjamin pasien tidak hilang dalam proses evakuasi bencana, sistem menerapkan aturan transisi status yang kaku:

`ACTIVE` -> `EN_ROUTE` -> `ON_SITE` -> `TRANSPORT` -> `COMPLETED` (atau langsung `COMPLETED` jika tertangani stabil di posko).

1. **ACTIVE:** Rujukan dibuat oleh dokter posko atau dari kasus T0 terkonfirmasi. Faskes menugaskan tim evakuasi/ambulans.
2. **EN_ROUTE:** Tim medis bergerak dari fasilitas menuju posko pengungsian.
3. **ON_SITE:** Tim medis tiba di titik posko pasien, melakukan stabilisasi di tenda. Jika pasien sudah stabil, status dapat langsung ditutup ke `COMPLETED`.
4. **TRANSPORT:** Pasien dinaikkan ke ambulans untuk dirujuk ke Rumah Sakit Rujukan / RS Jiwa.
5. **COMPLETED:** Pasien telah diserahterimakan di IGD Rumah Sakit Penerima beserta rekam medis digitalnya.

### 5.7 Alur Sinkronisasi Offline-First & Replay Engine
1. Saat bekerja tanpa internet, seluruh operasi create/update disimpan di antrean `Outbox` IndexedDB dengan penanda `client_uuid` (UUID v4).
2. Peramban mendeteksi koneksi internet pulih (event `online` atau pemicu Service Worker).
3. **Replay Engine** aktif di latar belakang:
   - Mengurutkan antrean: Transmisi Darurat T0 diproses terlebih dahulu, disusul data Asesmen.
   - Mengirim request `POST /relawan/sync/emergencies` atau `POST /relawan/sync/assessments`.
4. **Prinsip Idempotensi di Server:**
   - Server memeriksa apakah `client_uuid` sudah pernah tercatat di database.
   - Jika sudah ada, server memperbarui record tanpa membuat record duplikat (mencegah data ganda jika koneksi terputus di tengah jalan).
   - Jika belum ada, server membuat entitas baru di database MySQL.
5. Klien menerima respon 200/201, menghapus item dari antrean Outbox, dan memperbarui status lokal menjadi `SYNCED`.

### 5.8 Alur Monitoring Makro & Manajemen Bencana Admin
1. **Interactive Geospatial Heatmap (`/admin/map`):**
   - Menampilkan peta digital wilayah bencana dengan penanda posko dan kasus aktif.
   - Titik diklasifikasikan dengan layer warna: T0 (Merah Berkedip), T1 (Merah), T2 (Kuning), T3 (Hijau).
   - BPBD dan Dinkes dapat mendeteksi klaster posko yang mengalami distres massal untuk pengiriman tim pendukung.
2. **Pemantauan Longitudinal 30 Hari (`/admin/analytics`):**
   - Grafik kurva tren temporal memantau dinamika epidemiologi psikososial:
     - *Hari 1–3:* Fase Akut (Syok).
     - *Hari 4–14:* Fase Reaksi Trauma Puncak (*Peak Distress*).
     - *Hari 15–30:* Fase Pemulihan atau Transisi Gangguan Kronis (PTSD/Depresi Mayor).
   - Mampu mendeteksi **Trauma Sekunder** (misal: jika pada hari ke-18 angka T1 di Posko B tiba-tiba melonjak, administrator dapat mengidentifikasi masalah logistik atau sanitasi buruk di posko tersebut).
3. **Manajemen Posko & Provisioning (`/admin/volunteers`, `/admin/operations/posko`):**
   - Pembuatan data Posko Bencana baru.
   - Pendaftaran dan aktivasi akun relawan lapangan serta tenaga medis faskes.
   - Manajemen inventaris obat jiwa dan kit dukungan anak di modul logistik.

---

## 6. Skema Basis Data & Struktur Entitas

Database RAPID-MIND dirancang menggunakan MySQL 8.0 dengan integritas referensial dan UUID pada tabel-tabel utama:

### Rincian Tabel Utama:
1. **`users`**: Menyimpan kredensial dan peran aktor.
   - Kolom: `id`, `name`, `username`, `email`, `password`, `role` (`RELAWAN`, `HEALTHCARE`, `ADMIN`), `phone_number`, `shelter_id`, `facility_id`.
2. **`shelters`**: Posko penampungan pengungsian bencana.
   - Kolom: `id`, `name`, `region_id`, `latitude`, `longitude`, `capacity`, `current_occupants`.
3. **`healthcare_facilities`**: Puskesmas, Rumah Sakit Umum, dan Rumah Sakit Jiwa rujukan.
   - Kolom: `id`, `name`, `type` (`PUSKESMAS`, `RSUD`, `RS_JIWA`, `KLINIK`), `phone_number`, `latitude`, `longitude`.
4. **`patients`**: Identitas penyintas korban bencana.
   - Kolom: `id` (UUID), `nik`, `name`, `date_of_birth`, `gender`, `phone_number`, `shelter_id`.
5. **`assessments`**: Sesi penapisan triase penyintas.
   - Kolom: `id` (UUID), `patient_id`, `user_id` (Relawan), `shelter_id`, `mode` (`VERBAL`, `NON_VERBAL`), `status` (`IN_PROGRESS`, `COMPLETED`), `created_at`.
6. **`srq_responses`**: Jawaban 20 butir kuesioner SRQ-20 (skor 0/1 per butir).
7. **`risk_responses`**: Jawaban 5 indikator faktor risiko latar belakang trauma (R1 s.d. R5).
8. **`function_responses`**: Jawaban 3 domain keberfungsian hidup harian (F1, F2, F3).
9. **`triage_results`**: Hasil kalkulasi triase terpadu.
   - Kolom: `id`, `assessment_id`, `srq_score`, `risk_score`, `function_score`, `total_score`, `system_recommendation` (`T0_SUSPECT`, `T0_CONFIRMED`, `T1`, `T2`, `T3`), `is_red_flag_override`.
10. **`emergency_events`**: Laporan insiden gawat darurat T0.
    - Kolom: `id` (UUID), `patient_id`, `assessment_id`, `user_id`, `red_flag_type` (`SUICIDAL_IDEATION`, `PSYCHOSIS`, `SEVERE_AGITATION`, `MEDICAL_CRISIS`), `status` (`PENDING`, `ACKNOWLEDGED`, `REVIEWING`, `CONFIRMED`, `DOWNGRADED`, `RESOLVED`), `latitude`, `longitude`, `shelter_id`, `notes`.
11. **`emergency_verifications`**: Log riwayat verifikasi darurat oleh faskes.
    - Kolom: `id`, `emergency_event_id`, `verified_by`, `verification_method` (`PHONE`, `VIDEO`, `FIELD_TEAM`), `notes`.
12. **`clinical_validations`**: Catatan diagnosis dan validasi resmi dokter/psikiater.
    - Kolom: `id`, `assessment_id`, `validated_by`, `clinical_result` (`T1`, `T2`, `T3`), `diagnosis_notes`, `intervention_plan`, `referral_required`.
13. **`referrals`**: Tiket rujukan dan penjemputan medis ambulans.
    - Kolom: `id` (UUID), `emergency_event_id`, `clinical_validation_id`, `patient_id`, `referred_by`, `facility_id`, `status` (`ACTIVE`, `EN_ROUTE`, `ON_SITE`, `TRANSPORT`, `COMPLETED`), `notes`.
14. **`referral_status_history`**: Audit trail jejak waktu pergeseran ambulans rujukan.
15. **`audit_logs`**: Log keamanan seluruh perubahan status dan akses data pasien.

---

## 7. Daftar Rute Web & API Endpoint

### 7.1 Rute Publik & Autentikasi
| Method | URI | Controller Action | Keterangan |
|---|---|---|---|
| `GET` | `/login` | `AuthController@showLogin` | Halaman login multi-role |
| `POST` | `/login` | `AuthController@login` | Proses login & penerbitan token JWT |
| `POST` | `/logout` | `AuthController@logout` | Revokasi sesi & hapus token cookie |
| `GET` | `/relawan/session-status` | `RelawanSessionController@status` | Validasi sesi recovery untuk PWA offline |

### 7.2 Rute Relawan Lapangan (`/relawan/...`) — Role: RELAWAN
| Method | URI | Controller Action | Keterangan |
|---|---|---|---|
| `GET` | `/relawan/home` | `RelawanController@home` | Beranda PWA Relawan |
| `GET` | `/relawan/pfa` | `RelawanController@pfa` | Modul PFA (Look, Listen, Link, Grounding) |
| `GET` | `/relawan/assessment` | `RelawanController@assessmentIndex` | Inisiasi sesi asesmen baru |
| `GET` | `/relawan/assessment/drafts` | `RelawanController@assessmentDrafts` | Daftar asesmen lokal yang belum selesai |
| `POST` | `/relawan/assessment` | `RelawanController@createAssessment` | Pendaftaran identitas pasien baru |
| `GET` | `/relawan/assessment/{id}/srq` | `RelawanController@assessmentSrq` | Formulir 20 pertanyaan SRQ-20 |
| `POST` | `/relawan/assessment/{id}/srq` | `RelawanController@saveSrq` | Simpan jawaban SRQ-20 |
| `GET` | `/relawan/assessment/{id}/risk` | `RelawanController@assessmentRisk` | Formulir 5 faktor risiko kerentanan |
| `POST` | `/relawan/assessment/{id}/risk` | `RelawanController@saveRisk` | Simpan jawaban faktor risiko |
| `GET` | `/relawan/assessment/{id}/function` | `RelawanController@assessmentFunction` | Formulir 3 keberfungsian harian |
| `POST` | `/relawan/assessment/{id}/function` | `RelawanController@saveFunction` | Simpan jawaban fungsi harian |
| `GET` | `/relawan/assessment/{id}/review` | `RelawanController@assessmentReview` | Halaman ringkasan sebelum submit |
| `POST` | `/relawan/assessment/{id}/complete` | `RelawanController@completeAssessment` | Finalisasi & kalkulasi skor triase |
| `GET` | `/relawan/assessment/{id}/result` | `RelawanController@assessmentResult` | Tampilan hasil triase & panduan aksi |
| `POST` | `/relawan/emergencies` | `RelawanController@triggerEmergency` | Pemicuan sinyal darurat T0 SOS |
| `POST` | `/relawan/sync/assessments` | `RelawanSyncController@assessment` | Endpoint sinkronisasi batch asesmen |
| `POST` | `/relawan/sync/emergencies` | `RelawanSyncController@emergency` | Endpoint sinkronisasi batch darurat |
| `GET` | `/relawan/data` | `RelawanController@data` | Status data storage & antrean sinkronisasi |

### 7.3 Rute Healthcare Workspace (`/healthcare/...`) — Role: HEALTHCARE
| Method | URI | Controller Action | Keterangan |
|---|---|---|---|
| `GET` | `/healthcare/emergencies` | `HealthcareController@emergencies` | Antrean insiden gawat darurat T0 |
| `GET` | `/healthcare/emergencies/{id}` | `HealthcareController@emergencyDetail` | Detail insiden & peta GPS penjemputan |
| `POST` | `/healthcare/emergencies/{id}/acknowledge` | `HealthcareController@acknowledge` | Konfirmasi Faskes menerima sinyal |
| `POST` | `/healthcare/emergencies/{id}/verify` | `HealthcareController@verify` | Catatan verifikasi telepon/tim lapangan |
| `POST` | `/healthcare/emergencies/{id}/classify` | `HealthcareController@classify` | Penetapan status T0_CONFIRMED/DOWNGRADED |
| `POST` | `/healthcare/emergencies/{id}/referrals` | `HealthcareController@createEmergencyReferral` | Terbitkan tiket rujukan/ambulans dari T0 |
| `GET` | `/healthcare/validations` | `HealthcareController@validations` | Daftar antrean asesmen prioritas T1-T3 |
| `GET` | `/healthcare/validations/{id}` | `HealthcareController@validationDetail` | Lembar periksa asesmen lengkap pasien |
| `POST` | `/healthcare/validations/{id}` | `HealthcareController@validateAssessment` | Simpan diagnosis klinis & rencana terapi |
| `GET` | `/healthcare/referrals` | `HealthcareController@referrals` | Monitor proses rujukan & dispatch |
| `POST` | `/healthcare/referrals/{id}/status` | `HealthcareController@updateReferralStatus` | Update status ambulans (EN_ROUTE/dll) |
| `GET` | `/healthcare/patients` | `HealthcareController@patients` | Direktori rekam medis pasien bencana |
| `GET` | `/healthcare/patients/{id}` | `HealthcareController@patientDetail` | Riwayat rekam medis longitudinal pasien |

### 7.4 Rute Admin Command Center (`/admin/...`) — Role: ADMIN
| Method | URI | Controller Action | Keterangan |
|---|---|---|---|
| `GET` | `/admin/summary` | `AdminController@summary` | Ringkasan indikator makro bencana |
| `GET` | `/admin/map` | `AdminController@map` | Peta sebaran spasial distres (Heatmap) |
| `GET` | `/admin/analytics` | `AdminController@analytics` | Pemantauan epidemiologi kurva 30 hari |
| `GET` | `/admin/volunteers` | `AdminController@volunteers` | Daftar relawan aktif di posko |
| `POST` | `/admin/volunteers` | `ProvisioningController@storeVolunteer` | Pendaftaran akun relawan baru |
| `GET` | `/admin/operations/posko` | `ShelterManagementController@index` | Daftar posko penampungan pengungsi |
| `POST` | `/admin/operations/posko` | `ShelterManagementController@store` | Pendaftaran posko baru beserta kapasitas |
| `GET` | `/admin/facilities/organizations` | `FacilityManagementController@index` | Daftar Puskesmas & Rumah Sakit |
| `POST` | `/admin/facilities/organizations` | `FacilityManagementController@store` | Pendaftaran fasilitas kesehatan baru |
| `GET` | `/admin/facilities/users` | `ProvisioningController@healthcareUsers` | Daftar akun tenaga medis faskes |
| `POST` | `/admin/facilities/users` | `ProvisioningController@storeHealthcare` | Pendaftaran akun dokter/psikiater faskes |
| `GET` | `/admin/logistics` | `AdminController@logistics` | Pemantauan logistik MHPSS & obat jiwa |

---

## 8. Struktur Direktori Repositori

```
rapid-mind/
├── app/
│   ├── Enums/                     # Enum PHP 8.2 (UserRole, TriageCategory, RedFlagType, dsb.)
│   ├── Domain/
│   │   ├── Sync/                  # Logika sinkronisasi batch & idempotensi outbox
│   │   └── Triage/                # Engine kalkulasi skor triase di sisi server
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/             # Controller admin command center & provisioning
│   │   │   ├── AuthController.php # Autentikasi multi-role & JWT
│   │   │   ├── Healthcare/        # Controller validasi klinis & penanganan darurat
│   │   │   └── Relawan/           # Controller PWA relawan & asesmen lapangan
│   │   └── Middleware/            # JWT middleware & role restriction (auth.jwt, role:...)
│   └── Models/                    # Model Eloquent (Assessment, Patient, EmergencyEvent, dsb.)
├── database/
│   ├── migrations/                # Skema database MySQL (22 file migrasi)
│   └── seeders/                   # Seeder akun demo, posko, faskes, dan contoh kasus
├── docs/                          # Dokumen perancangan, arsitektur, dan flow proyek
├── resources/
│   ├── css/                       # Konfigurasi Tailwind CSS
│   └── js/                        # Kode Vue 3 (Composition API) + TypeScript
│       ├── components/            # Komponen modular UI (Modal, Button, Badge, Alert)
│       ├── domain/                # Kalkulator triase sisi klien & transformasi data
│       ├── layouts/               # Layout shell per role (Relawan, Healthcare, Admin)
│       ├── offline/               # Manajemen IndexedDB, Outbox Queue, & Sync Listener
│       └── Pages/
│           ├── Admin/             # Layar Summary, Map, Analytics, Volunteers, Posko
│           ├── Auth/              # Layar Login
│           ├── Healthcare/        # Layar Emergencies, Validations, Referrals, Patients
│           └── Relawan/           # Layar Home, Pfa, Emergency, Data, dan Assessment/
├── routes/
│   ├── web.php                    # Seluruh rute aplikasi Inertia per role
│   └── api.php                    # Rute API RESTful stateless
├── compose.yaml                   # Konfigurasi Docker Compose untuk deploy cepat
├── vite.config.js                 # Konfigurasi Vite & PWA Service Worker plugin
└── package.json & composer.json   # Dependensi frontend & backend
```

---

## 9. Panduan Instalasi & Menjalankan Proyek

### 9.1 Prasyarat Sistem
- **PHP** >= 8.2 (dengan ekstensi `pdo_mysql`, `mbstring`, `bcmath`, `curl`)
- **Composer** >= 2.5
- **Node.js** >= 20.x & **NPM**
- **MySQL** >= 8.0
- **Git**

### 9.2 Langkah Instalasi Lokal
1. **Clone Repositori & Buka Direktori:**
   ```bash
   git clone https://github.com/afrizaldwi/rapid-mind.git
   cd rapid-mind
   ```

2. **Instal Dependensi Backend (PHP):**
   ```bash
   composer install
   ```

3. **Instal Dependensi Frontend (Node):**
   ```bash
   npm install
   ```

4. **Konfigurasi Environment (`.env`):**
   ```bash
   cp .env.example .env
   php artisan key:generate
   php artisan jwt:secret
   ```
   *Sesuaikan konfigurasi koneksi database MySQL (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) serta kredensial Pusher/WebSockets.*

5. **Migrasi Database & Seeder Demo:**
   ```bash
   php artisan migrate:fresh --seed
   ```
   *Perintah ini akan membuat seluruh tabel dan mengisi akun demo siap pakai untuk Relawan, Healthcare, dan Admin.*

6. **Kompilasi Aset Frontend:**
   ```bash
   npm run build
   # Atau untuk mode pengembangan (hot reload):
   npm run dev
   ```

7. **Jalankan Server Lokal:**
   ```bash
   php artisan serve --port=8000
   ```
   Aplikasi dapat diakses melalui peramban di `http://localhost:8000`.

### 9.3 Akun Pengguna Demo Bawaan
| Peran | Username / Email | Password Default | Tujuan Akses |
|---|---|---|---|
| **Relawan** | `relawan_demo` | `password` | Uji coba mobile PWA, PFA, penapisan SRQ-20, & pemicuan SOS. |
| **Healthcare** | `dokter_demo` | `password` | Uji coba verifikasi T0, validasi klinis asesmen, & dispatch rujukan. |
| **Admin** | `admin_demo` | `password` | Uji coba command center, peta spasial (heatmap), & provisioning posko. |

---
*Dokumen ini disusun sebagai acuan resmi perancangan arsitektur, diagram UML (Activity, Sequence, Use Case, Class Diagram), serta pedoman operasional sistem RAPID-MIND.*
