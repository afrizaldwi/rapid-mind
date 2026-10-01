# RAPID-MIND Workflow Verification Ledger

**Verification checkpoint:** 1 October 2026 — Phase B2A local-first assessment gate
**Branch:** `demo`
**Document type:** Evidence and status documentation

## 1. Purpose and Scope

This ledger records runtime and browser verification evidence for the current `demo` implementation. It is intended to support demo workflow confidence, implementation handoff, and regression reference with historical checkpoints preserved and the latest source/automated checkpoint recorded below.

This document is not a replacement for product requirements or design specifications. It does not claim production readiness, security certification, clinical validation, full end-to-end automation, or complete offline/PWA readiness.

The evidence below preserves what was actually verified during this development session. Interactive browser-agent verification is recorded as browser/runtime verification. Read-only database queries are recorded only as supporting persistence evidence where noted.

## 2. Verification Terminology

- **SOURCE-INSPECTED**: Relevant source, route, specification, or implementation was inspected. This is not runtime proof.
- **AUTOMATED TESTED**: A repository-backed automated test or suite was executed.
- **BROWSER VERIFIED**: The behavior was exercised through the interactive browser capability.
- **RUNTIME VERIFIED**: Runtime behavior or persistence was confirmed during the session, including supporting read-only database evidence where stated.
- **PASS**: The stated behavior worked within the tested scope.
- **PASS WITH LIMITATION**: The core behavior worked, but a known product or UI limitation remains.
- **FAIL**: The stated behavior did not work in the tested scope.
- **NOT DIRECTLY TESTED**: The behavior remains unverified in this session.
- **NOT IMPLEMENTED**: The required behavior is not currently available in the approved workflow form.

No browser-agent result in this ledger is described as a Playwright automated E2E suite, automated E2E test, or CI E2E test. No such suite was run for this checkpoint.

## 3. Environment and Preconditions

| Item | Verified context |
|---|---|
| Application | `http://localhost:8080` |
| Runtime | Docker Compose |
| Branch | `demo` |
| Database | PostgreSQL/PostGIS |
| Realtime | Laravel Reverb + Echo |

The database was eventually brought to the expected demo baseline with:

```text
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan db:seed
```

Verified bootstrap state after that correction:

```text
shelters = 3
healthcare_facilities = 3

relawan@rapidmind.id
-> shelter_id = 1

nakes@rapidmind.id
-> facility_id = 1
```

This records the demo environment state used for verification. It does not state that production deployment should necessarily depend on `DemoSeeder`.

## 4. Workflow Verification Matrix

| Workflow slice | Status | Evidence / scope |
|---|---|---|
| Role login and routing | PASS - BROWSER VERIFIED | `RELAWAN -> /relawan/home`; `HEALTHCARE -> /healthcare/emergencies`; `ADMIN -> /admin/summary` |
| PFA LOOK / LISTEN / LINK | PASS - BROWSER VERIFIED | LOOK reachable; LISTEN reachable and interactive; LINK reachable; persistent T0 control available |
| Normal Relawan assessment | PASS - BROWSER VERIFIED | Patient -> SRQ-20 -> Faktor Risiko -> Fungsi Harian -> Tinjau -> Hasil; synthetic result `T2`, `13/37` |
| Healthcare normal clinical validation | PASS - BROWSER VERIFIED | System recommendation `T2`; Healthcare clinical result `T2`; diagnosis note and intervention plan persisted |
| Non-T0 clinical referral | PASS WITH LIMITATION | Referral persisted and appeared in global Healthcare workspace; patient longitudinal workspace does not surface it directly |
| Persistent patient-bound T0 | PASS - BROWSER VERIFIED | Patient and assessment binding persisted; Healthcare received the event; no duplicate realtime event observed |
| Generic / unidentified T0 | PASS - BROWSER VERIFIED | Correct generic context displayed: `Penyintas Tanpa Nama / Situasi Darurat Lapangan` |
| Healthcare realtime T0 reception | PASS - BROWSER VERIFIED | Reverb / Echo updated the Healthcare queue without manual refresh |
| Healthcare T0 acknowledgement | PASS - BROWSER VERIFIED | `PENDING -> ACKNOWLEDGED`; opening an incident alone did not acknowledge it |
| Healthcare secondary verification | PASS - BROWSER VERIFIED | `ACKNOWLEDGED -> PHONE verification -> REVIEWING`; verification/audit data persisted |
| T0 confirmation | PASS - BROWSER VERIFIED | Emergency status `REVIEWING -> CONFIRMED`; clinical result `T0_CONFIRMED`; destination `RSUD Candi`, `facility_id = 1`; referral created |
| T0 downgrade | PASS - BROWSER VERIFIED | `REVIEWING -> clinical_result T1 -> DOWNGRADED`; no automatic referral created |
| T0 referral progression | PASS - BROWSER VERIFIED | `ACTIVE -> EN_ROUTE -> ON_SITE -> TRANSPORT -> COMPLETED`; history appended for all five states |
| Q17 interruption | PASS - BROWSER VERIFIED | `Q17 = YA` opened Potential Red Flag modal; no EmergencyEvent was created |
| Q17 dismissal semantics | PASS - BROWSER VERIFIED | Manual continuation preserved `Q17 = YA`; no T0 created; assessment remained active |
| Q17 explicit escalation | PASS - BROWSER VERIFIED | Potential Red Flag -> `BUKA VERIFIKASI T0 DARURAT`; no emergency transmitted before final explicit submit |
| Q17 T0 persistence | PASS - BROWSER VERIFIED | Patient, assessment, emergency, red flag, assessment status, and emergency status matched expected values |
| Interrupted assessment recovery | PASS - BROWSER VERIFIED | T0 submission -> return to assessment -> original `IN_PROGRESS` assessment resumed with `Q17 = YA` preserved |
| Assessment / T0 separation | PASS - RUNTIME VERIFIED | Assessment and EmergencyEvent remained distinct records with the original assessment and patient references |
| Admin screen smoke | PASS - BROWSER VERIFIED | Summary, map, analytics, volunteers, facilities, accounts, and logistics loaded without observed runtime exceptions |
| Seeded Posko visibility | PASS - BROWSER VERIFIED | `Posko Candi`, `Posko Utama Maguwo`, `Posko Siaga Pakem`; all appeared in Relawan assignment dropdown |
| Seeded Faskes visibility | PASS - BROWSER VERIFIED | `RSUD Candi`, `Puskesmas Pakem`, `PSC 119 Sleman` |
| Admin map / summary seeded state | PASS - BROWSER VERIFIED | `3 Posko Terdaftar`; map sidebar reflected all three Posko |
| T3 validation worklist routing | NOT DIRECTLY TESTED | Requires focused verification against the approved lower-priority/history behavior |

## 5. Detailed Verified Journeys

### 5.1 Normal Relawan assessment

Synthetic assessment: `DEMO FLOW NORMAL`

```text
Patient creation
-> SRQ-20
-> Faktor Risiko
-> Fungsi Harian
-> Tinjau
-> Hasil
```

Status: **PASS - BROWSER VERIFIED**

Verified:

- all 20 SRQ answers were usable;
- Q17 was `TIDAK`;
- five risk questions were completed;
- three functional domains were completed;
- review and completion worked;
- system recommendation was produced as `T2`;
- total score was `13/37`;
- the clinical disclaimer was present;
- patient context was preserved.

The result is a system recommendation, not a diagnosis.

### 5.2 Healthcare normal clinical validation

