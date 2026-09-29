# RAPID-MIND — T0 Emergency Interaction Design

**Document type:** UI/UX design specification  
**Scope:** Relawan T0 emergency interaction, verification, offline behavior, transmission, and active emergency state  
**Product language:** Bahasa Indonesia  
**Discussion/design language:** English  
**Design direction:** Operational Humanitarian UI  
**Status:** Design baseline for the next UI/UX phase

---

# 1. Source Constraints

This design is derived from and must remain consistent with:

1. `RAPID_MIND_TECHNICAL_PLAN.md`
2. `workflow.md`
3. `RAPID_MIND_VISUAL_FOUNDATION.md`
4. `RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md`

The technical plan remains the architectural constraint.

The visual foundation remains locked unless later usability or accessibility testing identifies a concrete problem.

The Relawan shell/navigation document remains the current interaction baseline unless explicitly revised.

This document does not redefine the project architecture, triage thresholds, color system, typography, or role authority boundaries.

---

# 2. Core T0 Principles

The T0 interaction must preserve these principles:

- T0 is an emergency event, not merely a higher T1 score.
- T0 bypasses the normal T1/T2/T3 score flow.
- A Relawan-created emergency is `T0-Suspect`.
- Healthcare performs secondary/clinical validation.
- The first tap on `T0 DARURAT` must never silently transmit an emergency.
- Raw STT/NLP output must never silently create or transmit T0.
- Manual Relawan confirmation is required before T0-Suspect creation.
- Emergency creation and network transmission are separate states.
- Local persistence occurs before depending on network transmission.
- Offline T0 must be placed in a priority local queue.
- Unsynchronized T0 must remain visible.
- Failed authentication or network access must not destroy emergency data.
- GPS failure must not block T0 creation.
- Patient identity failure must not block T0 creation.
- A pure browser PWA must not be assumed capable of silently sending SMS.
- The Relawan interface must not expose clinical confirmation actions reserved for Healthcare.
- Emergency red remains protected and structurally distinct from normal interaction colors.
- Avoid permanent flashing, pulsing, sirens, or continuous vibration.

---

# 3. Recommended High-Level State Flow

```text
NORMAL FIELD WORK
PFA / SRQ / Risk / Function / Beranda / Data
        │
        ├──────────────────────────────────────┐
        │                                      │
        ▼                                      ▼
MANUAL T0 TAP                         Q17 / STT SAFETY SIGNAL
        │                                      │
        │                             Ordinary interview pauses
        │                                      │
        │                             Potential Red Flag notice
        │                                      │
        │                         ┌────────────┴────────────┐
        │                         │                         │
        │                  Bukan Red Flag          Verifikasi T0
        │                         │                         │
        │                         ▼                         │
        │                 Resume workflow                  │
        │                                                   │
        └───────────────────────────┬───────────────────────┘
                                    ▼
                         T0 VERIFICATION FLOW
                                    │
                              GATE 1 — PERSON
                                    │
                       Who is the emergency about?
                                    │
                              GATE 2 — REASON
                                    │
                     What Red Flag is occurring?
                                    │
                         Location captured alongside
                                    │
                              GATE 3 — SEND
                                    │
                       Explicit final T0-Suspect action
                                    │
                                    ▼
                         SAVE LOCALLY FIRST
                                    │
                         emergency_event + outbox
                                    │
                  ┌─────────────────┴───────────────────┐
                  │                                     │
             INTERNET                               NO INTERNET
                  │                                     │
                  ▼                                     ▼
           Send immediately                      Priority local queue
                  │                                     │
        ┌─────────┴─────────┐                  Offer SMS handoff
        │                   │                         where usable
     ACK received       send fails                       │
        │                   │                           │
        ▼                   ▼                           ▼
 T0-Suspect received   Remains queued              Await reconnect
 by server             locally                           │
        │                   │                           │
        └───────────────────┴───────────────┬───────────┘
                                            ▼
                                  EMERGENCY ACTIVE VIEW
                                            │
                         Stay with / protect penyintas
                                            │
                             transmission status visible
                                            │
                         Healthcare performs validation
                                            │
                        ┌───────────────────┴──────────────┐
                        │                                  │
                 T0-CONFIRMED                       Downgraded
                 / referral                         T1 / T2
```

---

# 4. Verification Pattern Options

Three interaction patterns were considered.

| Pattern | Interaction | Strength | Weakness |
|---|---|---|---|
| One-tap + Undo | Tap T0 → immediately transmit → brief Undo | Extremely fast | Unsafe for accidental taps and unacceptable for uncertain STT interpretation |
| Structured 3-gate confirmation | Tap → identify patient → choose reason → explicit final send | Fast, auditable, clear intent, supports unknown patients and multiple Red Flags | Slightly slower than one tap |
| Press-and-hold / swipe to send | Fill minimal data → hold/swipe to send | Adds physical confirmation | Poorer accessibility, less reliable one-handed, harder with tremor or motor impairment |

