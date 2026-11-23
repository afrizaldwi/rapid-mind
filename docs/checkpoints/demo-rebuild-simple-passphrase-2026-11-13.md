# Rebuild data demo dan frasa sederhana — 13 November 2026

## Otorisasi dan lingkup

Pemilik secara eksplisit meminta backup data lama, truncate data demo, isi ulang teratur, serta reset data offline browser localhost setelah identifikasi/backup. Ini menggantikan larangan reset pada checkpoint terdahulu hanya untuk dataset demo localhost dan profil yang diidentifikasi di sini. Database testing, skema, kunci aplikasi, dependensi, Git/history dan profil browser pengujian terdahulu tidak dihapus atau diubah.

## Backup sebelum truncate

Folder privat: storage/app/private/before-demo-rebuild-20261113-hnh_vgo0 (0700; arsip/credential0600).

- rapid_mind.dump: backup awal, SHA256 8e6a6b505ca6e37bbe179676fe17d03928ef8b088219faf12c9aadf5631d7215. Restore sukses ke rapid_mind_backup_verify_hnh_vgo0.
- rapid_mind-final.dump: backup final setelah aplikasi maintenance dan queue/scheduler/Reverb dihentikan, SHA256 5b7fe24e28cfdb1a7fc9c8fc1d3acdb164cc426dd7b7a3a7d89ed1403a918635. Restore sukses ke rapid_mind_final_verify_hnh_vgo0. Kedua database verifikasi dipertahankan.
- Sebelum reset:45 akun,50 pasien,83 asesmen,51 emergency. before-table-counts.json menyimpan inventaris31 tabel lengkap.
- Chrome biasa: jendela/profil Daffa, localhost:8080/_local-demo/storage-maintenance. Backup rapid-mind-browser-backup (1).json disalin privat sebagai chrome-daffa-backup.json; SHA256 fae793702cf617e3054eb383d3779b618570d8789f91627bd8a13710334cb189.12 store,14 encryptedStaging,1 offlineKeys,1 ownerEncryptionModes,3 receipts,1 continuity,0 plaintext clinical rows/outbox. JSON/schema diperiksa, semua store mempunyai keyPath sehingga tidak ada kunci out-of-line yang hilang. Tidak ada dekripsi kunci/data untuk backup. Restore browser belum diuji ulang; jangan menyamakannya dengan restore PostgreSQL yang benar-benar dilakukan.
- Browser Codex dicadangkan terpisah sebagai codex-browser-backup.json; tidak mempunyai database offline.

Backup browser mencakup metadata schema/index, row IndexedDB, localStorage/sessionStorage origin ini; bukan salinan seluruh profil, password manager atau cookie HttpOnly. Cache aset/worker tidak dihapus. File backup sensitif: jangan commit/bagikan.

## Reset dan dataset baru

Chrome: tab aplikasi lama ditutup, halaman backup mengonfirmasi reset dengan frasa RESET RAPID-MIND; screenshot nyata menunjukkan Reset selesai. Database:[]. Tidak menyentuh origin lain atau profil pengujian sebelumnya. Halaman mempunyai restore dari backup untuk pemulihan; HTML-nya disimpan privat. Route localhost sementara kemudian dihapus, sudah kembali404. Chrome pengguna ditinggalkan di /login.

Server:31 tabel application-data dari daftar FixtureEmptyDataset dikosongkan bersama dalam transaksi menggunakan TRUNCATE ... CONTINUE IDENTITY, tanpa CASCADE dan tanpa migrasi. migrations29 dan spatial_ref_sys8500 tetap utuh. Sequence users tetap45 sehingga akun baru46–51 tidak mengambil identitas akun lama. Cookie/sesi/JWT lama tidak memperoleh akun baru dengan ID yang sama; ciphertext/outbox perangkat lain tetap terisolasi menurut owner lama.

CompetitionFixtureSeeder yang sudah ada dipakai dengan opt-in eksplisit, anchor UTC2026-11-13, transport inert/null, session/cache/mail array dan queue sync selama seeding. Tidak mengganti .env atau dependensi. Seeder diulang sekali: validasi marker sukses, tidak menduplikasi dataset. Data historis fixture bersifat scripted synthetic dan broadcast dibungkam; bukan bukti pasien diperiksa, petugas mengakui kejadian atau unit dihubungi.

Hasil:1 wilayah,3 Posko,2 Faskes,2 unit respons,6 akun,12 pasien,12 asesmen,5 emergency,2 validasi klinis,2 rujukan,2 dispatch,3 shares,45 audit. Satu marker COMPETITION_FIXTURE_COMPLETED. Tidak ada orphan pasien-owner atau assessment-patient. Runtime session/cache setelah login merupakan data operasional normal, bukan fixture tambahan.

| ID | Akun | Role / penugasan |
| --- | --- | --- |
|46|admin@rapidmind.test|ADMIN|
|47|budi.santoso@rapidmind.test|RELAWAN / Posko12|
|48|rani.prameswari@rapidmind.test|RELAWAN / Posko13|
|49|dimas.prakoso@rapidmind.test|RELAWAN / Posko14|
|50|maya.lestari@rapidmind.test|HEALTHCARE / Faskes18|
|51|arief.wicaksono@rapidmind.test|HEALTHCARE / Faskes19|