```text
Completed Relawan assessment
-> /healthcare/validations
-> clinical validation
```

Status: **PASS - BROWSER VERIFIED**

Verified:

```text
system recommendation = T2
Healthcare clinical result = T2
diagnosis note persisted
intervention plan persisted
```

The system recommendation and Healthcare clinical validation remained separate.

### 5.3 Non-T0 clinical referral

Synthetic workflow: `DEMO FLOW CLINICAL REFERRAL`

Status: **PASS WITH LIMITATION - BROWSER VERIFIED**, with the patient-workspace limitation recorded below.

Verified:

```text
Assessment
-> TriageResult T2
-> ClinicalValidation T2
-> referral_required = true
-> Referral ACTIVE
```

Supporting persistence evidence:

```text
clinical_validation_id = 3
emergency_event_id = NULL
facility_id = 1
EmergencyEvent count for patient = 0
```

This confirms that a normal clinical referral can originate from `ClinicalValidation` independently of the T0 emergency workflow. The referral persisted and appeared correctly in the global Healthcare referral workspace.

Patient longitudinal workspace visibility is **PASS WITH LIMITATION** because the referral is not currently surfaced directly there.

### 5.4 Persistent patient-bound T0

Status: **PASS - BROWSER VERIFIED**

Verified:

- the active assessment patient was displayed in T0 verification;
- explicit final submission was required;
- patient ID persisted;
- assessment ID persisted;
- `EmergencyEvent.patient_id == Assessment.patient_id`;
- Healthcare received the event in realtime;
- no duplicate realtime event was observed.

### 5.5 Generic / unidentified T0

Status: **PASS - BROWSER VERIFIED**

From `/relawan/home`, T0 verification displayed:

```text
Penyintas Tanpa Nama / Situasi Darurat Lapangan
```

No previous assessment patient context leaked into the generic T0 flow.

### 5.6 Healthcare T0 lifecycle

The following lifecycle was browser verified:

```text
Emergency status:
PENDING
-> ACKNOWLEDGED
-> REVIEWING
-> CONFIRMED

Clinical result:
T0_CONFIRMED
```

Opening an incident alone did not acknowledge it. Secondary verification used `PHONE`, after which the incident entered `REVIEWING`.

Confirmed synthetic emergency:

```text
01a0f1dd-3e1b-7078-a8dd-cdc183ed890a
```

Selected destination:

```text
RSUD Candi
facility_id = 1
```

The referral was created successfully.

### 5.7 T0 downgrade

Synthetic emergency:

```text
01a0f1dc-98e6-72a9-982d-805c8cdc877b
```

Status: **PASS - BROWSER VERIFIED**

Verified:

```text
REVIEWING
-> clinical_result T1
-> DOWNGRADED
```

No automatic referral was created.

### 5.8 T0 referral progression

Synthetic referral:

```text
01a0f1e9-7f34-70c4-96d1-7e7678c1053a
```

Status: **PASS - BROWSER VERIFIED**

Verified progression:

```text
ACTIVE
-> EN_ROUTE
-> ON_SITE
-> TRANSPORT
-> COMPLETED
```

Status history was appended for all five states.

## 6. Q17 Human-Safety Workflow

Synthetic patient: `DEMO FLOW Q17`

### 6.1 Q17 interruption

```text
Q17 = YA
-> Potential Red Flag modal
```

Status: **PASS - BROWSER VERIFIED**

Choosing `YA` interrupted the flow for human review. No EmergencyEvent was created merely by choosing `YA`.

### 6.2 Dismissal semantics

Selecting `Lanjutkan Asesmen Manual` was **PASS - BROWSER VERIFIED**.

Verified:

```text
Q17 remains YA
no T0 created
assessment remains active
```

### 6.3 Explicit escalation

```text
Q17 YA
-> Potential Red Flag
-> BUKA VERIFIKASI T0 DARURAT
-> T0 verification
```

Status: **PASS - BROWSER VERIFIED**

The current patient remained `DEMO FLOW Q17`. No emergency was transmitted before final explicit submission.

### 6.4 Q17 T0 persistence

Status: **PASS - BROWSER VERIFIED**

Verified values:

```text
patient_id:
01a0f1fd-00cb-725b-b24f-7285132a231e

assessment_id:
01a0f1fd-00d4-71bf-b2ab-feb3f373d61c

emergency_id:
01a0f1fe-843f-716b-af1f-8b1dc5e8b7ec

red_flag_type:
SUICIDAL_IDEATION

assessment status:
IN_PROGRESS

emergency status:
PENDING
```

### 6.5 Interrupted assessment recovery

Status: **PASS - BROWSER VERIFIED**

Verified:

```text
T0 submission
-> return to /relawan/assessment
-> original assessment remains IN_PROGRESS
-> resume
-> Q17 YA remains preserved
```

Q17 was preserved through the current local in-progress assessment draft behavior. This does not claim that all 20 SRQ answers had already been persisted server-side at that point.

### 6.6 Assessment / T0 separation

Status: **PASS - RUNTIME VERIFIED**

Assessment and `EmergencyEvent` remained distinct records:

```text
EmergencyEvent.assessment_id
-> original assessment

EmergencyEvent.patient_id
-> same patient
```

T0 creation did not complete or overwrite the assessment.

## 7. Admin Verification Already Completed

### 7.1 Admin screen smoke

Status: **PASS - BROWSER VERIFIED**

The following screens loaded without observed runtime exceptions during the smoke test:

```text
/admin/summary
/admin/map
/admin/analytics
/admin/volunteers
/admin/facilities
/admin/accounts
/admin/logistics
```

### 7.2 Seeded Posko visibility

Status: **PASS - BROWSER VERIFIED**

Verified:

```text
Posko Candi
Posko Utama Maguwo
Posko Siaga Pakem
```

The Relawan assignment dropdown contained all three.

### 7.3 Seeded Faskes visibility

Status: **PASS - BROWSER VERIFIED**

Verified:

```text
RSUD Candi
Puskesmas Pakem
PSC 119 Sleman
```

### 7.4 Admin map / summary seeded state

Status: **PASS - BROWSER VERIFIED**

Verified:

```text
3 Posko Terdaftar
```

The map sidebar reflected the three Posko.

## 8. Environment Bootstrap Incident and Retest

The initial browser workflow verification found:

```text
shelters = 0
healthcare_facilities = 0
```

The migration below was still pending:

```text
2026_09_30_000000_add_clinical_validation_id_to_referrals_table
```

This caused:

```text
T0 clinical classification
-> facility validation failure
-> incident stuck REVIEWING
-> no referral
```

This was initially observed as a demo blocker. The environment was corrected using:

```text
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan db:seed
```

After correction, the following was verified:

```text
shelters = 3
facilities = 3
Relawan shelter_id = 1
Healthcare facility_id = 1
```

The focused browser retest then produced:

```text
Gate L - T0 Clinical Decision: PASS
Gate M - Referral Progression: PASS
Gate N - T0 Downgrade: PASS
Gate P - Admin seed-dependent UI: PASS
```

The original failure is therefore classified as a **resolved environment/bootstrap issue**, not a remaining application defect.

## 9. Admin Bootstrap Gap

This is the most important remaining implementation gap and the reason for the next phase: **Admin Bootstrap & Provisioning MVP**.

Source inspection shows the following existing behavior:

```text
/admin/accounts
-> generic account creation

/admin/volunteers
-> list Relawan
-> reassign existing Relawan to existing Posko

/admin/facilities
-> read-only facility listing
```

