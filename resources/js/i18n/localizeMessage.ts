import type { SupportedLocale } from "./types";

const PAIRS: ReadonlyArray<readonly [id: string, en: string]> = [
    // Bidirectional notices & client validation
    [
        "Jawaban manual atau tersimpan dipertahankan. Periksa respons yang belum jelas secara manual.",
        "Manual or saved answers remain preserved. Check unclear responses manually.",
    ],
    [
        "Hasil suara telah ditinjau. Klarifikasi jawaban yang belum jelas; Q17 Ya memerlukan konfirmasi relawan.",
        "Voice results reviewed. Clarify any unclear responses; Q17 Yes requires volunteer confirmation.",
    ],
    ["Nama penyintas harus diisi.", "Survivor name is required."],
    ["Asesmen lokal belum siap.", "Local assessment is not ready."],
    ["Daftar penyintas belum dapat dimuat.", "Survivor list could not be loaded."],
    ["Data di perangkat belum dapat dibaca.", "Device data cannot be read yet."],
    ["Lengkapi jawaban SRQ-20 terlebih dahulu.", "Complete SRQ-20 answers first."],
    ["Lengkapi penilaian faktor risiko terlebih dahulu.", "Complete risk factor assessment first."],
    ["Lengkapi penilaian fungsi harian terlebih dahulu.", "Complete daily functioning assessment first."],

    // Resume stage labels & status badges
    ["Lanjutkan SRQ-20", "Continue SRQ-20"],
    ["Lanjutkan Faktor Risiko", "Continue Risk Factors"],
    ["Lanjutkan Fungsi Harian", "Continue Daily Functioning"],
    ["Tinjau Asesmen", "Review Assessment"],
    ["Lanjutkan", "Continue"],
    ["T0-Confirmed Aktif", "Active T0-Confirmed"],
    ["T0-Suspect Aktif", "Active T0-Suspect"],
    ["Lokasi manual", "Manual location"],
    ["GPS tersimpan", "Saved GPS"],
    ["Kit Ramah Anak", "Child-Friendly Kit"],
    ["Paket Sanitasi Lansia", "Elderly Sanitation Kit"],
    ["Obat Kronis Esensial", "Essential Chronic Medicine"],

    // Auth, Session, Middleware & Rate Limiting
    ["Email/username atau kata sandi tidak sesuai.", "Email/username or password does not match."],
    ["Akun Anda sedang nonaktif. Hubungi Admin.", "Your account is currently inactive. Contact an Admin."],
    ["Terlalu banyak percobaan masuk. Coba lagi sebentar.", "Too many login attempts. Try again shortly."],
    ["Terlalu banyak percobaan. Coba lagi sebentar.", "Too many attempts. Try again shortly."],
    ["Sesi berakhir. Silakan masuk kembali.", "Session expired. Please sign in again."],
    ["Token tidak dapat diperbarui. Silakan login kembali.", "Token could not be refreshed. Please sign in again."],
    ["Berhasil keluar.", "Logged out successfully."],
    ["Anda tidak memiliki akses ke resource ini.", "You do not have access to this resource."],
    ["Anda tidak memiliki akses ke halaman tersebut.", "You do not have access to that page."],
    ["Anda tidak memiliki akses untuk menjalankan tindakan Healthcare.", "You do not have permission to perform Healthcare actions."],

    // Relawan Server Messages & Sync
    ["Penyintas tidak tersedia untuk Relawan ini.", "Survivor is not available for this Volunteer."],
    ["Nama penyintas diperlukan untuk identitas lokal baru.", "Survivor name is required for a new local identity."],
    ["Asesmen tidak tersedia untuk Relawan ini.", "Assessment is not available for this Volunteer."],
    ["Identitas penyintas diperlukan untuk asesmen lokal baru.", "Survivor identity is required for a new local assessment."],
    ["Penyintas tidak sesuai dengan asesmen yang dipilih.", "Survivor does not match the selected assessment."],
    ["Jawaban SRQ tersimpan di server.", "SRQ answers saved to server."],
    ["Faktor risiko tersimpan.", "Risk factors saved."],
    ["Jawaban risiko harus Ya atau Tidak.", "Risk answer must be Yes or No."],
    ["Fungsi harian tersimpan.", "Daily functioning saved."],
    ["Nilai fungsi harus 0, 1, atau 3.", "Function value must be 0, 1, or 3."],
    ["Nilai fungsi harus bilangan bulat.", "Function value must be an integer."],
    [
        "Asesmen belum lengkap atau memiliki jawaban tidak valid. Periksa SRQ-20, faktor risiko, dan fungsi harian.",
        "Assessment is incomplete or contains invalid answers. Check SRQ-20, risk factors, and daily functioning.",
    ],
    ["Asesmen berhasil diselesaikan.", "Assessment completed successfully."],
    ["Asesmen selesai tidak dapat diubah.", "Completed assessment cannot be modified."],
    [
        "Asesmen server telah berubah. Muat dan tinjau versi terbaru sebelum menyimpan.",
        "Server assessment has changed. Reload and review the latest version before saving.",
    ],
    [
        "Insiden T0 tersimpan di server dan notifikasi realtime berhasil dikirim.",
        "T0 incident saved on server and realtime notification was delivered.",
    ],
    ["Insiden T0 tersimpan di server.", "T0 incident saved on server."],
    [
        "Insiden T0 telah tersimpan di server, tetapi notifikasi realtime ke Healthcare belum dapat dikonfirmasi. Gunakan kanal komunikasi darurat cadangan bila diperlukan.",
        "T0 incident saved on server, but realtime notification to Healthcare could not be confirmed yet. Use backup emergency communication channels if needed.",
    ],
    [
        "Insiden T0 tersimpan di server, tetapi notifikasi realtime belum dapat dikonfirmasi.",
        "T0 incident saved on server, but realtime notification could not be confirmed yet.",
    ],
    ["Identitas atau pemilik asesmen bertentangan.", "Assessment identity or owner conflicts with server record."],
    ["Mode asesmen selesai tidak dapat diubah.", "Completed assessment mode cannot be changed."],
    ["Isi asesmen selesai bertentangan dengan rekaman server.", "Completed assessment data conflicts with the server record."],
    [
        "Asesmen server telah berubah. Draf lokal tetap disimpan; tinjau konflik sebelum mengirim ulang.",
        "Server assessment has changed. Local draft remains saved; review the conflict before resending.",
    ],
    [
        "Versi asesmen server tidak ditemukan. Draf lokal tetap disimpan.",
        "Server assessment version not found. Local draft remains saved.",
    ],
    ["Mode asesmen bertentangan.", "Assessment mode conflicts."],
    ["Penyintas tidak sesuai dengan asesmen.", "Survivor does not match the assessment."],
    ["Kirim daftar observasi bersama catatan lainnya.", "Send observation list together with the other note."],
    ["Kode observasi tidak valid.", "Invalid observation code."],
    ["UNKNOWN tidak boleh digabung dengan observasi lain.", "UNKNOWN cannot be combined with other observations."],
    ["Catatan lainnya hanya boleh disertakan untuk OTHER.", "Other note may only be included for OTHER."],
    ["Catatan observasi hanya untuk OTHER, maksimal 500 karakter.", "Observation note is only for OTHER, maximum 500 characters."],
    ["Nilai jawaban SRQ tidak valid.", "Invalid SRQ answer value."],
    ["Format jawaban SRQ tidak valid.", "Invalid SRQ answer format."],
    ["Nomor pertanyaan SRQ tidak valid.", "Invalid SRQ question number."],
    ["Klarifikasi seluruh 20 jawaban SRQ sebelum menghitung skor.", "Clarify all 20 SRQ answers before calculating the score."],
    ["Keadaan jawaban SRQ bertentangan.", "Conflicting SRQ answer states."],
    ["Keadaan jawaban SRQ tidak valid.", "Invalid SRQ answer state."],
    ["SRQ-20 harus memiliki 20 jawaban definitif.", "SRQ-20 must have 20 definitive answers."],
    ["SRQ-20 masih memiliki jawaban yang belum diklarifikasi.", "SRQ-20 still has unclarified answers."],
    ["Klarifikasi seluruh jawaban SRQ sebelum menyelesaikan asesmen.", "Clarify all SRQ answers before completing the assessment."],
    ["Jawaban SRQ harus YES, NO, UNCLEAR, UNANSWERED, atau boolean.", "SRQ answer must be YES, NO, UNCLEAR, UNANSWERED, or boolean."],

    // Healthcare Server Messages, Dispatch & Referrals
    [
        "Kasus sudah melewati tahap pengakuan dan tidak dapat dimundurkan.",
        "Case has passed the acknowledgement stage and cannot be moved back.",
    ],
    ["Kasus berhasil diakui.", "Case acknowledged successfully."],
    [
        "Verifikasi sekunder tidak dapat disimpan karena tahap kasus sudah berubah.",
        "Secondary verification cannot be saved because the case stage has changed.",
    ],
    [
        "Keputusan klinis tidak dapat disimpan karena tahap atau hasil klinis kasus sudah berubah.",
        "Clinical decision cannot be saved because the case stage or clinical result has changed.",
    ],
    ["Status klinis darurat berhasil diperbarui.", "Emergency clinical status updated successfully."],
    ["Rujukan darurat diterbitkan setelah konfirmasi T0.", "Emergency referral issued following T0 confirmation."],
    ["Rujukan darurat hanya dapat dibuat setelah T0 dikonfirmasi.", "Emergency referral can only be created after T0 is confirmed."],
    ["Rujukan tidak dapat dibuat karena identitas pasien belum tercatat.", "Referral cannot be created because patient identity is not yet recorded."],
    [
        "Rujukan untuk kasus ini sudah tercatat ke Faskes lain dan tidak dapat diubah.",
        "A referral for this case is already recorded to another facility and cannot be changed.",
    ],
    ["Rujukan darurat berhasil dibuat.", "Emergency referral created successfully."],
    ["Rujukan tindak lanjut klinis.", "Clinical follow-up referral."],
    ["Rujukan klinis diterbitkan pasca-validasi asesmen.", "Clinical referral issued after assessment validation."],
    ["Validasi belum tersimpan karena gangguan server. Coba lagi.", "Validation was not saved due to a server issue. Try again."],
    ["Validasi klinis berhasil disimpan.", "Clinical validation saved successfully."],
    ["Perubahan status rujukan ini tidak diizinkan.", "This referral status change is not permitted."],
    [
        "Data telah diperbarui oleh pengguna lain. Muat data terbaru sebelum melakukan perubahan.",
        "Data was updated by another user. Load the latest data before making changes.",
    ],
    ["Status rujukan berhasil diperbarui.", "Referral status updated successfully."],
    [
        "Perubahan tersimpan, tetapi pembaruan realtime ke perangkat lain belum dapat dikonfirmasi.",
        "Changes saved, but realtime updates to other devices could not be confirmed yet.",
    ],
    [
        "Perubahan belum tersimpan karena gangguan server. Muat data terbaru sebelum mencoba lagi.",
        "Changes were not saved due to a server issue. Load the latest data before trying again.",
    ],
    ["Pekerjaan rujukan ditandai selesai di sistem.", "Referral task marked complete in the system."],
    ["Penugasan respons tersimpan di sistem.", "Response assignment saved in the system."],
    ["Status respons tersimpan di sistem.", "Response status saved in the system."],
    ["Hubungan rujukan respons tersimpan di sistem.", "Response referral link saved in the system."],
    ["Perubahan tersimpan di sistem.", "Changes saved in the system."],
    [
        "Hasil penyimpanan belum dapat dipastikan karena jaringan terputus. Muat status terbaru sebelum mencoba lagi.",
        "Save outcome cannot be confirmed because the network disconnected. Load the latest status before trying again.",
    ],
    [
        "Status rujukan telah berubah. Muat data terbaru atau lanjutkan alur rujukan yang berlaku.",
        "Referral status has changed. Load the latest data or continue with the active referral flow.",
    ],
    [
        "Penugasan untuk kejadian ini sudah tercatat dan tidak dapat diganti.",
        "An assignment for this incident is already recorded and cannot be replaced.",
    ],
    [
        "Penugasan respons hanya dapat dibuat setelah T0 dikonfirmasi.",
        "A response assignment can only be created after T0 is confirmed.",
    ],
    ["Pilih unit respons yang aktif.", "Select an active response unit."],
    ["Perubahan status respons ini tidak diizinkan.", "This response status change is not permitted."],
    ["Rujukan respons sudah tercatat dan tidak dapat diganti.", "Response referral is already recorded and cannot be replaced."],
    [
        "Rujukan harus berasal dari kejadian darurat dan pasien yang sama.",
        "Referral must originate from the same emergency incident and patient.",
    ],
    [
        "Sumber keputusan klinis rujukan tidak sesuai dengan kejadian darurat.",
        "The referral clinical decision source does not match the emergency incident.",
    ],
    [
        "Data respons telah berubah. Muat data terbaru sebelum melakukan perubahan.",
        "Response data has changed. Load the latest data before making changes.",
    ],
    ["Koordinat GPS darurat yang valid belum tersedia.", "Valid emergency GPS coordinates are not yet available."],
    ["Posko pada kejadian darurat belum tersedia.", "Shelter on the emergency incident is not yet available."],
    ["Lokasi Posko belum cukup untuk penugasan.", "Shelter location is insufficient for dispatch assignment."],
    ["Isi deskripsi lokasi tujuan respons.", "Enter a destination description for the response."],

    // Admin Provisioning, Master Data & Logistics
    ["Posko berhasil dibuat.", "Shelter created successfully."],
    ["Posko berhasil diperbarui.", "Shelter updated successfully."],
    [
        "Posko masih memiliki Relawan aktif. Pindahkan atau nonaktifkan Relawan terlebih dahulu.",
        "Shelter still has active Volunteers. Reassign or deactivate them first.",
    ],
    ["Skema penugasan Faskes belum tersedia.", "Facility assignment schema is not yet available."],
    ["Faskes berhasil dibuat.", "Healthcare facility created successfully."],
    ["Faskes berhasil diperbarui.", "Healthcare facility updated successfully."],
    [
        "Faskes masih memiliki akun Healthcare aktif. Pindahkan atau nonaktifkan akun terlebih dahulu.",
        "Facility still has active Healthcare accounts. Reassign or deactivate them first.",
    ],
    ["Akun berhasil dibuat.", "Account created successfully."],
    ["Akun berhasil diperbarui.", "Account updated successfully."],
    ["Masukkan nomor telepon Relawan Indonesia yang valid.", "Enter a valid Indonesian Volunteer phone number."],
    ["Pilih Posko aktif untuk penugasan Relawan.", "Select an active Shelter for Volunteer assignment."],
    ["Pilih Faskes aktif untuk penugasan Healthcare.", "Select an active Healthcare Facility for Healthcare assignment."],
    ["Kebutuhan logistik berhasil dicatat.", "Logistics need recorded successfully."],
    ["Kebutuhan logistik berhasil diperbarui.", "Logistics need updated successfully."],
    ["Alokasi logistik berhasil dicatat.", "Logistics allocation recorded successfully."],
    [
        "Kategori, nama bahan, dan satuan tidak dapat diubah setelah alokasi dicatat.",
        "Category, material name, and unit cannot be changed after allocations are recorded.",
    ],
    [
        "Jumlah kebutuhan tidak boleh lebih kecil dari total yang sudah dialokasikan.",
        "Quantity needed cannot be smaller than the total already allocated.",
    ],
    ["Jumlah alokasi melebihi sisa kebutuhan.", "Allocation quantity exceeds the remaining need."],
    [
        "Kebutuhan dan alokasi baru hanya dapat dicatat untuk Posko aktif.",
        "New needs and allocations can only be recorded for an active Shelter.",
    ],

    // Offline Client / Storage / Encryption / STT Errors
    ["Asesmen ini belum tersedia di perangkat.", "This assessment is not yet available on this device."],
    ["Data penyintas belum tersedia di perangkat.", "Survivor data is not yet available on this device."],
    ["Asesmen lokal tidak ditemukan pada perangkat ini.", "Local assessment was not found on this device."],
    ["Data penyintas tidak tersedia.", "Survivor data is unavailable."],
    ["Asesmen lokal tidak tersedia.", "Local assessment is unavailable."],
    ["Penyintas lokal tidak tersedia.", "Local survivor is unavailable."],
    [
        "Akses asesmen berubah. Tinjau kembali sebelum menyelesaikan.",
        "Assessment access changed. Review again before completing.",
    ],
    ["Asesmen belum lengkap atau tidak tersedia.", "Assessment is incomplete or unavailable."],
    ["Asesmen berubah. Tinjau kembali sebelum menyelesaikan.", "Assessment changed. Review again before completing."],
    ["Versi server asesmen berubah selama sinkronisasi.", "Server assessment version changed during synchronization."],
    ["Respons asesmen sudah usang.", "Assessment response is stale."],
    ["Metadata kunci rusak.", "Key metadata is corrupted."],
    ["Data lokal berubah bersamaan. Ulangi tindakan.", "Local data changed concurrently. Repeat the action."],
    ["Data lokal berubah bersamaan. Ulangi penyimpanan.", "Local data changed concurrently. Repeat saving."],
    ["Identitas antrean rusak.", "Outbox entry identity is corrupted."],
    ["Antrean terenkripsi rusak atau tidak sesuai pemilik.", "Encrypted outbox is corrupted or does not match owner."],
    ["Referensi catatan antrean hilang atau tidak sesuai.", "Outbox record reference is missing or mismatched."],
    ["Indeks antrean hilang atau duplikat. Data tetap tersimpan.", "Outbox index is missing or duplicated. Data remains saved."],
    ["Catatan lokal tidak tersedia untuk Relawan ini.", "Local record is not available for this Volunteer."],
    ["Asesmen berubah saat menyiapkan antrean. Coba lagi.", "Assessment changed while preparing the outbox queue. Try again."],
    ["Identitas antrean sudah tersedia.", "Outbox identity already exists."],
    ["Antrean berubah bersamaan.", "Outbox changed concurrently."],
    ["Identitas insiden atau antrean sudah tersedia.", "Incident or outbox identity already exists."],
    ["Catatan lokal tidak tersedia.", "Local record is unavailable."],
    ["Antrean tidak tersedia.", "Outbox entry is unavailable."],
    ["Catatan lokal hilang.", "Local record is missing."],
    ["Respons server tidak sesuai catatan.", "Server response does not match record."],
    ["Sesi sinkronisasi berubah.", "Synchronization session changed."],
    ["Revisi antrean berubah.", "Outbox revision changed."],
    ["Hidrasi memerlukan asesmen selesai yang diterima server.", "Hydration requires a completed server-accepted assessment."],
    ["Identitas asesmen server bertentangan.", "Server assessment identity conflicts."],
    ["Relasi asesmen selesai tidak valid.", "Completed assessment relations are invalid."],
    ["Isi asesmen selesai bertentangan dengan server.", "Completed assessment content conflicts with server."],
    ["Observasi asesmen selesai bertentangan dengan server.", "Completed assessment observations conflict with server."],
    [
        "Pendaftaran enkripsi belum diizinkan untuk sesi dan lingkungan ini.",
        "Encryption enrollment is not allowed for this session and environment.",
    ],
    ["Pendaftaran kunci memerlukan koneksi server.", "Key enrollment requires a server connection."],
    ["Sesi Relawan belum terverifikasi.", "Volunteer session is not yet verified."],
    ["Sesi Relawan tidak sesuai pemilik data.", "Volunteer session does not match data owner."],
    ["Akses Relawan lokal belum tersedia untuk akun ini.", "Local Volunteer access is not yet available for this account."],
    [
        "Pendaftaran enkripsi perangkat belum diizinkan pada lingkungan ini.",
        "Device encryption enrollment is not permitted in this environment.",
    ],
    ["Konfirmasi frasa sandi tidak sama.", "Passphrase confirmation does not match."],
    [
        "Frasa sandi offline harus 20–1024 karakter dan tidak berulang.",
        "Offline passphrase must be 20–1024 characters and non-repeating.",
    ],
    [
        "Penyimpanan bukan perangkat baru. Periksa pemulihan atau reset yang disetujui.",
        "Storage is not a new device. Check approved recovery or reset options.",
    ],
    ["Inisialisasi berubah di tab lain.", "Initialization changed in another tab."],
    ["Pendaftaran tertunda tidak tersedia.", "Pending enrollment is unavailable."],
    ["Kunci perangkat tidak tersedia.", "Device key is unavailable."],
    ["Kunci perangkat berubah.", "Device key changed."],
    ["Buka kembali pendaftaran dengan frasa sandi.", "Reopen enrollment with the passphrase."],
    ["Pendaftaran berubah.", "Enrollment changed."],
    [
        "Inisialisasi perangkat tidak sesuai. Data tetap tersimpan.",
        "Device initialization mismatch. Data remains saved.",
    ],
    ["Metadata kunci berubah.", "Key metadata changed."],
    [
        "Penyimpanan akses tidak tersedia. Muat ulang setelah diperbaiki.",
        "Access storage is unavailable. Reload after resolving.",
    ],
    ["Penyimpanan akses tidak tersedia.", "Access storage is unavailable."],
    ["Akses klinis berubah. Buka kunci kembali.", "Clinical access changed. Unlock again."],
    ["Penulisan klinis plaintext dinonaktifkan.", "Plaintext clinical writes are disabled."],
    ["Penyintas tidak sesuai asesmen.", "Survivor does not match assessment."],
    ["Asesmen belum lengkap.", "Assessment is incomplete."],
    ["Akses asesmen berubah.", "Assessment access changed."],
    ["Insiden tidak tersedia untuk Relawan ini.", "Incident is not available for this Volunteer."],
    ["Pilih indikator Red Flag yang valid.", "Select a valid Red Flag indicator."],
    ["Catatan maksimal 1000 karakter.", "Notes may not exceed 1000 characters."],
    ["Koordinat tidak valid.", "Invalid coordinates."],
    [
        "Insiden darurat belum tersimpan di perangkat. Tetap dampingi penyintas dan coba lagi.",
        "Emergency incident is not yet saved on this device. Continue accompanying the survivor and try again.",
    ],
    ["Antrean sinkronisasi insiden tidak tersedia.", "Incident synchronization queue is unavailable."],
    ["Kunci data offline terkunci.", "Offline data key is locked."],
    ["Kunci data offline tidak tersedia.", "Offline data key is unavailable."],
    ["Kunci data offline berubah.", "Offline data key changed."],
    ["Akses data offline berubah saat membuka kunci.", "Offline data access changed while unlocking."],
    ["Inisialisasi atau sesi klinis belum sesuai.", "Initialization or clinical session does not match."],
    [
        "Penyimpanan klinis belum diinisialisasi atau diblokir. Data tetap tersimpan.",
        "Clinical storage is uninitialized or blocked. Data remains saved.",
    ],
    ["Mode penyimpanan berubah. Muat ulang data lokal.", "Storage mode changed. Reload local data."],
    ["Buka kunci data offline Relawan ini.", "Unlock offline data for this Volunteer."],
    ["Konteks Relawan berubah. Masuk kembali.", "Volunteer context changed. Sign in again."],
    ["Konteks Relawan berubah.", "Volunteer context changed."],
    ["Penyimpanan klinis belum dipersiapkan.", "Clinical storage is not yet prepared."],
    ["Aktivasi penyimpanan terenkripsi belum tersedia.", "Encrypted storage activation is not yet available."],
    ["Salinan terenkripsi belum lengkap atau berubah.", "Encrypted copies are incomplete or changed."],
    ["Kunci offline tidak tersedia.", "Offline key is unavailable."],
    ["Jumlah catatan terenkripsi tidak sesuai.", "Encrypted record count mismatch."],
    ["Salinan terenkripsi hilang.", "Encrypted copy missing."],
    ["Identitas catatan terenkripsi tidak sesuai.", "Encrypted record identity mismatch."],
    ["Salinan terenkripsi usang.", "Encrypted copy is stale."],
    ["Pemilik sudah menggunakan penyimpanan terenkripsi.", "Owner already uses encrypted storage."],
    ["Kunci offline berubah selama aktivasi.", "Offline key changed during activation."],
    ["Data lokal berubah selama aktivasi.", "Local data changed during activation."],
    ["Identitas antrean terenkripsi tidak sesuai.", "Encrypted outbox identity mismatch."],
    ["Respons asesmen server tidak sesuai catatan.", "Server assessment response does not match record."],
    ["Penyintas respons server tidak sesuai asesmen.", "Server response survivor does not match assessment."],
    ["Keadaan asesmen server tidak valid.", "Server assessment state is invalid."],
    ["Versi asesmen server tidak valid.", "Server assessment version is invalid."],
    ["Batas identitas antrean rusak.", "Outbox identity boundary is corrupted."],
    [
        "Batas identitas antrean hilang. Data tetap tersimpan.",
        "Outbox identity boundary is missing. Data remains saved.",
    ],
    ["Bukti identitas antrean tidak lengkap atau rusak.", "Outbox identity proof is incomplete or corrupted."],
    ["Batas identitas antrean tidak konsisten.", "Outbox identity boundary is inconsistent."],
    ["Identitas antrean habis.", "Outbox identity limit exhausted."],
    ["Server tidak tersedia.", "Server unavailable."],
    ["Respons aset offline tidak sesuai.", "Offline asset response mismatch."],
    ["ONNX WASM runtime tidak tersedia.", "ONNX WASM runtime is unavailable."],
    ["Backend Whisper tidak tersedia.", "Whisper backend is unavailable."],
    ["Whisper worker gagal dijalankan.", "Whisper worker failed to start."],
    ["Patient options unavailable", "Pilihan penyintas belum tersedia."],
    ["Another Relawan owns the active synchronization session", "Relawan lain sedang memegang sesi sinkronisasi aktif."],
    ["Emergency unavailable for owner", "Insiden darurat tidak tersedia untuk pemilik ini."],
    ["Emergency owner mismatch", "Pemilik insiden darurat tidak sesuai."],
    ["Assessment owner mismatch", "Pemilik asesmen tidak sesuai."],
    ["Assessment unavailable for owner", "Asesmen tidak tersedia untuk pemilik ini."],
    ["Patient owner mismatch", "Pemilik data penyintas tidak sesuai."],
    ["Local emergency missing", "Data insiden lokal tidak ditemukan."],
    ["Local patient missing", "Data penyintas lokal tidak ditemukan."],
    ["Local assessment missing", "Data asesmen lokal tidak ditemukan."],
    ["Offline data is locked for this owner", "Data offline terkunci untuk pemilik ini."],
    ["Kasus darurat berhasil diakui.", "Emergency case acknowledged."],
    ["Gagal mengakui kasus.", "Failed to acknowledge case."],
    ["Verifikasi medis berhasil disimpan.", "Clinical verification saved."],
    ["Gagal menyimpan verifikasi.", "Failed to save verification."],
    ["Klasifikasi triase berhasil ditetapkan.", "Triage classification assigned."],
    ["Gagal menetapkan klasifikasi.", "Failed to assign classification."],
    ["Rujukan medis berhasil diterbitkan.", "Medical referral issued."],
    ["Gagal menerbitkan rujukan.", "Failed to issue referral."],
    ["Gagal menyimpan faktor risiko.", "Failed to save risk factors."],
    ["Gagal menyimpan fungsi harian.", "Failed to save daily functioning."],
    ["Asesmen belum dapat diselesaikan.", "Unable to complete assessment."],
    ["Asesmen belum tersimpan pada perangkat ini.", "Assessment is not yet saved on this device."],
    ["Sebagian asesmen server belum dapat disalin ke perangkat ini.", "Some server assessments could not be copied to this device."],
    ["Daftar asesmen lokal belum dapat dibaca.", "Local assessment list could not be read."],
    ["Mode atau antrean sinkronisasinya belum tersimpan. Coba simpan draf kembali.", "Mode or sync queue was not saved. Try saving the draft again."],
    ["Observasi atau antrean sinkronisasinya belum tersimpan. Coba simpan draf kembali.", "Observation or sync queue was not saved. Try saving the draft again."],
    ["Mode atau observasi belum tersimpan. Coba lagi.", "Mode or observation could not be saved. Please try again."],
    ["Draf lokal belum tersimpan. Jawaban di halaman ini masih ada; coba pilih jawaban lagi.", "Local draft could not be saved. Answers on this page are still intact; try selecting an answer again."],
    ["Jawaban belum tersimpan di perangkat ini. Coba lagi.", "Answer was not saved on this device. Please try again."],
    ["Asesmen lokal tidak dapat dibaca.", "Local assessment could not be read."],
    ["Asesmen ini belum tersedia di perangkat.", "This assessment is not available on this device."],
    ["Data penyintas belum tersedia di perangkat.", "Survivor data is not available on this device."],
    ["Insiden ini belum tersedia di perangkat.", "This emergency incident is not available on this device."],
    ["Halaman ini belum tersedia dalam mode lapangan offline.", "This page is not yet available in offline field mode."],
    ["Navigasi server melewati batas waktu.", "Server navigation timed out."],
    ["Akses perangkat belum dapat diperiksa. Coba lagi saat penyimpanan tersedia.", "Device access could not be verified. Try again when storage is available."],
    ["Asesmen belum lengkap. Periksa kembali SRQ-20, faktor risiko, dan fungsi harian.", "Assessment is incomplete. Please review SRQ-20, risk factors, and daily functioning."],
    ["Gagal menghapus jawaban sebelumnya.", "Failed to clear the previous answer."],
    ["Lanjutkan SRQ-20", "Continue SRQ-20"],
    ["Lanjutkan Faktor Risiko", "Continue Risk Factors"],
    ["Lanjutkan Fungsi Harian", "Continue Daily Functioning"],
    ["Tinjau Asesmen", "Review Assessment"],
    ["T0-Confirmed Aktif", "Active T0-Confirmed"],
    ["T0-Suspect Aktif", "Active T0-Suspect"],
    ["Lokasi manual", "Manual location"],
    ["Nama penyintas harus diisi.", "Survivor name is required."],
    ["Gagal memulai asesmen baru.", "Failed to start new assessment."],
    ["Akses halaman gagal dimuat. Coba kembali.", "Failed to load page access. Please try again."],
    ["Pendaftaran frasa sandi gagal. Coba ulangi.", "Passphrase registration failed. Please try again."],
    ["Konfirmasi frasa sandi tidak cocok.", "Passphrase confirmation does not match."],
    ["Sesi offline belum siap. Buka kunci terlebih dahulu.", "Offline session is not ready. Unlock first."],
    ["Frasa sandi tidak sesuai.", "Incorrect passphrase."],
    ["Pembacaan kunci terenkripsi gagal.", "Failed to read encrypted key."],
    ["Data operasi tidak dapat diperbarui.", "Operation data could not be updated."],
    ["Gagal memperbarui status operasi.", "Failed to update operation status."],
    ["Gagal memuat data rujukan.", "Failed to load referral data."],
    ["Konflik sinkronisasi rujukan terdeteksi.", "Referral synchronization conflict detected."],
    ["Asesmen lokal belum siap.", "Local assessment is not ready."],
    ["Asesmen lokal tidak tersedia.", "Local assessment is not available."],
    ["Asesmen selesai tidak dapat diubah.", "Completed assessments cannot be modified."],
    [
        "Jawaban manual atau tersimpan dipertahankan. Periksa respons yang belum jelas secara manual.",
        "Manual or saved answers remain preserved. Check unclear responses manually.",
    ],
    [
        "Hasil suara telah ditinjau. Klarifikasi jawaban yang belum jelas; Q17 Ya memerlukan konfirmasi relawan.",
        "Voice results reviewed. Clarify any unclear responses; Q17 Yes requires volunteer confirmation.",
    ],
];