Identitas adalah fixture sintetis dari spesifikasi kode, bukan pengguna/pasien nyata. Panduan login privat: storage/app/private/competition-fixture/DEMO-ACCOUNTS.txt. Password tidak dicetak ke laporan atau frontend. Jangan menyamakan password login dengan frasa offline.

## Penyederhanaan frasa

OfflineEncryptionGate kini menerangkan pembuatan frasa pribadi dari beberapa kata tidak berkaitan, minimal20 karakter; spasi boleh, simbol khusus tidak wajib. Ada aria-describedby dan minlength hanya pada pendaftaran baru. Unlock kunci existing tidak diberi minimum baru agar tetap kompatibel. Penjelasan existing menegaskan bahwa frasa baru tidak membuka kunci lama dan password login berbeda.

Tidak ada PIN pendek, auto-unlock, passphrase universal, penurunan PBKDF2/AES-GCM, perubahan ciphertext atau auto-enrollment. Pemilik memilih frasa sendiri saat benar-benar mendaftarkan penyimpanan; recovery tetap sekunder. Belum ada kunci baru yang dibuat otomatis pada browser pengguna.

## Verifikasi baru

-15 tes Node gate/crypto PASS.
-11 skenario Chrome/IndexedDB/PWA terisolasi PASS, C:/Users/daffa/AppData/Local/Temp/rapid-mind-p0-browser-8YDRiB/results.json. HTTP fixture tertutup, tidak menambahkan akun/kasus ke database demo yang baru dirapikan. Meliputi enkripsi, explicit enrollment/recovery, offline persistence/outbox dan preservation.
-vue-tsc --noEmit, isolated production build, git diff --check PASS.
-Login/workspace/logout nyata lewat HTTP Laravel untuk admin, relawan-1 dan healthcare-a PASS; bukan pengujian interaksi browser ketiga role. Fixture clinical ownership/orphan check dan idempotent seeder PASS.
-Backup database benar-benar direstore. Backup/reset Chrome profil pengguna dan halaman login akhir diperiksa lewat UI nyata.
-Aset manifest/app localhost dibandingkan byte dengan berkas build. Endpoint maintenance dihapus/404. Seluruh6 service Docker kembali aktif; maintenance telah berakhir.

Kesalahan diagnostik verifier (escape namespace PHP dan slash JSON nama komponen) diperbaiki; tidak mengubah produk atau kredensial. Tidak dihitung sebagai hasil penerimaan.

## Build, perubahan file dan keterbatasan

Aktif di http://localhost:8080/login; app assets/app-BGJfDPI7.js, manifest SHA256850ce905e213272e6319b1e44cffd5791e62e81209670a2d3668d8ac9dbdee4c. Source baseline de6be73ce37cf392aa54f0154151602c5b19db31 ditambah perubahan belum di-commit. Build /tmp/rapid-mind-c1-pwa-7dTR2J/build dipublikasikan aditif dengan previous-build dicadangkan dalam folder backup. Tidak ada chunk lama yang dibuang.

File tracked berubah: resources/js/components/Relawan/OfflineEncryptionGate.vue (7 baris petunjuk/atribut); docs/RAPID_MIND_OFFLINE_SECURITY_DESIGN.md dan laporan ini. Route pemeliharaan sementara telah dikembalikan tanpa perubahan tracked tersisa. Backup, credential, verifier dan inventory berada di storage privat/ignored.

Belum dilakukan: full PHP suite (termasuk yang memakai RefreshDatabase), full browser–Laravel T0/realtime acceptance sesudah reset, restore browser actual, native mobile/background, field acceptance dan production security. Uji isolated browser bukan bukti integrasi Healthcare. Perangkat/profil lain yang belum diidentifikasi tidak direset; unsynced fieldwork miliknya tidak dipindahkan. Basis akun baru memakai ID baru sehingga data itu tidak boleh dianggap milik akun baru.

Rollback memerlukan koordinasi restore PostgreSQL final dan backup browser yang sesuai, tanpa menyalakan penulis lama sebelum pengecekan owner/session. HTML restore-browser privat dipertahankan; route hanya boleh diaktifkan lagi secara lokal untuk pemulihan yang disetujui. Tidak ada Git commit/push, instalasi dependensi, migrasi skema atau kunci aplikasi.


## Follow-up: owner-requested simple demo credentials

User explicitly requested simpler usernames and login passwords. All six existing marker-owned accounts were updated in place: admin, relawan1, relawan2, relawan3, medis1, medis2. Canonical emails, IDs46–51, roles and Posko/Faskes assignments are unchanged. FixtureDefinition names now match these usernames so future seed/roster validation remains consistent. The password is demo-only and recorded in the private account guide, not in tracked source. Offline phrases/keys were not changed.

Previous credential inventory and user rows were backed up under before-simple-accounts in the private rebuild backup folder. Existing durable FixtureCredentialReplacement staging/publish was reused; token versions incremented and refresh families revoked. One audit records the update without password/hash payloads. No clinical data reset or deletion occurred.

Verification: CompetitionDemoAccountsTest through Docker PASS10 tests /201 assertions, DatabaseTransactions on the guarded testing DB; no schema reset. Real localhost HTTP login/workspace/logout using the new username for all six accounts PASS. No browser interaction claim for this follow-up. git diff --check PASS. Source file changed in this follow-up: database/seeders/Competition/FixtureDefinition.php; runtime credential file and private guide reconciled. No frontend asset or dependency change, commit or push.