The following are **NOT IMPLEMENTED / NOT BROWSER VERIFIED** in the approved workflow form.

### 9.1 Posko management

```text
Create Posko
Edit Posko
Activate/deactivate Posko
Manage coordinates
```

### 9.2 Faskes management

```text
Create Faskes
Edit Faskes
Activate/deactivate Faskes
```

### 9.3 Dedicated Relawan provisioning

Approved flow:

```text
Admin
-> Relawan
-> Tambah Relawan
```

The flow requires an active Posko. The current generic role-selector `/admin/accounts` form does not match the approved provisioning UX.

### 9.4 Dedicated Healthcare provisioning

Approved flow:

```text
Admin
-> Faskes
-> Akun Healthcare
-> Tambah Akun
```

The flow requires an active Faskes. The current generic role-selector account form does not match the approved provisioning UX.

### 9.5 Account lifecycle

Currently missing or incomplete:

```text
edit account
activate/deactivate account
Healthcare Faskes reassignment
dedicated account detail/lifecycle
```

The intended prototype uses deactivation rather than routine destructive deletion. This ledger does not claim that hard deletion is required.

## 10. Known Workflow Mismatches and Non-Blocking Limitations

### 10.1 Assessment identity screen

**WORKFLOW MISMATCH - non-blocking**

The design expects:

```text
Identitas
-> SRQ
```

The current implementation collects identity directly in `/relawan/assessment` and navigates to SRQ.

### 10.2 Non-T0 referral destination selection

**WORKFLOW MISMATCH / PROTOTYPE SHORTCUT**

The current Healthcare validation modal does not expose a destination Faskes selector. When referral is requested, the backend defaults to the logged-in Healthcare user's facility.

The verified result was:

```text
facility_id = 1
RSUD Candi
```

### 10.3 Referral versus dispatch semantics

**WORKFLOW MISMATCH / PROTOTYPE SHORTCUT**

The current `/healthcare/referrals` combines referral monitoring with ambulance-like progression:

```text
ACTIVE
EN_ROUTE
ON_SITE
TRANSPORT
COMPLETED
```

This is recorded as a limitation and is not redesigned in this documentation task.

### 10.4 Healthcare classification error feedback

**POLISH / HARDENING**

Step-3 classification errors may fail without sufficiently visible inline feedback. Valid seeded input currently succeeds.

### 10.5 Patient referral visibility

**WORKFLOW/UI GAP**

The referral persists and is visible globally at `/healthcare/referrals`, but is not currently clearly surfaced in the patient longitudinal detail workspace.

### 10.6 T3 validation worklist routing

**NOT DIRECTLY TESTED**

The approved Healthcare workflow says:

```text
T1 -> active validation work
T2 -> lower-priority validation/follow-up
T3 -> searchable in patient history without flooding active validation
```

The current implementation still requires focused verification against that rule. This ledger does not claim PASS or FAIL for it.

## 11. Areas Intentionally Not Claimed Complete

The following were outside the current browser-workflow verification scope or remain deferred:

```text
full offline/outbox synchronization
PWA installation/service-worker behavior
security/authorization hardening
CSRF investigation
production deployment security
backup/restore
full automated E2E suite
STT accuracy
advanced NLP
clinical protocol validation
performance/load testing
complete responsive/accessibility audit
```

## 12. Synthetic Test Data Note

Browser verification created synthetic records using names such as:

```text
DEMO FLOW NORMAL
DEMO FLOW T0
DEMO FLOW Q17
DEMO FLOW CLINICAL REFERRAL
```

Some records intentionally remain in PostgreSQL for inspection. No cleanup was performed for this documentation checkpoint.

Important synthetic traceability IDs include:

```text
Q17 patient:
01a0f1fd-00cb-725b-b24f-7285132a231e

Q17 assessment:
01a0f1fd-00d4-71bf-b2ab-feb3f373d61c

Q17 emergency:
01a0f1fe-843f-716b-af1f-8b1dc5e8b7ec

Confirmed T0:
01a0f1dd-3e1b-7078-a8dd-cdc183ed890a

Completed T0 referral:
01a0f1e9-7f34-70c4-96d1-7e7678c1053a

Downgraded T0:
01a0f1dc-98e6-72a9-982d-805c8cdc877b

Normal clinical-referral patient:
01a0f202-b348-7139-827d-471c5267aefc

Normal clinical-referral assessment:
01a0f202-b353-70ad-a204-4e2ae0529296

Normal clinical referral:
01a0f204-6ae4-7113-83c4-a9398bee8c74
```

These are synthetic test records, not production identities.

## 13. Historical Overall Status (Before Admin Bootstrap)

```text
ONLINE OPERATIONAL WORKFLOW:
PASS for tested demo scope

Relawan normal assessment:
PASS

Healthcare normal validation:
PASS

Non-T0 clinical referral:
PASS WITH LIMITATION

Manual T0:
PASS

Q17 -> T0:
PASS

Realtime T0 reception:
PASS

Healthcare T0 lifecycle:
PASS

T0 referral progression:
PASS

Admin monitoring smoke:
PASS

ADMIN BOOTSTRAP / PROVISIONING:
INCOMPLETE

Next implementation priority at that checkpoint:
Admin Bootstrap & Provisioning MVP
```

This checkpoint does not claim that RAPID-MIND is production ready, fully complete, clinically validated, or secure. It records the verified online demo scope and the remaining implementation boundary.

---

## Admin Bootstrap & Provisioning MVP — Source & Automated Checkpoint (30 September 2026)

The earlier ADMIN BOOTSTRAP / PROVISIONING: INCOMPLETE entry above describes the prior browser checkpoint and remains historical evidence. The implementation has been **SOURCE-INSPECTED** and **AUTOMATED TESTED**: the Laravel suite passed **79 tests and 835 assertions** (`docker compose exec -T app php artisan test`); Admin route registration, Vue type checking, frontend build, and git diff --check passed. The build reported large-chunk advisory warnings.

---

## Admin Bootstrap & Provisioning MVP — Browser Verification (30 September 2026)

Status: **BROWSER VERIFIED — ANTIGRAVITY / Chrome-CDP** (Gates A–J and L PASS; Gate K passes its directly tested browser checks (K1–K2), while K3 remains NOT DIRECTLY TESTED IN BROWSER. Overall browser matrix: 77 verification items PASS, 1 item NOT DIRECTLY TESTED IN BROWSER.; post-fix verification confirmed `/admin/map` resolution).

External browser runtime verification was executed on `http://localhost:8080` using Google Chrome with DevTools/CDP automation. Synthetic records were provisioned and manipulated via the application interface without destructive database mutations.

### Verification Matrix (Gates A through L)

