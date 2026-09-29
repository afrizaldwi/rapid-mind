# RAPID-MIND — Healthcare Operational Workspace Design

**Document type:** UI/UX design specification  
**Scope:** Healthcare / Faskes / PSC 119 desktop operational workspace, emergency handling, validation, patient records, and referral structure  
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
5. `RAPID_MIND_T0_EMERGENCY_INTERACTION.md`

The technical plan remains the architectural constraint.

The visual foundation remains locked unless later usability or accessibility testing identifies a concrete problem.

The Relawan shell/navigation and T0 emergency documents remain the current interaction baseline unless explicitly revised.

This document does not redefine the project architecture, triage thresholds, visual palette, typography, or role authority boundaries.

---

# 2. Core Healthcare Principles

- Healthcare is emergency-first.
- Active T0 emergencies take precedence over analytics.
- RAPID-MIND is decision support, not autonomous diagnosis.
- A Relawan-created emergency is `T0-Suspect`.
- Healthcare performs secondary / clinical validation.
- `T0-Suspect`, technical transmission state, Healthcare handling state, clinical classification, and dispatch/referral state are different concepts.
- Server receipt must never imply that Healthcare has reviewed an emergency.
- `T0-Confirmed` means Healthcare has clinically validated the emergency state.
- `T0-Confirmed` does not automatically mean an ambulance or mobile team has already been dispatched.
- The original `T0-Suspect` must remain auditable when Healthcare later confirms or downgrades it.
- Healthcare clinical validation must create a separate record rather than overwrite the original system recommendation or T0 event.
- Important actions must be attributable to an actor and timestamp.
- Healthcare is patient/action-oriented.
- Admin remains macro/analytical/geospatial.
- Red remains protected for emergency/high-severity semantics.
- Permanent pulsing, flashing, sirens, or continuous vibration are not used.
- The Healthcare interface may be moderately dense but must remain clinically scannable and keyboard accessible.

---

# 3. Recommended Healthcare Architecture

## 3.1 Final Direction

Use:

> **Persistent emergency queue + one focused incident workspace + adaptive contextual rail**

Conceptual desktop structure:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ RAPID-MIND | Facility / PSC              Realtime     Alert Sound    │
├──────────┬──────────────────┬────────────────────────┬───────────────┤
│          │                  │                        │               │
│ NAV      │ T0 QUEUE         │ ACTIVE WORKSPACE       │ CONTEXT       │
│          │                  │                        │               │
│ Darurat  │ Perlu Respons    │ Selected incident      │ Timeline      │
│ Validasi │ Sedang Ditangani │ Verification           │ History       │
│ Rujukan  │ Tindak Lanjut    │ Clinical decision      │ Location      │
│ Pasien   │                  │ Referral / response    │               │
│          │                  │                        │               │
└──────────┴──────────────────┴────────────────────────┴───────────────┘
```

The contextual rail is adaptive. At narrower desktop widths it becomes a drawer.

The queue and active workspace have higher layout priority than the contextual rail.

---

# 4. Primary Healthcare Navigation

Use four permanent Healthcare destinations:

```text
Darurat
Validasi
Rujukan
Pasien
```

Do not add a separate visible `Operasional` destination because it overlaps with `Darurat`.

`Darurat` is the Healthcare landing destination after login.

The technical route `/healthcare/dashboard` may still exist internally, but visible navigation does not need to mirror every technical route.

---

# 5. Healthcare Operational State Model

Healthcare must not use one ambiguous status field.

## A. Technical Receipt

```text
Diterima sistem
Realtime terputus
Data mungkin tidak terbaru
```

## B. Healthcare Handling

```text
Belum diakui
→ Sudah diakui
→ Sedang ditinjau
```

## C. Clinical Classification

```text
T0-Suspect
→ T0-Confirmed

or

T0-Suspect
→ T1

or