## Final Direction

Use **structured 3-gate confirmation**.

The three gates are logical, but they should be shown on one compact emergency task surface rather than three separate wizard pages.

```text
T0 DARURAT

1  Penyintas
   Siti Aminah
   [ Ganti ]

2  Alasan darurat
   ☑ Risiko keselamatan jiwa
   ☐ Psikosis/disorientasi berat
   ☐ Agitasi berbahaya
   ☐ Kegawatdaruratan medis

3  Lokasi
   Posko Candi
   GPS tersedia

[ BATAL ]
[ KIRIM T0-SUSPECT ]
```

Intent structure is preferred over artificial friction.

Do not require:

- long press;
- swipe-only confirmation;
- countdown timers;
- typing confirmation phrases;
- CAPTCHA-like confirmation;
- tiny “Saya yakin” checkboxes.

---

# 5. T0 Surfaces

The T0 interaction should use four primary emergency surfaces:

```text
1. Verification
   ↓
2. Creating / transmitting
   ↓
3. Active T0-Suspect
   ↓
4. Healthcare update / resolution
```

Q17/STT adds one safety interruption surface before verification:

```text
Potential Red Flag interruption
        ↓
T0 Verification
```

Each surface answers a different operational question.

| State | Main Question |
|---|---|
| Potential Red Flag | Did the system detect something requiring human verification? |
| Verification | Who is involved, what happened, and should I escalate? |
| Creating / transmitting | Has the event been safely recorded and is it reaching Healthcare? |
| Active T0-Suspect | What should I do now, and what is the response status? |
| Healthcare update | What has the medical team decided? |

---

# 6. Persistent `T0 DARURAT` Control

The existing persistent control remains:

```text
[ ⚠ T0 DARURAT ]
```

Characteristics remain:

- T0 red `#991B1B`;
- white text;
- explicit label;
- emergency icon;
- minimum height approximately 56px;
- persistent throughout Relawan workflows except login;
- static by default;
- no permanent pulse, flash, bounce, or glow;
- structurally separate from bottom navigation.

## Tap Behavior

The first tap must **never transmit T0**.

Instead:

```text
tap
↓
emergency task surface opens immediately
↓
NO transmission yet
```

A full-height mobile sheet or effectively full-screen task layer is preferred over a tiny confirmation dialog.

Do not use:

```text
Kirim T0?
[Batal] [Ya]
```

because it does not establish patient identity, emergency reason, or transmission context.

---

# 7. Emergency Verification Surface

Recommended heading:

```text
T0 DARURAT

Laporkan kondisi yang memerlukan
penanganan segera oleh tenaga kesehatan.

Status yang dibuat adalah T0-Suspect
dan masih memerlukan validasi tenaga kesehatan.
```

The three logical sections are:

```text
1. Penyintas
2. Alasan Darurat
3. Lokasi & Kirim
```

These remain on one scrollable emergency surface.

---

# 8. Emergency Header and Exit Behavior

Normal contextual header example:

```text
← Asesmen             Offline • 2
SRQ-20 • 12/20
```

Emergency surface:

```text
×                     T0 DARURAT
```

The ordinary global navigation visually recedes.

The close control dismisses the emergency task layer rather than behaving like ordinary navigation.

Before T0 creation, dismissing the surface may require confirmation:

```text
Keluar dari verifikasi T0?

Belum ada T0-Suspect yang dibuat.

[ Tetap di Sini ]
[ Keluar ]
```

No emergency event has been created at this point.

---

# 9. Manual T0 Trigger

Manual trigger means the Relawan has already expressed emergency intent.

Flow:

```text
Tap T0 DARURAT
↓
Open T0 verification immediately
```

Do not add another generic “Potential emergency detected” screen.

If a PFA or assessment patient is currently active:

- prefill that patient;
- allow the Relawan to change the patient;
- do not require redundant patient reconfirmation.

---

# 10. Q17 Manual `YA`

Q17 is a safety exception.

If Q17 is manually answered `YA`:

```text
Q17 = YA
↓
Pause ordinary assessment progression
↓
Safety interruption
↓
Verifikasi T0 Darurat
```

Recommended interface text:

```text
Jawaban keselamatan memerlukan verifikasi

Jawaban pertanyaan 17 menunjukkan kemungkinan
risiko keselamatan jiwa.

Tetap dampingi penyintas.

[ Periksa Kembali Jawaban ]
[ Verifikasi T0 Darurat ]
```

A Q17 `YA` does not silently transmit T0.

If the Relawan continues to verification:

- current patient is prefilled;
- `Risiko keselamatan jiwa / menyakiti diri` is preselected;
- provenance may state `Dipicu dari jawaban Pertanyaan 17`;
- the reason remains editable until final submission.

---

# 11. STT / NLP Potential Red Flag

Raw STT/NLP output has lower authority than manual Relawan input.

When speech suggests possible immediate safety risk:

```text
potential safety response detected
↓
pause ordinary verbal interview
↓
stop/pause microphone
↓
show Potential Red Flag interruption
```

Recommended interface:

```text
POTENSI RED FLAG

Sistem mendeteksi ucapan yang mungkin
berkaitan dengan keselamatan jiwa.

Hasil suara

“...lebih baik mati saja...”

Tetap dampingi penyintas dan periksa
kondisinya sebelum melanjutkan.

[ BUKAN RED FLAG ]

[ VERIFIKASI T0 DARURAT ]
```

Critical rules:

- raw STT never directly creates T0;
- raw STT never silently transmits T0;
- simple keyword presence is not sufficient;
- negation and context matter;
- ambiguous speech remains unresolved;
- manual Relawan judgment remains authoritative.

---

# 12. Meaning of `Bukan Red Flag`

`Bukan Red Flag` rejects the emergency interpretation.

It does **not** automatically change the underlying SRQ answer.

Example:

```text
speech interpretation rejected
≠
SRQ answer automatically changed
```

If the Relawan dismisses the Red Flag suggestion:

```text
return to SRQ
↓
microphone remains stopped
↓
Relawan explicitly decides whether to restart it
```

Do not automatically resume microphone capture.

---

# 13. Entering T0 From STT

When the Relawan taps:

```text
VERIFIKASI T0 DARURAT
```

the normal T0 verification surface opens.

Prefill:

```text
Penyintas
Siti Aminah
```

and suggested reason:

```text
☑ Risiko keselamatan jiwa / menyakiti diri

Disarankan dari wawancara suara
```

Use `Disarankan`, not `Dikonfirmasi`.

The speech processor suggests; the Relawan confirms; Healthcare clinically validates.

---

# 14. Gate 1 — Penyintas

Prompt:

```text
Siapa penyintas yang membutuhkan bantuan?
```

## Active Patient Context

If the T0 is opened during an existing patient workflow:

```text
Penyintas

Siti Aminah
NIK •••• •••• •••• 4821

Sedang dalam asesmen ini.

[ GANTI PENYINTAS ]
```

Do not require an extra `Konfirmasi Siti Aminah` button.

Continuing to the final send is sufficient confirmation.

Only masked NIK should normally be shown on the Relawan emergency surface.

---

# 15. Selecting Another Penyintas

`GANTI PENYINTAS` opens a secondary selection surface.

Example:

```text
Pilih Penyintas

[ Cari nama atau NIK ]

TERBARU

○ Budi Santoso
  •••• 2841

○ Siti Aminah
  •••• 4821

○ Rina Wulandari
  •••• 1097

────────────────────

[ PENYINTAS BELUM TERIDENTIFIKASI ]
```

Recent locally available patient data should be shown first.

Online lookup may augment the list but must not be required for emergency creation.

---

# 16. Unknown / Unidentified Penyintas

Unknown identity is a valid emergency state.

Use:

```text
Penyintas belum teridentifikasi
```

rather than relying only on the phrase `Tanpa Nama`.

After selection:

```text
Penyintas

Belum teridentifikasi

Identitas dapat dilengkapi setelah
kondisi darurat tertangani.
```

Optional field:

```text
Petunjuk identifikasi
[ contoh: pria dewasa, tenda B12 ]
```

This field is optional.

Do not block emergency creation by requiring:

- NIK;
- full address;
- date of birth;
- complete registration;
- full patient intake.

Internally, the emergency/patient reference should use a generated system identifier rather than a fake NIK.

Do not create placeholder values such as:

```text
0000000000000000
```

---

# 17. Gate 2 — Alasan Darurat / Red Flag

Recommended heading:

```text
Alasan Darurat

Pilih semua kondisi yang terlihat.
```

The current workflow supports four main operational Red Flag groups.

## A. Safety / Self-Harm

```text
□ Risiko keselamatan jiwa / menyakiti diri

Ucapan ingin mati, upaya menyakiti diri,
atau perilaku yang membahayakan dirinya.
```

## B. Psychosis / Severe Disorientation

```text
□ Psikosis atau disorientasi berat

Halusinasi, kebingungan berat,
tidak mengenali keadaan sekitar,
atau tidak merespons.
```

## C. Severe Agitation / Dangerous Behavior

```text
□ Agitasi atau perilaku membahayakan

Menyerang, mengamuk, atau perilaku
yang membahayakan orang lain.
```