| Gate | Item | Status | Verification & Evidence |
|---|---|---|---|
| **Gate A: Admin Navigation & Baseline** | A1 | **PASS** | Root Admin login (`admin@rapidmind.id` / `password`) succeeded and redirected to `/admin/summary`. |
| | A2 | **PASS** | Dedicated sidebar navigation links verified: Manajemen Relawan (`/admin/volunteers`), Manajemen Posko (`/admin/operations/posko`), Organisasi Faskes (`/admin/facilities/organizations`), Akun Healthcare (`/admin/facilities/users`). |
| | A3 | **PASS** | Generic `Kelola Akun` link is completely absent from navigation. |
| | A4 | **PASS** | Direct browser navigation to `/admin/accounts` returned HTTP 404 Not Found (no generic role-selector account creation UI accessible). |
| **Gate B: Posko Creation & Editing** | B1 | **PASS** | Posko creation (`Posko Browser Test`, Region Merapi, `Jl. Browser Test`, lat `-7.7`, lng `110.4`, Aktif) succeeded. |
| | B2 | **PASS** | Redirected to `/admin/operations/posko/{id}` with flash message: `"Posko berhasil dibuat."` |
| | B3 | **PASS** | Name, Region, and Address correctly restored and preserved in form fields. |
| | B4 | **PASS** | Latitude (`-7.7`) and Longitude (`110.4`) restored accurately from PostGIS coordinates. |
| | B5 | **PASS** | Posko list displays real state `Aktif` and volunteers count `0`. |
| | B6 | **PASS** | Address updated to `Jl. Browser Test Updated`; edit persisted upon save and page reload. |
| | B7 | **PASS** | `/admin/summary` shows `Posko Browser Test` in shelter operational table with dynamic state `Aktif`. |
| **Gate C: Faskes Creation & Zero-Count** | C1 | **PASS** | Faskes creation (`Faskes Browser Test`, Puskesmas, `Jl. Faskes Browser`, Aktif) succeeded. |
| | C2 | **PASS** | Redirected to `/admin/facilities/organizations/{id}` with flash message: `"Faskes berhasil dibuat."` |
| | C3 | **PASS** | Faskes list `/admin/facilities/organizations` displays real status `Aktif`. |
| | C4 | **PASS** | Healthcare account count for `Faskes Browser Test` is exactly `0` (not incorrectly `1`). |
| | C5 | **PASS** | Address edited to `Jl. Faskes Browser Updated`; persisted upon save and page reload. |
| **Gate D: Dedicated Relawan Provisioning** | D1 | **PASS** | Provisioning `Relawan Browser Test` (`relawan.browser@example.test`, password `password123`, assigned to `Posko Browser Test`) succeeded. Confirmed form contains NO role selector. |
| | D2 | **PASS** | Account appears in Manajemen Relawan list (`/admin/volunteers`). |
| | D3 | **PASS** | Status displayed as `Aktif`. |
| | D4 | **PASS** | Current Posko displayed as `Posko Browser Test`. |
| | D5 | **PASS** | Edit page (`/admin/volunteers/{id}`) displays correct assignment. |
| | D6 | **PASS** | Admin logged out cleanly. |
| | D7 | **PASS** | Logged in with provisioned credentials (`relawan.browser@example.test` / `password123`). |
| | D8 | **PASS** | Relawan session reached `/relawan/home` with header showing "Relawan Browser Test" and "Posko Browser Test". |
| | D9 | **PASS** | Relawan bottom navigation rendered normally (Beranda, PFA, Asesmen, Data). Logged out cleanly. |
| **Gate E: Dedicated Healthcare Provisioning** | E1 | **PASS** | Provisioning `Healthcare Browser Test` (`nakes.browser@example.test`, password `password123`, assigned to `Faskes Browser Test`) succeeded. Confirmed form contains NO role selector. |
| | E2 | **PASS** | Account appears in Healthcare list (`/admin/facilities/users`). |
| | E3 | **PASS** | Status displayed as `Aktif`. |
| | E4 | **PASS** | Current Faskes displayed as `Faskes Browser Test`. |
| | E5 | **PASS** | Admin logged out cleanly. |
| | E6 | **PASS** | Logged in with Healthcare credentials (`nakes.browser@example.test` / `password123`). |
| | E7 | **PASS** | Login reached `/healthcare/emergencies`. |
| | E8 | **PASS** | Healthcare workspace rendered normally (WORKSPACE MEDIS, Faskes: `Faskes Browser Test`, navigation to Darurat, Validasi, Rujukan, Pasien). Logged out cleanly. |
| **Gate F: Posko Lifecycle Guard** | F1 | **PASS** | Deactivation of `Posko Browser Test` while assigned active Relawan was rejected. |
| | F2 | **PASS** | Validation message displayed: `"Posko masih memiliki Relawan aktif. Pindahkan atau nonaktifkan Relawan terlebih dahulu."` |
| | F3 | **PASS** | Posko remained active upon reload. |
| | F4 | **PASS** | Created `Posko Browser Test 2` and reassigned `Relawan Browser Test` to it; reassignment succeeded. |
| | F5 | **PASS** | Relawan list & edit page updated to show `Posko Browser Test 2`. |
| | F6 | **PASS** | Original `Posko Browser Test` can now be deactivated (0 active volunteers assigned). |
| | F7 | **PASS** | Posko list and `/admin/summary` show `Posko Browser Test` as `Nonaktif`. |
| **Gate G: Faskes Lifecycle Guard** | G1 | **PASS** | Deactivation of `Faskes Browser Test` while assigned active Healthcare user was rejected. |
| | G2 | **PASS** | Validation message displayed: `"Faskes masih memiliki akun Healthcare aktif. Pindahkan atau nonaktifkan akun terlebih dahulu."` |
| | G3 | **PASS** | Faskes remained active upon reload. |
| | G4 | **PASS** | Created `Faskes Browser Test 2` and reassigned `Healthcare Browser Test` to it; reassignment succeeded. |
| | G5 | **PASS** | Healthcare list & edit page updated to show `Faskes Browser Test 2`. |
| | G6 | **PASS** | Original `Faskes Browser Test` can now be deactivated (0 active healthcare accounts assigned). |
| | G7 | **PASS** | Original Faskes list status updated to `Nonaktif`. |
| **Gate H: Account Deactivation & Auth** | H1 | **PASS** | Deactivated `Relawan Browser Test`; list displays `Nonaktif`. |
| | H2 | **PASS** | Login attempt rejected with notice: `"⚠️ Akun Anda sedang nonaktif. Hubungi Admin."` |
| | H3 | **PASS** | Reactivated Relawan with active Posko; save succeeded. |
| | H4 | **PASS** | Relawan login succeeded again, reaching `/relawan/home`. Logged out. |
| | H5 | **PASS** | Deactivated `Healthcare Browser Test`; list displays `Nonaktif`. |
| | H6 | **PASS** | Login attempt rejected with notice: `"⚠️ Akun Anda sedang nonaktif. Hubungi Admin."` |
| | H7 | **PASS** | Reactivated Healthcare user with active Faskes; save succeeded. |
| | H8 | **PASS** | Healthcare login succeeded again, reaching `/healthcare/emergencies`. Logged out. |
| **Gate I: Retained Inactive Assignment Edge Case** | I1 | **PASS** | Retained inactive Posko appears in dropdown labelled `Posko Browser Test 2 — Nonaktif (penugasan saat ini)`. |
| | I2 | **PASS** | Renamed Relawan to `Relawan Browser Test Renamed` while inactive; save succeeded. |
| | I3 | **PASS** | Checking `Akun aktif` while retaining inactive Posko automatically disables the `Simpan` button (`disabled`), preventing activation. |
| | I4 | **PASS** | Selected active Posko `Posko Candi`, checked `Akun aktif`, and saved; activation succeeded. |
| | I5 | **PASS** | Retained inactive Faskes appears in dropdown labelled `Faskes Browser Test 2 — Nonaktif (penugasan saat ini)`. |
| | I6 | **PASS** | Renamed Healthcare user to `Healthcare Browser Test Renamed` while inactive; save succeeded. |
| | I7 | **PASS** | Checking `Akun aktif` while retaining inactive Faskes automatically disables the `Simpan` button (`disabled`), blocking save. |
| | I8 | **PASS** | Selected active Faskes `RSUD Candi`, checked `Akun aktif`, and saved; activation succeeded. |
| **Gate J: New Provisioning Excludes Inactive Master Data** | J1 | **PASS** | `/admin/volunteers/create` excludes inactive Posko (`Posko Browser Test`, `Posko Browser Test 2`). Only active Posko are selectable. |
| | J2 | **PASS** | `/admin/facilities/users/create` excludes inactive Faskes (`Faskes Browser Test`, `Faskes Browser Test 2`). Only active Faskes are selectable. |
| **Gate K: Referral/Faskes Lifecycle Evidence** | K1 | **PASS** | In Healthcare emergency referral selection UI (`/healthcare/emergencies/01a0f1dc-2853-72f8-936f-4d82ed69aaf9`), inactive Faskes do NOT appear in the dropdown. |
| | K2 | **PASS** | Active Faskes (`RSUD Candi`, `Puskesmas Pakem`, `PSC 119 Sleman`) remain selectable. |
| | K3 | **NOT DIRECTLY TESTED IN BROWSER** | No pre-existing historical referral points to an inactive facility in the current synthetic test dataset (all historical referrals point to active `RSUD Candi`). Covered separately by automated test `historical referral remains readable after facility becomes inactive`. |
| **Gate L: Status/Count Consistency & Smoke Regression** | L1 | **PASS** | Posko list accurately reflects real `Aktif` / `Nonaktif` states and volunteer counts. |
| | L2 | **PASS** | Faskes list accurately reflects real `Aktif` / `Nonaktif` states. |
| | L3 | **PASS** | Relawan list accurately reflects real account state (`Aktif`, assigned to `Posko Candi`). |
| | L4 | **PASS** | Healthcare list accurately reflects real account state (`Aktif`, assigned to `RSUD Candi`). |
| | L5 | **PASS** | Faskes Healthcare counts are exact (`0` for unassigned/inactive, `2` for `RSUD Candi`). |
| | L6 | **PASS** | Admin Summary `/admin/summary` loads normally and displays consistent metrics. |
| | L7 | **PASS** | Admin Map `/admin/map` returns HTTP 200 OK (post-fix verified after adding `use App\Models\HealthcareFacility;` import). MapLibre GL JS canvas (1192×638) renders raster tiles, zoom/attribution controls, 5 interactive markers with detail popups, map legend, and shelter cards list. 0 fatal console errors. |
| | L8 | **PASS** | Admin Analytics `/admin/analytics` loads normally with ECharts longitudinal trends. |
| | L9 | **PASS** | Admin Logistics `/admin/logistics` loads normally. |
| | L10 | **PASS** | Complete Admin workflow exercises cleanly across all tabs (`/admin/summary`, `/admin/map`, `/admin/analytics`, `/admin/volunteers`, `/admin/logistics`, `/admin/operations/posko`, `/admin/facilities/organizations`, `/admin/facilities/users`) with 0 console/runtime errors preventing operations. |