T0-Suspect
→ T2
```

## D. Referral / Dispatch

```text
Belum ada tindak lanjut
→ Rujukan dibuat
→ Tim ditugaskan
→ Menuju lokasi
→ Tiba
→ Transportasi / handoff
→ Selesai
```

These dimensions must remain independent.

---

# 6. High-Level T0 Operational Flow

```text
Relawan creates T0-Suspect
        │
        ▼
Server receives event
        │
        ▼
BARU / BELUM DIAKUI
        │
        ▼
AKUI KASUS
        │
        ▼
SUDAH DIAKUI
        │
        ▼
MULAI VERIFIKASI SEKUNDER
        │
        ▼
SEDANG DITINJAU
        │
        ├──────────────────┐
        ▼                  ▼
T0-CONFIRMED            T1 / T2
        │                  │
        ▼                  ▼
Referral / Dispatch     Non-T0 follow-up
        │
        ▼
Resolution / history
```

Opening an incident does **not** acknowledge it.

---

# 7. Acknowledgement vs Review

`AKUI KASUS` means a Healthcare user has intentionally taken responsibility for progressing the incident.

`MULAI VERIFIKASI SEKUNDER` means actual secondary / clinical review has started.

Example:

```text
T0 A
Sudah diakui oleh Perawat Rina
Verifikasi belum dimulai

T0 B
Sedang ditinjau oleh dr. Budi

T0 C
Belum diakui
```

---

# 8. Incoming T0 Queue

Use dense rows rather than large decorative cards.

Example:

```text
T0-SUSPECT                         BARU

Siti Aminah
Posko Candi

Risiko keselamatan jiwa
+ Agitasi membahayakan

Dibuat 16:42
Diterima 16:43                     2 menit

Relawan: Ahmad
```

Unknown patient:

```text
T0-SUSPECT                         BARU

Penyintas belum teridentifikasi
Posko Candi • Tenda B12

Kegawatdaruratan medis

Dibuat 16:42
Diterima 16:43
```

Queue rows should contain:

- T0 classification;
- handling state;
- patient name or unidentified state;
- masked identifier where useful;
- Posko / location summary;
- Red Flag summary;
- event age;
- creation time;
- server receipt time;
- Relawan identity;
- current Healthcare handler if assigned;
- high-level referral/dispatch state.

Detailed clinical history does not belong in the queue row.

---

# 9. T0 Queue Grouping and Ordering

Primary grouping:

```text
PERLU RESPONS
→ T0 belum diakui

SEDANG DITANGANI
→ sudah diakui / sedang ditinjau

TINDAK LANJUT
→ clinically decided but operational follow-up remains active
```

Within `Perlu Respons`:

```text
T0 first
→ unacknowledged first
→ oldest emergency first
```

Do not invent a clinical ranking between different Red Flag categories unless an approved protocol defines one.

Show event creation and server receipt time separately when operationally meaningful.

---

# 10. New T0 Alert Behavior

A new T0 produces:

```text
1. new queue item
2. persistent visible alert state
3. finite audio alert
```

Do not forcibly replace the incident currently being reviewed.

If several T0s arrive together:

```text
3 T0 baru memerlukan respons
```

Avoid overlapping or continuous alarms.

---

# 11. Alert Sound and Visual Behavior

Recommended:

```text
New T0:
• one finite distinct sound
• static high-salience T0 treatment
• persistent queue badge
• explicit "BARU / BELUM DIAKUI"
```

Top shell:

```text
Suara peringatan: Aktif
```

or:

```text
Suara peringatan: Nonaktif
```

Never use permanent flashing, permanent pulsing, continuous sirens, continuous vibration, or a solid-red screen.

---

# 12. Multiple Simultaneous T0 Events

Every emergency has its own stable identifier and independent state.

An individual Healthcare user works primarily with one selected incident at a time, while the full queue remains visible.

Do not use one global reusable `activeEmergency` object.

---

# 13. Selected T0 Incident Header

Example:

```text
T0-SUSPECT                         BELUM DIAKUI

Siti Aminah
NIK 3515••••••••4821

