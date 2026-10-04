# RAPID-MIND — Relawan Mobile Shell, Navigation, and SRQ-20 Interaction Design

**Document type:** UI/UX design specification  
**Scope:** Relawan mobile PWA shell, navigation, assessment interaction, and SRQ-20 verbal/non-verbal workflow  
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

The technical plan remains the architectural constraint.

The visual foundation remains locked unless later usability or accessibility testing identifies a concrete problem.

This document does not redefine the project architecture, triage logic, or visual palette.

---

# 2. Locked Visual Direction

## Core Design Principles

- Calm by default.
- Action over decoration.
- Emergency is exceptional.
- Field readability first.
- Status must be explicit.
- Offline is a normal operating mode, not automatically an error.
- Clinical authority must be explicit.
- Relawan is low-density and touch-first.
- Healthcare is emergency-first and moderately dense.
- Admin is dense, analytical, and geospatial.

## Core UI Palette

```text
Ink       #0F172A
Teal      #0F766E
Slate     #64748B
Soft Gray #F1F5F9
White     #FFFFFF
```

## Triage Semantic Exception

```text
T0        #991B1B
T1        #C2410C
T2        #A16207
T3        #15803D
```

T0 is a separate emergency state/event and must not be visually treated as merely a stronger T1.

## Typography

Primary typeface:

```text
Inter Variable
```

Relawan:

- default body text: approximately 16px;
- assessment questions: approximately 20px;
- field tap targets: minimum approximately 56px;
- compact supporting text may use 14px where necessary;
- do not reduce important text merely to fit more information on screen.

---

# 3. Relawan Shell Information Architecture

The Relawan mobile application uses a task-oriented information architecture rather than exposing every technical route as a primary navigation destination.

## Primary Destinations

```text
Beranda
PFA
Asesmen
Data
```

### Beranda

Primary operational starting point.

Typical responsibilities:

- continue unfinished work;
- start common field workflows;
- show important local/synchronization state;
- expose the most recent draft or pending work;
- provide quick access to PFA and assessment workflows.

### PFA

Day 1–3 Psychological First Aid guide.

Primary internal structure:

```text
LOOK
LISTEN
LINK
```

PFA remains a human-centered guide rather than a dense administrative form.

### Asesmen

Entry point for Day 4–30 structured assessment.

The structured assessment includes:

```text
Identitas Penyintas
→ SRQ-20
→ Faktor Risiko
→ Fungsi Harian
→ Tinjau
→ Hasil Rekomendasi
```

### Data

Operational data workspace for the volunteer.

It should include:

```text
Sedang Dikerjakan / Belum Selesai
Menunggu Sinkronisasi
Tersinkron
```

`Data` is preferred over exposing separate `Pasien`, `Riwayat`, and `Sinkronisasi` tabs.

---

# 4. Navigation Model

## Recommended Pattern: Contextual Task Shell

Normal application state uses four global bottom-navigation destinations:

```text
Beranda | PFA | Asesmen | Data
```

However, during a structured assessment, the interface enters a focused task state.

The assessment should not behave like a conventional browsing screen where global tabs remain the primary interaction.

General navigation may be visually reduced while assessment-specific content and emergency access remain dominant.

## Why

The Relawan workflow should distinguish:

```text
Application navigation
→ Which major tool am I using?

Workflow navigation
→ Where am I inside the field task?

Emergency escalation
→ I need to bypass the normal workflow now.
```

These should not share the same visual hierarchy.

---

# 5. Top Application Bar

The Relawan header should remain restrained.

Avoid unnecessary permanent elements such as:

- notification bell;
- search;
- decorative large logo;
- multiple status icons;
- dense account controls;
- current date/time unless operationally required.

## Normal Example

```text
RAPID-MIND                   Tersinkron
Posko Candi
```

or:

```text
RAPID-MIND          Offline • 3 data
Posko Candi
```

The current Posko or operational context may be shown when useful.

## Contextual Header

Nested workflows should prioritize context rather than repeatedly displaying large branding.

Examples:

```text
← PFA                       Offline
LISTEN
```

```text
← Asesmen             Offline • 2
SRQ-20 • 8/20
```