### Functional Defect Discovered & Resolved

- **Route:** `GET /admin/map`
- **Observed Behavior (Initial Run):** HTTP 500 Internal Server Error when loading the Geospatial Map page.
- **Error Detail:** `Class "App\Http\Controllers\Admin\HealthcareFacility" not found` in `app/Http/Controllers/Admin/AdminController.php:57`.
- **Root Cause:** Missing `use App\Models\HealthcareFacility;` import at the top of `app/Http/Controllers/Admin/AdminController.php`. Line 57 attempts to execute `HealthcareFacility::where('is_active', true)->get();` within the `App\Http\Controllers\Admin` namespace without an import or FQCN.
- **Resolution & Post-Fix Retest:**
  - Added `use App\Models\HealthcareFacility;` to `app/Http/Controllers/Admin/AdminController.php`.
  - Focused browser retest confirmed: HTTP 200 OK, full MapLibre canvas render (1192×638), tile layer, zoom/attribution controls, 5 interactive shelter markers with popup cards, map legend, and 0 fatal console errors.
  - Full automated suite re-verified: **79 tests, 835 assertions passed**.

---

## USER MANUAL RETEST — NOT YET PERFORMED

The browser verification above was conducted autonomously by **Antigravity (Chrome-CDP)**. It provides external browser-level evidence, but **MUST NOT** be represented as user manual verification.

The project owner still intends to manually retest the application before final demonstration.

### Checklist for Owner Manual Retest:

1. **Root Admin login and Admin navigation** (`admin@rapidmind.id` / `password` → `/admin/summary`, verify 4 dedicated links, confirm absence of `Kelola Akun`, verify `/admin/accounts` returns 404).
2. **Posko create/edit/status behavior** (create Posko with coordinates, verify PostGIS lat/long restoration, verify `Aktif` status on list and Summary, verify edit persistence).
3. **Faskes create/edit/status and zero-count behavior** (create Puskesmas, verify `0` healthcare accounts displayed, edit and verify persistence).
4. **Dedicated Relawan provisioning and login** (confirm no role selector, provision Relawan, verify list status and Posko assignment, log out Admin, log in as Relawan → `/relawan/home`, verify PWA navigation).
5. **Dedicated Healthcare provisioning and login** (confirm no role selector, provision Healthcare, verify list status and Faskes assignment, log out Admin, log in as Healthcare → `/healthcare/emergencies`, verify desktop medical workspace).
6. **Posko/Faskes active-assignment deactivation guards** (attempt deactivation with assigned active users, verify rejection and validation feedback, verify master data remains active).
7. **Relawan/Healthcare reassignment** (reassign Relawan/Healthcare to second Posko/Faskes, verify list and detail reflect new assignment, confirm original Posko/Faskes can now be deactivated).
8. **Account deactivation → login rejection → reactivation** (deactivate account, confirm login rejection with Indonesian notice, reactivate with active assignment, confirm login succeeds).
9. **Retained inactive current assignment edge case** (deactivate account, deactivate its assigned Posko/Faskes, verify retained inactive option labelled `Nonaktif (penugasan saat ini)`, verify basic edit succeeds while inactive, verify activation while retaining inactive assignment is blocked by UI/backend, verify activation succeeds when selecting active location).
10. **Inactive Posko/Faskes excluded from new provisioning** (verify create pages `/admin/volunteers/create` and `/admin/facilities/users/create` exclude inactive master data).
11. **New referral UI excludes inactive Faskes** (log in as Healthcare, check referral dropdown in emergency/validation UI, verify inactive Faskes do not appear). *Note: Historical referral pointing to an inactive Faskes was `NOT DIRECTLY TESTED IN BROWSER` by Antigravity (covered by automated test).*
12. **Final Admin Summary/Map/Analytics smoke** (verify Summary KPIs, Map with markers and popups, Analytics charts, Logistics page).

---

## Healthcare Operational Completion MVP — Source and Automated Checkpoint (30 September 2026)

The earlier overall-status and Admin checkpoint entries above are historical evidence. This is the initial implementation checkpoint for the Healthcare operational phase; the focused correction checkpoint below is current.