Posko Candi
Dibuat 16:42 • Diterima sistem 16:43

Risiko keselamatan jiwa
Agitasi atau perilaku membahayakan

Belum ada penanggung jawab

[ AKUI KASUS ]
```

After acknowledgement:

```text
Ditangani oleh
dr. Rina Pratama

Diakui 16:45

[ MULAI VERIFIKASI SEKUNDER ]
```

---

# 14. Emergency Summary

The emergency event appears before longitudinal clinical history.

Show:

- Red Flag reasons;
- Relawan identity;
- Posko/location;
- event creation time;
- server receipt time;
- available emergency note.

T0 may exist independently of a complete assessment.

---

# 15. Unidentified Patient Handling

Use:

```text
Penyintas belum teridentifikasi
```

Do not use fake NIK values.

If identity is linked later, preserve that the event was originally created while the patient was unidentified.

---

# 16. Clinical Context in an Active T0

Use progressive disclosure.

First layer:

```text
KONTEKS KLINIS TERAKHIR

Asesmen terakhir
28 September 2026 • 14:21

Rekomendasi Sistem          T1
SRQ-20                      14 / 20
Faktor Risiko                5 / 8
Fungsi Harian                6 / 9

SRQ-20 #17                   YA

[ LIHAT DETAIL ASESMEN ]
```

Always show the assessment timestamp.

Use `Rekomendasi Sistem`, not `Diagnosis`, for system-generated triage.

---

# 17. Longitudinal Context Rail

Example:

```text
RIWAYAT PENYINTAS

29 Sep  16:42
T0-Suspect
Risiko keselamatan jiwa

28 Sep  14:21
T1 • Rekomendasi sistem
SRQ 14/20

21 Sep  10:08
T2 • Rekomendasi sistem
SRQ 9/20
```

Historical inspection should not remove the active emergency context.

---

# 18. Starting Secondary Verification

Use:

```text
[ MULAI VERIFIKASI SEKUNDER ]
```

Prototype-level verification metadata may include:

```text
VERIFIKASI SEKUNDER

Dimulai 16:46
oleh dr. Rina

Metode verifikasi
[ Telepon ] [ Video ] [ Langsung / Tim Lapangan ]

Catatan verifikasi
[ ........................................ ]
```

Do not invent an unsupported clinical checklist.

`Video` records the verification method; it does not require an integrated video-call engine.

---

# 19. No Prominent Clinical Countdown Timer

Record timestamps, but do not show a prominent live stopwatch pressuring clinical review.

Response time may be calculated later for audit or analytics.

---

# 20. Clinical Decision Area

Before review starts:

```text
HASIL VALIDASI

Hasil validasi tersedia setelah
verifikasi sekunder dimulai.
```

During review:

```text
HASIL VALIDASI

Pilih hasil verifikasi tenaga kesehatan.

○ T0 — Darurat terkonfirmasi

○ T1 — Prioritas asesmen klinis

○ T2 — Tindak lanjut psikososial

Catatan / alasan keputusan
[ ........................................... ]

[ SIMPAN HASIL VALIDASI ]
```

Use one outcome selector and one auditable save action.

---

# 21. No T3 in T0 Downgrade Flow

Current baseline:

```text
T0-Confirmed
or
downgrade to T1/T2
```

Do not expose T3 unless the clinical protocol is explicitly revised.

---

# 22. Meaning of `T0-Confirmed`

`T0-Confirmed` means Healthcare has clinically / secondarily validated that the incident remains a T0 emergency.

It does **not** mean:

- ambulance dispatched;
- team assigned;
- referral accepted;
- transport underway;
- patient arrived;
- emergency completed.

The original T0-Suspect remains visible in history.

---

# 23. Downgrade Behavior

Example:

```text
HASIL VALIDASI

T1 — Prioritas asesmen klinis

T0-Suspect telah ditinjau oleh
tenaga kesehatan.

