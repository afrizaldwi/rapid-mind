# RAPID-MIND Final Screen Inventory & Implementation Handoff

**Status:** Final pre-development UI/UX handoff  
**Date:** 29 September 2026  
**Scope:** Competition MVP / prototype implementation  
**Product:** RAPID-MIND  
**Primary audience:** implementation team / coding agent / UI engineer  
**Language rule:** This handoff is written in English. All user-facing RAPID-MIND UI copy remains **Bahasa Indonesia** unless a future requirement explicitly changes that.

---

# 0. Purpose and Authority

This document consolidates the agreed RAPID-MIND UI/UX decisions into one implementation-oriented reference.

It is intended to answer:

- which route-level screens exist;
- which interactions are overlays, sheets, drawers, dialogs, or nested workspace states rather than pages;
- how the three roles navigate;
- which cross-role UI primitives should be shared;
- which system states every major surface must represent;
- which features are required for the competition MVP;
- which features are explicitly deferred;
- what each screen depends on technically;
- in what order implementation should proceed;
- which older requirements are superseded by later, more specific decisions.

The source material used to derive this handoff is:

1. `RAPID_MIND_TECHNICAL_PLAN.md`
2. `workflow.md`
3. `RAPID_MIND_VISUAL_FOUNDATION.md`
4. `RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md`
5. `RAPID_MIND_T0_EMERGENCY_INTERACTION.md`
6. `RAPID_MIND_HEALTHCARE_WORKSPACE.md`
7. `RAPID_MIND_REFERRAL_RESPONSE_INTERACTION.md`
8. `RAPID_MIND_ADMIN_WORKSPACE.md`
9. `RAPID_MIND_AUTH_PROVISIONING.md`
10. `RAPID_MIND_SHARED_SYSTEM_STATES_INTERACTIONS.md`

## 0.1 Authority order

When requirements conflict, use this order:

1. **Explicit decisions in this handoff**
2. The dedicated detailed UX document for that domain
3. The visual/shared-state foundations
4. `RAPID_MIND_TECHNICAL_PLAN.md`
5. `workflow.md` when an older workflow statement conflicts with a later explicit implementation decision

`workflow.md` remains authoritative for product/business intent, but older implementation assumptions in it must not override later dedicated UX or technical decisions.

## 0.2 Locked product model

RAPID-MIND is:

- one product;
- one repository;
- one Laravel application;
- one user-facing website/PWA;
- three role-specific experiences.

Canonical roles:

```text
ADMIN
RELAWAN
HEALTHCARE
```

There is **no `HOSPITAL` role**.

Organization model:

```text
1 Healthcare/Faskes organization
→ many Healthcare users

1 Healthcare user
→ 1 primary Healthcare/Faskes organization
```

Admin is the normal account-provisioning authority.

## 0.3 Locked technical baseline

The intended architecture remains:

```text
Laravel 13
Vue 3
Inertia.js
TypeScript
Tailwind CSS
PostgreSQL + PostGIS
JWT access + refresh authentication
Laravel Reverb / Echo
IndexedDB + Dexie
PWA / Workbox
MapLibre
ECharts
```

Relawan is mobile-first and offline/local-first.

Healthcare and Admin are desktop-oriented server-backed workspaces. Their mutations must not be treated as generic offline-first writes.

## 0.4 Locked shared-state model

The following are independent concepts and must never be collapsed into one generic status:

```text
Domain state
Data durability
Server commit / synchronization
Connectivity / realtime freshness
Authentication
Action state
```

In particular:

```text
Local persistence
≠ Server acceptance
≠ Synchronization
≠ Realtime freshness
```

Canonical Relawan data-state copy:

```text
Menyimpan di perangkat…
Tersimpan di perangkat
Menunggu sinkronisasi
Menyinkronkan
Tersinkron
Sinkronisasi belum berhasil
Data belum tersimpan di perangkat
```

Healthcare/Admin success copy such as:

```text
Perubahan tersimpan
```

must only appear after server confirmation.

---

# 1. Explicit Final Overrides

These decisions supersede contradictory or older statements elsewhere.

## 1.1 STT is MVP-required

Speech-to-text is one of RAPID-MIND's main project features and **must not be deferred**.

For SRQ-20 verbal mode:

```text
Mode Verbal
→ Relawan explicitly starts voice interview
→ one continuous STT session for the full SRQ-20 interview
→ transcript / interpretation may propose structured answers
→ uncertain interpretation may remain unresolved
→ Relawan can confirm or manually override
→ structured manual answer is authoritative
```

Required properties:

- one STT session for the full SRQ-20 verbal interview;
- no microphone button on every question;
- SRQ questions remain visible as interview guidance;
- STT is assistive, not authoritative;
- manual `YA / TIDAK` remains available at all times;
- STT failure must never block completion of SRQ-20;
- uncertain STT interpretation must not be silently coerced into `YA` or `TIDAK`;
- Q17 safety behavior remains independent of STT reliability.

The Technical Plan entry that previously listed speech-to-text as deferred is superseded.

## 1.2 Simplified password/account lifecycle for current MVP

For the current competition prototype:

```text
Admin creates account
→ Admin sets default/initial password
→ User logs in using that password
→ User directly enters role workspace
```

Deferred:

- first-login forced password initialization;
- user-initiated change-password flow;
- reauthentication UX;
- dedicated inactive/revoked-account UX;
- logout-all-devices UI;
- session/device-management UI;
- password recovery;
- advanced credential-reset lifecycle.

Backend RBAC remains required.

Admin still controls account provisioning.

A default password created by Admin is an accepted prototype tradeoff and is **not** to be represented as production-grade credential lifecycle design.

## 1.3 T0 offline SMS behavior

Do **not** implement or claim verified automatic silent SMS transmission from the PWA.

The current interaction contract is:

```text
T0 saved locally
→ normal network sync attempted
→ if applicable, app may open native SMS composer / handoff
→ user/device messaging application handles actual sending
```

The product may say that the SMS composer was opened.

It must **not** claim:

```text
SMS berhasil dikirim
```

unless the system has actual confirmation.

## 1.4 Tele-emergency method does not imply integrated calling engine

Healthcare may record a verification method such as:

```text
Telepon
Video
Langsung / Tim Lapangan
```

This does not require an integrated voice/video calling engine in the MVP.

## 1.5 Non-T0 Healthcare clinical validation

`workflow.md` explicitly allows Healthcare to perform clinical validation, enter medical diagnosis notes, define an intervention/follow-up plan, and issue referrals.

However, no approved diagnostic taxonomy is defined.

Therefore the MVP supports:

```text
Status tindak lanjut
Catatan diagnosis medis
Catatan klinis
Rencana intervensi / tindak lanjut
Rujukan diperlukan: Ya / Tidak
```

Rules:

- `Catatan diagnosis medis` is free text;
- do not invent a PTSD/depression/ASD/GAD diagnosis selector;
- do not introduce unsupported diagnostic scoring;
- system recommendation and clinical result must remain distinguishable.

## 1.6 Fungsi Harian component

Fungsi Harian contains three domains on one page.

Each domain uses:

- large full-width selectable rows/cards;
- radio-style single selection per domain;
- clear selected state;
- touch-friendly spacing;
- no dropdown.

## 1.7 Relawan Data workspace

`Data` is the Relawan operational data area.

It must **not** become a separate patient-management/EMR module.

Core groupings:

```text
Sedang Dikerjakan / Belum Selesai
Menunggu Sinkronisasi
Tersinkron
```

A contextual patient/detail view may show:

- identity;
- available assessment history;
- local/remote status;
- related T0 incidents;
- timestamps;
- synchronization state.

Completed assessment records are read-only in normal Relawan flow.

## 1.8 Resource needs ownership

There is no fourth Posko user role.

For the MVP:

```text
Admin records/updates a Posko resource need
→ Admin sees the need
→ Admin records allocation
```

This is intentionally limited to:

```text
resource needs
+
resource allocation records
```

Do not expand it into inventory, warehouse, procurement, supplier, purchase-order, or fleet software.

---

# A. Final Screen Inventory

# A1. Shared / Authentication Surfaces

## A1.1 Universal Login

**Route**

```text
/login
```

**Type:** route-level page  
**MVP:** REQUIRED