- **SOURCE-INSPECTED:** Branch `demo` at starting head `ce4ee0a134977d1dfc23248f73eadbfda1a867cf`; inspected routes, domain models, controllers, Vue pages, migrations, tests, and the applicable specifications. The source now includes Relawan phone normalization and native `tel:` action in selected T0 detail; T1/T2 validation worklist and route-backed review; explicit active Faskes selection for new non-T0 referrals; and patient referral history from existing provenance relationships.
- **AUTOMATED TESTED:** The full Laravel suite passed **86 tests, 991 assertions** after adapting prior worklist assertions to the new T1/T2 contract. The new feature tests cover contact exposure and missing phone, worklist ordering and T3 exclusion, selected assessment evidence, explicit referral destination, transactional failure rollback and retry, and T0/non-T0 patient referral provenance. Provisioning and DemoSeeder tests cover canonical phone persistence and preservation of a non-empty number.
- **DATABASE/MIGRATION:** `2026_09_30_000001_add_phone_number_to_users_table` ran successfully; `migrate:status` reported it as Ran. The schema adds nullable `users.phone_number` only. `DemoSeeder` completed on the local demo database, and a Docker read-back confirmed the canonical demo Relawan phone as `+6281234567890`. No dependency was installed.
- **ROUTES/FRONTEND:** Healthcare route listing included `GET /healthcare/validations/{assessmentId}`. Vue TypeScript check and production build passed; build retained the large-chunk advisory warning. `git diff --check` passed.
- **BROWSER VERIFIED — ANTIGRAVITY:** NOT YET PERFORMED for this phase.
- **USER MANUAL RETEST:** NOT YET PERFORMED for this phase.

The selected T0 call link opens the device's telephone handler; it does not confirm a completed call or save the `PHONE` verification method. Non-T0 `Sedang Ditinjau` remains deferred because there is no persistent review/ownership state. T0 confirmation still automatically creates a referral in the prototype, even though the later UX direction separates confirmation from referral. The existing referral/dispatch progression and T0 critical path remain unchanged. Browser behavior, mobile telephone handling, offline behavior, realtime effects, clinical validity, and production security are not established by these source and automated checks.

**Next verification priority:** Antigravity browser verification of the Healthcare flow, followed by user manual retest.

---

## Healthcare Operational Completion MVP — Focused Correction Checkpoint (1 October 2026)

The 30 September checkpoint above remains historical evidence. This correction pass is **SOURCE-INSPECTED** and **AUTOMATED TESTED**; it does not add browser evidence.

- The non-T0 validation POST now accepts only completed source assessments with a T1/T2 system recommendation, matching the selected GET route. Healthcare may still save a T1, T2, or T3 clinical result for an eligible source. A previously saved validation is immutable in this MVP: replay returns success without changing the clinical decision or creating another referral, history event, or validation audit entry.
- `previousAssessments` now includes only assessments completed before the selected assessment, capped at five. The Validasi worklist and selected detail serialize only the reporting user's id, name, shelter_id, and shelter relation; they omit the Relawan phone and email. The selected T0 detail still receives the phone number.
- Patient referral history is explicitly newest first (`created_at`, then id), and current status plus status-history entries use the existing Indonesian terminology from the Healthcare Rujukan view. Referral records and state transitions were not changed.
- **AUTOMATED TESTED:** `docker compose exec -T app php artisan test` passed **90 tests, 1,052 assertions**. Focused tests cover ineligible T3/T0/incomplete/missing-triage POST sources, allowed T3 clinical result from an eligible source, immutable replay, true prior history, omitted phone/email props, and deterministic patient referral order. `route:list` passed with 68 routes; `vue-tsc --noEmit`, `npm run build`, and `git diff --check` passed. The build transformed 1,243 modules and retained the large-chunk advisory warning. Dependencies installed: **NONE**.
- **BROWSER VERIFIED — ANTIGRAVITY:** NOT YET PERFORMED for the Healthcare phase.
- **USER MANUAL RETEST:** NOT YET PERFORMED for the Healthcare phase.

The retained prototype limits in the 30 September checkpoint still apply, including no persistent non-T0 `Sedang Ditinjau` state and the existing automatic T0 referral behavior. The next verification step is the separate Antigravity browser pass.

---

## Healthcare Operational Completion MVP — Browser Verification (1 October 2026)

Status: **SOURCE-INSPECTED / AUTOMATED TESTED (90 tests, 1,052 assertions) / ANTIGRAVITY BROWSER VERIFIED** (for the selected prototype scope and subject to explicit NDVs below).

**USER MANUAL RETEST: NOT YET PERFORMED**.

External browser runtime verification was executed on `http://localhost:8080` using Google Chrome with DevTools/CDP automation. The browser pass found:
- Zero functional defects
- Zero fatal browser console errors
- No unexpected HTTP 4xx/5xx responses
- No application/source/documentation changes during browser verification (`git status --short` was clean)

Testing intentionally modified demo database state through normal application UI interactions (not source changes):
- Created synthetic volunteer `Relawan Phone Test` (`relawan.phone@example.test`, ID 24) assigned to `Posko Candi`.
- Verified Indonesian phone input validation (`12345` rejected) and normalization (`081234567890` saved as `+6281234567890`; updated with `6289876543210` saved as `+6289876543210`).
- Completed Healthcare validation for assessment `6c000387-12cc-5435-a880-6b4967b08031` (Siti Aminah, initial system recommendation T2): validated as `T2`, diagnosis note `"Observasi reaksi stres pascabencana sedang"`, intervention plan `"Konseling suportif dan rujukan lanjutan"`, and generated an active referral to `RSUD Candi`.

### Verification Matrix (Gates A through I)

