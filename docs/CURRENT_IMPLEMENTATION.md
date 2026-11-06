# RAPID-MIND — Current Implementation Reference

**Reviewed:** 7 November 2026 (Asia/Jakarta), documentation D1

**Application source baseline:** `demo` at `e85b981`

**Previous inventory baseline:** 24 October 2026, `7839420` (Checkpoint 2C)

**Purpose:** concise source-aligned inventory; not a product-requirements replacement

**Requirements authority:** current owner instructions, later-approved safety decisions,
then approved domain/UX specifications and the original `docs/workflow.md` vision

**Evidence authority:** dated checkpoint reports and `docs/workflow-verification.md`

D1 inspected source, test sources and existing reports only. No tests, runtime,
browser, migration or enrollment was rerun. `IMPLEMENTED` is not `PASS` or
`ACCEPTED`; dated test results apply only to their recorded scope.

Status labels in this document mean:

- **IMPLEMENTED:** present in current repository source.
- **BACKEND ONLY:** persisted/service/HTTP behavior exists without current UI controls.
- **PARTIAL:** only part of the intended workflow exists or legacy compatibility is active.
- **PLANNED:** specified but not implemented in the current source.
- **UNVERIFIED:** source may exist, but the stated runtime behavior lacks direct evidence for this checkpoint.
- **REQUIRES OWNER DECISION:** implementation and an authoritative requirement/design decision disagree.

## 1. Product and stack

RAPID-MIND is one Laravel application and one user-facing website with three
canonical roles: `RELAWAN`, `HEALTHCARE`, and `ADMIN`. It is a disaster
mental-health decision-support prototype, not an autonomous diagnostic system.

**IMPLEMENTED stack:** Laravel 13, Vue 3, Inertia.js, TypeScript, Tailwind CSS,
PostgreSQL/PostGIS, Eloquent, Laravel Reverb/Echo, queue/scheduler services,
IndexedDB/Dexie, a Relawan-scoped PWA/service worker, MapLibre, ECharts, Nginx,
and Docker Compose. Web navigation without an Authorization header uses a
version-bound Laravel session. API routes require bearer JWT authentication;
user activity, token version and refresh-family validity are checked. A web
session alone does not authenticate API requests. Authentication does not unlock
clinical ciphertext; offline key access has its own passphrase/recovery lifecycle.

## Final team decision update — 7 November 2026

The owner/team approved Healthcare T0 downgrade to T1/T2/T3, superseding the old
T1/T2-only design. Controller classification accepts those results, maps them to
DOWNGRADED, and writes verification/audit records in a locked transaction. This
is explicit Healthcare-owned product behavior, not external protocol certification.

Healthcare receives necessary details subject to case/facility authorization,
not universal access granted by the role. Inspected list/detail reads use broad
queries/ID lookup without case/facility filters; workflow access checks role and
activity, and the emergency broadcast channel is role-wide. This is a scoped
source finding requiring authorization review, not proof of approved unrestricted
patient access. Internal Dispatch assignment does not establish external vehicle
contact, pickup or physical response.

P1 remains multi-select observational reasons with optional OTHER note and no
scoring/diagnostic/T0 effect. P2 permits three explicit visible choices if
UNANSWERED remains distinct on untouched/reset input; current
`resources/js/components/Relawan/Assessment/SrqResponseControl.vue` renders four
controls. Q17 confirmation before persistence and scoring guards remain unchanged.
No UI redesign is implemented or requested here. Relawan remains limited to its
own report and delivery state. Official Admin reporting requirements/gaps are in
[the Admin specification](RAPID_MIND_ADMIN_WORKSPACE.md). C1 acceptance and C2/C3
remain pending; real-user migration/plaintext cleanup remain P0 objectives.

## 2. Role architecture

| Role | Implemented responsibility | Explicit boundary |
|---|---|---|
| RELAWAN | PFA, patient/assessment context, SRQ-20, risk factors, daily function, system triage recommendation, verified T0-Suspect creation, local persistence and synchronization | Does not clinically confirm T0 and does not receive Healthcare referral/dispatch state |
| HEALTHCARE | T0 acknowledgement, secondary verification, clinical classification, non-T0 validation, referral decisions, patient history, and patient-specific Dispatch UI/backend commands | Does not provision users/facility master data; dispatch does not change clinical classification |
| ADMIN | Account/facility/Posko provisioning, regional aggregates, marker maps, Relawan assignment, and resource-need/allocation records | No patient-specific acknowledgement, classification, referral decision, or dispatch progression |