### Purpose

One login surface for all three roles.

### Fields

```text
Email / username
Kata sandi
Masuk
```

Do not include:

- role selector;
- organization selector;
- public registration;
- social login;
- "remember me" requirement;
- password-reset flow in the current MVP.

### Successful routing

```text
ADMIN       → /admin/summary
RELAWAN     → /relawan/home
HEALTHCARE  → /healthcare/emergencies
```

### Required states

- idle;
- submitting;
- invalid credentials;
- server unavailable;
- network unavailable;
- access denied due to invalid role/configuration;
- successful redirect.

For fresh login, offline authentication should not pretend to succeed if no valid offline eligibility/context exists.

---

## A1.2 Access Denied

**Route:** not a primary navigation destination  
**Type:** full-page application state  
**MVP:** SUPPORTING

Used for:

- wrong-role route access;
- forbidden resource;
- invalid account/workspace configuration where a simple login redirect would hide the problem.

Keep this generic. Do not build a large account-security workflow around it.

---

## A1.3 Profile / Account Menu

**Route:** no dedicated route required for MVP  
**Type:** shell menu / popover / sheet  
**MVP:** SUPPORTING

Minimal content:

```text
Nama
Role
Posko or Faskes context where applicable
Logout
```

Deferred from this menu:

```text
Ubah kata sandi
Logout semua perangkat
Daftar sesi/perangkat
Kelola kredensial
```

For Relawan mobile, use an appropriate sheet/menu.

For Healthcare/Admin desktop, use a compact profile menu.

---

# A2. Relawan Screen Inventory

## A2.0 Relawan Global Shell

Primary destinations:

```text
Beranda
PFA
Asesmen
Data
```

Persistent emergency access:

```text
T0 DARURAT
```

T0 is **not** a fifth bottom-navigation item.

The T0 control must remain quickly reachable throughout the normal Relawan experience except `/login`.

During focused assessment tasks, global navigation may be visually reduced, but T0 remains available.

---

## A2.1 Beranda

**Route**

```text
/relawan/home
```

**Type:** route-level page  
**MVP:** REQUIRED

### Responsibilities

- current Relawan/Posko context;
- resume incomplete work;
- quick entry to PFA;
- quick entry to Asesmen;
- operational data/sync summary;
- important active T0 context when relevant.

### Required states

- online;
- offline but locally operational;
- pending synchronization;
- sync failure;
- local persistence failure;
- no unfinished work;
- one or multiple unfinished records.

Do not make the page an analytics dashboard.

---

## A2.2 PFA Guide

**Route**

```text
/relawan/pfa
```

**Type:** route-level page with internal sections  
**MVP:** REQUIRED

### Internal content

```text
LOOK
LISTEN
LINK
```

PFA is an interactive guide, not a complex data-entry form.

Do not create separate global routes for every PFA card unless later implementation proves a route is necessary for deep-link/resume behavior.

T0 remains persistent.

---

## A2.3 Assessment Entry

**Route**

```text
/relawan/assessment
```

**Type:** route-level page  
**MVP:** REQUIRED

### Responsibilities

- start a new assessment;
- resume an incomplete assessment;
- establish/select patient identity context before structured assessment;
- show unfinished assessment candidates without turning into a full Data workspace.

Assessment sequence:

```text
Identitas Penyintas
→ SRQ-20
→ Faktor Risiko
→ Fungsi Harian
→ Tinjau
→ Hasil Rekomendasi
```

---

## A2.4 Assessment — Identity

**Route**

```text
/relawan/assessment/:assessmentId/identity
```

**Type:** nested focused task page  
**MVP:** REQUIRED

### Responsibilities

- identify existing patient if available;
- create/record new patient identity where allowed;
- retain stable UUID/local identity;
- work from cached/local patient information when offline;
- avoid accidental duplicate creation.

Every meaningful change must be locally persisted.

---

## A2.5 Assessment — SRQ-20

**Route**

```text
/relawan/assessment/:assessmentId/srq
```

**Type:** nested focused task page  
**MVP:** REQUIRED

### Layout

One scrollable SRQ-20 page.

Do not create 20 separate routes.

Required interaction mode control:

```text
Verbal
Non-Verbal
```

Manual structured answers:

```text
YA
TIDAK
```

### Verbal STT mode

MVP-required.

Use one continuous interview session:

```text
Mulai Wawancara Suara
→ STT active
→ interview proceeds naturally
→ transcript/interpretation updates suggested answers
```

Requirements:

- manual answer remains authoritative;
- existing answers remain intact when mode changes;
- changing Verbal/Non-Verbal does not require confirmation if no data is destroyed;
- uncertain STT result must remain visibly unresolved;
- STT unavailable → manual workflow continues;
- do not block SRQ completion because STT fails.

### Q17 safety interruption

If Q17 or other detected content raises a potential Red Flag:

- interrupt the ordinary assessment flow;
- show Potential Red Flag safety surface;
- do not silently create/transmit T0;
- require T0 verification gates before T0-Suspect creation.

---

## A2.6 Assessment — Faktor Risiko

**Route**

```text
/relawan/assessment/:assessmentId/risk
```

**Type:** nested focused task page  
**MVP:** REQUIRED

### Layout

Five risk-factor items on one page.

Use large touch targets.

Persist locally after every answer.

---

## A2.7 Assessment — Fungsi Harian

**Route**

```text
/relawan/assessment/:assessmentId/function
```

**Type:** nested focused task page  
**MVP:** REQUIRED

### Layout

Three domains on one page.

Each domain:

```text
Domain title
[ full-width choice ]
[ full-width choice ]
[ full-width choice ]
...
```

Single selection per domain.

Do not use dropdowns.

Persist locally immediately.

---

## A2.8 Assessment — Tinjau

**Route**

```text
/relawan/assessment/:assessmentId/review
```

**Type:** nested focused task page  
**MVP:** REQUIRED

### Responsibilities

Review before final recommendation:

- identity;
- SRQ-20 completeness;
- risk factors;
- function;
- unresolved STT items;
- relevant safety warnings.

The page must not make a final clinical diagnosis.

---

## A2.9 Assessment — Hasil Rekomendasi

**Route**

```text
/relawan/assessment/:assessmentId/result
```

**Type:** nested route-level result page  
**MVP:** REQUIRED

### Responsibilities

Show:

- system-computed recommendation;
- relevant score/basis;
- triage recommendation T1/T2/T3;
- clear interpretation;
- explicit disclaimer that this is decision support pending Healthcare clinical validation;
- local save state;
- synchronization state.

Do not present the recommendation as a final diagnosis.

Completed result is normally read-only.

---

## A2.10 Data

**Route**

```text
/relawan/data
```

**Type:** route-level operational workspace  
**MVP:** REQUIRED

### Primary groupings

```text
Sedang Dikerjakan / Belum Selesai
Menunggu Sinkronisasi
Tersinkron
```

### Responsibilities

- resume incomplete work;
- inspect pending sync;
- inspect synchronized local records;
- retry synchronization when appropriate;
- surface T0 priority records;
- separate local safety from remote synchronization.

Do not split this into global:

```text
Pasien
Riwayat
Sinkronisasi
```

tabs.

---

## A2.11 Relawan Patient / Data Detail

**Route**

```text
/relawan/data/patients/:patientId
```

**Type:** supporting route-level detail  
**MVP:** SUPPORTING

### Minimum content

```text
Identitas penyintas
Riwayat asesmen yang tersedia
Status asesmen
T0 terkait, jika ada
Waktu terakhir diperbarui
Status sinkronisasi
```

This is an operational field-data detail, not an EMR.

Do not add broad patient-management CRUD.

---

## A2.12 Potential Red Flag Interruption

**Route:** none  
**Type:** blocking overlay / focused safety surface  
**MVP:** REQUIRED

Triggered by:

- Q17 safety indication;
- STT-detected potential safety indication;
- manual Red Flag discovery during assessment.

Purpose:

```text
Potential danger detected
→ stop ordinary flow
→ explain concern
→ offer entry into T0 verification
```

Do not transmit T0 from this surface automatically.

---

## A2.13 T0 Verification

**Route:** none before event creation  
**Type:** full-height task sheet / effectively full-screen mobile task surface  
**MVP:** REQUIRED