| Gate | Item | Status | Verification & Evidence |
|---|---|---|---|
| **Gate A: Admin Relawan Phone Provisioning** | A1 | **PASS** | Relawan create form (`/admin/volunteers/create`) contains required `Nomor telepon *` input field (`<input id="phone_number" type="tel" required ...>`). |
| | A2 | **PASS** | Healthcare provisioning form (`/admin/facilities/users/create`) does not show or require the Relawan phone field. |
| | A3 | **PASS** | Submitting invalid phone (`12345`) displays visible error `"Masukkan nomor telepon Relawan Indonesia yang valid."`; form remains usable and interactive. |
| | A4 | **PASS** | Valid Indonesian format `081234567890` saves successfully; redirects to `/admin/volunteers/24` with flash notice `"Akun berhasil dibuat."`. |
| | A5 | **PASS** | Re-opened/reloaded edit page displays phone number normalized to `+6281234567890`. |
| | A6 | **PASS** | Editing with alternate format `6289876543210` saves successfully and normalizes upon reload to `+6289876543210`. |
| **Gate B: T0 Relawan Contact** | B1 | **PASS** | Emergency queue (`/healthcare/emergencies`) displays volunteer name but conceals phone numbers. |
| | B2 | **PASS** | Selected emergency detail (`/healthcare/emergencies/01a0f1fe-843f-716b-af1f-8b1dc5e8b7ec`) renders `"Kontak Relawan Pelapor"` card. |
| | B3 | **PASS** | Contact card renders reporting Relawan name (`Relawan Lapangan Budi`), normalized phone (`+6281234567890`), and `"Hubungi Relawan"` button/link. |
| | B4 | **PASS** | Anchor element uses native `tel:+6281234567890` protocol link. |
| | B5 | **PASS** | Native link verified via DOM inspection without claiming actual telephone connectivity. |
| | B6 | **PASS** | Advisory text verified: *"Panggilan dibuka melalui perangkat Anda. Simpan metode verifikasi secara terpisah setelah menghubungi Relawan."*. |
| | B7 | **PASS** | Viewing or inspecting contact link does not create a `PHONE` verification, does not alter emergency status (`PENDING`), and does not advance clinical workflow. |
| | B8 | **NDV** | Fallback message when Relawan has no phone number: **Not Directly Verified** (all existing demo T0 emergencies were reported by a volunteer with a provisioned phone number; covered by automated test `selected emergency exposes contact but queue does not and missing phone renders fallback`). |
| **Gate C: Validasi Worklist** | C1 | **PASS** | Worklist (`/healthcare/validations`) displays distinct `"Perlu Divalidasi"` and `"Selesai"` sections. |
| | C2 | **PASS** | `"Perlu Divalidasi"` contains only completed source assessments with T1/T2 recommendations (Siti Aminah, T2). |
| | C3 | **PASS** | T3 assessments do not appear as active validation work. |
| | C4 | **NDV** | T1-before-T2 priority ordering: **Not Directly Verified** (initial demo worklist contained only one unvalidated assessment; covered by automated test `worklist prioritizes oldest t1 then t2 and keeps t3 in patient history`). |
| | C5 | **NDV** | Same-category FIFO ordering: **Not Directly Verified** (single unvalidated assessment in demo dataset; covered by automated test `worklist prioritizes oldest t1 then t2 and keeps t3 in patient history`). |
| | C6 | **PASS** | Completed validations appear in `"Selesai"` with recommendation, doctor validation badge, and detail link. |
| **Gate D: Selected Validation Detail** | D | **PASS** | Selected assessment (`/healthcare/validations/6c000387-12cc-5435-a880-6b4967b08031`) renders patient identity, NIK, Posko, reporting volunteer, timestamp, system recommendation (T2), total score (11/37), SRQ (6/20), Risk (3/8), Function (2/9), expandable structured SRQ/risk/function answers, prior assessment history, active Faskes selector, and clinical disclaimer. Zero Relawan phone/email exposed. Previously completed validation renders read-only without editable form. |
| **Gate E: Validation Failure Behavior** | E | **PASS** | Submitting validation with clinical notes and `Rujukan diperlukan = true` without selecting a Faskes was rejected; user remained on page; facility required validation error displayed; form inputs preserved; no success state shown. |
| **Gate F: Successful Validation & Referral** | F | **PASS** | Submitting with active Faskes (`RSUD Candi`) succeeded; page transitioned to read-only stored validation; clinical result `T2`, notes, plan, and destination retained; moved from `"Perlu Divalidasi"` to `"Selesai"`; re-opening remained read-only; reload created no duplicate referrals. Patient detail (`/healthcare/patients/01a0f1e7-5fbb-72c3-a962-ed5699f19a37`) rendered referral with `Sumber: Validasi Asesmen (Rekomendasi Sistem T2)`, `RSUD Candi`, Indonesian status (`Aktif Terbit`), referrer, created timestamp, and status history. |
| **Gate G: T0 Referral Provenance** | G | **PASS** | Patient history (`/healthcare/patients/01a0f1dd-3d34-702b-b6bb-203571e99c32`) explicitly distinguishes `Sumber: Darurat T0` from `Sumber: Validasi Asesmen`, displaying destination (`RSUD Candi`), current Indonesian status (`Selesai di RS`), referrer, and multi-stage status history. |
| **Gate H: Historical Inactive Faskes** | H | **NDV** | Referral pointing to inactive Faskes: **Not Directly Verified** (all existing demo referrals point to active `RSUD Candi`; covered by automated test `historical referral remains readable after facility becomes inactive`). |
| **Gate I: T0 Regression Smoke** | I | **PASS** | Emergency queue loads; selected emergency loads; emergency status (`CONFIRMED`) renders; verification history renders; referral data renders; zero unexpected 4xx/5xx HTTP errors observed during navigation. |

### Explicit NDV List & Reasons:
1. **B8 — Missing-Phone Fallback:** In the current demo dataset, all reporting Relawans for existing T0 emergencies have provisioned phone numbers. Covered by automated test `selected emergency exposes contact but queue does not and missing phone renders fallback`.
2. **C4 — T1-before-T2 Priority Ordering:** The initial demo worklist contained only one unvalidated assessment (`T2` Siti Aminah). Covered by automated test `worklist prioritizes oldest t1 then t2 and keeps t3 in patient history`.
3. **C5 — Same-Category FIFO Ordering:** Single unvalidated assessment in initial demo worklist. Covered by automated test `worklist prioritizes oldest t1 then t2 and keeps t3 in patient history`.
4. **H — Historical Inactive Faskes Referral:** All historical demo referrals point to active `RSUD Candi`. Covered by automated test `historical referral remains readable after facility becomes inactive`.

### Retained Limitations & Project Boundaries:
- **USER MANUAL RETEST — NOT YET PERFORMED**: The browser verification above was conducted autonomously by **Antigravity (Chrome-CDP)**. It provides external browser-level evidence, but does NOT substitute for the project owner's manual verification before the final team demonstration.
- **Actual device/OS telephone call connectivity: NOT VERIFIED** (verified native `tel:` URI and DOM attributes only).
- **Non-T0 Sedang Ditinjau persistent review/ownership state:** Still not implemented in this prototype.
- **Automatic T0 Referral:** T0 confirmation still automatically creates a referral in the current prototype.
- **Standard Prototype Caveats:** Production readiness, security hardening, offline/PWA sync, realtime beyond tested scope, clinical validity, and full E2E coverage remain unproven and out of scope.

### Checklist for Owner Manual Retest (Healthcare Completion Scope):
1. **Relawan Phone Provisioning:** Admin create/edit Relawan, verify phone requirement, invalid rejection, and normalization (`08...` and `62...` to `+628...`).
2. **Healthcare Provisioning:** Verify Healthcare user creation does not expose Relawan phone field.
3. **T0 Relawan Contact:** Verify emergency queue hides phone number; verify selected emergency shows name, normalized phone, and `Hubungi Relawan` `tel:` link.
4. **Validasi Worklist:** Verify `Perlu Divalidasi` shows T1/T2 assessments and excludes T3; verify `Selesai` lists completed validations.
5. **Validation Review & Form Failure:** Open T1/T2 assessment, verify full clinical evidence and disclaimer; submit with referral checked but no facility selected, verify rejection and input preservation.
6. **Validation & Referral Success:** Select active Faskes, submit, verify transition to read-only stored view, verify movement to `Selesai`, and verify patient profile shows `Sumber: Validasi Asesmen` with Indonesian status.
7. **T0 Provenance:** Open patient with T0 referral, verify provenance is marked `Sumber: Darurat T0` distinct from assessment referrals.
8. **T0 Regression Smoke:** Verify emergency queue, detail, verification logs, and referral dispatch progression.
9. **Missing-Phone T0 Fallback:** If a safe fixture is available, open a T0 incident whose reporting Relawan has no phone number and verify the fallback coordination message is displayed instead of `Hubungi Relawan`.
10. **Validasi Priority Ordering:** With both unvalidated T1 and T2 assessments available, verify T1 appears before T2 in `Perlu Divalidasi`.
11. **Validasi FIFO Ordering:** With multiple unvalidated assessments in the same T1/T2 category, verify the older assessment appears before the newer assessment.
12. **Historical Inactive Faskes:** If a safe historical fixture is available, open a patient whose existing referral points to a now-inactive Faskes and verify the original destination remains visible and is marked `(Nonaktif saat ini)`.

## 11. Phase B1 Verification — Local Data & Replay Contract

