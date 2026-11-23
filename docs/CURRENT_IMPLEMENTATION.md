# RAPID-MIND — Current Implementation Reference

**Reviewed:** 10 November 2026 (Asia/Jakarta), final documentation alignment

**Application source baseline:** `demo` at `7076e1327e53db9671dbc6fcc575ffd03cded6d7`

**Previous inventory baseline:** 24 October 2026, `7839420` (Checkpoint 2C)

**Purpose:** concise source-aligned inventory; not a product-requirements replacement

**Requirements authority:** current owner instructions, later-approved safety decisions,
then approved domain/UX specifications and the original `docs/workflow.md` vision

**Evidence authority:** dated checkpoint reports and `docs/workflow-verification.md`

This alignment inspected current source, commit inventories, test sources and
recorded reports. No tests, builds, runtime/browser checks, migrations or enrollment
were rerun. The owner-reported manual Chrome check below is attributed evidence.
`IMPLEMENTED` is not `PASS` or `ACCEPTED`; dated test results apply only to their
recorded scope.

Status labels in this document mean:

- **IMPLEMENTED:** present in current repository source.
- **BACKEND ONLY:** persisted/service/HTTP behavior exists without current UI controls.
- **PARTIAL:** only part of the intended workflow exists or legacy compatibility is active.
- **PLANNED:** specified but not implemented in the current source.
- **UNVERIFIED:** source may exist, but the stated runtime behavior lacks direct evidence for this checkpoint.
- **REQUIRES OWNER DECISION:** implementation and an authoritative requirement/design decision disagree.

<a id="current-handoff"></a>

## Current handoff — 10 November 2026