## 3. Navigation and route inventory

All role routes below use `auth.jwt` plus the matching role middleware unless
otherwise stated.

### Relawan

Visible bottom navigation in `resources/js/layouts/RelawanLayout.vue`:

| Label | Route | Page/source | Status |
|---|---|---|---|
| Beranda | `/relawan/home` | `resources/js/Pages/Relawan/Home.vue` | **IMPLEMENTED** |
| PFA | `/relawan/pfa` | `resources/js/Pages/Relawan/Pfa.vue` | **IMPLEMENTED** |
| Asesmen | `/relawan/assessment` | `resources/js/Pages/Relawan/Assessment/Index.vue` | **IMPLEMENTED** |
| Data | `/relawan/data` | `resources/js/Pages/Relawan/Data.vue` | **IMPLEMENTED** |

Supporting routes include:

```text
GET  /relawan/patients/options
GET  /relawan/assessment/drafts
POST /relawan/assessment
GET  /relawan/assessment/{assessmentId}/identity
GET|POST /relawan/assessment/{assessmentId}/srq
GET|POST /relawan/assessment/{assessmentId}/risk
GET|POST /relawan/assessment/{assessmentId}/function
GET  /relawan/assessment/{assessmentId}/review
POST /relawan/assessment/{assessmentId}/complete
GET  /relawan/assessment/{assessmentId}/result
POST /relawan/sync/assessments
POST /relawan/sync/emergencies
GET  /relawan/offline-enrollment-status
POST /relawan/emergencies
GET  /relawan/emergencies/{emergencyId}
```

`GET /relawan/session-status` is the read-only recovery boundary outside the
role-prefixed middleware group.

### Healthcare

Visible sidebar in `resources/js/layouts/HealthcareLayout.vue`:

| Label | Route | Page/source | Status |
|---|---|---|---|
| Triase & Kedaruratan | `/healthcare/emergencies` | `resources/js/Pages/Healthcare/Emergencies/Index.vue` | **IMPLEMENTED** |
| Validasi Klinis | `/healthcare/validations` | `resources/js/Pages/Healthcare/Validations/Index.vue` | **IMPLEMENTED** |
| Rujukan | `/healthcare/referrals` | `resources/js/Pages/Healthcare/Referrals/Index.vue` | **IMPLEMENTED — clinical completion + legacy compatibility** |
| Data Pasien & Riwayat | `/healthcare/patients` | `resources/js/Pages/Healthcare/Patients/Index.vue` | **IMPLEMENTED** |

Read/detail routes:

```text
GET /healthcare/emergencies/{emergencyId}
GET /healthcare/validations/{assessmentId}
GET /healthcare/patients/{patientId}
```

Clinical and legacy referral mutations:

```text
POST /healthcare/emergencies/{emergencyId}/acknowledge
POST /healthcare/emergencies/{emergencyId}/verify
POST /healthcare/emergencies/{emergencyId}/classify
POST /healthcare/emergencies/{emergencyId}/referrals
POST /healthcare/validations/{assessmentId}
POST /healthcare/referrals/{referralId}/status
```

Independent Referral/Dispatch commands (2C backend, 2D/2E UI integration; schema required):

```text
POST /healthcare/emergencies/{emergencyId}/dispatches
POST /healthcare/dispatches/{dispatchId}/status
POST /healthcare/dispatches/{dispatchId}/referral
POST /healthcare/referrals/{referralId}/complete
```

### Admin

Visible grouped sidebar in `resources/js/layouts/AdminLayout.vue`:

| Group | Label | Route | Page/source | Status |
|---|---|---|---|---|
| Command Center | Pusat Komando | `/admin/summary` | `resources/js/Pages/Admin/Summary.vue` | **IMPLEMENTED** |
| Command Center | Data Longitudinal | `/admin/analytics` | `resources/js/Pages/Admin/Analytics.vue` | **IMPLEMENTED** |
| Operations | Manajemen Relawan | `/admin/volunteers` | `resources/js/Pages/Admin/People/Index.vue` | **IMPLEMENTED** |
| Operations | Posko & Sumber Daya | `/admin/operations/posko` | `resources/js/Pages/Admin/MasterData/Index.vue` | **IMPLEMENTED** |
| Operations | Kebutuhan Logistik | `/admin/logistics` | `resources/js/Pages/Admin/Logistics.vue` | **IMPLEMENTED** |
| Healthcare Network | Organisasi Faskes | `/admin/facilities/organizations` | `resources/js/Pages/Admin/MasterData/Index.vue` | **IMPLEMENTED** |
| Healthcare Network | Akun Healthcare | `/admin/facilities/users` | `resources/js/Pages/Admin/People/Index.vue` | **IMPLEMENTED** |
| Spatial | Peta Geospasial | `/admin/map` | `resources/js/Pages/Admin/Map.vue` | **IMPLEMENTED — markers, not density heatmap** |

Supporting mutations create/update Relawan and Healthcare accounts, Posko and
Faskes records, resource needs, and resource allocations. `/admin/facilities`
redirects to `/admin/facilities/organizations` for compatibility.

## 4. Implemented workflows

### Relawan field workflow

**IMPLEMENTED:** local-first assessment identity, SRQ-20, five risk factors,
three daily-function domains, review, system triage recommendation, and outbox
synchronization. A verified T0-Suspect is persisted locally before transmission,
uses priority 1 ahead of routine assessment synchronization, and supports
unidentified emergencies. Manual answers remain authoritative over STT.

**P1 — IMPLEMENTED:** non-verbal observations support `NOT_SPEAKING`,
`SEVERE_DISTRESS`, `SPEECH_DIFFICULTY`, `HEARING_COMMUNICATION_BARRIER`,
`CHOOSES_NOT_TO_SPEAK`, `UNKNOWN`, and `OTHER`. Multiple distinct reasons are
allowed, except UNKNOWN must stand alone. OTHER can have an optional note up to
500 characters; notes require OTHER. Draft/sync and Healthcare presentation retain
these observations without diagnosing or changing SRQ/risk/function/triage/T0.

**P2 — IMPLEMENTED:** YES/NO/UNCLEAR/UNANSWERED survive client/storage/API/server
and Healthcare boundaries. Definitive YES/NO retain boolean compatibility;
unresolved persisted rows use nullable `answer` plus `answer_state`. Missing or
malformed evidence is not NO/zero. Scoring requires all 20 definitive answers.
Manual or STT apparent Q17 YES requires explicit confirmation before persistence;
protected manual answers remain authoritative. Final T0 verification/submission
is separate and available without a complete assessment.

The additive schema is defined in
`database/migrations/2026_11_03_000000_add_assessment_observations_and_srq_states.php`;
its application to the current runtime database was not checked by D1.

**PARTIAL:** browser/device support varies. Native SMS is a user-mediated `sms:`
handoff, not confirmed automatic delivery. Fresh offline authentication,
installed-standalone PWA interoperability across all platforms, complete offline
Whisper, and production security are not claimed.

### Healthcare emergency and validation workflow

**IMPLEMENTED:** the emergency screen combines a queue with one selected case.
The tabs are `Ringkasan`, `Asesmen`, `Tindakan`, and `Riwayat`. Server-enforced
handling is:

```text
PENDING → ACKNOWLEDGED → REVIEWING → CONFIRMED | DOWNGRADED
```

T0 confirmation does not automatically create a referral. A separate explicit
action creates an emergency-origin referral to an active facility. Exact retries
are no-ops under the documented match rules; stale/changed requests conflict.

**IMPLEMENTED:** `/healthcare/validations` shows pending completed T1/T2
assessments and completed validation history. Healthcare may save a T1/T2/T3
result for an eligible non-T0 assessment and may explicitly create a referral.

**IMPLEMENTED:** patient search and detail provide `Ringkasan`, `Asesmen`,
`Darurat`, `Validasi`, and `Rujukan` longitudinal sections.

### Admin operations