Do not implement as a tiny confirmation dialog.

### Three verification groups

```text
1. Penyintas
2. Alasan Darurat
3. Lokasi & Kirim
```

Patient may be:

- selected known patient;
- newly identified;
- unidentified when the situation requires immediate action.

Location fallback order:

```text
GPS
→ assigned Posko
→ manual location
```

Failure to acquire GPS must not block T0.

First tap on the persistent T0 control must not transmit anything.

---

## A2.14 T0 Patient Selector

**Route:** none  
**Type:** secondary sheet/picker inside T0 verification  
**MVP:** REQUIRED

Must support:

- search/select patient;
- use current assessment patient;
- unidentified patient;
- return to T0 verification without losing entered emergency data.

---

## A2.15 T0 Local Commit / Transmission Transition

**Route:** none as a stable destination  
**Type:** short-lived task state  
**MVP:** REQUIRED

Correct sequence:

```text
validate required emergency input
→ create T0-Suspect locally
→ persist to IndexedDB
→ enqueue high-priority outbox item
→ then attempt server transmission
```

The UI must distinguish:

```text
Menyimpan di perangkat…
Tersimpan di perangkat
Menunggu sinkronisasi
Menyinkronkan
Tersinkron
Sinkronisasi belum berhasil
Data belum tersimpan di perangkat
```

Do not show remote success before server confirmation.

---

## A2.16 Active T0-Suspect Incident

**Route**

```text
/relawan/emergencies/:emergencyId
```

**Type:** route-level persistent incident screen  
**MVP:** REQUIRED

### Why it is a route

Once the emergency exists locally, it must be recoverable after:

- app navigation;
- refresh;
- browser restart;
- offline continuation.

### Content

- patient identity or unidentified status;
- Red Flag reasons;
- created time;
- location;
- local persistence state;
- network transmission state;
- SMS handoff state if used;
- safety instructions;
- interrupted assessment reference.

These are separate Relawan-facing concepts:

```text
Original T0-Suspect report
Transmission/sync state
```

Do not expose Healthcare acknowledgement, review, clinical validation, confirmation, downgrade, resolution, referral, or dispatch progression through this screen or its payload.

Assessment is suspended, not deleted.

Do not automatically resume it after T0 resolution.

---

## A2.17 T0 Change / Input Error Report

**Route:** none  
**Type:** sheet / form attached to active incident  
**MVP:** SUPPORTING

A created T0 must not simply be deleted.

If entered accidentally or circumstances change:

- append an audited correction/update;
- preserve creation history;
- if offline creation later proves incorrect, synchronize both creation and correction/retraction history as required by the domain model.

---

## A2.18 Relawan Status Data Sheet

**Route:** none  
**Type:** bottom sheet  
**MVP:** REQUIRED

Opened from compact operational status control.

Shows:

- number of records pending;
- active syncing;
- failed sync;
- locally safe/offline condition;
- retry action where appropriate;
- local persistence failure as a higher-severity condition.

---

## A2.19 Leave Assessment Confirmation

**Route:** none  
**Type:** confirmation sheet/dialog  
**MVP:** SUPPORTING

Message must explain that progress has already been saved locally.

Do not use conventional:

```text
Perubahan belum disimpan
```

if the data is actually locally persisted.

---

# A3. Healthcare Screen Inventory

Healthcare is a desktop-oriented operational workspace with four permanent destinations:

```text
Darurat
Validasi
Rujukan
Pasien
```

Landing destination:

```text
Darurat
```

Healthcare mutations require server confirmation.

Healthcare must not offer generic offline queued mutations.

---

## A3.1 Darurat Worklist

**Route**

```text
/healthcare/emergencies
```

**Type:** route-level workspace  
**MVP:** REQUIRED

### Main layout

```text
Emergency queue
+
focused incident workspace
+
adaptive contextual rail
```

Queue groups:

```text
Perlu Respons
Sedang Ditangani
Tindak Lanjut
```

Default prioritization:

```text
T0 first
→ unacknowledged first
→ oldest emergency first
```

Do not invent ranking between Red Flag categories.

Opening an incident does not acknowledge it.

---

## A3.2 Selected Emergency Incident

**Route**

```text
/healthcare/emergencies/:emergencyId
```

**Type:** route-backed selected workspace state  
**MVP:** REQUIRED

### Workspace content

- emergency summary;
- patient identity;
- Relawan/Posko context;
- emergency reasons;
- location;
- event creation time;
- server receipt time;
- latest assessment/clinical context;
- timeline/history;
- acknowledgement;
- secondary verification;
- clinical decision;
- referral;
- field response/dispatch.

### Handling lifecycle

```text
Belum diakui
→ Sudah diakui
→ Sedang ditinjau
```

This is separate from clinical classification.

### Clinical lifecycle

```text
T0-Suspect
→ T0-confirmed
OR
→ T1
OR
→ T2
```

No T3 downgrade option from a T0 emergency verification.

---

## A3.3 New T0 Alert

**Route:** none  
**Type:** persistent notification/alert state  
**MVP:** REQUIRED

Behavior:

- finite audio signal;
- visible emergency indication;
- queue badge/count;
- no indefinite alarm loop;
- no forced focus-stealing navigation.

The new incident should enter the queue in realtime.

---

## A3.4 Acknowledge Incident

**Route:** none  
**Type:** high-priority action state inside selected incident  
**MVP:** REQUIRED

Explicit action:

```text
AKUI KASUS
```

Opening or viewing is not equivalent to acknowledgement.

Server confirmation required.

---

## A3.5 Secondary Verification

**Route:** none  
**Type:** focused panel/workspace section  
**MVP:** REQUIRED

Explicit action to begin:

```text
MULAI VERIFIKASI SEKUNDER
```

Verification method options may include:

```text
Telepon
Video
Langsung / Tim Lapangan
```

Supporting fields:

```text
Catatan verifikasi
```

Do not invent unsupported clinical checklists.

Do not imply integrated video calling merely because `Video` can be recorded as a method.

---

## A3.6 T0 Clinical Decision

**Route:** none  
**Type:** high-impact decision panel  
**MVP:** REQUIRED

Choices:

```text
T0-confirmed
T1
T2
```

Server-confirmed action.

A T0-confirmed decision does not automatically equal completed referral or completed dispatch.

---

## A3.7 Referral Creation From Emergency

**Route:** none  
**Type:** drawer/panel/form attached to incident  
**MVP:** REQUIRED

Referral destination is selected from Admin-managed active Healthcare/Faskes organizations.

Referral lifecycle:

```text
No referral
→ Aktif
→ Selesai
```

Do not invent:

- accepted;
- rejected;
- bed reserved;
- physician acceptance;
- inter-hospital transfer lifecycle.

---

## A3.8 Field Response / Dispatch

**Route:** none  
**Type:** panel attached to active incident  
**MVP:** REQUIRED

Select a preconfigured response team/unit.

Lifecycle:

```text
No dispatch
→ Ditugaskan
→ Menuju lokasi
→ Tiba di lokasi
→ Transportasi
→ Selesai
```

The transport stage should be implementable as an optional branch where operationally appropriate; do not assume every dispatch necessarily transports the patient.

Do not create response-team CRUD in Healthcare or Admin for this MVP.

---

## A3.9 Validasi Worklist

**Route**

```text
/healthcare/validations
```

**Type:** route-level worklist  
**MVP:** REQUIRED

### Internal worklist states

```text
Perlu Divalidasi
Sedang Ditinjau
Selesai
```

Priority behavior:

- T1 should appear as active validation priority;
- T2 is lower priority;
- T3 remains in patient history and does not require a prominent validation worklist unless future policy changes.

This is an operational queue, not analytics.

---

## A3.10 Selected Validation

**Route**

```text
/healthcare/validations/:assessmentId
```

**Type:** route-backed selected work item  
**MVP:** REQUIRED

Using `assessmentId` is appropriate because a validation may not yet have a separate validation record before Healthcare begins.

### Required content

- patient identity;
- system recommendation;
- SRQ-20 result/detail;
- risk-factor result/detail;
- function result/detail;
- explanation/basis for recommendation;
- previous relevant patient history;
- Healthcare validation input.

### Validation input