## D. Acute Medical Emergency

```text
□ Kegawatdaruratan medis

Penurunan kesadaran, sesak berat,
nyeri dada, kejang, atau kondisi fisik akut.
```

These descriptions are UI summaries of the current workflow, not new clinical criteria.

Final clinical wording must remain aligned with the approved emergency protocol.

---

# 18. Multiple Emergency Reasons

Multiple Red Flags may be selected.

Example:

```text
☑ Risiko keselamatan jiwa / menyakiti diri

☑ Agitasi atau perilaku membahayakan

□ Psikosis atau disorientasi berat

□ Kegawatdaruratan medis
```

At least one reason is required before T0 creation.

Do not require the Relawan to choose one “primary” reason.

Emergency conditions may coexist.

---

# 19. `Kondisi Darurat Lain`

A final flexible option may be included:

```text
□ Kondisi darurat lain
```

If selected, require a short explanation:

```text
Jelaskan kondisi darurat

[ ________________________ ]
```

This prevents the taxonomy from blocking escalation when a genuine emergency does not fit the predefined categories.

Keep this option last so it does not replace normal structured selections.

---

# 20. Gate 3 — Location

Location should be captured automatically where possible but must not block emergency creation.

Recommended source hierarchy:

```text
1. Current device GPS
2. Assigned Posko location
3. Manually described location
```

The emergency record should preserve the location source.

---

# 21. GPS Available

Normal Relawan view:

```text
Lokasi Bantuan

✓ Lokasi perangkat tersedia

Posko Candi
Diambil 16:42
```

Raw coordinates do not need to be shown by default.

An optional secondary control may expose details:

```text
Lihat detail lokasi
```

Healthcare may receive the coordinates as part of the emergency payload.

---

# 22. GPS Loading

Do not block the rest of verification.

Example:

```text
Lokasi Bantuan

Mencari lokasi perangkat…
```

The Relawan can continue selecting patient and emergency reasons.

If GPS resolves before final submission, use the resolved location.

---

# 23. GPS Unavailable

If device GPS cannot be obtained:

```text
Lokasi perangkat belum tersedia.

Lokasi Posko
Posko Candi

[ TAMBAHKAN PETUNJUK LOKASI ]
```

Final T0 creation remains allowed.

---

# 24. GPS Permission Denied

Use explicit calm wording:

```text
Lokasi perangkat tidak dapat diakses.

T0 tetap dapat dibuat.
Lokasi Posko Candi akan digunakan.

[ TAMBAHKAN PETUNJUK ]
[ COBA AKSES LOKASI ]
```

Retrying GPS must not dominate or block the emergency workflow.

---

# 25. No GPS and No Posko Location

Still allow T0 creation.

Show:

```text
Lokasi belum tersedia

Tambahkan petunjuk singkat agar tim
lebih mudah menemukan penyintas.

[ contoh: Tenda B, dekat dapur umum ]
```

This field should be strongly encouraged but not technically mandatory.

Perfect location data must not be a prerequisite for creating an emergency event.

---

# 26. Final T0 Summary

Before final submission:

```text
Ringkasan T0

Penyintas
Siti Aminah

Alasan
• Risiko keselamatan jiwa
• Agitasi atau perilaku membahayakan

Lokasi
Posko Candi
GPS tersedia
```

Supporting text:

```text
T0-Suspect akan dibuat dan dikirim
untuk verifikasi tenaga kesehatan.
```

This communicates that the Relawan creates an emergency suspicion, not a clinical diagnosis.

---

# 27. Sticky Emergency Action Region

Recommended:

```text
─────────────────────────────

[ KIRIM T0-SUSPECT ]

Batal
```

On mobile, the emergency action is the dominant control.

`Batal` is visually secondary.

Do not make both actions equal red buttons.

The final action should remain reachable one-handed above browser/device safe areas.

---

# 28. Conditions for Final Send

`KIRIM T0-SUSPECT` is enabled when:

```text
valid penyintas state selected
AND
at least one emergency reason selected
```

`Penyintas belum teridentifikasi` is a valid patient state.

The following must **not** be required:

- GPS;
- internet;
- successful server connection;
- current valid access token for local creation.

---

# 29. Final Button Wording

Use:

```text
KIRIM T0-SUSPECT
```

instead of:

```text
KIRIM DARURAT
```

or:

```text
KONFIRMASI T0
```

The wording teaches the authority boundary:

- Relawan escalates a suspected emergency;
- Healthcare clinically validates it.

---

# 30. Local Persistence Before Network Transmission

After final confirmation:

```text
tap KIRIM T0-SUSPECT
↓
lock duplicate submission
↓
write emergency event locally
↓
write priority outbox operation
↓
confirm local persistence
↓
attempt remote transmission
```

Do not use:

```text
send API
↓
hope it succeeds
↓
save locally afterward
```

The local device is responsible for preserving field work.

---

# 31. Creating / Processing State

Immediately after final tap:

```text
Menyimpan T0…
```

The Relawan should not edit the same submission during local commit.

When successful:

```text
✓ T0 tersimpan di perangkat
```

Only after server acknowledgement may the interface claim remote receipt.

---

# 32. Local Persistence Failure

This is more severe than network failure.

Show:

```text
T0 BELUM TERSIMPAN

Data darurat belum berhasil disimpan
di perangkat.

[ COBA SIMPAN LAGI ]
```

Do not claim:

```text
Data aman
```

when local persistence failed.

Immediate physical/emergency guidance may also remain visible.

---

# 33. Online Transmission States

Do not use one vague `Terkirim` state.

Recommended progression:

```text
Disimpan di perangkat
→ Mengirim T0…
→ Diterima sistem
→ Ditinjau tenaga kesehatan
→ later operational/clinical updates
```

Meaning must remain explicit.

`Diterima sistem` means technical acknowledgement only.

It does **not** mean:

```text
ambulans sedang datang
```

or:

```text
tenaga kesehatan sudah meninjau
```

unless those states have actually occurred.

---

# 34. Online Active State

After local save:

```text
T0-Suspect Aktif

Siti Aminah

✓ Tersimpan di perangkat

↻ Mengirim ke sistem…
```

After acknowledgement:

```text
✓ Diterima sistem
```

Then:

```text
Menunggu peninjauan tenaga kesehatan
```

---

# 35. Transmission Failure

If the API times out or server is unreachable:

```text
T0-Suspect Aktif

✓ Aman tersimpan di perangkat

Belum diterima server

Sistem akan mencoba kembali secara otomatis.
```

Optional secondary action:

```text
[ COBA KIRIM SEKARANG ]
```

Automatic retry remains the default.

---

# 36. Offline T0

Offline is urgent but not equivalent to local failure.

Example:

```text
T0-Suspect Aktif

OFFLINE

✓ T0 aman tersimpan di perangkat

Belum dapat dikirim melalui internet.

T0 berada pada antrean prioritas dan
akan dikirim saat koneksi kembali.
```

T0 must be prioritized ahead of normal queued assessment synchronization.

---

# 37. Native SMS Handoff

The initial PWA must not claim it can silently send SMS.

When internet is unavailable but cellular SMS may still work, offer a native-assisted handoff.

Example:

```text
Kirim melalui SMS

Internet tidak tersedia.

RAPID-MIND dapat membuka aplikasi SMS
dengan pesan darurat yang telah disiapkan.

Anda tetap perlu menekan Kirim
di aplikasi SMS.

[ BUKA APLIKASI SMS ]
```

The PWA may open a native SMS composer where supported.

After returning, the application may say:

```text
Aplikasi SMS telah dibuka
```

but must not claim:

```text
SMS berhasil dikirim
```

unless a future native implementation can genuinely verify it.

Guaranteed automatic SMS requires a native wrapper/application rather than a pure browser PWA.

---

# 38. SMS Payload Direction

The exact production SMS payload is not yet locked.

The workflow originally suggests identity, Red Flag, and GPS information.

However, ordinary SMS should not be treated as inherently end-to-end encrypted.

The final payload requires a separate privacy/security decision.

A minimized future concept could be:

```text
RAPID-MIND T0
Event: <short emergency ID>
Posko: Candi
Reason: safety risk
Location: ...
Volunteer contact/reference: ...
```

Do not lock full NIK or detailed clinical content into SMS until the security/privacy model is explicitly reviewed.

---

# 39. Active T0-Suspect Incident Screen

Once the event exists, the emergency UI becomes a stable incident workspace.

Example:

```text
T0-SUSPECT

Belum divalidasi tenaga kesehatan

Siti Aminah
Risiko keselamatan jiwa
Agitasi atau perilaku membahayakan

────────────────

STATUS PENGIRIMAN

✓ Diterima sistem
16:42

STATUS PENANGANAN

Menunggu peninjauan tenaga kesehatan

────────────────

Yang perlu dilakukan sekarang

• Tetap dampingi penyintas.
• Pastikan area sekitar aman.
• Hubungi petugas posko atau tenaga medis
  terdekat bila tersedia.
• Jangan tinggalkan penyintas sendirian.
```

The Relawan should remain focused on immediate safety and connection to professional help.

---

# 40. Information That Must Remain Visible

After T0 creation, keep visible:

- `T0-Suspect`;
- statement that Healthcare has not yet clinically validated it;
- patient identity or `Belum teridentifikasi`;
- selected Red Flag reasons;
- event creation time;
- location and/or location source;
- local persistence state;
- network transmission state;
- Healthcare review/response state;
- SMS handoff state where relevant;
- field safety instructions;
- interrupted assessment reference where relevant.