Diperbarui 16:49
oleh dr. Rina
```

Do not use `T0 salah` or `False alarm`.

A downgraded case leaves the active T0 emergency queue but remains available in history.

---

# 24. Referral and Dispatch After T0 Validation

After T0 confirmation:

```text
TINDAK LANJUT DARURAT

T0 telah dikonfirmasi.

Belum ada tindakan rujukan atau
dispatch yang tercatat.

[ BUAT RUJUKAN ]
[ TUGASKAN TIM ]
```

Referral and dispatch are downstream states and must not be collapsed into `T0-Confirmed`.

---

# 25. Incident Timeline and Auditability

Example:

```text
RIWAYAT KEJADIAN

16:42
T0-Suspect dibuat
Ahmad Fauzi • Relawan

16:43
Diterima sistem

16:45
Kasus diakui
dr. Rina Pratama

16:46
Verifikasi sekunder dimulai
dr. Rina Pratama

16:49
T0 dikonfirmasi
dr. Rina Pratama

16:51
Tim PSC 119 ditugaskan
Operator Dimas

16:56
Tim menuju lokasi
```

Important transitions record actor, timestamp, previous state, new state, reason, and metadata.

Corrections create new recorded updates rather than silently editing history.

---

# 26. Multiple Healthcare Users

Use soft ownership.

Other authorized Healthcare users may still read an incident already acknowledged by another operator.

If data changes during editing:

```text
Data kasus telah diperbarui oleh pengguna lain.

Hasil terbaru perlu dimuat sebelum
Anda melakukan perubahan.

[ MUAT PEMBARUAN ]
```

Do not allow stale forms to overwrite newer decisions.

Formal case-transfer workflow remains deferred.

---

# 27. Realtime and Stale Data

Normal:

```text
Realtime aktif
```

If realtime disconnects:

```text
Realtime terputus

Pembaruan otomatis sementara tidak tersedia.
Terakhir diperbarui 17:08:14
```

If server/API is unavailable:

```text
Koneksi ke server terputus

Data di layar mungkin tidak terbaru.
Terakhir diperbarui 17:08:14
```

Healthcare is not fully offline-first like Relawan.

State-changing actions must not falsely appear successful while the server is unreachable.

---

# 28. Healthcare Accessibility

Requirements:

- no color-only semantics;
- visible keyboard focus;
- logical Tab order;
- Enter / Space activation;
- browser zoom support to at least 200%;
- adaptive context rail;
- new T0 alerts do not steal keyboard focus;
- audio alerts have visible equivalents;
- compact desktop typography remains readable.

---

# 29. Non-Emergency Healthcare IA

```text
HEALTHCARE

Darurat
├── T0 Perlu Respons
├── Sedang Ditangani
└── Tindak Lanjut

Validasi
├── Perlu Divalidasi
├── Sedang Ditinjau
└── Selesai

Rujukan
├── Aktif
└── Selesai

Pasien
└── Rekam longitudinal penyintas
```

---

# 30. What Enters `Validasi`

Recommended:

```text
T0
→ handled in Darurat

T1
→ automatically enters active Validasi work

T2
→ enters lower-priority validation / follow-up work

T3
→ remains in patient history
→ searchable
→ does not automatically create active validation work
```

This prevents routine T3 records from flooding the clinical work queue.

---

# 31. `Validasi` Is a Worklist

Example:

```text
VALIDASI

[ Perlu Divalidasi 12 ] [ Sedang Ditinjau 3 ] [ Selesai ]

Cari penyintas...               Filter ▾

PRIORITAS  PENYINTAS       ASESMEN       POSKO       WAKTU

T1        Siti Aminah      SRQ 16/20     Candi       14:21
          Fungsi 7/9
          Belum ditinjau

T1        Budi Santoso     SRQ 12/20     Waru        13:52
          Fungsi 6/9
          Belum ditinjau

T2        Rina Wulandari   SRQ 9/20      Gedangan    12:38
          Belum ditinjau