```text
Status tindak lanjut
Catatan diagnosis medis
Catatan klinis
Rencana intervensi / tindak lanjut
Rujukan diperlukan: Ya / Tidak
```

Do not invent a diagnostic taxonomy.

Do not present system recommendation as Healthcare diagnosis.

---

## A3.11 Rujukan Worklist

**Route**

```text
/healthcare/referrals
```

**Type:** route-level worklist  
**MVP:** REQUIRED

Primary states:

```text
Aktif
Selesai
```

This is a global operational referral view.

Patient-specific referral history belongs inside the patient workspace.

---

## A3.12 Referral Detail

**Route**

```text
/healthcare/referrals/:referralId
```

**Type:** route-level detail  
**MVP:** REQUIRED

Content:

- patient;
- source clinical context;
- destination organization/facility;
- referral state;
- timestamps;
- actor/history;
- linked emergency if any;
- linked dispatch if any.

Completion must be server confirmed.

---

## A3.13 Pasien List

**Route**

```text
/healthcare/patients
```

**Type:** route-level list/workspace  
**MVP:** REQUIRED

Search and list patient records.

Do not attempt to become a full hospital EMR.

---

## A3.14 Patient Workspace

**Route**

```text
/healthcare/patients/:patientId
```

**Type:** route-level longitudinal workspace  
**MVP:** REQUIRED

Internal sections:

```text
Ringkasan
Asesmen
Darurat
Validasi
Rujukan
```

These are nested sections/tabs, not five new primary navigation routes.

### Rules

- assessments are chronological and immutable as historical submissions;
- T0 incidents remain distinct emergency events;
- Healthcare-entered validation remains distinguishable from system recommendation;
- referral history is longitudinal;
- patient workspace is broader than Relawan Data detail but still not a complete EMR.

---

## A3.15 Healthcare Conflict Notice

**Route:** none  
**Type:** blocking inline/panel/dialog state  
**MVP:** REQUIRED

Used when:

- another Healthcare user changed the same incident/validation/referral;
- the current data version is stale;
- a high-impact mutation must not overwrite newer server state.

Behavior:

```text
block stale mutation
→ explain record changed
→ refresh/reconcile
→ require renewed user intent
```

Do not silently overwrite.

---

## A3.16 Healthcare Connection / Realtime Banners

**Route:** none  
**Type:** persistent banner  
**MVP:** REQUIRED

Separate:

```text
Realtime terputus
Server tidak tersedia
Data mungkin tidak terbaru
```

Do not claim offline operational mutations are safe.

---

# A4. Admin Screen Inventory

Admin permanent navigation:

```text
Ringkasan
Relawan
Faskes
Operasional
```

Admin is desktop-optimized.

Admin may work on tablet/laptop widths, but is not a mobile-first field application.

---

## A4.1 Ringkasan

**Route**

```text
/admin/summary
```

**Type:** route-level command-center workspace  
**MVP:** REQUIRED

### Responsibilities

- geospatial overview;
- T0–T3 distribution;
- assessment volume;
- Posko/region patterns;
- dominant risk-factor aggregates;
- 30-day trends;
- global filters;
- contextual export.

Map and analytics remain one workspace.

Do **not** split permanent navigation into separate:

```text
Peta
Analitik
```

### Geographic behavior

Default drill-down should be area/Posko-based.

Do not make patient-level clinical details the Admin map's default interaction.

---

## A4.2 Posko Geographic Drill-down

**Route:** none required  
**Type:** side panel/drawer from Ringkasan  
**MVP:** REQUIRED

Show aggregate Posko information.

Do not expose unnecessary patient-level clinical details.

---

## A4.3 Relawan Roster

**Route**

```text
/admin/volunteers
```

**Type:** route-level management table  
**MVP:** REQUIRED

Capabilities:

- view Relawan;
- search/filter;
- create account;
- inspect status/context;
- assign/reassign Posko;
- activate/deactivate if included in current implementation scope.

Use server-confirmed mutations.

---

## A4.4 Create Relawan

**Route**

```text
/admin/volunteers/create
```

**Type:** route-level form  
**MVP:** REQUIRED

Minimum fields:

```text
Nama
Email / username
Posko awal
Status akun
Kata sandi awal
Konfirmasi kata sandi
```

No role selector.

No public registration.

On success, show account summary.

No mandatory first-login password-change state.

---

## A4.5 Relawan Detail

**Route**

```text
/admin/volunteers/:volunteerId
```

**Type:** route-level detail  
**MVP:** REQUIRED

Content:

- profile;
- account status;
- current Posko;
- Posko assignment history;
- operational metadata needed for management.

Do not turn into an HR system.

---

## A4.6 Relawan Posko Reassignment

**Route:** none  
**Type:** dialog/drawer from Relawan detail  
**MVP:** REQUIRED

Must modify current/future assignment context while preserving historical records.

Server confirmation required.

---

## A4.7 Faskes — Organization Registry

**Route**

```text
/admin/facilities/organizations
```

**Type:** route-level management table  
**MVP:** REQUIRED

Minimum organization/facility data:

```text
Nama
Tipe
Alamat / lokasi
Region
Koordinat
Status
```

Inactive facilities:

- cannot receive new referrals;
- cannot receive new Healthcare associations.

For the MVP, deactivation should be blocked while active Healthcare users remain assigned.

---

## A4.8 Create Organization / Facility

**Route**

```text
/admin/facilities/organizations/create
```

**Type:** route-level form  
**MVP:** REQUIRED

Server-confirmed create operation.

---

## A4.9 Organization / Facility Detail

**Route**

```text
/admin/facilities/organizations/:organizationId
```

**Type:** route-level detail  
**MVP:** REQUIRED

Content:

- facility data;
- status;
- location;
- associated Healthcare users;
- entity-level change history where available.

Do not create a global enterprise audit console.

---

## A4.10 Faskes — Healthcare User Roster

**Route**

```text
/admin/facilities/users
```

**Type:** route-level management table  
**MVP:** REQUIRED

Capabilities:

- view Healthcare users;
- search/filter;
- create Healthcare account;
- inspect primary organization;
- activate/deactivate if included;
- change organization association.

---

## A4.11 Create Healthcare User

**Route**

```text
/admin/facilities/users/create
```

**Type:** route-level form  
**MVP:** REQUIRED

Minimum fields:

```text
Nama
Email / username
Faskes / organisasi
Status akun
Kata sandi awal
Konfirmasi kata sandi
```

No role selector.

No separate Hospital role.

No first-login forced password change.

---

## A4.12 Healthcare User Detail

**Route**

```text
/admin/facilities/users/:userId
```

**Type:** route-level detail  
**MVP:** REQUIRED

Content:

- profile;
- status;
- primary Healthcare/Faskes organization;
- relevant entity-level history.

---

## A4.13 Operasional — Posko List

**Route**

```text
/admin/operations/posko
```

**Type:** route-level management table  
**MVP:** REQUIRED

Minimum Posko data:

```text
Nama
Region
Alamat / lokasi
Koordinat
Status
```

---

## A4.14 Create Posko

**Route**

```text
/admin/operations/posko/create
```

**Type:** route-level form  
**MVP:** REQUIRED

Server-confirmed create operation.

---

## A4.15 Posko Detail

**Route**

```text
/admin/operations/posko/:poskoId
```

**Type:** route-level detail  
**MVP:** REQUIRED

Content may include:

- Posko profile;
- coordinates;
- active/inactive state;
- current Relawan distribution;
- resource needs;
- resource allocations;
- entity-level history.

---

## A4.16 Operasional — Sumber Daya

**Route**

```text
/admin/operations/resources
```

**Type:** route-level operational workspace  
**MVP:** REQUIRED

Two concepts only:

```text
Kebutuhan
Alokasi
```

Minimum need data:

```text
Posko
Jenis sumber daya
Jumlah dibutuhkan
Catatan kebutuhan
Pembaruan terakhir
```

Minimum allocation data:

```text
Posko
Jenis sumber daya
Jumlah dialokasikan
Waktu alokasi
Admin actor
```

Admin may create/update a need on behalf of Posko.

Do not add:

- supplier management;
- purchase order;
- warehouse receiving;
- procurement approval;
- fleet management;
- inventory accounting.

