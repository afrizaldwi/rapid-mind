# RAPID-MIND — Current Implementation Reference

**Reviewed:** 24 October 2026  
**Application source baseline:** `demo` at `7839420` (Checkpoint 2C)  
**Purpose:** concise source-aligned inventory; not a product-requirements replacement  
**Requirements authority:** `docs/workflow.md` (read-only)  
**Evidence authority:** `docs/workflow-verification.md` and dated checkpoint reports

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
and Docker Compose. Web navigation uses the Laravel session accepted by
`auth.jwt`; API-style bearer JWT support and refresh tokens also exist.

## 2. Role architecture

| Role | Implemented responsibility | Explicit boundary |
|---|---|---|
| RELAWAN | PFA, patient/assessment context, SRQ-20, risk factors, daily function, system triage recommendation, verified T0-Suspect creation, local persistence and synchronization | Does not clinically confirm T0 and does not receive Healthcare referral/dispatch state |
| HEALTHCARE | T0 acknowledgement, secondary verification, clinical classification, non-T0 validation, referral decisions, patient history, and patient-specific backend dispatch commands | Does not provision users/facility master data; dispatch does not change clinical classification |
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
| Rujukan | `/healthcare/referrals` | `resources/js/Pages/Healthcare/Referrals/Index.vue` | **PARTIAL — legacy lifecycle UI** |
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

Independent Referral/Dispatch commands from Checkpoint 2C:

```text
POST /healthcare/emergencies/{emergencyId}/dispatches       BACKEND ONLY
POST /healthcare/dispatches/{dispatchId}/status             BACKEND ONLY
POST /healthcare/dispatches/{dispatchId}/referral           BACKEND ONLY
POST /healthcare/referrals/{referralId}/complete            BACKEND ONLY
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

**PARTIAL:** `Referral.status` still casts to the legacy `ReferralStatus`, and the
existing Vue page plus `/referrals/{id}/status` still expose movement-like states.
This compatibility path remains until the coordinated database/application
cutover owned by Checkpoints 2F + 2G.

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

**BACKEND ONLY:** current pages receive no Dispatch read projection and expose no
Dispatch controls. There is no cancellation, reassignment, capacity reservation,
fleet management, external team contact, or facility-acceptance workflow.

## 6. UI versus backend-only capability

| Capability | Current status |
|---|---|
| T0 acknowledgement, verification, classification | **IMPLEMENTED UI + backend** |
| Explicit T0/non-T0 referral creation | **IMPLEMENTED UI + backend** |
| Legacy referral movement progression | **IMPLEMENTED compatibility UI + backend** |
| Independent clinical referral completion | **BACKEND ONLY** |
| Dispatch assignment/progression/linking | **BACKEND ONLY** |
| Response-unit registry persistence | **IMPLEMENTED foundation; no CRUD UI** |
| Dispatch read props, queue projection, patient timeline | **PLANNED — 2D** |
| Separated-domain synthetic demo fixtures | **PLANNED — 2E** |
| Dispatch realtime updates | **PLANNED; no event/subscription yet** |

## 7. Realtime and offline/PWA

- **IMPLEMENTED:** `HealthcareLayout.vue` is the sole private `emergencies`
  subscription owner. `EmergencyCreated` and `EmergencyUpdated` trigger bounded,
  route-aware Inertia reconciliation; new emergencies use a finite audio cue.
  HTTP health and socket readiness are represented separately.
- **IMPLEMENTED:** Relawan uses owner-scoped Dexie repositories, stable UUIDs,
  priority outbox processing, a Relawan-scoped service worker, continuity/session
  recovery, and same-owner Web Locks when supported.
- **NOT IMPLEMENTED:** Dispatch-specific broadcasting/subscriptions and Admin
  realtime aggregate subscriptions.
- **UNVERIFIED HERE:** no browser, PWA, offline, Reverb transport, or device test
  was executed during this documentation-only checkpoint. Consult the ledger for
  dated earlier evidence and limitations.

## 8. Partial and pending work

- **PENDING — 2D + 2E:** Dispatch read models/props and UI, separate sibling
  Referral/Dispatch controls, frontend integration, queue/patient
  projections, Dispatch realtime reconciliation, and deterministic synthetic
  fixtures.
- **PENDING — 2F + 2G:** coordinated database/application cutover and final
  verification. Checkpoints 2D + 2E do not remove legacy endpoints, Referral casts,
  or existing constraints. No development database reset or destructive migration
  is authorized yet.
- **PENDING:** full density heatmap, Admin realtime aggregates, PDF/Excel export,
  live volunteer GPS, response-unit CRUD/fleet operations, continuous STT, and
  complete offline Whisper behavior.
- **UNVERIFIED:** development-database migration/cutover and production readiness.

## 9. Known requirement and design deviations

1. **REQUIRES OWNER DECISION — T3 T0 downgrade:** the earlier Healthcare design
   baseline restricts downgrade to T1/T2, while current emergency UI/controller
   accepts T3. This reference records the conflict without changing policy.
2. **PARTIAL — offline fallback:** `docs/workflow.md` describes automatic SMS and
   broad Background Sync behavior; current browser SMS is user-mediated and the
   document-side outbox remains central to synchronization.
3. **PARTIAL — Admin geospatial:** requirements describe a T0–T3 density heatmap;
   current maps use Posko/Faskes markers and aggregate T0 emphasis.
4. **PARTIAL — Admin realtime:** requirements describe live aggregate updates;
   current Admin layout has browser connectivity state but no Echo subscription.
5. **PARTIAL — Referral UI:** the separated Referral lifecycle exists in schema
   and backend commands, while the visible page still uses the legacy combined
   movement lifecycle until cutover.
6. **PARTIAL — Admin metrics:** summary/analytics T0 populations and confirmation
   wording are not fully uniform; documentation does not conceal this as a single
   clinically verified measure.
7. **DESIGN CONFLICT — Relawan visibility:** current safety direction restricts
   Relawan to T0-Suspect and transmission state. Any older referral/response spec
   suggesting Healthcare milestones for Relawan is not current implementation.

## 10. References

- Final requirements: `docs/workflow.md`
- Technical architecture/status: `docs/RAPID_MIND_TECHNICAL_PLAN.md`
- Admin design and current alignment: `docs/RAPID_MIND_ADMIN_WORKSPACE.md`
- Healthcare design and current alignment: `docs/RAPID_MIND_HEALTHCARE_WORKSPACE.md`
- Referral/response target UX (alignment deferred until 2D + 2E):
  `docs/RAPID_MIND_REFERRAL_RESPONSE_INTERACTION.md`
- Domain foundation: `docs/checkpoint-2b-domain-foundation.md`
- Backend workflows: `docs/checkpoint-2c-backend-workflows.md`
- Verification history: `docs/workflow-verification.md`

The most relevant source entry points are `routes/web.php`,
`resources/js/layouts/`, `resources/js/Pages/`, `app/Http/Controllers/`,
`app/Domain/Healthcare/`, `app/Models/`, `app/Enums/`, and `tests/`.