```

No KPI/chart dashboard.

---

# 32. Non-T0 Validation Ordering

Use:

```text
1. T1
2. T2
```

Within each class:

```text
oldest unreviewed first
```

Previous T0 or safety history may appear as contextual markers, but do not create unofficial classes such as `T1+`.

---

# 33. Explain Why the System Recommended T1/T2

Example:

```text
REKOMENDASI SISTEM

T1 — Prioritas asesmen klinis

Total skor terintegrasi      18

SRQ-20                       10 / 20
Faktor Risiko                 3 / 8
Fungsi Harian                 5 / 9
```

If T1 came from functional override:

```text
Pemicu rekomendasi
Gangguan fungsi berat
```

The UI should expose the basis of the recommendation.

---

# 34. Assessment Evidence

Use expandable sections:

```text
SRQ-20                         10 / 20
[ LIHAT 20 JAWABAN ]

Faktor Risiko                   3 / 8
[ LIHAT DETAIL ]

Fungsi Harian                   5 / 9
[ LIHAT DETAIL ]
```

Elevate genuinely safety-significant information without turning all positive responses red.

---

# 35. Non-T0 Healthcare Validation

Keep:

```text
REKOMENDASI SISTEM
```

separate from:

```text
VALIDASI HEALTHCARE
```

Do not overwrite the original recommendation.

---

# 36. Clinical Outcome Taxonomy Is Not Fully Defined

The current sources allow Healthcare to:

- confirm or adjust recommendations;
- add clinical notes;
- record follow-up plans;
- issue referrals.

They do not define a sufficiently detailed approved diagnostic taxonomy for the non-T0 workflow.

Do not invent a diagnosis menu such as PTSD / depression / ASD / GAD until the clinical protocol is explicitly approved.

Prototype structure may support:

```text
HASIL VALIDASI

Status tindak lanjut
[ Healthcare-entered structured result ]

Catatan klinis
[...]

Rencana tindak lanjut
[...]

Rujukan diperlukan
[ Ya / Tidak ]
```

---

# 37. `Pasien` as the Longitudinal Record

Global list:

```text
PASIEN

[ Cari nama atau NIK... ]

Nama            Status terbaru      Posko        Terakhir
Siti Aminah     T1                  Candi        29 Sep
Budi Santoso    T2                  Waru         29 Sep
Rina Wulandari  T3                  Candi        28 Sep
```

Detailed patient workspace:

```text
Ringkasan
Asesmen
Darurat
Validasi
Rujukan
```

---

# 38. Patient `Ringkasan`

Example:

```text
STATUS TERBARU

Validasi terakhir
T1 — Prioritas asesmen klinis

Asesmen terakhir
29 Sep 2026 • 14:21

Rujukan aktif
Tidak ada

PERKEMBANGAN TERBARU

29 Sep   T1
22 Sep   T2
16 Sep   T2
```

A current summary must not replace historical records.

---

# 39. Patient `Asesmen`

Use chronological immutable assessment entries.

Each assessment keeps its own:

- timestamp;
- recommendation;
- SRQ;
- risk;
- function;
- Relawan source.

Do not combine multiple submissions into one mutable “latest answers” record.

---

# 40. Patient `Darurat`

T0 history remains separate from assessments.

Example:

```text
29 Sep • 16:42

T0-Suspect
Risiko keselamatan jiwa

Validasi Healthcare
→ T1

[ LIHAT KEJADIAN ]
```

---

# 41. Patient `Validasi`

Show Healthcare decisions and what was being validated.

Example:

```text
29 Sep • 16:49
Hasil: T1
dr. Rina Pratama
Sumber: T0-Suspect

29 Sep • 14:48
Validasi asesmen
dr. Budi Santoso
Sumber: Asesmen 14:21
```

---

# 42. Patient `Rujukan`

Example:

```text
29 Sep 2026

RSUD ...
Status: Dalam proses

Dibuat dari:
T0-Confirmed 16:49

[ LIHAT RUJUKAN ]
```

Referral provenance remains explicit.

---

# 43. Global `Rujukan` Workspace

Example:

```text
RUJUKAN