```text
← Data                 Tersinkron
Detail Penyintas
```

---

# 6. Connection and Synchronization Status

Raw network state is not enough.

The shell should communicate the operational status of the volunteer's work.

The volunteer primarily needs to know:

> Is my work safely stored?

not merely:

> Is the browser online?

## Recommended Shell States

### A. Synced

```text
✓ Tersinkron
```

Use Teal.

Meaning:

- local work is safely stored;
- no pending outbox items;
- latest synchronization completed successfully.

### B. Syncing

```text
↻ Menyinkronkan 3 data
```

Use Teal.

Animation should occur only while an actual sync attempt is taking place.

No permanent spinner.

### C. Offline but locally safe

```text
Offline • 3 data tersimpan
```

Use Slate or Ink.

This is a normal operating state and should not automatically use red/error treatment.

### D. Synchronization failed

```text
2 data belum tersinkron
```

Expanded message:

```text
Sinkronisasi belum berhasil.
Data tetap aman di perangkat.
```

This is different from local persistence failure.

### E. Local persistence failed

```text
Data belum tersimpan
```

This is significantly more serious because data preservation can no longer be guaranteed.

It should receive stronger interruption/error treatment.

---

# 7. Combined Status Control

Instead of separate Wi-Fi, cloud, database, refresh, and account indicators, use one combined operational status control.

Example:

```text
Offline • 3 data tersimpan
```

Tapping it can open a bottom sheet:

```text
Status Data

Offline

3 data tersimpan di perangkat
0 data gagal disimpan

Terakhir tersinkron
14:32

[ Coba Sinkronkan ]
```

Automatic synchronization remains the default.

Manual retry exists as additional user control.

Potential automatic sync triggers include:

- submission;
- network restoration;
- app resume;
- app startup;
- background sync where supported.

---

# 8. Bottom Navigation

Use:

```text
Beranda
PFA
Asesmen
Data
```

Each destination should have:

- icon;
- explicit text label;
- clear active state;
- effective tap target of at least approximately 56px.

Do not rely on icons alone.

## Unsynced Badge

`Data` may show an unsynchronized count.

Example:

```text
Data ③
```

The badge must not use T0 emergency red merely because data is pending.

Unsynchronized data is operational backlog, not a clinical emergency.

---

# 9. Persistent T0 Emergency Control

T0 emergency access is independent from normal navigation.

It is not a fifth bottom-navigation tab.

## Recommended Control

Use an explicit floating emergency pill/button rather than an icon-only circular FAB.

Example:

```text
[ ⚠ T0 DARURAT ]
```

Recommended characteristics:

- T0 red `#991B1B`;
- white text;
- explicit label;
- emergency icon;
- minimum height approximately 56px;
- persistent throughout Relawan workflows except login;
- static by default;
- no permanent pulsing, flashing, bouncing, or glowing.

T0 must remain visually and structurally distinct from T1.

## Placement

Place above bottom navigation and device safe area.

Do not allow it to overlap:

- answer controls;
- sticky assessment actions;
- browser/device gesture regions;
- important text.

---

# 10. Offline Authentication Behavior

Authentication state must not destroy field continuity.

If:

```text
access token expires
+
network is unavailable
```

the application must not immediately force the volunteer away from an active local workflow.

The volunteer should still be able to use:

- PFA;
- local patient data already available;
- structured assessment;
- local triage calculation;
- IndexedDB-backed saving.

When connectivity returns:

```text
try authentication refresh
```

If refresh succeeds:

```text
resume synchronization
```

If refresh fails:

```text
Perlu masuk kembali untuk sinkronisasi.
Data tetap aman di perangkat.
```

Reauthentication may block server synchronization, but it must never silently delete unsynchronized work.

---

# 11. Assessment Persistence Model

The assessment should behave as a protected field workflow.

## Core Rule

Every meaningful answer saves locally immediately.

Navigation must never determine whether an answer survives.

Conceptually:

```text
User interaction
↓
IndexedDB
↓
local assessment state
↓
outbox/sync state
↓
server synchronization separately
```

There is no requirement for a `Simpan` button on every question.

---

# 12. Assessment Stage Structure