const ID_TO_EN: Record<string, string> = {};
const EN_TO_ID: Record<string, string> = {};

for (const [idText, enText] of PAIRS) {
    if (!(idText in ID_TO_EN)) ID_TO_EN[idText] = enText;
    if (!(enText in EN_TO_ID)) EN_TO_ID[enText] = idText;
}

function translateLaravelValidation(text: string, target: "id" | "en"): string | null {
    if (target !== "id") return null;

    let m = text.match(/^The (.+?) field is required\.$/);
    if (m) return `Bidang ${m[1]} wajib diisi.`;

    m = text.match(/^The (.+?) has already been taken\.$/);
    if (m) return `${m[1]} sudah terdaftar.`;

    m = text.match(/^The (.+?) field must be a valid email address\.$/);
    if (m) return `Format email ${m[1]} tidak valid.`;

    m = text.match(/^The (.+?) field confirmation does not match\.$/);
    if (m) return `Konfirmasi ${m[1]} tidak cocok.`;

    m = text.match(/^The (.+?) field must be at least (\d+) characters\.$/);
    if (m) return `${m[1]} minimal harus terdiri dari ${m[2]} karakter.`;

    m = text.match(/^The (.+?) field must not be greater than (-?\d+) characters\.$/);
    if (m) return `${m[1]} maksimal ${m[2]} karakter.`;

    m = text.match(/^The (.+?) field must be at least (-?\d+)\.$/);
    if (m) return `${m[1]} minimal harus bernilai ${m[2]}.`;

    m = text.match(/^The (.+?) field must not be greater than (-?\d+)\.$/);
    if (m) return `${m[1]} tidak boleh lebih dari ${m[2]}.`;

    m = text.match(/^The selected (.+?) is invalid\.$/);
    if (m) return `Pilihan ${m[1]} tidak valid.`;

    m = text.match(/^The (.+?) field format is invalid\.$/);
    if (m) return `Format ${m[1]} tidak valid.`;

    m = text.match(/^The (.+?) field must be an integer\.$/);
    if (m) return `${m[1]} harus berupa bilangan bulat.`;

    m = text.match(/^The (.+?) field must be a string\.$/);
    if (m) return `${m[1]} harus berupa teks.`;

    m = text.match(/^The (.+?) field must be true or false\.$/);
    if (m) return `${m[1]} harus bernilai ya atau tidak.`;

    m = text.match(/^The (.+?) field must be a number\.$/);
    if (m) return `${m[1]} harus berupa angka.`;

    m = text.match(/^The (.+?) field must be greater than (\d+)\.$/);
    if (m) return `${m[1]} harus lebih besar dari ${m[2]}.`;

    m = text.match(/^The (.+?) field must be between (-?\d+) and (-?\d+)\.$/);
    if (m) return `${m[1]} harus di antara ${m[2]} dan ${m[3]}.`;

    return null;
}

