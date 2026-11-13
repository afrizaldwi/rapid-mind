# Healthcare reconnect dan pencabutan akses, 13 November 2026

Status: PASS untuk checkpoint sintetis yang tercantum; berhenti untuk review pemilik. Bukan penerimaan seluruh C2/C3.

## Perubahan dan temuan

Browser pada aset localhost sebelum perbaikan membuktikan bahwa putus WebSocket tetap dipulihkan oleh polling HTTP dan reconnect private Echo/Reverb berhasil tanpa reload. Namun, saat form kotor, pencabutan token_version tidak menutup halaman klinis. CaseAudience sudah menghentikan event baru untuk kanal lama dan middleware sudah menolak sesi server; pemeriksaan UI hanya menggunakan `/up` yang tidak memeriksa otorisasi, sementara rekonsiliasi klinis ditunda oleh draf.

Perbaikan sempit pada HealthcareLayout menambahkan pemeriksaan GET Inertia atas URL aktif, hanya meminta auth, healthcareChannel, clinicalScopeAvailable. Pemeriksaan ini berjalan terpisah dari antrean draf, memakai versi Inertia saat ini, credentials same-origin, no-store, dan batas waktu probe yang sudah ada. Respons 401 menutup konteks dan menuju login; 403/404 atau perubahan kanal menutup konteks dan menuju antrean Healthcare. Langganan lama ditinggalkan dan rekonsiliasi dihentikan sebelum navigasi. Respons untuk URL/kanal yang sudah berganti diabaikan. Gangguan sementara tidak diperlakukan sebagai pencabutan hak.

Interval tetap 15 detik, juga dipicu saat mount, online dan perubahan koneksi socket. Ini bukan pencabutan tampilan seketika; ketika server terjangkau, deteksi menunggu probe berikutnya beserta waktu request. Draf yang tetap berizin tetap dilindungi. Pencabutan eksplisit mengakhiri konteks klinis di memori, tanpa menghapus database/IndexedDB/storage. Draf Healthcare belum tersimpan tidak diklaim tersimpan atau dipulihkan otomatis setelah hak dicabut. Tidak ada mutasi klinis yang dicoba ulang otomatis.

## File checkpoint ini

- `resources/js/layouts/HealthcareLayout.vue`: pemeriksaan otorisasi independen dari draf dan penutupan tampilan klinis yang tidak lagi berizin.
- `tests/Node/healthcareAccessRevocation.test.ts`: enam regresi mounted Vue untuk sesi dicabut, kanal berubah, kasus ditolak, kegagalan sementara, akses tetap valid dan respons URL lama.
- `tests/Browser/healthcareReconnectRevocation.browser.mjs`: uji browser nyata dengan fixture baru dan bukti runtime Docker.
- `tests/Browser/helpers/liveLaravelProxy.mjs`: kendali putus WebSocket khusus profil pengujian, terpisah dari HTTP; tidak menyintesis auth/event/receipt.
- Dokumen laporan ini.

Perubahan terdahulu dan dua file design-system milik pekerjaan lain tetap dipertahankan. Tidak ada perubahan PHP, route, kebijakan klinis, environment, dependensi atau lockfile. Tidak ada commit/push.

## Verifikasi browser

Google Antigravity tidak tersedia dalam sesi ini. Memakai Chrome headless/CDP yang sudah terpasang, profil baru, HTTP Nginx/Laravel/PostgreSQL dan websocket Reverb/Echo sesungguhnya. Setelah perbaikan, aset produksi kandidat diuji lewat overlay khusus profil; aset terpublikasi localhost tidak ditimpa. Build kandidat: `/tmp/rapid-mind-c1-pwa-uQDuGQ/build`.

Run akhir: `C:/Users/daffa/AppData/Local/Temp/rapid-mind-healthcare-reconnect-6lyhDY/results.json`.

| Skenario | Hasil |
| --- | --- |
| Fixture region, Posko, dua Faskes dan tiga akun sintetis terisolasi; driver Reverb nyata | PASS |
| Tunnel websocket nyata diputus, HTTP tetap aktif; peringatan reconnect muncul dan polling memuat kasus yang event Created-nya terlewat | PASS |
| Socket baru, otorisasi/langganan private berhasil, status Online dan event Updated ID-only berikutnya diterima tanpa reload halaman | PASS |
| Draf sintetis berizin tetap utuh saat pembaruan ditunda | PASS |
| token_version dicabut saat draf kotor: tidak menerima event baru, pindah login; GET dan POST acknowledge nyata 401 | PASS |
| Akun dipindah Faskes saat draf kotor: konteks lama tertutup, GET dan POST verify kasus lama 404, auth kanal lama 403 | PASS |
| Faskes sintetis dinonaktifkan: private channel ditolak 403 | PASS |
| Akun sintetis dinonaktifkan saat idle: browser pindah login | PASS |