Do not expose internal technical IDs unless needed for troubleshooting.

Do not expose a dense audit log in the normal Relawan interface.

---

# 41. Three Independent Status Axes

T0 must not use one combined status that hides different meanings.

## A. Emergency / Clinical Classification

```text
T0-Suspect
T0-Confirmed
Downgraded to T1/T2
```

Healthcare controls clinical validation after T0-Suspect creation.

## B. Transmission State

```text
Tersimpan lokal
Menunggu dikirim
Mengirim
Diterima server
Gagal sinkronisasi
```

## C. Response / Dispatch State

Potential examples:

```text
Belum ditinjau
Sedang ditinjau
Tim ditugaskan
Menuju lokasi
Tiba
```

Example legitimate combination:

```text
T0-Suspect
Diterima server
Belum ditinjau tenaga kesehatan
```

These axes must remain conceptually separate.

---

# 42. Interrupted PFA / SRQ Behavior

T0 suspends but never destroys existing field work.

Example:

```text
T0 initiated
↓
current answers already locally saved
↓
STT session stops if active
↓
assessment becomes suspended
↓
T0 workflow takes foreground
```

Assessment state remains available later.

Possible status:

```text
Asesmen dijeda karena T0
```

The application should not automatically resume the assessment after T0 creation.

---

# 43. Interrupted Assessment Reference

Example on the active incident screen:

```text
Asesmen Sebelumnya

SRQ-20
12 dari 20 terjawab

Dijeda karena T0 Darurat.

[ LIHAT ASESMEN ]
```

Do not make `Lanjutkan asesmen` the dominant action while the emergency remains active.

The questionnaire is secondary to the emergency response.

---

# 44. STT After Emergency Interruption

When T0 interrupts verbal SRQ:

```text
microphone stops
↓
captured answers remain
↓
local assessment remains
↓
emergency takes foreground
```

When the user returns later:

```text
Verbal mode remains selected
microphone = OFF
```

The Relawan must explicitly tap:

```text
Mulai Wawancara Suara
```

again.

No automatic recording restart.

---

# 45. False Positive Before T0 Creation

For STT/Q17 safety interruption:

```text
Potential Red Flag
→ Bukan Red Flag
```

No T0 emergency event is created.

The ordinary assessment may resume.

The rejected emergency inference must not automatically rewrite unrelated SRQ answers.

---

# 46. Cancellation During Verification

Before final `KIRIM T0-SUSPECT`:

```text
Batal
```

may exit verification.

Nothing has been transmitted.

The interrupted PFA/SRQ state remains intact.

---

# 47. After T0-Suspect Creation

Once the emergency event exists:

- do not offer `Hapus T0`;
- do not silently erase it;
- preserve the original event for auditability.

Instead offer:

```text
[ LAPORKAN PERUBAHAN KONDISI ]
```

Potential options:

```text
Perubahan Kondisi

○ Kondisi darurat tidak lagi terlihat
○ Penyintas telah ditangani petugas
○ T0 dibuat karena kesalahan input
○ Lainnya

[ KIRIM PEMBARUAN ]
```

This creates another recorded transition/update.

Healthcare remains responsible for clinical downgrade or confirmation.

---

# 48. Accidental T0 Created Offline

If a T0-Suspect was fully created offline and then identified as an input error:

```text
T0-Suspect
Menunggu koneksi
```

offer:

```text
LAPORKAN KESALAHAN INPUT
```

Do not delete the original event.

Conceptually synchronize both:

```text
T0 created 16:42
T0 retracted by Relawan 16:43
reason = accidental input
```

The history remains auditable.

---

# 49. Healthcare Review State

When Healthcare begins reviewing:

```text
T0-SUSPECT

Sedang ditinjau tenaga kesehatan
```

Do not infer human review merely from server acknowledgement.

Only show:

```text
Tim medis telah menerima laporan
```

when that state corresponds to an actual Healthcare-side action.

---

# 50. T0 Confirmed by Healthcare

Example:

```text
T0 TERKONFIRMASI

Dikonfirmasi tenaga kesehatan
16:48

Tim medis sedang menindaklanjuti.
```

If an actual dispatch/referral state exists:

```text
Tim menuju lokasi
```

may be shown.

Do not show dispatch language before the Healthcare workflow actually produces it.

The original T0-Suspect remains part of the event history.

---

# 51. Healthcare Downgrade

If Healthcare determines that the case should be T1 or T2:

```text
Status diperbarui tenaga kesehatan

T0-Suspect telah ditinjau.

Status tindak lanjut:
T1 — Prioritas asesmen klinis
```

Do not use blame-oriented wording such as:

```text
T0 salah
```

The original Relawan escalation and later Healthcare validation are distinct decisions.

Potential timeline:

```text
16:42 T0-Suspect dibuat
16:43 Diterima sistem
16:46 Ditinjau tenaga kesehatan
16:49 Diperbarui menjadi T1
```

---

# 52. Relawan vs Healthcare Responsibility Boundary

## Relawan UI

The Relawan is responsible for:

```text
detect concern
→ identify person
→ record Red Flag(s)
→ capture location
→ create T0-Suspect
→ transmit or preserve offline
→ remain with penyintas
→ receive operational status
```

## Healthcare UI

Healthcare is responsible for:

```text
receive T0-Suspect
→ secondary verification
→ review assessment/history
→ clinical interpretation
→ T0-Confirmed or downgrade
→ referral/dispatch decisions
→ clinical notes
→ intervention/transport workflow
```

The Relawan must not receive controls such as:

```text
Konfirmasi T0
Diagnosis
Downgrade ke T1
Downgrade ke T2
Resep / Intervensi
Dispatch Ambulans
```

These belong to Healthcare.

---

# 53. Sound, Vibration, and Visual Alert Behavior

The Relawan device should not behave like a continuous alarm siren.

Recommended behavior:

| Event | Sound | Haptic | Visual |
|---|---|---|---|
| Manual T0 tap | No | Short single acknowledgement | Emergency verification surface |
| Q17 manual `YA` | Optional short cue | Short | Safety interruption |
| STT potential Red Flag | Short cue | Short distinct pattern | Potential Red Flag interruption |
| Local T0 saved | No | Short confirmation | Explicit local-save state |
| Server acknowledged | No | Optional light haptic | `Diterima sistem` |
| Internet transmission failed | No repeated alarm | One distinct vibration | Persistent offline/transmission state |
| Local storage failed | Stronger finite cue | Distinct vibration | High-priority persistence failure |

Never use:

- continuous siren;
- continuous vibration;
- permanent pulsing;
- permanent glowing;
- flashing red screens.

Any audio alert must also have visible information.

---

# 54. Accessibility and One-Handed Use

Requirements:

- no color-only semantic communication;
- minimum approximately 56px emergency tap targets;
- large selectable Red Flag rows;
- full-row selection rather than tiny checkboxes;
- explicit text labels;
- no swipe-only essential actions;
- no hold-only essential actions;
- screen-reader label must explicitly include `T0 Darurat`;
- logical keyboard/focus order;
- browser zoom support;
- high outdoor contrast;
- safe-area handling;
- final send control positioned within comfortable thumb reach;
- critical actions in the lower portion of the screen;
- no reliance on small top-right actions for emergency completion.

Example selectable reason row:

```text
┌──────────────────────────────┐
│ ☑ Risiko keselamatan jiwa   │
│   / menyakiti diri           │
│                              │
│   Ucapan ingin mati...       │
└──────────────────────────────┘
```

---

# 55. Emergency Red Usage

Do not make the entire emergency screen solid red.

Use T0 red for:

- emergency heading;
- T0 badge or panel;
- final emergency action;
- key emergency boundaries;
- critical status emphasis.

Keep most content on White / Soft Gray surfaces with Ink text.

Reason:

```text
everything red
↓
everything looks equally urgent
↓
hierarchy becomes weaker
↓
long instructions become harder to scan
↓
emergency red loses semantic value
```

T0 must be structurally distinct, not only red.

---

# 56. Online / Offline / Reconnect Edge Cases

## Browser Says Online, API Is Unreachable

Treat as transmission failure:

```text
Belum terkirim
T0 aman di perangkat
```

Retry automatically.

## Server Received T0 but Acknowledgement Was Lost

Retry using the same stable emergency identifier.

Do not create duplicate emergency events.

## Internet Returns While SMS Composer Is Open

Synchronize the local T0 through the normal server route.

SMS is fallback communication, not the canonical emergency database record.

## Authentication Expired While Offline

Allow:

```text
save T0 locally
offer local/SMS emergency handling
```

On reconnect:

```text
attempt token refresh
```

If reauthentication is required:

```text
Perlu masuk kembali untuk sinkronisasi.
Data T0 tetap aman di perangkat.
```

Never delete emergency data.

## Application Closes After Local Confirmation

On restart:

```text
load local emergency event
↓
restore active T0 state
↓
resume priority synchronization
```

## Multiple T0 Events

Each emergency uses a separate stable identifier and separate state.

Do not use one global reusable “active emergency” object.

---

# 57. Recommended Final Interaction Sequence