**IMPLEMENTED:** Pusat Komando uses persisted aggregate data; Peta Geospasial
shows Posko and available Faskes markers plus a Posko directory; Data Longitudinal
shows T1/T2/T3 distribution and 30 daily completed-assessment case counts;
provisioning manages role-specific accounts and assignments; logistics stores
resource needs and append-only allocation records.

**PARTIAL:** some current metric labels/populations require follow-up alignment.
The map is not a full density heatmap, and analytics are counts without a reliable
population denominator or patient-recovery inference.

## 5. Referral and Dispatch architecture

The implemented target domains are independent:

```text
Clinical classification ≠ Referral ≠ EmergencyDispatch
```

### Referral

Referral records a Healthcare clinical handoff decision to a destination Faskes.
It can originate from a confirmed T0 emergency or a non-T0 clinical validation.
The target lifecycle is:

```text
ACTIVE → COMPLETED
```

Creation and new completion commands write status history and audit records in
the same transaction. Source provenance, patient, facility, actor, and notes are
preserved.

**IMPLEMENTED WITH COMPATIBILITY:** with additive schema available, ACTIVE rows
use the independent clinical-completion UI/endpoint. Completion means internal
referral work is finished, not that a facility accepted/admitted/treated the
patient. `Referral.status` still casts to the legacy `ReferralStatus`;
intermediate legacy rows retain movement controls and `/referrals/{id}/status`.
Without schema readiness, legacy controls remain the fallback. Final legacy
retirement/constraint cutover and runtime verification remain pending evidence.

### EmergencyDispatch

EmergencyDispatch records operational assignment and movement after a confirmed
T0 emergency. It has one emergency, one active preconfigured response unit, an
assigner/time, an immutable target snapshot, optional referral, status, notes,
and ordered history. One dispatch is allowed per emergency and a linked referral
must originate from the same emergency/patient context.

```text
ASSIGNED → EN_ROUTE → ON_SITE → TRANSPORT → COMPLETED
                            └────────────→ COMPLETED
```

Assignment, transition, and link services use database transactions, row locks,
expected state, exact-replay semantics, conflicts for changed retries, atomic
history/audit writes, and database uniqueness/foreign-key barriers. T0 dispatch
may exist without a referral or identified patient. Dispatch progression never
changes clinical classification or completes a referral.

**IMPLEMENTED UI + BACKEND:** selected-case actions and emergency detail expose
sibling Referral/Dispatch controls. `HealthcareOperationsRead` supplies compact
operations, active units, server target choices, histories and enum-derived next
statuses; the patient view includes separate operational history. Confirmed T0
remains in the active queue while Dispatch is absent/unfinished or any Referral
is unfinished. Referral completion alone does not remove it.

Read readiness checks Dispatch/history/unit tables and the Referral verification
column. Missing prerequisites produce `operations.available: false`, empty unit
options and disabled new controls, conservatively retaining confirmed cases.
Source availability does not establish deployed schema or successful mutations.
There is no cancellation, reassignment, capacity reservation, fleet management,
external team contact, or facility-acceptance workflow.

## 6. UI/backend integration and prerequisites

| Capability | Current status |
|---|---|
| T0 acknowledgement, verification, classification | **IMPLEMENTED UI + backend** |
| Explicit T0/non-T0 referral creation | **IMPLEMENTED UI + backend** |
| Legacy referral movement progression | **IMPLEMENTED compatibility UI + backend** |
| Independent clinical referral completion | **IMPLEMENTED UI + backend; schema required** |
| Dispatch assignment/progression/linking | **IMPLEMENTED UI + backend; schema required** |
| Response-unit registry persistence | **IMPLEMENTED foundation; no CRUD UI** |
| Dispatch read props, queue projection, patient timeline | **IMPLEMENTED — 2D/2E; schema-aware** |
| Separated-domain synthetic demo fixtures | **IMPLEMENTED seeder; runtime execution not established here** |
| Dispatch/Referral realtime updates | **IMPLEMENTED events/listeners; live transport not verified by D1** |

## 7. Realtime, P0 privacy and offline/PWA