**Checkpoint:** `9d3900fa95fc68b5f7f64166fa1a9617a57702ed`
**Status:** B1 **COMPLETE / PASS for the selected prototype scope**; B2 is next and B3 remains pending.

| Verification slice | Status | Evidence / scope |
|---|---|---|
| B1 source implementation | **PASS — SOURCE INSPECTED** | Account-scoped repositories, stable UUIDs, outbox, metadata, transport, and sync endpoints inspected. |
| B1 automated contract | **PASS — AUTOMATED TESTED** | `RelawanSyncContractTest`: 15 targeted tests / 121 assertions. |
| Full backend regression | **PASS** | 111 tests / 1,258 assertions. |
| Authenticated assessment sync transport | **PASS — BROWSER/RUNTIME VERIFIED** | HTTP 201 first submission; HTTP 200 exact replay; client assessment and patient UUIDs preserved; replay created no duplicate logical assessment. |
| Authenticated emergency sync transport | **PASS — BROWSER/RUNTIME VERIFIED** | HTTP 201 first submission; HTTP 200 exact replay; `replayed = true`; same emergency UUID preserved. |
| Normal assessment local-first path | **PASS / B2A** | Local patient/assessment creation, stage persistence, local triage, completion, Result, and priority-2 outbox path verified. |
| T0 local-first path | **PENDING / B2B** | Real Relawan T0 UI integration remains for the next checkpoint. |
| Shell/Data operational integration | **PENDING / B2C** | Real shell state, Data workspace, and operational sync integration remain pending. |
| Offline reload/reopen and PWA | **NOT YET VERIFIED / B3** | Service Worker shell and complete disconnect/reconnect workflow were not tested. |
| Populated v1 IndexedDB upgrade | **NOT DIRECTLY RUNTIME TESTED** | Migration exists and was source/static verified; populated real-browser v1 upgrade was not exercised. |
| Concurrent load replay | **NOT LOAD TESTED** | Server transaction/identity locking exists; real concurrent duplicate replay was not load-tested. |

### Focused Authenticated Browser Gate

This was a focused authenticated browser/session synchronization gate through the running Nginx/Laravel application, not a full offline/PWA browser gate, complete browser E2E test, load test, or production certification. Manual DevTools calls were runtime evidence and were not an automated browser test.

Assessment synchronization:

```text
POST /relawan/sync/assessments
-> HTTP 201
-> client assessment UUID preserved
-> client patient UUID preserved
-> status IN_PROGRESS
-> created = true

same payload replay
-> HTTP 200
-> same assessment UUID and patient UUID
-> deterministic replay; no duplicate logical assessment
```

Emergency synchronization:

```text
POST /relawan/sync/emergencies
-> HTTP 201
-> client emergency UUID preserved
-> assessment relationship preserved
-> created = true

same payload replay
-> HTTP 200
-> replayed = true
-> same emergency UUID
```

The B1 contract coverage includes stable IDs, canonical server triage, client triage non-authority, exact and conflicting assessment replay, ownership collision, `IN_PROGRESS` shell reconciliation, invalid complete-payload rollback, unidentified emergency, exact emergency replay, one `EmergencyCreated` dispatch for first creation only, local patient reconciliation, minimal T0 assessment shell creation, later completion using the same UUID, replay after assessment-mode change, same-shelter existing-patient semantics, inaccessible-patient protection, partial `IN_PROGRESS` response groups, non-Relawan endpoint rejection, patient/assessment relationship conflict, and broadcast-failure persistence.

The corrected replay semantic remains: `assessment_mode` used to create a missing T0 assessment shell is dependency context, not immutable emergency replay identity. An exact T0 replay remains valid if the linked assessment later changes mode during canonical assessment synchronization.

## 12. Phase B2A Verification — Local-First Normal Assessment Workflow

**Checkpoint:** `49f632ab4a5d7b7bd624da298ce123d9c4f7aa13`
**Status:** B2A **COMPLETE / PASS for the selected prototype scope**. Phase B remains **IN PROGRESS**; B2B is next, B2C is pending, and B3 is pending.

| Verification slice | Status | Evidence / scope |
|---|---|---|
| Remote/source B2A implementation | **PASS — SOURCE INSPECTED** | Pushed checkpoint reviewed; local patient/assessment shell, Identity, stage persistence, local triage, Result, and priority-2 outbox path are present. |
| `AssessmentLocalShellTest` | **PASS — AUTOMATED TESTED** | 3 passed / 92 assertions. |
| `RelawanSyncContractTest` regression | **PASS — AUTOMATED TESTED** | 15 passed / 121 assertions. |
| Full Laravel regression | **PASS** | 114 tests / 1,350 assertions. |
| Vue TypeScript | **PASS** | `./node_modules/.bin/vue-tsc --noEmit`. |
| Production build | **PASS** | `npm run build`; existing `>500 kB` chunk advisory only. |
| Git diff check | **PASS** | `git diff --check`. |
| New local assessment creation | **PASS — BROWSER/RUNTIME VERIFIED** | Patient and assessment created in `RapidMindOfflineDB` with stable UUIDs; `IN_PROGRESS`; `LOCAL_SAVED`; no `POST /relawan/assessment` required. |
| Stage-local persistence | **PASS — BROWSER/RUNTIME VERIFIED** | SRQ, Risk, and Function answers confirmed directly in IndexedDB; stage progression did not require server POST success. |
| Resume behavior | **PASS — BROWSER/RUNTIME VERIFIED** | Partial SRQ work survived leaving and resuming the assessment. |
| Local triage and Result | **PASS — BROWSER/RUNTIME VERIFIED** | SRQ 4 + Risk 4 + Function 2 = 10/37; local recommendation T2 existed before successful synchronization. |
| Forced synchronization failure | **PASS — BROWSER/RUNTIME VERIFIED** | Assessment remained `COMPLETED`, `SYNC_FAILED`, with local completion time and triage preserved. |
| Priority-2 `ASSESSMENT` outbox | **PASS — BROWSER/RUNTIME VERIFIED** | Failed item had type `ASSESSMENT`, priority 2, status `FAILED`, revision 1, retry count 1. |
| HTTP 201 recovery/reconciliation | **PASS — BROWSER/RUNTIME VERIFIED** | Restored sync returned HTTP 201; local state became `SYNCED`; outbox entry was removed. |
| Stable client/server UUIDs | **PASS — BROWSER/RUNTIME VERIFIED** | Client-generated assessment and patient UUIDs became canonical PostgreSQL identifiers. |
| Duplicate protection | **PASS — BROWSER/RUNTIME VERIFIED** | Repeated synchronization/reload did not create duplicate logical patient or assessment. |
| Existing-server-patient reuse | **PASS — BROWSER/RUNTIME VERIFIED** | A second local assessment reused an existing canonical server patient UUID. |
| Cross-account isolation | **PASS — BROWSER/RUNTIME VERIFIED** | Non-destructive isolation verified across two Relawan accounts; each saw only its own records and drafts across logout/login. |
| Offline reload/reopen/PWA boundary | **NOT YET VERIFIED / B3** | B2A did not verify Service Worker startup, true offline reload/reopen, or the complete PWA disconnect/reconnect golden gate. |

**Browser/runtime scope:** Gates A-L **PASS** with no functional browser/runtime error observed in the B2A gate. This is Chrome/CDP and direct IndexedDB/network evidence, not complete automated browser E2E coverage, production readiness, security certification, or clinical certification. B2A did not redesign STT/Q17 behavior; Phase C remains separate.