export function localizeMessage(
    message: string | null | undefined,
    locale: SupportedLocale | string = "id",
): string {
    if (!message) return "";
    const trimmed = message.trim();
    if (!trimmed) return "";

    const target: "id" | "en" = locale === "en" ? "en" : "id";
    const dict = target === "en" ? ID_TO_EN : EN_TO_ID;

    if (trimmed in dict) {
        return dict[trimmed];
    }

    // Handle "T0 BELUM TERSIMPAN. <detail>" / "T0 NOT SAVED YET. <detail>"
    const t0IdMatch = trimmed.match(/^T0 BELUM TERSIMPAN\.\s*(.*)$/);
    if (t0IdMatch) {
        if (target === "id") return trimmed;
        const suffix = t0IdMatch[1] ? localizeMessage(t0IdMatch[1], "en") : "";
        return suffix ? `T0 NOT SAVED YET. ${suffix}` : "T0 NOT SAVED YET.";
    }
    const t0EnMatch = trimmed.match(/^T0 NOT SAVED YET\.\s*(.*)$/);
    if (t0EnMatch) {
        if (target === "en") return trimmed;
        const suffix = t0EnMatch[1] ? localizeMessage(t0EnMatch[1], "id") : "";
        return suffix ? `T0 BELUM TERSIMPAN. ${suffix}` : "T0 BELUM TERSIMPAN.";
    }

    // Handle "Posko: <name>" / "Shelter: <name>" in DispatchPanel target labels
    const shelterIdMatch = trimmed.match(/^Posko:\s*(.+)$/);
    if (shelterIdMatch && target === "en") {
        return `Shelter: ${shelterIdMatch[1]}`;
    }
    const shelterEnMatch = trimmed.match(/^Shelter:\s*(.+)$/);
    if (shelterEnMatch && target === "id") {
        return `Posko: ${shelterEnMatch[1]}`;
    }

    // Handle generic rate limit prefix if seconds are interpolated
    if (target === "en" && /^Terlalu banyak percobaan/.test(trimmed)) {
        return "Too many attempts. Try again shortly.";
    }
    if (target === "id" && /^Too many (login )?attempts/i.test(trimmed)) {
        return "Terlalu banyak percobaan masuk. Coba lagi sebentar.";
    }

    const laravelTranslated = translateLaravelValidation(trimmed, target);
    if (laravelTranslated) {
        return laravelTranslated;
    }

    return message;
}

export default localizeMessage;