This section supersedes older current-state summaries; dated checkpoint results
remain historical evidence for their original scope. See [P0 handoff](../P0-HANDOFF.md)
and the [current verification ledger](workflow-verification.md#november-10-handoff).

| Classification | Status |
| --- | --- |
| P0 IMPLEMENTED | YES |
| P0 CORE BROWSER VERIFIED | YES |
| P0 LOCAL DEMO ACCEPTANCE | CONDITIONAL PASS |
| Natural background/foreground privacy locking | NOT TESTED |
| Production security acceptance | NOT ESTABLISHED |

Seven historical core browser PASS results and six browser-runner safety PASS
results are retained. Simulated visibility handling is not native background-lock
acceptance. P1/P2 are substantially implemented with automated coverage; complete
cross-role acceptance remains pending. **C2 remains NOT ACCEPTED; C3 has not started.**

| Commit | Reviewed scope | File count |
| --- | --- | ---: |
| `e561c98` | Facility/case authorization, realtime and offline reconciliation, including final T0 correction | 81 |
| `1e44ff8` | Guarded synthetic provisioning | 6 |
| `be61204` | Browser-runner safety cleanup | 5 |
| `9f8fd4b` | Competition data policy and team handoff | 7 |
| `7076e13` | Same-document offline Relawan navigation | 8 |

The first four commits contain exactly 99 distinct reviewed files. The navigation
commit contains eight files; paths can overlap earlier commits. The eight
superseded `scripts/c2/` files remain excluded. Git inspection confirms these local
commit inventories; the owner supplies remote-baseline verification, not a fresh
network/push check by this documentation task.

Recorded operations: both November additive development migrations completed;
the November 9 protected database backup and frontend publication were verified;
synthetic scopes/accounts were provisioned. See the [C2 preparation record](checkpoints/c2-browser-preparation.md).
These historical records do not authorize repetition or prove today's runtime.

The SQL/history decision is **RESOLVED**: retain the existing repository/history
and owner-approved historical synthetic SQL backup unchanged. Keep ignored
credentials, recovery codes, profiles, debug captures and private evidence out of
transfer. Local Inertia DevTools disablement was verified separately; each teammate
must set `INERTIA_DEVTOOLS_ENABLED=false` in their own ignored `.env` and verify it.
No production default is changed by that local setting.


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

## Approved team decision — 7 November; source alignment — 10 November 2026

The owner/team approved Healthcare T0 downgrade to T1/T2/T3, superseding the old
T1/T2-only design. Controller classification accepts those results, maps them to
DOWNGRADED, and writes verification/audit records in a locked transaction. This
is explicit Healthcare-owned product behavior, not external protocol certification.

Healthcare case/facility authorization is now implemented in `e561c98` through
`HealthcareCaseAccess`, routing snapshots, explicit audited shares, scoped queries,
clinical/operational write checks and current recipient resolution. The earlier D1
broad-read/role-wide-channel finding is historical and superseded. Active Healthcare
in an active responsible facility manages its cases; referral destinations receive
case-specific read access, including only explicitly shared associated assessment
information. One case never unlocks unrelated patient history. Admin has no
patient-level clinical permission; Dispatch assignment grants no clinical access
and does not establish external vehicle contact, pickup or physical response.

P1 remains multi-select observational reasons with optional OTHER note and no
scoring/diagnostic/T0 effect. P2 permits three explicit visible choices if
UNANSWERED remains distinct on untouched/reset input; current
`resources/js/components/Relawan/Assessment/SrqResponseControl.vue` renders four
controls. Q17 confirmation before persistence and scoring guards remain unchanged.
No UI redesign is implemented or requested here. Relawan remains limited to its
own report and delivery state. The three-button SRQ revision belongs to the
receiving team; four controls remain implemented. Official Admin reporting gaps
remain in [the Admin specification](RAPID_MIND_ADMIN_WORKSPACE.md). The current P0
classifications above apply; full C2 acceptance and C3 signoff are not established.
General real-user migration/plaintext cleanup remain P0 objectives.

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

### Three navigation contexts — `7076e13`

- **Online:** the existing Inertia runtime uses server-authorized web navigation.
- **Offline bootstrap:** a full document fallback checks remembered Relawan
  continuity and requires explicit clinical unlock before resolving clinical data.
- **Unlocked offline shell:** `OfflineRelawanShell` / `offlineNavigation.ts` reuse
  `resolveOfflineRoute()` and owner-scoped repositories for same-document routes.
  Reactive route props, URL-only history, Back/Forward, query strings and SRQ
  anchors replace reloads. Ordinary offline links and `runtime.navigate()` share
  this path; native external/download/modified-click behavior is preserved.

An uninterrupted authorized visible session retains its in-memory key across
supported routes. Actual reload/pagehide, visibility invalidation, logout, owner
changes and worker protocol invalidation retain their safety boundaries. Stale
async navigation cannot reinstall clinical content after invalidation; no decrypted
props, passphrase or key is written into history or other browser persistence.

**Recorded automated evidence:** 64 focused tests PASS; final navigation/link
subset 13 PASS again, not 13 additional distinct tests; `vue-tsc --noEmit` and
`git diff --check` PASS. Tests used real encryption/repository logic with browser,
database transport and leaf-page doubles. None was rerun for this alignment.
**Owner-reported manual evidence:** successful Chrome offline navigation after
controlled service-worker activation. This narrow report does not establish a
complete acceptance suite, native background locking, all Back/Forward/reload/
owner-race cases, or a newly measured publication hash. Build/activation records
from November 9 describe that release only; do not reuse its hashes for this fix.

Login password and offline encryption passphrase remain separate. The online
double-prompt UX improvement is **DEFERRED**, not implemented by the router.

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
unidentified emergencies. Bounded transient retry, stable identifiers and idempotent
receipts are implemented. Recipient resolution and dispatch share a best-effort
exception boundary: persisted T0 reports uncertain realtime delivery rather than
false clinical failure. Manual answers remain authoritative over STT.

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
its approved application, together with the November 7 facility-routing migration,
is recorded in the [C2 report](checkpoints/checkpoint-c2-local-clinical-integration.md).
Neither migration nor database verification was repeated during this alignment.

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

**IMPLEMENTED:** patient search, summaries, detail and nested histories provide
`Ringkasan`, `Asesmen`, `Darurat`, `Validasi`, and `Rujukan` only from authorized
cases. Reciprocal A/B regression coverage includes latest patient clinical status.
Unrouted historical cases remain UNRESOLVED; no automatic backfill is performed.

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

- **IMPLEMENTED:** `HealthcareLayout.vue` subscribes to recipient-specific private
  `healthcare.facility.{facilityId}.user.{userId}.version.{version}` channels.
  `CaseAudience` rechecks current active case/facility grants at send time; the old
  role-wide `emergencies` channel is denied. Emergency, Referral, Dispatch and
  `AssessmentUpdated` ID-only events trigger authorized canonical reconciliation,
  including assessment-worklist invalidation. Counts use the same case scope.
  Operational notifications emit only after transaction commit; rollback/replay do not emit
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
  Browser/privacy and live receipt evidence now includes the seven historical core
  P0 scenarios in [P0-HANDOFF.md](../P0-HANDOFF.md), within its explicit limits.
- **NOT IMPLEMENTED:** Admin realtime aggregate subscriptions.
- **NOT ESTABLISHED:** comprehensive real-device/background behavior, general
  real-user activation/migration/cleanup and production readiness. Recorded local
  database/HTTP/Reverb checks are scoped evidence, not a fresh runtime audit here.

## 8. Historical evidence — 7 November 2026; later scope superseded above

The following table preserves the D1 review and original report boundaries. Its
C2-only-pending wording does not erase the later core P0 browser evidence above.

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

Focused source/test anchors (repository-relative; inspected, not executed by this alignment):

- `app/Domain/Healthcare/HealthcareCaseAccess.php`, `CaseRouting.php`, `CaseAudience.php`, `CaseSharing.php`
- `app/Domain/Sync/EmergencySynchronizer.php`, `tests/Feature/HealthcareCaseScopeTest.php`
- `resources/js/relawan/OfflineRelawanShell.vue`, `offlineNavigation.ts`, `offlineLink.ts`
- `tests/Node/offlineNavigation.test.ts`, `tests/Node/offlineRelawanLink.test.ts`

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


## Adendum 13 November 2026: unlock UX dan bantuan darurat

Passphrase menjadi metode utama; recovery menjadi pilihan sekunder pada gate yang sudah ada. Tombol Bantuan Darurat membuka panduan dan status jaringan perangkat tanpa DEK atau akses ke repository klinis. Pemilik mengonfirmasi belum ada kontak terverifikasi: UI menampilkan kondisi kosong tanpa nomor/tel fiktif. Tidak ada pelaporan T0 baru saat terkunci; desain online tanpa DEK dan outbox offline tanpa DEK tidak diimplementasikan. Enrollment, enkripsi dan invalidasi hidden/pagehide/reload/logout/owner tetap sama.

Bukti baru: 55 tes Node, TypeScript/build dan11 skenario browser sintetis PASS; bukan uji Laravel live atau native mobile background. Aset kandidat belum dipublikasikan. Bukti historis di atas tidak ditimpa atau dianggap uji ulang. Lihat [laporan dan batas verifikasi](checkpoints/offline-unlock-emergency-assistance-2026-11-13.md).


## Later owner correction, 13 November 2026: operation-specific unlock

This decision supersedes the earlier same-day global-gate UX. Server-authenticated Home/PFA and a new assessment form render without a clinical DEK; saving the encrypted draft requests unlock explicitly. An authorized persisted server emergency projection is readable without local decryption. Existing local clinical workspaces retain an inline operation gate while app navigation remains available. Offline LOCKED shows a limited shell and independent assistance; opening local data requires a user action. No plaintext clinical outbox, automatic unlock, cryptographic migration, data reset or ciphertext deletion was added. AES-GCM, ownership, session/key invalidation and stale-generation fences remain.

Final evidence:47 focused Node tests, TypeScript/build PASS;15 published Chrome–Laravel scenarios PASS, including actual asset-byte verification, login dashboard without passphrase, PFA/back, draft-save unlock and encrypted offline T0/sync. Current localhost app asset is assets/app-C76lqTlK.js, manifest f2ee7d9b6d0eaf4523a8016d10c2f14cd602db6d1197cd663e98e48681d7c9f4. Native mobile/background acceptance is still not established. See [checkpoint, source baseline, files, fixtures and limits](checkpoints/operation-specific-clinical-unlock-2026-11-13.md). Historical evidence above is preserved.