[ Aktif 4 ] [ Selesai ]

Pasien          Tujuan          Sumber      Status
Siti Aminah     RSUD ...        T0          Diproses
Budi Santoso    Puskesmas ...   T1          Diproses
```

The global page is operational.

The patient view is longitudinal.

---

# 44. Referral vs Dispatch

Lock:

```text
Referral
≠
Dispatch
```

Referral = care / facility handoff decision.

Dispatch = movement of medical/mobile/transport resources.

Examples:

```text
T0:
Referral → RSUD X
Dispatch → PSC Unit 02
```

```text
T1:
Referral → specialist / facility
Dispatch → none
```

---

# 45. Referral Workspace

Conceptual structure:

```text
RUJUKAN

Siti Aminah

Tujuan
RSUD ...

Dibuat oleh
dr. Rina • 16:51

Sumber rujukan
T0-Confirmed

Catatan
...

STATUS RUJUKAN

Dibuat
↓

Dikirim / diproses
↓

Selesai
```

The complete production referral-state vocabulary is not yet locked.

---

# 46. Dispatch Inside Referral Context

For T0:

```text
RESPONS LAPANGAN
PSC Unit 02

Ditugaskan
→ Menuju lokasi
→ Tiba
→ Transportasi
→ Selesai
```

This is dispatch state, not clinical-validation state.

---

# 47. Search Behavior

Global patient search should support at minimum:

```text
Nama
NIK
```

and may support Posko context.

Search belongs inside `Pasien` and relevant selection surfaces rather than permanently occupying the global top bar.

---

# 48. Patient Identity and NIK Exposure

Use minimum necessary exposure.

Patient list:

```text
Siti Aminah
NIK ••••4821
```

Patient record may show the full authorized identifier.

Emergency queue should generally use name plus masked identifier where useful.

---

# 49. Cross-Section Navigation

From T0:

```text
Darurat
T0-Suspect
    ↓
T0-Confirmed
    ↓
Buat Rujukan
    ↓
Rujukan
```

From T1:

```text
Validasi
T1 recommendation
    ↓
Healthcare review
    ↓
Referral required
    ↓
Rujukan
```

From patient history:

```text
Pasien
    ↓
historical assessment
    ↓
associated validation
    ↓