```text
NORMAL WORK
        │
        ├── Manual T0
        │       ↓
        │   Verification
        │
        └── Q17/STT
                ↓
        Potential Red Flag
                ↓
      Relawan decides to verify
                │
                ▼
────────────────────────────────

T0 VERIFICATION

Penyintas
    ↓
Current / another / unidentified

Alasan Darurat
    ↓
1+ Red Flags

Location
    ↓
GPS → Posko → manual guidance

Final review
    ↓
KIRIM T0-SUSPECT

────────────────────────────────

LOCAL COMMIT FIRST

emergency_event
+
priority outbox

────────────────────────────────

TRANSMISSION

Online
→ API
→ server acknowledged

Offline
→ priority queue
→ SMS handoff if appropriate
→ automatic retry

────────────────────────────────

ACTIVE INCIDENT

T0-Suspect
+
transmission state
+
Healthcare state
+
field instructions

────────────────────────────────

HEALTHCARE

review
→ T0-Confirmed
OR
→ T1/T2

────────────────────────────────

Original T0 history remains preserved
```

---

# 58. Locked Decisions From This Discussion

The following are treated as the current design baseline:

1. The persistent `T0 DARURAT` control opens verification; the first tap never transmits.
2. Use a structured 3-gate flow rather than one-tap transmission or press-and-hold.
3. The three gates are presented on one compact emergency task surface.
4. Manual T0 enters verification directly.
5. Q17 `YA` interrupts normal progression and requests T0 verification.
6. Raw STT/NLP never silently creates or transmits T0.
7. STT emergency detection stops/pauses the microphone and surfaces a human verification interruption.
8. `Bukan Red Flag` rejects the emergency inference without automatically rewriting SRQ answers.
9. Current patient is prefilled when T0 is triggered during an active patient workflow.
10. The Relawan may switch to another patient.
11. `Penyintas belum teridentifikasi` is a valid first-class emergency state.
12. Missing NIK must never block T0.
13. Emergency reasons use structured Red Flag categories.
14. Multiple emergency reasons may be selected.
15. At least one emergency reason is required.
16. A flexible `Kondisi darurat lain` option may be provided with a short explanation.
17. Location is captured using GPS when possible.
18. Assigned Posko location is the next fallback.
19. Manual location guidance is the final fallback.
20. GPS is never required to create T0.
21. Final action uses `KIRIM T0-SUSPECT`.
22. Local persistence occurs before network transmission.
23. T0 local records enter a priority outbox.
24. `T0-Suspect`, transmission state, and Healthcare response state are separate concepts.
25. `Diterima sistem` does not mean Healthcare has reviewed the case.
26. `Diterima sistem` does not mean ambulance/medical assistance is already on the way.
27. Offline T0 remains visible and explicitly marked as safe locally.
28. Local persistence failure is treated as more severe than ordinary sync failure.
29. Native SMS is a user-mediated handoff, not silent browser transmission.
30. The PWA must not claim SMS was sent merely because the native SMS composer opened.
31. Exact production SMS payload remains a later security/privacy decision.
32. The active T0-Suspect screen shows field safety guidance while waiting.
33. T0 interrupts but never destroys PFA/SRQ work.
34. STT does not automatically restart after an emergency interruption.
35. Before final send, T0 verification can be cancelled without creating an event.
36. After creation, T0 must not be deleted from history.
37. Later changes are recorded as updates/transitions.
38. Healthcare owns T0 confirmation and downgrade.
39. Relawan does not receive clinical diagnosis, downgrade, medication, or dispatch controls.
40. Sound/haptic feedback is finite and restrained.
41. No continuous sirens, vibration, pulsing, or flashing.
42. Emergency interactions must remain one-handed and accessible.
43. Emergency red is protected and should not fill the entire screen.
44. Retry after reconnect must reuse stable identifiers to prevent duplicate T0 events.
45. Authentication failure must never destroy locally preserved T0 data.

---

# 59. Next Design Topic

The next UI/UX discussion should move to:

# HEALTHCARE DASHBOARD

The next phase should define the high-level Healthcare operational workspace before individual visual mockups or production code.

Topics should include:

1. Healthcare information architecture;
2. desktop shell and navigation;
3. emergency-first dashboard hierarchy;
4. incoming T0-Suspect queue;
5. new-alert behavior;
6. queue ordering and prioritization;
7. acknowledgement vs clinical review;
8. T0 incident detail;
9. patient identity and assessment-history context;
10. secondary verification workflow;
11. T0 confirmation;
12. downgrade to T1/T2;
13. referral/dispatch workflow;
14. response status;
15. realtime updates;
16. sound and alert control;
17. multiple concurrent emergencies;
18. offline/reconnect behavior for Healthcare;
19. auditability;
20. distinction between Healthcare operational controls and Admin analytics.

Do not write production code yet.

Design the Healthcare experience from its operational state model and queue/workspace architecture before moving into visual mockups.