Payload event yang diperiksa hanya `{emergency:{id}}`. Tidak ada exception aplikasi browser pada run akhir. Screenshot `01-access-removed.png` dan `02-account-revoked.png` tersimpan bersama results; screenshot login setelah pencabutan akun diperiksa visual. Semua proses Chrome khusus checkpoint sudah ditutup; profil dan bukti tetap disimpan. Hash direktori public/build dan public/hot tetap sama setelah setiap run.

Kasus adalah fixture server sintetis baru, bukan pengulangan penerimaan pembuatan T0 Relawan. Fixture diinisialisasi PENDING lalu acknowledgement dilakukan melalui UI/API nyata. Status akhir ACKNOWLEDGED, satu audit EMERGENCY_ACKNOWLEDGED, tanpa verifikasi, rujukan atau dispatch. Emit Updated tambahan hanya stimulus transport untuk kasus sintetis ini, bukan klaim perubahan klinis. Tidak ada kontak lapangan/layanan medis riil.

## Tes otomatis dan build

- PASS: 30 tes Node pada healthcareAccessRevocation, healthcareEmergencyActions, healthcareEmergencyActionsTab, healthcareEmergencyQueue, healthcareWorklistFreshness, healthcareDraftReconciliation.
- PASS: `vue-tsc --noEmit` melalui Node WSL yang sudah tersedia.
- PASS: build produksi Vite terisolasi melalui `tests/Browser/helpers/localPwaBuild.mjs`; public/build dan public/hot pemilik tidak berubah.
- PASS: `node --check` runner browser dan helper proxy; `git diff --check`.
- Suite PHP tidak dijalankan ulang: tidak ada perubahan PHP. Suite BroadcastChannelAuthorizationTest dan AuthenticationBoundaryTest memakai RefreshDatabase dan sengaja tidak dijalankan sesuai larangan reset. Penolakan akses server di atas dibuktikan lewat request browser ke Laravel nyata.

## Jejak data yang dipertahankan

Empat percobaan total dipertahankan, termasuk reproduksi dan diagnosis selector detail. Semua memakai organisasi/akun baru, bukan mengubah akun lama.

| Run | Akun | Faskes | Region / Posko | Emergency |
| --- | --- | --- | --- | --- |
| PtYvcz, reproduksi gagal pencabutan saat draf kotor | 24–26 | 10–11 | 5 / 8 | 01a1d468-6e4a-7229-8a2f-11193d2f3c71 |
| wAwpwX, perbaikan sesi lulus; runner berhenti pada selector detail | 27–29 | 12–13 | 6 / 9 | 01a1d469-ad56-72c4-9646-8b33abb1ce7e |
| nXnKMf, delapan skenario lulus | 30–32 | 14–15 | 7 / 10 | 01a1d46b-2f71-72c9-9906-147cd14a6096 |
| 6lyhDY, akhir dengan penolakan mutasi server eksplisit | 33–35 | 16–17 | 8 / 11 | 01a1d46c-726b-7142-ac59-40d922bf5e22 |

Run akhir: Relawan33 hanya pemilik fixture; Healthcare34 dipindah dari Faskes16 ke17 dan token_version naik ke2; Healthcare35 dinonaktifkan; Faskes17 dinonaktifkan sebagai stimulus uji batas bawah. Perubahan ini langsung melalui Eloquent khusus fixture, bukan bukti penerimaan workflow Admin (Admin normal membatasi penonaktifan Faskes berakun aktif). Password acak hanya di memori runner, tidak diekspor ke laporan. Tidak ada fixture, profil, database, storage atau kunci lama yang dihapus/reset/dimigrasikan. Tidak ada dependensi diinstal/diubah.

## Belum diverifikasi dan batas checkpoint

Belum diuji: pencabutan share kasus individual, pengalihan scope kasus saat koneksi HTTP putus total, durasi outage/reconnect panjang, balapan serentak revoke vs transaksi aktif, history/BFCache/back-navigation, perangkat mobile/native/background lock, alarm suara, keseluruhan P1/P2, workflow Admin, referral/dispatch dan produksi. Perbaikan tidak mengklaim penghapusan salinan klinis yang pernah sah diterima sebelum pencabutan. Versi aset localhost yang terpublikasi belum memuat patch ini; bukti perbaikan berasal dari build kandidat produksi dengan backend/realtime nyata.

Langkah berikutnya yang disarankan hanya review checkpoint dan keputusan pemilik tentang publikasi kandidat. Tidak melanjutkan fase atau publikasi secara otomatis.