- **IMPLEMENTED:** `HealthcareLayout.vue` owns the Healthcare-only private
  `emergencies` subscription. Emergency events and ID-only `DispatchUpdated` /
  `ReferralUpdated` reconcile route-appropriate canonical props. Operational
  notifications emit only after transaction commit; rollback/replay do not emit
  duplicate notifications, and transport failures do not undo persistence.
  Coalescing/draft deferral and separate HTTP/socket readiness remain in place.
- **IMPLEMENTED P0:** enrolled-owner clinical records/outbox use AES-256-GCM,
  wrapped keys, explicit lock/recovery and owner/generation fences. Ordinary
  enrollment requires server-approved exact `http://localhost:8080` local policy,
  default-off opt-in and a matching active Relawan web session. Existing enrolled
  owners can unlock offline; API authentication and offline decryption are separate.
- **IMPLEMENTED:** initialization fails closed for legacy/unknown/inconsistent
  storage; no automatic historical migration or deletion occurs. Retention checks
  are read-only eligibility decisions, not automatic purge. Old/raw same-origin
  writers remain a cutover limitation. See
  [offline security](RAPID_MIND_OFFLINE_SECURITY_DESIGN.md) for the current contract.
- **IMPLEMENTED:** clinical no-store/history protection, locked-DOM masking,
  owner-scoped repositories, stable UUIDs, priority outbox, session recovery,
  same-owner Web Locks where supported, and static-asset PWA readiness/update gates.
  Browser cache/privacy success is limited to the recorded C1 fixture scope.
- **NOT IMPLEMENTED:** Admin realtime aggregate subscriptions.
- **UNVERIFIED BY D1:** live transport, current database/configuration, real-device
  behavior, general real-user activation/migration/cleanup, and production readiness.

## 8. Checkpoint evidence and pending acceptance — 7 November 2026

October **STT C1/C2** mean speech foundation/interpretation. November **Safety
C1/C2** mean browser/privacy/PWA and local integration. Historical STT passes do
not close November acceptance gates.

| Scope | Source status | Previously recorded verification and limits |
|---|---|---|
| Referral/Dispatch 2D/2E | UI, projections, events/listeners and deterministic fixture seeder implemented | [2D/2E report](checkpoints/checkpoint-2de-frontend-realtime-fixtures.md): 173 Laravel tests / 2,057 assertions, 9 Node/Vue tests, typecheck/build and other focused checks; isolated testing DB, no live browser/Reverb acceptance. Not rerun by D1. |
| B4.4 local enrollment | Server-authorized ordinary-asset localhost enrollment implemented | [B4.4 report](checkpoints/checkpoint-b44-controlled-development-activation.md): owner dummy-profile enrollment and scoped browser acceptance passed; corrected SRQ map and 61/61 interception matcher assertions recorded. Not general real-clinical-user migration or production activation. |
| November Safety C1 | **IMPLEMENTED — ACCEPTANCE PENDING** | [C1 report](checkpoints/checkpoint-c1-local-browser-integration.md): 29 Node files / 0 failures, 82 PHP tests / 302 assertions, typecheck/build/lint; Chromium 18 PASS / 1 NOT TESTED. Ordinary production-built assets/actual worker, synthetic authentication/server responses. Not rerun by D1. |
| November Safety C2 | **PENDING integration acceptance** | Relawan → outbox/sync → live Laravel/PostgreSQL → Healthcare, authorization, realtime, replay/failure semantics and privacy are not established by C1 or old STT C2 results. |
| November Safety C3 | **PENDING final acceptance** | Final local P0–P2 regression/signoff, including unresolved C1 conditions; no production certification implied. |

Natural background/foreground lock remains **NOT TESTED** in C1: automated
minimization/tab switching did not produce a trusted hidden transition. A
synthetic visibility-handler pass does not close it; native mobile background
lock remains unverified. C1 also did not submit a browser T0, exercise live
backend authentication/sync, or verify migration between different release asset
graphs. These remain distinct from successful isolated offline restart.

Referral/Dispatch schema deployment, final legacy retirement/constraint cutover
and runtime acceptance are not established by this source review. The dated
[2F-B2.2 report](checkpoints/checkpoint-2fb2-additive-deployment.md) records an
attempt stopped before migrations, not current service/database state. No reset,
migration, seeding or activation is authorized by D1.