---

## A4.17 Admin Management Confirmations

**Route:** none  
**Type:** confirmation dialogs  
**MVP:** SUPPORTING

Appropriate for consequential actions such as:

- deactivate account;
- deactivate facility;
- reassign Relawan;
- change Healthcare organization;
- terminal operational state where relevant.

Do not show confirmation dialogs for harmless navigation/filter changes.

---

## A4.18 Admin Realtime / Server State Banners

**Route:** none  
**Type:** persistent status banners  
**MVP:** REQUIRED

Needed especially on:

- Ringkasan realtime map/aggregates;
- operational summaries.

Separate:

```text
Realtime terputus
Server tidak tersedia
Data mungkin tidak terbaru
```

Normal CRUD tables do not need fake realtime behavior if they are not realtime-backed.

---

# B. Route & Navigation Tree

The following is the recommended implementation route tree.

Internal URL naming may remain English while visible navigation labels remain Bahasa Indonesia.

```text
/login

/relawan
  → redirect /relawan/home

/relawan/home
/relawan/pfa
/relawan/assessment
/relawan/assessment/:assessmentId/identity
/relawan/assessment/:assessmentId/srq
/relawan/assessment/:assessmentId/risk
/relawan/assessment/:assessmentId/function
/relawan/assessment/:assessmentId/review
/relawan/assessment/:assessmentId/result
/relawan/data
/relawan/data/patients/:patientId
/relawan/emergencies/:emergencyId

/healthcare
  → redirect /healthcare/emergencies

/healthcare/emergencies
/healthcare/emergencies/:emergencyId
/healthcare/validations
/healthcare/validations/:assessmentId
/healthcare/referrals
/healthcare/referrals/:referralId
/healthcare/patients
/healthcare/patients/:patientId

/admin
  → redirect /admin/summary

/admin/summary
/admin/volunteers
/admin/volunteers/create
/admin/volunteers/:volunteerId
/admin/facilities/organizations
/admin/facilities/organizations/create
/admin/facilities/organizations/:organizationId
/admin/facilities/users
/admin/facilities/users/create
/admin/facilities/users/:userId
/admin/operations/posko
/admin/operations/posko/create
/admin/operations/posko/:poskoId
/admin/operations/resources
```

## B1. Explicitly not route-level pages

The following should remain contextual surfaces unless future technical constraints require otherwise:

```text
Relawan Status Data sheet
Potential Red Flag interruption
T0 verification
T0 patient selector
T0 local commit/transmission transition
T0 correction/report sheet
Leave-assessment confirmation

Healthcare new-T0 alert
Acknowledge state
Secondary verification panel
T0 decision panel
Referral creation form from incident
Field-response/dispatch panel
Concurrency conflict notice

Admin Posko map drill-down
Relawan reassignment dialog
Management confirmations
Profile/account menu
```

## B2. URL/query-state guidance

List filters should use stable URL/query state where useful.

Examples:

```text
/relawan/data?status=pending
/healthcare/validations?state=pending&priority=T1
/healthcare/referrals?state=active
/admin/summary?region=...&posko=...&period=...&triage=...
```

For desktop worklists:

- preserve filters when opening a detail;
- preserve search where reasonable;
- preserve scroll position when returning to the list;
- deep-linked detail routes must still render without first visiting the list.

---

# C. Shared Implementation Primitives

Create a shared primitive only where at least two concrete uses justify consistent behavior.

Do not over-generalize role-specific operational patterns.

## C1. Recommended shared primitives

### 1. `OperationalStatusBanner`

Use for:

- Healthcare realtime disconnected/server unavailable/stale data;
- Admin realtime disconnected/server unavailable/stale data.

Do not use it as Relawan's sync model.

---

### 2. `SystemEmptyState`

Use for:

- empty Healthcare queues;
- empty Admin tables;
- empty Relawan data groups where appropriate.

Must explain what the empty state means operationally.

---

### 3. `FormField` / `InlineFormError`

Use across:

- Admin provisioning;
- Admin master-data forms;
- Healthcare validation/referral forms.

Preserve entered values when validation fails.

---

### 4. `ConfirmActionDialog`

Use for consequential actions across Healthcare/Admin and for selected Relawan exits.

Do not use for every button.

---

### 5. `DirtyFormGuard`

Use for server-backed Healthcare/Admin forms where unsaved input could be lost.

Do **not** use the same semantics for Relawan locally persisted assessment answers.

---

### 6. `ServerMutationAction`

A consistent action-state primitive for Healthcare/Admin:

```text
idle
submitting
server-confirmed success
validation failure
server failure
conflict
```

Must not show success before confirmation.

---

### 7. `RelawanDataStatus`

Dedicated local/sync primitive for Relawan.

Must represent:

```text
saving locally
saved locally
pending sync
syncing
synced
sync failed
local persistence failed
offline
```

Do not reuse a generic online/offline badge.

---

### 8. `TriageBadge`

Use for T0/T1/T2/T3 classification display.

Requirements:

- textual label;
- color is secondary;
- no color-only meaning;
- T0 visually/structurally distinct.

Do not use the triage badge for sync/handling/referral status.

---

### 9. `MaskedPatientIdentity`

Use where full identity is not operationally necessary.

Especially useful in:

- Admin aggregate surfaces;
- queue summaries;
- compact cards.

---

### 10. `TimelineEventRow`

Use for:

- Healthcare emergency history;
- referral history;
- patient longitudinal event history;
- Admin entity-level change history where appropriate.

Keep event types explicit.

---

### 11. `DesktopWorklistTable`

Use for:

- Healthcare Validasi;
- Healthcare Rujukan;
- Healthcare Pasien;
- Admin Relawan;
- Admin Healthcare users;
- Admin facilities;
- Admin Posko;
- Admin resources.

Do not force the same table component onto Relawan mobile Data.

---

### 12. `SearchablePatientSelector`

Use for:

- Relawan assessment identity;
- Relawan T0 patient selection;
- Healthcare patient linking where needed.

Must support offline/local data in Relawan contexts.

---

### 13. `ConcurrencyConflictNotice`

Use for Healthcare/Admin server-backed mutation conflicts.

Required behavior:

```text
record changed
→ block stale action
→ refresh/reconcile
→ renewed intent
```

---

## C2. Explicit anti-pattern: generic `StatusBadge`

Do not create one universal status component that visually merges:

- triage;
- local durability;
- sync;
- realtime;
- incident handling;
- referral;
- dispatch;
- account state.

These dimensions have different semantics and different safety consequences.

---

# D. State Coverage Matrix

Legend:

```text
CORE       = must be directly implemented and deliberately designed
SUPPORT    = required supporting state
N/A        = not meaningful for that surface
DEFERRED   = intentionally not implemented in this MVP
```