The structured assessment should remain divided into meaningful stages:

```text
Identitas Penyintas
↓
SRQ-20
↓
Faktor Risiko
↓
Fungsi Harian
↓
Tinjau
↓
Hasil Rekomendasi
```

Do not put identity + SRQ + risk + function into one enormous continuous page.

The three assessment sections use different interaction patterns and should remain distinct stages.

---

# 13. Draft and Resume Behavior

## Recommended States

Do not use one ambiguous `Draft` state for everything.

Use conceptually distinct states:

### Sedang Dikerjakan

An assessment currently being worked on.

### Belum Selesai

An incomplete assessment intentionally left for later.

### Menunggu Sinkronisasi

A locally completed assessment that has not yet been accepted by the server.

Completed-but-unsynced data is not an unfinished draft.

## Resume

When the application is reopened after interruption:

```text
Lanjutkan Asesmen

Siti Aminah
SRQ-20 • 8 dari 20
Terakhir disimpan 14:32

[ Lanjutkan ]
```

The most recent incomplete workflow should be prominent.

## Multiple Drafts

Multiple unfinished assessments are allowed.

Disaster-response conditions may require suspending one interaction and assisting another person.

If an unfinished assessment exists and the volunteer starts another:

```text
Ada asesmen yang belum selesai

Siti Aminah
SRQ-20 • 12 dari 20

[ Lanjutkan Asesmen ]
[ Mulai Asesmen Baru ]
```

Do not automatically overwrite or discard the previous assessment.

---

# 14. Reload / Restart Recovery

Reloading the browser, closing the PWA, or restarting the device should not destroy locally saved progress.

Expected behavior:

```text
App opens
↓
IndexedDB loads active assessment
↓
assessment is restored
```

Potential feedback:

```text
Asesmen dipulihkan dari perangkat
```

Existing answers remain intact.

---

# 15. SRQ-20 Page Structure

## Final Direction

SRQ-20 uses **one continuous scrollable page**.

Do not use 20 separate screens requiring repeated `Kembali` and `Selanjutnya` actions.

This reduces interaction burden and allows the Relawan to maintain attention on the penyintas.

## Do Not Use 20 Large Cards

Twenty full cards would create excessive:

- borders;
- shadows;
- spacing;
- visual mass;
- scrolling distance.

Use one White assessment surface with questions separated by:

- generous whitespace;
- subtle dividers;
- clear numbering.

---

# 16. SRQ-20 Question Anatomy

Each normal item should contain:

```text
08

Apakah Ibu/Bapak mengalami kesulitan
untuk berpikir jernih?

[ YA ]        [ TIDAK ]

▾ Petunjuk relawan
```

## Recommended Hierarchy

- item number: compact, Slate;
- assessment question: approximately 20px, strong Ink hierarchy;
- answer controls: 16px or larger, strong interaction state;
- guidance trigger: 14–16px;
- expanded guidance: 16px body text.

---

# 17. Question Wording

For field use:

## Primary Visible Wording

Use conversational Indonesian suitable for reading aloud naturally to the penyintas.

## Expandable Supporting Content

`Petunjuk relawan` may contain:

- standardized/formal SRQ wording;
- interpretation guidance;
- field-specific reminders.

Example:

```text
03

Apakah malam hari sulit tidur
atau sering terbangun?

[ YA ] [ TIDAK ]

▾ Petunjuk relawan
```

Expanded:

```text
Pertanyaan SRQ-20:
"Apakah Sdr tidak bisa tidur nyenyak?"

Petunjuk:
Bedakan dengan sulit tidur karena tempat
berisik atau panas.
```

Do not display every explanatory paragraph by default.

---

# 18. Answer Controls

Use two large choices:

```text
┌───────────────┐ ┌───────────────┐
│      YA       │ │     TIDAK     │
└───────────────┘ └───────────────┘
```

Selected:

```text
┌───────────────┐ ┌───────────────┐
│    ✓ YA       │ │     TIDAK     │
└───────────────┘ └───────────────┘
```

Minimum effective height:

```text
approximately 56px
```

Normal answer selection uses Teal.

Do not use:

```text
YA = red
TIDAK = green
```