associated referral
```

Preserve patient context while navigating.

---

# 50. Emergency Priority Across the Product

A new T0 arriving while the user is in `Pasien`, `Validasi`, or `Rujukan` must still surface through:

- persistent `Darurat` badge/count;
- finite sound;
- visible new-T0 notification;
- queue update.

Do not steal keyboard focus or replace the current form automatically.

---

# 51. Scope Boundary: Not a Full Hospital EMR

RAPID-MIND Healthcare may support:

```text
clinical validation
clinical note
follow-up plan
referral
emergency response state
```

Do not expand the prototype into:

```text
full medication ordering
hospital pharmacy
lab ordering
radiology
billing
complete inpatient record
full prescription-management system
```

unless product scope is deliberately expanded later.

---

# 52. Healthcare vs Admin Boundary

## Healthcare

- patient-specific T0 queue;
- acknowledgement;
- secondary verification;
- patient clinical record;
- SRQ / Risk / Function history;
- clinical validation;
- T0 confirmation;
- downgrade to T1/T2;
- clinical notes;
- referral;
- dispatch/transport operational status.

## Admin

- regional heatmap;
- aggregate T0/T1/T2/T3 distribution;
- population-level trends;
- macro longitudinal analytics;
- volunteer distribution;
- logistics/resource allocation;
- executive reporting;
- regional strategic monitoring.

Healthcare may view a selected patient's/emergency's location.

Healthcare should not become the regional analytical command center.

---

# 53. Locked Healthcare Decisions

1. Healthcare lands on `Darurat`, not a KPI dashboard.
2. Use persistent emergency queue + one selected workspace + adaptive context rail.
3. Primary navigation is `Darurat`, `Validasi`, `Rujukan`, `Pasien`.
4. Opening a T0 does not acknowledge it.
5. `AKUI KASUS` records human ownership.
6. `MULAI VERIFIKASI SEKUNDER` separately records start of clinical review.
7. `Diterima sistem` does not mean Healthcare has reviewed the incident.
8. T0-Suspect, handling, clinical classification, and dispatch/referral remain separate.
9. T0 queue uses dense rows.
10. Unacknowledged T0s are prioritized.
11. Older equivalent emergencies appear first.
12. No unapproved ranking between Red Flag categories.
13. Creation time and receipt time remain distinguishable.
14. New T0 alerts do not replace the active workspace.
15. T0 alert sound is finite.
16. No permanent flashing/pulsing/sirens/vibration.
17. One operator primarily works with one selected incident at a time.
18. Multiple T0s remain visible.
19. Unknown patients are valid first-class emergency records.
20. Emergency information appears before longitudinal clinical history.
21. Clinical history uses progressive disclosure.
22. Secondary verification does not invent an unsupported clinical checklist.
23. No prominent countdown timer pressures clinical review.
24. Current T0 validation outcomes are T0 / T1 / T2.
25. T3 is not exposed as a T0 downgrade unless protocol changes.
26. `T0-Confirmed` means clinical confirmation only.
27. Referral/dispatch are separate downstream states.
28. Original T0-Suspect is never overwritten.
29. Clinical corrections create new recorded transitions.
30. Soft ownership uses stale/concurrency protection.
31. Realtime failure is explicit.
32. Healthcare actions must not falsely appear saved during server failure.
33. Healthcare remains keyboard accessible.
34. `Validasi` is a worklist, not analytics.
35. T1 automatically enters active validation work.
36. T2 enters lower-priority validation/follow-up work.
37. T3 remains searchable in patient history without flooding active validation.
38. System recommendation and Healthcare validation remain separate.
39. UI explains the basis of T1/T2 recommendations.
40. No unsupported diagnostic taxonomy is invented.
41. `Pasien` is the longitudinal patient workspace.
42. Patient record sections are `Ringkasan`, `Asesmen`, `Darurat`, `Validasi`, `Rujukan`.
43. Assessments remain historical records.
44. Emergency events remain separate from assessments.
45. `Rujukan` exists both in patient history and as a global queue.
46. Referral and dispatch are separate concepts.
47. Exact referral-state vocabulary is not yet locked.
48. Full NIK exposure is minimized in dense lists.
49. RAPID-MIND does not become a general-purpose hospital EMR.

---

# 54. Open Questions / Deferred Decisions

## Referral / Dispatch State Machine

The next design discussion should define:

1. exact referral states;
2. exact dispatch states;
3. who may change each state;
4. when referral exists without dispatch;
5. when dispatch exists without referral;
6. destination/facility selection;
7. referral acceptance/rejection behavior;
8. transfer between facilities;
9. cancellation/update behavior;
10. completion criteria;
11. audit requirements;
12. failed/stale handoff behavior;
13. concurrent update behavior;
14. how referral status is shown to Relawan where appropriate.

## Non-T0 Clinical Validation Protocol

The UI structure is defined, but exact clinical outcome fields and diagnostic taxonomy remain unresolved because the current sources do not provide a sufficiently detailed approved protocol.

## Healthcare Case Transfer / Ownership

Soft ownership is currently preferred.

A formal `Alihkan penanggung jawab` workflow remains deferred until real staffing/handoff rules are defined.

---

# 55. Next Design Topic

Continue with:

# REFERRAL / DISPATCH STATE MACHINE

The goal is to complete the remaining Healthcare operational model before moving to individual visual compositions or production code.

After referral/dispatch is locked, Healthcare will be sufficiently defined to move toward:

1. detailed screen composition;
2. responsive desktop behavior;
3. empty/loading/error states;
4. reusable component structure;
5. final implementation specification.