| Surface | Loading | Empty | Local save | Sync | Offline | Realtime stale/disconnect | Server failure | Auth failure | Conflict | Dirty form | Recovery |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Login | CORE | N/A | N/A | N/A | CORE | N/A | CORE | CORE | N/A | SUPPORT | retry login |
| Relawan Beranda | CORE | SUPPORT | SUPPORT | CORE | CORE | N/A | SUPPORT | SUPPORT | N/A | N/A | resume/sync |
| Relawan PFA | CORE | N/A | optional local state | SUPPORT | CORE | N/A | SUPPORT | SUPPORT | N/A | N/A | continue offline |
| Assessment Identity | CORE | SUPPORT | CORE | CORE | CORE | N/A | SUPPORT | SUPPORT | local duplicate handling | N/A | resume |
| SRQ-20 | CORE | N/A | CORE | CORE | CORE | N/A | SUPPORT | SUPPORT | N/A | N/A | resume + manual fallback |
| STT | CORE | N/A | answers persist locally | indirect | degraded/offline-dependent | N/A | STT unavailable | N/A | N/A | N/A | manual input |
| Faktor Risiko | CORE | N/A | CORE | CORE | CORE | N/A | SUPPORT | SUPPORT | N/A | N/A | resume |
| Fungsi Harian | CORE | N/A | CORE | CORE | CORE | N/A | SUPPORT | SUPPORT | N/A | N/A | resume |
| Review | CORE | N/A | CORE | CORE | CORE | N/A | SUPPORT | SUPPORT | N/A | N/A | return/edit |
| Result | CORE | N/A | CORE | CORE | CORE | N/A | SUPPORT | SUPPORT | N/A | read-only | later sync |
| Relawan Data | CORE | CORE | CORE | CORE | CORE | N/A | SUPPORT | SUPPORT | N/A | N/A | retry/resume |
| T0 verification | CORE | N/A | draft as needed | N/A before event | CORE | N/A | N/A | SUPPORT | N/A | not conventional dirty state | leave confirmation |
| T0 local commit | CORE | N/A | CORE | CORE | CORE | N/A | CORE | SUPPORT | idempotency | N/A | high-priority retry |
| Active T0 | CORE | N/A | CORE | CORE | CORE | response freshness | CORE | SUPPORT | update reconciliation | N/A | reopen incident |
| Healthcare Darurat | CORE | CORE | N/A | server only | no offline mutation | CORE | CORE | CORE | CORE | N/A | reconnect/refresh |
| Healthcare Validasi | CORE | CORE | N/A | server only | no offline mutation | SUPPORT | CORE | CORE | CORE | CORE | preserve/reconcile form |
| Healthcare Rujukan | CORE | CORE | N/A | server only | no offline mutation | SUPPORT | CORE | CORE | CORE | CORE | reload/reconcile |
| Healthcare Pasien | CORE | CORE | N/A | server only | no offline mutation | SUPPORT | CORE | CORE | localized | mostly N/A | retry sections |
| Admin Ringkasan | CORE | SUPPORT | N/A | server only | no offline mutation | CORE | CORE | CORE | N/A/read-only | N/A | refresh |
| Admin Management | CORE | CORE | N/A | server only | no offline mutation | optional | CORE | CORE | CORE | CORE | preserve/reconcile |
| Admin Resources | CORE | CORE | N/A | server only | no offline mutation | optional | CORE | CORE | CORE | CORE | retry confirmed mutation |

## D1. Shared failure principles

### Relawan

If local persistence fails:

```text
Data belum tersimpan di perangkat
```

This is more severe than synchronization failure.

If synchronization fails but local persistence succeeded:

```text
Sinkronisasi belum berhasil.
Data tetap aman di perangkat.
```

Do not treat these as equivalent.

### Healthcare/Admin

If server persistence fails:

- do not show successful mutation;
- do not silently queue a blind background mutation;
- preserve form input where safe;
- allow explicit retry after connection/server recovery.

### Realtime

Realtime disconnection means:

```text
updates may not be fresh
```

It does not automatically mean:

```text
server unavailable
```

and vice versa.

---

# E. MVP vs Deferred Scope

# E1. MVP-required end-to-end product chain

The core demonstration path is:

```text
Login
→ Relawan Beranda
→ PFA
→ Assessment Identity
→ SRQ-20 manual + STT verbal assistance
→ Faktor Risiko
→ Fungsi Harian
→ Review
→ T1/T2/T3 system recommendation
→ local persistence
→ Data/outbox/synchronization
→ T0 verification when needed
→ local T0-Suspect
→ server sync/realtime
→ Healthcare Darurat queue
→ acknowledgement
→ secondary verification
→ T0 confirmation or T1/T2 downgrade
→ referral
→ field response/dispatch
→ Healthcare patient longitudinal record
→ Admin operational/aggregate monitoring
```

---

# E2. Required Relawan MVP

```text
Universal login
Relawan shell
Beranda
PFA LOOK/LISTEN/LINK
Assessment identity
SRQ-20 manual mode
SRQ-20 Verbal/Non-Verbal mode
STT continuous verbal interview
manual override
uncertain STT handling
risk factors
function assessment
review
triage recommendation
local IndexedDB persistence
resume unfinished work
Data workspace
outbox/sync visibility
offline operation
T0 persistent access
Potential Red Flag interruption
T0 verification
unknown patient support
location fallback
T0 local-first creation
high-priority T0 sync
active T0 incident
```

---

# E3. Required Healthcare MVP

```text
Darurat queue
realtime T0 arrival
finite alert/audio behavior
acknowledgement
secondary verification
T0/T1/T2 clinical decision
assessment context
Validasi worklist
non-T0 validation
free-text medical diagnosis note
clinical notes
follow-up/intervention plan
referral required flag
referral creation/lifecycle
field response/dispatch lifecycle
Pasien list
patient longitudinal workspace
concurrency protection
realtime/server distinction
```

---

# E4. Required Admin MVP

```text
Ringkasan
map/geospatial overview
T0–T3 aggregates
regional/Posko filters
30-day trend
risk-factor aggregate
contextual export
Relawan roster/provisioning
Relawan Posko assignment/reassignment
Healthcare/Faskes organization registry
Healthcare account provisioning
Posko master data
resource needs
resource allocations
entity-level management history where practical
```

---

# E5. Explicitly deferred

## Authentication/account security

```text
first-login forced password change
normal change-password screen
reauthentication modal/workflow
dedicated inactive/revoked account screens
password recovery
logout-all-devices UI
session/device management
MFA
passkeys
SMS OTP
public self-registration
social login
```

## Clinical/communication expansion

```text
integrated video call engine
integrated voice call engine
advanced diagnostic taxonomy
unsupported clinical checklists
automatic final clinical diagnosis
```

## T0/communications

```text
silent/automatic verified SMS sending from PWA
mesh networking implementation unless separately approved
```

## Healthcare/referral expansion

```text
hospital acceptance/rejection workflow
bed availability
physician acceptance workflow
complex inter-facility transfer workflow
referral cancellation/reassignment model
advanced ETA/SLA system
full fleet management
response-team/unit master CRUD
full hospital EMR
```

## Admin expansion

```text
full HR system
warehouse system
procurement system
supplier management
purchase orders
inventory accounting
advanced logistics optimization
fleet management
global enterprise audit console
report builder
patient-level Admin clinical EMR
complex volunteer movement tracking
```

## Infrastructure sophistication

```text
Redis unless implementation later requires it
multiple API replicas
multi-region deployment
complex permission matrix beyond required RBAC
```

---

# F. Dependency Map

# F1. Shared foundation

```text
Visual tokens
→ typography
→ spacing
→ triage colors
→ accessible status semantics
→ shared form/action primitives
```

Depends on:

- Tailwind;
- shared Vue component library;
- route guards;
- role shell architecture.

---

# F2. Authentication / RBAC

```text
/login
→ JWT auth
→ role resolution
→ role route guard
→ role redirect
```

Depends on:

- Laravel auth/API;
- access/refresh token strategy;
- user role model;
- Healthcare primary organization relation;
- Relawan Posko context.

Current MVP does not depend on password-initialization UI.

---

# F3. Relawan PWA foundation

```text
service worker
+ app shell
+ Dexie
+ account-isolated local database
+ stable UUID
+ local repositories
+ outbox
```

Required before serious assessment/T0 work.

---

# F4. PFA

Depends on:

- Relawan shell;
- local content/data cache where required;
- persistent T0 shortcut.

No complex backend mutation dependency.

---

# F5. Patient identity / assessment session

Depends on:

- local patient repository;
- stable UUID strategy;
- optional server patient matching;
- duplicate/collision rules;
- assessment session model.

---

# F6. SRQ-20 + STT

Depends on:

```text
assessment session
+ SRQ question protocol/version
+ local answer persistence
+ manual YA/TIDAK model
+ STT engine/provider integration
+ transcript/interpretation layer
+ uncertain-result state
+ manual override model
```

Important:

The exact STT engine/provider is an implementation choice, but the UX contract in this document is fixed.

STT must not become a prerequisite for structured answer completion.

---

# F7. Integrated triage engine

Depends on:

- SRQ-20 result;
- risk-factor result;
- function result;
- approved scoring/domain rules;
- deterministic test coverage.

The UI must consume a domain result, not reimplement scoring logic in view components.

---

# F8. Relawan Data/outbox/sync

Depends on:

```text
Dexie persistence
stable local IDs
outbox table
sync service
idempotent server endpoints
account isolation
conflict/deduplication rules
```

---

# F9. T0

Depends on:

```text
Relawan local database
high-priority outbox
patient identity context
Red Flag reason model
location strategy
idempotent emergency UUID
server emergency endpoint
realtime publication
Healthcare queue
audit/history model
```