A positive symptom response is not automatically an emergency, and triage colors should retain their semantic meaning.

---

# 19. SRQ-20 Progress

Progress represents **answered items**, not scroll position.

Example:

```text
SRQ-20 • 8 dari 20
```

If the volunteer has answered Q1–Q7 and Q12:

```text
8 dari 20
```

is still correct.

Progress should not imply that merely scrolling past an item counts as completion.

A thin progress indicator may accompany the count.

---

# 20. Flexible Question Order

Sequential answering is not mandatory.

The Relawan may temporarily skip an item and return later.

Example:

```text
Q1–Q8 answered
Q9 unresolved
Q10 answered
```

The application should allow that.

At review time, required unanswered items are explicitly surfaced.

Example:

```text
18 dari 20 terjawab

Belum dijawab:
• Pertanyaan 9
• Pertanyaan 14
```

---

# 21. Question Navigator

Provide a compact optional jump-to-question control.

Example:

```text
Jawaban SRQ-20

01 ✓    06 ✓    11 ✓    16 —
02 ✓    07 ✓    12 —    17 —
03 ✓    08 ✓    13 —    18 —
04 ✓    09 —    14 —    19 —
05 ✓    10 —    15 —    20 —

8 dari 20 terjawab
```

Requirements:

- not permanently expanded;
- each number can scroll to that question;
- answered/unanswered meaning must not rely on color alone;
- useful especially during final review.

---

# 22. Verbal / Non-Verbal Mode Control

The mode switch must remain easy to access.

Use a segmented control:

```text
[ VERBAL ] [ NON-VERBAL ]
```

Do not bury mode selection inside settings or a secondary menu.

The mode may change during the same assessment.

Example:

```text
Q1–Q9 → Verbal
Q10–Q20 → Non-Verbal
```

Existing answers remain intact when the mode changes.

No confirmation dialog is required merely to switch modes if no data is being deleted or reinterpreted.

---

# 23. Verbal Mode — Final STT Interaction Model

## Core Decision

Use **one STT session for the full SRQ-20 verbal interview**.

Do not place a microphone button on every question.

Do not require an explicit visible `active question` that moves through the interface.

The desired field interaction is:

```text
Select Verbal
↓
Tap microphone once
↓
Conduct the SRQ-20 interview naturally
↓
System transcribes and interprets responses
↓
YA / TIDAK answers are populated automatically
↓
Relawan finishes interview
↓
Relawan reviews and corrects the structured answers
```

This keeps the volunteer's attention on the penyintas rather than on repeated device interaction.

---

# 24. Verbal Mode Layout

Before listening:

```text
SRQ-20
0 dari 20 terjawab

[ VERBAL ] [ Non-Verbal ]

┌──────────────────────────────────┐
│ 🎙 Mulai Wawancara Suara        │
└──────────────────────────────────┘

01
Apakah ...

[ YA ] [ TIDAK ]

02
Apakah ...

[ YA ] [ TIDAK ]

...
```

During the session:

```text
┌──────────────────────────────────┐
│ 🎙 Wawancara suara aktif        │
│                                  │
│ Jawaban akan diisi otomatis.    │
│                                  │
│ [ Selesai Wawancara ]           │
└──────────────────────────────────┘
```

The questions remain visible as the interview guide.

The Relawan is not required to interact after each answer.

---

# 25. STT Processing Model

Speech-to-text and answer interpretation are separate responsibilities.

Conceptually:

```text
Audio
↓
Speech-to-Text
↓
Transcript
↓
Response interpretation
↓
YA / TIDAK / Belum Dapat Ditentukan
```

## Important Rule

Do not implement:

```text
keyword appears
→ YA
```

Simple keyword matching is insufficient.

Example:

```text
"Saya tidak sakit kepala."
```

contains:

```text
"sakit kepala"
```

but the correct answer is:

```text
TIDAK
```

The keywords defined in the workflow should be treated as recognition cues, not sufficient standalone decision rules.

Interpretation should consider context such as:

- negation;
- response meaning;
- question association;
- potentially ambiguous phrasing.

---

# 26. Automatic Answer Population

During or after the verbal session, the system may populate:

```text
01
[ ✓ YA ] [ TIDAK ]

Dipilih dari wawancara suara
```

or:

```text
02
[ YA ] [ ✓ TIDAK ]

Dipilih dari wawancara suara
```

Ordinary automatically recognized answers do not require a separate confirmation dialog.

That would eliminate the efficiency benefit.

---

# 27. Manual Override

Manual Relawan input remains authoritative.

If STT selects:

```text
YA
```

but the Relawan determines that the proper answer is:

```text
TIDAK
```

the volunteer simply taps `TIDAK`.

No edit modal.

No additional confirmation.

The corrected structured answer becomes authoritative.

Potential internal provenance:

```text
answer = false
source = stt
manual_override = true
```

The exact storage model will be decided during implementation.

---

# 28. Uncertain STT Results

Do not force every spoken response into a binary answer.

Support an internal processing state:

```text
BELUM DAPAT DITENTUKAN
```

This is not an SRQ response category.

It only indicates that the input processor could not safely choose `YA` or `TIDAK`.

Example:

```text
12
Apakah kesulitan mengambil keputusan?

Belum dapat ditentukan dari wawancara.

[ YA ] [ TIDAK ]
```

The Relawan resolves it manually during review.

Do not invent answers merely to reach 20/20 automatically.

---

# 29. End-of-Interview Review

When the volunteer taps:

```text
Selesai Wawancara
```

the microphone stops.

The application summarizes recognition:

```text
Wawancara selesai

17 dari 20 jawaban berhasil dikenali
3 jawaban perlu diperiksa

[ Tinjau Jawaban ]
```

The review page remains the same continuous SRQ-20 structure.

Examples:

```text
01                    Dikenali otomatis

Apakah sering sakit kepala?

[ ✓ YA ] [ TIDAK ]
```

```text
07                    PERLU DIPERIKSA

Apakah pencernaan memburuk?

[ YA ] [ TIDAK ]

Jawaban suara belum cukup jelas.
```

The volunteer checks/corrects the structured answers before continuing.

---

# 30. Transcript Visibility

Do not permanently display a full transcript underneath every question.

That would make the continuous page too dense.

For ambiguous items, allow optional evidence:

```text
▾ Lihat hasil suara
```

Expanded:

```text
Hasil suara:
"Kadang mual, tapi biasanya habis makan..."
```

Transcript retention/storage policy must be decided separately.

Do not assume full audio/transcripts should be permanently stored.

---

# 31. Non-Verbal Mode

When `NON-VERBAL` is selected:

- the microphone control disappears;
- the same SRQ-20 questions remain;
- large `YA / TIDAK` controls remain available;
- answers may be derived through the permitted adaptive interaction method.

Conceptually:

```text
[ Verbal ] [ NON-VERBAL ]

01
Apakah ...

[ YA ] [ TIDAK ]

02
Apakah ...

[ YA ] [ TIDAK ]
```

Non-Verbal may use:

- penyintas nodding/shaking head;
- direct screen tapping;
- guided observation;
- contextual confirmation permitted by the workflow.

The exact Non-Verbal screen details can be refined later.

---

# 32. Switching Modes Mid-Assessment

Changing mode must:

- preserve all existing answers;
- preserve local draft state;
- not reinterpret earlier responses;
- not require a destructive confirmation dialog.

If the microphone is active and the user selects `Non-Verbal`:

```text
microphone stops immediately
↓
Non-Verbal mode becomes active
↓
existing answers remain
```

If switching back to `Verbal`:

```text
microphone control becomes visible
```

but the microphone does **not** start automatically.

The Relawan must explicitly tap:

```text
Mulai Wawancara Suara
```

---

# 33. STT and Offline Behavior

STT is an assistive acceleration feature.

It must never become a prerequisite for completing SRQ-20.

If STT is unavailable:

```text
Input suara tidak tersedia.
Jawaban tetap dapat dipilih manual.
```

The volunteer can continue using the complete manual `YA / TIDAK` workflow.

Core assessment functionality must remain available without server connectivity.

The eventual technical implementation must separately determine whether the selected STT engine can operate offline.

Do not make unsupported assumptions about browser/offline speech-recognition capabilities.

---