Full density heatmap, Admin realtime aggregates, exports, live volunteer GPS,
response-unit CRUD/fleet features, continuous STT and complete offline Whisper
remain backlog. P0–P2 and C1–C3 take priority; no next phase starts automatically.

## 9. Known requirement and design deviations

1. **APPROVED TEAM DECISION — 7 November 2026:** Healthcare may explicitly and
   auditably downgrade T0-Suspect to T1/T2/T3. This supersedes the earlier T1/T2-only
   restriction and matches current controller/UI support. No external clinical
   protocol certification or new runtime test is implied.
2. **PARTIAL — offline fallback:** `docs/workflow.md` describes automatic SMS and
   broad Background Sync behavior; current browser SMS is user-mediated and the
   document-side outbox remains central to synchronization.
3. **PARTIAL — Admin geospatial:** requirements describe a T0–T3 density heatmap;
   current maps use Posko/Faskes markers and aggregate T0 emphasis.
4. **PARTIAL — Admin realtime:** requirements describe live aggregate updates;
   current Admin layout has browser connectivity state but no Echo subscription.
5. **PARTIAL — Referral compatibility:** independent completion UI/backend is
   implemented when schema is ready; intermediate legacy movement rows, the old
   endpoint and model cast remain until separately verified retirement/cutover.
6. **IMPLEMENTATION GAP — official Admin metrics:** approved counts/geography
   must use Healthcare-validated outcomes only, without patient identity. Current
   categories, trends and maps mix recommendations/suspects; raw validated totals
   omit emergency downgrade categories and lack cross-source deduplication. The
   current confirmed-total KPI has no recommendation fallback. See the detailed
   query/gap matrix in `docs/RAPID_MIND_ADMIN_WORKSPACE.md`; nothing is fixed here.
7. **SUPERSEDED DESIGN — Relawan visibility:** the approved team decision limits
   Relawan to its own T0-Suspect report and delivery state. Older proposals to
   expose Healthcare milestones are superseded, not pending policy decisions.

## 10. References

Focused source/test anchors (repository-relative; inspected, not executed by D1):

- `app/Domain/Assessment/SrqAnswer.php`, `app/Domain/Assessment/NonVerbalObservations.php`
- `app/Domain/Sync/AssessmentSynchronizer.php`, `resources/js/offline/assessmentContract.ts`
- `resources/js/composables/useSrqResponses.ts`, `resources/js/lib/healthcareAssessmentPresentation.ts`
- `app/Domain/Healthcare/HealthcareOperationsRead.php`, `app/Domain/Healthcare/HealthcareWorkflowEvents.php`
- `resources/js/components/Healthcare/Operations/DispatchPanel.vue`, `resources/js/components/Healthcare/Operations/ClinicalReferralCard.vue`
- `tests/Feature/AssessmentResponseContractTest.php`, `tests/Feature/HealthcareWorkflowRealtimeTest.php`
- `tests/Node/relawanSrqSafety.test.ts`, `tests/Node/healthcareAssessmentPresentation.test.ts`

Documentation and checkpoint references:

- Requirements: current owner/later-approved safety decisions, approved domain
  specifications, and original `docs/workflow.md` subject to those decisions
- Technical architecture/status: `docs/RAPID_MIND_TECHNICAL_PLAN.md`
- Admin design and current alignment: `docs/RAPID_MIND_ADMIN_WORKSPACE.md`
- Healthcare design and current alignment: `docs/RAPID_MIND_HEALTHCARE_WORKSPACE.md`
- Referral/response target UX (historical Relawan-visibility conflict remains):
  `docs/RAPID_MIND_REFERRAL_RESPONSE_INTERACTION.md`
- Domain foundation: `docs/checkpoints/checkpoint-2b-domain-foundation.md`
- Backend workflows: `docs/checkpoints/checkpoint-2c-backend-workflows.md`
- Verification history: `docs/workflow-verification.md`

The most relevant source entry points are `routes/web.php`,
`resources/js/layouts/`, `resources/js/Pages/`, `app/Http/Controllers/`,
`app/Domain/Healthcare/`, `app/Models/`, `app/Enums/`, and `tests/`.