T0 must work even when:

- patient is unidentified;
- GPS fails;
- network is unavailable.

---

# F10. Healthcare Darurat

Depends on:

```text
server emergency persistence
Reverb/Echo
Healthcare authorization
incident handling state
clinical classification state
audit timeline
concurrency/version protection
```

---

# F11. Healthcare Validasi

Depends on:

```text
assessment server records
patient longitudinal model
triage result/basis
Healthcare authorization
validation record
clinical note fields
concurrency control
```

---

# F12. Referral

Depends on:

```text
Healthcare validation/emergency context
active facility registry
referral domain model
server-confirmed lifecycle
timeline/audit
```

Admin facility master data must exist before realistic referral selection.

---

# F13. Field response / dispatch

Depends on:

```text
emergency
preconfigured response team/unit records
dispatch domain model
server-confirmed lifecycle
timeline/audit
```

Response-team CRUD is not required in this UI MVP.

Seed/configuration may provide the selectable teams.

---

# F14. Healthcare Pasien

Depends on server projections across:

```text
patients
assessments
emergencies
validations
referrals
```

Do not duplicate records just to satisfy the UI.

---

# F15. Admin provisioning/master data

Depends on:

```text
users
roles
facilities/organizations
Posko
Relawan assignment history
Healthcare primary organization association
audit metadata
```

---

# F16. Admin Ringkasan

Depends on:

```text
PostgreSQL
PostGIS
aggregate queries
Posko coordinates
assessment classifications
T0 records
MapLibre
ECharts
realtime aggregate updates where justified
```

Admin analytics must not delay the critical emergency workflow.

---

# F17. Admin resources

Depends on:

```text
Posko
resource need model
resource allocation model
Admin actor/audit
```

No Posko user role is required.

---

# G. Recommended Implementation Order

The order below minimizes rework and protects the critical path.

## Phase 1 — Foundation and domain contracts

Implement:

- Laravel/Vue/Inertia/TypeScript/Tailwind baseline;
- design tokens;
- shared layout primitives;
- role definitions;
- domain enums/state machines;
- identifiers/UUID conventions;
- database schema skeleton;
- API error format;
- optimistic/concurrency policy.

Do not start with Admin analytics.

---

## Phase 2 — Authentication and RBAC

Implement:

- `/login`;
- JWT access/refresh behavior;
- route guards;
- role redirect;
- basic access denied;
- minimal profile/logout menu;
- Admin-created default-password accounts.

Do not implement deferred password/security screens.

---

## Phase 3 — Triage/domain engine

Implement and test independently:

- SRQ-20 protocol/version;
- risk-factor scoring;
- function scoring;
- integrated recommendation;
- T0 bypass semantics.

UI should consume this engine.

---

## Phase 4 — Relawan PWA/local foundation

Implement:

- Relawan shell;
- PWA install/runtime baseline;
- Dexie schema;
- local repositories;
- account isolation;
- outbox;
- local persistence state primitives;
- resume foundation.

---

## Phase 5 — PFA

Implement:

- PFA guide;
- LOOK/LISTEN/LINK;
- T0 persistent access.

---

## Phase 6 — Relawan structured assessment

Implement in order:

```text
Identity
→ SRQ-20 manual
→ Verbal/Non-Verbal mode
→ STT continuous session
→ manual override/uncertain state
→ Risk Factors
→ Fungsi Harian
→ Review
→ Result
```

Every meaningful answer locally persists.

Do not postpone STT to a post-MVP phase.

---

## Phase 7 — Relawan Data + synchronization

Implement:

- unfinished/resume;
- pending sync;
- synchronized records;
- sync retries;
- correct local-vs-server messaging;
- patient/data detail.

Test browser restart and offline recovery.

---

## Phase 8 — T0 end-to-end

Implement:

- Potential Red Flag interruption;
- T0 verification;
- patient selector;
- unknown patient path;
- location fallback;
- local creation;
- high-priority outbox;
- idempotent server submission;
- active incident screen;
- correction/update history;
- SMS composer handoff if used.

This is a critical competition path.

---

## Phase 9 — Healthcare realtime Darurat

Implement:

- Reverb/Echo connection;
- queue;
- T0 arrival;
- acknowledgement;
- selected incident;
- handling states;
- connection/realtime banners;
- concurrency protection.

---

## Phase 10 — Healthcare clinical validation + patient workspace

Implement:

- secondary verification;
- T0 decision;
- Validasi worklist;
- selected validation;
- free-text diagnosis note;
- clinical notes;
- follow-up/intervention plan;
- referral-needed flag;
- Pasien list;
- patient longitudinal workspace.

---

## Phase 11 — Referral + field response/dispatch

Implement:

- facility selector;
- referral lifecycle;
- referral worklist/detail;
- response team selector from preconfigured data;
- dispatch lifecycle;
- shared timeline/audit.

---

## Phase 12 — Admin master data/provisioning

Implement before relying on manually seeded operational entities long-term:

- facilities;
- Healthcare users;
- Relawan users;
- Posko;
- Relawan assignment;
- default-password provisioning;
- entity details/history.

Note:

Basic facility/Posko data may be seeded earlier for Healthcare/Relawan development, but the Admin UI can be implemented here.

---

## Phase 13 — Admin Ringkasan and Resources

Implement:

- map;
- aggregate metrics;
- trends;
- filters;
- Posko drill-down;
- export;
- resource needs;
- resource allocations.

Do not let this phase block the emergency core.

---

## Phase 14 — Cross-role hardening

Validate:

- responsive behavior;
- keyboard/accessibility;
- empty/loading/error states;
- offline/reconnect;
- stale realtime;
- server failures;
- conflicts;
- browser refresh/deep links;
- PWA restart;
- T0 idempotency;
- account isolation;
- permissions/RBAC;
- visual hierarchy under emergency pressure.

---

# H. Resolved Contradictions and Remaining Non-Blocking Decisions

# H1. Resolved: STT defer vs core project feature

Older Technical Plan:

```text
speech-to-text may be deferred
```

Final decision:

```text
STT IS MVP REQUIRED
```

The Relawan detailed UX contract is authoritative for STT interaction.

---

# H2. Resolved: temporary credential / first-login password initialization

Older authentication design:

```text
temporary credential
→ first login
→ mandatory password change
```

Final current-MVP decision:

```text
Admin sets initial/default password
→ user logs in
→ role workspace
```

First-login password initialization is deferred.

---

# H3. Resolved: account-security UX scope

Deferred:

```text
reauthentication UX
change password
inactive/revoked dedicated UI
logout-all/session UI
```

Backend access control still applies.

---

# H4. Resolved: auto SMS claim

Older workflow language suggested automatic SMS fallback.

Final implementation rule:

- pure PWA must not claim verified silent automatic SMS;
- native SMS composer/handoff may be used;
- local T0 high-priority persistence remains mandatory.

---

# H5. Resolved: integrated video calling

Older workflow language may imply tele-emergency calls inside RAPID-MIND.

Final implementation rule:

```text
Video/Telepon/Langsung
```

may be stored as verification method.

No integrated calling engine is required.

---

# H6. Resolved: Healthcare diagnosis taxonomy

`workflow.md` permits diagnosis notes and clinical validation.

No detailed approved taxonomy exists.

Final rule:

- support free-text `Catatan diagnosis medis`;
- support clinical/follow-up notes;
- do not invent diagnostic categories.

---

# H7. Resolved: Fungsi Harian control

Use full-width radio-style selectable rows/cards.

---

# H8. Resolved: Relawan Data scope

`Data` is operational record/sync/resume workspace.

It is not:

- a separate patient-management module;
- a full history application;
- an EMR.

---

# H9. Resolved: resource need creation

Admin records resource needs on behalf of Posko for the MVP.

Do not create a new Posko role.

---

# H10. Remaining technical decision: STT engine/provider

The UX and product requirement are fixed.

The exact technical STT engine/provider is not fixed by this handoff.

Implementation must select an approach that supports the required UX while preserving:

- manual fallback;
- manual authority;
- uncertainty;
- no hard dependency on successful STT.

This does not block screen design.

---

# H11. Remaining domain detail: non-T0 `Status tindak lanjut`