# 34. SRQ-20 Question 17 — Safety Exception

Question 17 is not treated as an ordinary item.

It concerns suicidal/self-harm safety and can trigger the T0 emergency pathway.

## Presentation

Do not make the entire question permanently red before the user responds.

Example:

```text
17
Pertanyaan keselamatan

Dalam kondisi seberat ini, pernah
terlintas keinginan untuk menyerah
atau mengakhiri hidup?

[ YA ] [ TIDAK ]

Jawaban "Ya" memerlukan prosedur
keselamatan T0.
```

This preserves emergency salience without visually biasing the whole interview.

---

# 35. Q17 During Verbal STT

Q17 cannot simply wait until the final end-of-interview review if the spoken response indicates immediate danger.

Example:

```text
Penyintas:
"Iya, saya kepikiran buat mati saja."
```

The processing flow should become:

```text
potential safety response detected
↓
pause ordinary verbal interview flow
↓
surface T0 verification
```

Example UI:

```text
Potensi Red Flag Terdeteksi

Sistem mendeteksi jawaban yang berkaitan
dengan risiko keselamatan jiwa.

Hasil suara:
"...kepikiran buat mati saja..."

Tetap dampingi penyintas.

[ Bukan Red Flag ]
[ Verifikasi T0 Darurat ]
```

## Critical Safety Rule

Raw STT/NLP output must **not directly transmit T0 automatically**.

The Relawan remains part of the verification loop before creating/transmitting T0-Suspect.

---

# 36. Other Emergency Speech

The same principle may later apply to other configured emergency indicators such as:

- self-harm;
- acute psychosis;
- severe agitation;
- severe acute medical crisis.

If the system detects potential emergency speech:

```text
detect
↓
surface warning
↓
Relawan verifies
↓
T0 flow if confirmed
```

Do not use:

```text
keyword detected
↓
silent automatic emergency transmission
```

---

# 37. End of SRQ-20

At the bottom:

If complete:

```text
20 dari 20 terjawab

Semua pertanyaan telah diisi.

[ Tinjau Jawaban ]
```

If incomplete:

```text
18 dari 20 terjawab

2 pertanyaan belum diisi.

[ Lengkapi 2 Jawaban ]
```

The incomplete action jumps to missing items.

---

# 38. SRQ Review Before Risk Factors

The review stage verifies structured answers.

Example:

```text
Tinjau SRQ-20

20 dari 20 pertanyaan lengkap

Jawaban Ya     8
Jawaban Tidak 12

[ Lihat Semua Jawaban ]

[ Kembali ke SRQ-20 ]
[ Lanjut ke Faktor Risiko ]
```

Do not present a final T1/T2/T3 recommendation at this point.

The integrated result also requires:

- SRQ-20;
- Faktor Risiko;
- Fungsi Harian.

---

# 39. Risk Factors and Function Assessment Layout Direction

The continuous-page approach also applies well to these smaller sections.

## Faktor Risiko

Five items on one page.

Example:

```text
Faktor Risiko
0 dari 5 terisi

R1 Kehilangan Berat
[ YA ] [ TIDAK ]

R2 Pengalaman Traumatik Langsung
[ YA ] [ TIDAK ]

...

[ Lanjut ke Fungsi Harian ]
```

## Fungsi Harian

Three domains on one page.

Each domain can present the defined multi-level condition choices as large touch targets.

Exact component design will be specified later.

---

# 40. Responsive Behavior

## Small Phones

Do not shrink frontline typography merely to avoid scrolling.

Allow vertical scrolling.

Maintain:

- readable assessment questions;
- 56px-class touch targets;
- visible operational state;
- persistent T0 access;
- safe-area handling.

## Larger Phones

Use more breathing room but retain the same basic single-column workflow.

## Tablets

Do not transform the Relawan experience into a dense desktop dashboard.

Use a centered, constrained content column.

Approximate comfortable reading width may be in the range of:

```text
600–720px
```

subject to prototype testing.

Relawan remains touch-first on larger devices.

---

# 41. PWA Installed vs Browser

The shell must work both:

- as an installed PWA;
- inside a normal browser tab.

Account for:

- device safe-area insets;
- browser toolbar behavior;
- Android/iOS gesture navigation;
- browser/device Back behavior;
- reload/restart recovery.

Do not assume browser chrome dimensions are fixed.

---

# 42. Browser Back / Leave Assessment Behavior

Because answers are autosaved locally, leaving should not ask:

```text
Simpan draft?
```

The data is already saved.

Instead:

```text
Keluar dari asesmen?

Progres sudah tersimpan di perangkat
dan dapat dilanjutkan nanti.

[ Lanjutkan Asesmen ]
[ Simpan & Keluar ]
```

`Simpan & Keluar` means leave the workflow, not perform the first save.

Do not place destructive draft deletion inside this routine exit action.

---

# 43. Accessibility and Field Ergonomics

Requirements:

- no color-only semantic communication;
- body text generally 16px or larger for Relawan;
- assessment questions approximately 20px;
- minimum approximately 56px field tap targets;
- explicit text labels for emergency and sync states;
- no essential swipe-only interactions;
- support browser zoom;
- maintain readable contrast outdoors;
- preserve visible keyboard focus where applicable;
- pair any audio alert with visible information;
- avoid permanent pulsing/flashing animation.

One-handed use should be considered when placing:

- answer controls;
- mode toggle;
- microphone control;
- T0 emergency control.

---

# 44. Locked Decisions From This Discussion

The following decisions are treated as the current design baseline:

1. Relawan uses a contextual task shell.
2. Global navigation uses:
   - `Beranda`
   - `PFA`
   - `Asesmen`
   - `Data`
3. T0 is a separate persistent emergency action, not a navigation tab.
4. Use an explicit `T0 DARURAT` emergency pill/button rather than an icon-only FAB.
5. T0 is static by default; no permanent pulse.
6. Operational status combines connectivity and data/sync meaning.
7. Offline with safe local data is a normal state, not automatically an error.
8. Unsynchronized data remains visible.
9. Failed authentication refresh must not destroy local field work.
10. Every assessment answer autosaves locally.
11. Multiple unfinished assessments are allowed.
12. Completed-but-unsynced data is not treated as a draft.
13. SRQ-20 uses one continuous scrollable page.
14. Risk Factors use one page.
15. Function Assessment uses one page.
16. SRQ `YA / TIDAK` controls remain large and manual even when STT exists.
17. Verbal/Non-Verbal mode switching stays easily accessible.
18. Switching mode preserves existing answers.
19. Verbal mode uses one microphone session for the whole SRQ interview.
20. STT automatically proposes/populates structured `YA / TIDAK` answers.
21. Manual Relawan correction remains authoritative.
22. Simple keyword presence alone is not sufficient answer logic.
23. Ambiguous STT output remains unresolved rather than being guessed.
24. End-of-interview review is required before moving forward.
25. STT is optional assistance; manual SRQ remains fully usable when STT is unavailable.
26. Q17 and other emergency speech may interrupt the interview immediately.
27. Raw STT/NLP detection never silently creates/transmits T0.
28. T0 must enter a human verification flow.
29. Full transcript/audio retention is not yet decided.
30. Production code is not yet being written.

---

# 45. Next Design Topic

The next discussion should define:

# T0 EMERGENCY INTERACTION

Cover:

1. persistent `T0 DARURAT` trigger behavior;
2. Q17/STT-triggered emergency behavior;
3. emergency verification gates;
4. selecting/confirming the penyintas identity;
5. anonymous/unknown patient handling;
6. emergency reason selection;
7. location handling;
8. online transmission state;
9. offline T0 behavior;
10. priority local queue;
11. safe native SMS handoff concept where applicable;
12. instructions to the Relawan while waiting for help;
13. cancellation/false-positive handling;
14. what happens to an interrupted PFA/SRQ workflow;
15. T0-Suspect report vs local/server submission-state communication, without exposing Healthcare lifecycle or clinical results;
16. accessibility, sound, vibration, and motion;
17. avoiding accidental T0 activation without slowing genuine emergencies.

The design must preserve the principle:

> T0 is an emergency event and bypasses normal T1/T2/T3 scoring, but it is still a T0-Suspect until Healthcare performs secondary/clinical validation.