A field is required, but no approved clinical taxonomy of values is defined in the source material.

Do not invent diagnostic categories.

Implementation should keep this field structurally simple and replaceable until an approved value set is provided.

---

# H12. Remaining domain detail: dispatch transport branch

The dispatch lifecycle supports:

```text
Ditugaskan
→ Menuju lokasi
→ Tiba di lokasi
→ Transportasi
→ Selesai
```

but transport should not be assumed mandatory in every case.

The domain model should support completion paths without fabricating a transport event.

---

# H13. Remaining domain detail: exact referral/dispatch completion criteria

The UI lifecycle is defined.

The exact operational rule that qualifies a referral or dispatch as `Selesai` is not fully specified.

Do not invent additional intermediate statuses.

Treat final completion as an explicit authorized Healthcare action until a more specific rule is approved.

---

# I. Responsive Behavior

# I1. Relawan

Target:

```text
mobile first
single column
large touch targets
high contrast
minimal typing
persistent T0 access
```

Tablet behavior:

- keep a constrained reading/form width;
- approximately 600–720 px content width where appropriate;
- do not transform Relawan into a dense desktop dashboard.

Structured assessment should remain focused.

---

# I2. Healthcare

Target:

```text
desktop first
laptop/tablet capable
queue + workspace + contextual rail
```

At narrower widths:

- collapse contextual rail before sacrificing core incident workspace;
- queue may become a selectable panel/drawer;
- never hide emergency state/action behind unnecessary navigation depth.

---

# I3. Admin

Target:

```text
desktop optimized
laptop/tablet responsive
```

At narrower widths:

- stack analytical panels;
- preserve map usability;
- tables may become horizontally scrollable or adaptive;
- management forms should retain clear labels and server action state.

Admin is not required to become a mobile field app.

---

# J. Visual and Interaction Rules to Preserve

## J1. Core visual system

Use the established foundation:

```text
Ink       #0F172A
Teal      #0F766E
Slate      #64748B
Soft Gray #F1F5F9
White
```

Triage exceptions:

```text
T0 #991B1B
T1 #C2410C
T2 #A16207
T3 #15803D
```

T0 red is protected for true emergency semantics.

Do not use red as routine decoration.

---

## J2. Typography

Use Inter.

Relawan:

- body at least 16 px;
- questions approximately 20 px where specified;
- large touch labels.

Healthcare/Admin may use denser desktop typography while preserving readability.

---

## J3. No color-only meaning

Every status must have:

- text;
- icon/shape/structure where useful;
- color as supporting signal only.

---

## J4. Realtime must not steal focus

New server events may:

- update counters;
- add queue items;
- show finite alerts.

They should not unexpectedly navigate the user's current workspace.

---

## J5. Optimistic UI restrictions

Use optimistic UI only for low-risk actions where rollback is clear.

High-impact actions such as:

```text
T0 clinical decision
referral lifecycle transition
dispatch lifecycle transition
account provisioning
deactivation
organization change
resource allocation
```

must wait for server confirmation.

---

# K. Critical End-to-End Acceptance Scenarios

These scenarios should be used as implementation checkpoints.

## K1. Relawan offline assessment

```text
Relawan logs in while eligible/online
→ opens assessment
→ goes offline
→ completes identity/SRQ/risk/function
→ every answer persists locally
→ result is available locally
→ record shows pending sync
→ app/browser restarts
→ record remains recoverable
→ connection returns
→ sync occurs
→ status becomes synchronized
```

---

## K2. STT failure does not block SRQ

```text
Relawan enters Verbal mode
→ starts STT
→ STT becomes unavailable / produces uncertain result
→ app clearly indicates voice input problem
→ previously saved answers remain
→ Relawan continues manually
→ SRQ can still be completed
```

---

## K3. Q17 / Red Flag interruption

```text
Potential Red Flag identified
→ ordinary assessment is interrupted
→ no T0 is sent automatically
→ T0 verification opens
→ Relawan verifies patient/reason/location
→ T0 is persisted locally first
→ assessment remains preserved/suspended
```

---

## K4. T0 offline creation and later sync

```text
Relawan offline
→ creates verified T0-Suspect
→ local emergency save succeeds
→ active incident screen confirms local safety
→ record enters high-priority outbox
→ no false remote success shown
→ connection returns
→ same emergency ID is submitted idempotently
→ Healthcare receives one incident
→ Relawan state changes to synchronized
```

---

## K5. Healthcare acknowledgement is explicit

```text
Healthcare opens T0 incident
→ incident remains Belum diakui
→ user presses AKUI KASUS
→ server confirms
→ handling state becomes Sudah diakui
```

Viewing alone must never count as acknowledgement.

---

## K6. Healthcare T0 secondary validation

```text
acknowledged incident
→ MULAI VERIFIKASI SEKUNDER
→ verification method + notes
→ decision T0-confirmed or T1/T2
→ server confirmation
→ decision appears in timeline
→ Healthcare lifecycle and clinical state remain visible only to Healthcare
```

---

## K7. Referral and dispatch remain separate

```text
T0-confirmed
→ referral may be created
→ dispatch may be assigned
```

One must not silently imply the other.

---

## K8. Concurrency conflict

```text
Healthcare User A opens incident
Healthcare User B changes the record
User A submits stale high-impact action
→ server rejects/conflicts
→ UI explains record changed
→ latest data is loaded
→ User A must intentionally submit a new decision
```

---

## K9. Admin provisioning

```text
Admin creates Relawan or Healthcare account
→ default password entered by Admin
→ server confirms creation
→ account appears in roster
→ user can log in directly
→ no first-login password-change screen appears
```

---

## K10. Resource need/allocation

```text
Admin records Posko resource need
→ need appears in resources workspace
→ Admin records allocation
→ server confirms
→ allocation history is visible
```

No Posko login is required.

---

# L. Final Implementation Guardrails

Before treating any screen as complete, verify the following.

## Relawan

- local save is visible and truthful;
- sync is separate from local save;
- offline is not automatically treated as an error;
- T0 is always quickly accessible;
- T0 first tap never transmits immediately;
- T0 can be created without GPS;
- T0 can be created without known patient identity;
- Relawan sees T0-Suspect plus local/server submission state, never Healthcare lifecycle or clinical results;
- STT is present in the MVP;
- STT does not control the authoritative answer;
- manual SRQ remains fully usable;
- unfinished assessments resume correctly.

## Healthcare

- opening does not acknowledge;
- T0 handling, clinical state, referral, and dispatch are separate;
- realtime disconnect is distinct from server failure;
- high-impact actions wait for server confirmation;
- stale writes are blocked;
- no invented diagnosis taxonomy;
- no integrated video-call engine is implied.

## Admin

- Ringkasan is aggregate/geospatial, not patient clinical;
- Relawan, Faskes, and Operasional remain distinct management areas;
- one facility may have many Healthcare users;
- one Healthcare user has one primary facility;
- resources remain needs + allocations;
- no new Posko role;
- no false success on failed server mutation.

## Shared

- T0 is structurally distinct;
- no color-only semantics;
- status dimensions are not collapsed;
- loading/empty/error states are deliberate;
- meaningful destructive actions use confirmation;
- user input is preserved when safe after server validation failure;
- all visible product copy remains Bahasa Indonesia.

---

# M. Handoff Completion Status

The following design topics are considered **locked for implementation**:

```text
Visual foundation
Relawan shell/navigation
Relawan PFA
Relawan assessment stages
SRQ-20 manual interaction
SRQ-20 STT interaction
Faktor Risiko
Fungsi Harian
Relawan Data
T0 emergency interaction
Healthcare Darurat
Healthcare secondary validation
Healthcare non-T0 validation direction
Referral
Field response/dispatch
Healthcare patient workspace
Admin Ringkasan
Admin Relawan management
Admin Faskes management
Admin Posko management
Admin resources
Authentication scope
Account provisioning
Shared operational states
Route/navigation architecture
MVP/deferred scope
Implementation sequence
```

The remaining items in Section H are implementation/domain details that should stay replaceable and must not be filled with invented clinical or operational rules.

This document is therefore the **final pre-development UI/UX screen inventory and implementation handoff** for the current RAPID-MIND competition MVP.
