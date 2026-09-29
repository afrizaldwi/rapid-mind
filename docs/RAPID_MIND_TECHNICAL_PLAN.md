# RAPID-MIND — Technical Architecture & Development Plan

**Project:** RAPID-MIND  
**Document type:** Technical architecture + implementation plan  
**Status:** Working baseline for development  
**Primary source:** `workflow.md`  
**Last updated:** 2026-09-29

---

## 1. Project Goal

RAPID-MIND is an offline-capable disaster mental-health response platform with three operational roles:

1. **Relawan / Frontline Volunteer**
   - Mobile-first PWA.
   - PFA guide for Day 1–3.
   - SRQ-20 + Risk Factors + Functional Assessment for Day 4–30.
   - Persistent T0 Red Flag emergency shortcut.
   - Offline-first assessment capture and later synchronization.

2. **Healthcare / Faskes / PSC 119**
   - Desktop-oriented operational dashboard.
   - Receives T0-Suspect alerts.
   - Performs secondary/clinical validation.
   - Manages referral and priority queues.
   - Reviews patient assessment history.

3. **Admin / BPBD / Dinkes**
   - Desktop-oriented command-center dashboard.
   - Geospatial monitoring and heatmaps.
   - Aggregate regional analytics.
   - 30-day longitudinal monitoring.
   - Volunteer/resource/logistics management.

The system is a **decision-support platform**, not an autonomous diagnostic system. Triage outputs remain recommendations until validated by qualified healthcare personnel.

---

# 2. Final Technology Direction

## 2.1 Core Stack

| Area | Technology |
|---|---|
| Main framework | Laravel 13 |
| Backend language | PHP |
| Frontend | Vue 3 |
| Frontend bridge | Inertia.js |
| Frontend language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn-vue or equivalent reusable component system |
| Build tool | Vite |
| Authentication | JWT access token + refresh token |
| Authorization | Laravel Middleware + Policies/Gates |
| Database | PostgreSQL |
| Geospatial extension | PostGIS |
| ORM | Eloquent |
| Realtime | Laravel Reverb + Laravel Echo |
| Background jobs | Laravel Queue |
| Scheduled jobs | Laravel Scheduler |
| Offline local database | IndexedDB |
| IndexedDB wrapper | Dexie.js |
| PWA / Service Worker | Workbox / Vite PWA integration |
| Map | MapLibre GL JS |
| Charts | ECharts |
| Backend tests | Pest / PHPUnit |
| Browser/E2E tests | Playwright |
| Reverse proxy | Nginx |
| Infrastructure | Docker + Docker Compose |

---

## 2.2 Architecture Principle

RAPID-MIND will be developed as:

> **One product, one repository, one Laravel application, one user-facing website, three role-specific experiences.**

It should **not** become three separate websites unless future scale or organizational ownership makes that necessary.

The three roles will have separate layouts, routes, permissions, and workflows inside one Laravel + Vue/Inertia application.

Example URL structure:

```text
/login

/relawan/*
/healthcare/*
/admin/*
```

Role-specific routes:

```text
/relawan/dashboard
/relawan/pfa
/relawan/patients
/relawan/assessment
/relawan/history
/relawan/emergency

/healthcare/dashboard
/healthcare/emergency
/healthcare/patients
/healthcare/referrals
/healthcare/validation

/admin/dashboard
/admin/map
/admin/analytics
/admin/volunteers
/admin/logistics
```

---

# 3. High-Level System Architecture

```text
                         ┌─────────────────────┐
                         │       NGINX         │
                         │   Public Gateway    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Laravel        │
                         │ PHP-FPM + Inertia   │
                         └──────────┬──────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
               ▼                    ▼                    ▼
       ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
       │ Queue Worker │     │   Reverb     │     │  Scheduler   │
       │              │     │  WebSocket   │     │              │
       └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   ▼
                      ┌────────────────────────┐
                      │ PostgreSQL + PostGIS   │
                      └────────────────────────┘
```

The browser side additionally contains:

```text
Vue 3
├── Inertia pages
├── TypeScript domain helpers
├── Service Worker
├── IndexedDB / Dexie
├── offline outbox
├── local assessment state
├── MapLibre
└── Laravel Echo client
```

---

# 4. Docker Strategy

Docker Compose is the canonical way to run RAPID-MIND.

The target developer experience should be approximately:

```bash
git clone <repository>
cd rapid-mind

cp .env.example .env

docker compose up -d --build
```

The team should not need to install PostgreSQL, PHP, Nginx, or other infrastructure manually on the host machine.

## 4.1 Main Containers

Recommended services:

```text
nginx
app
queue
reverb
scheduler
postgres
```

Optional later:

```text
redis
```

Redis should only be introduced when there is a concrete need such as:

- high-volume queue processing;
- Bull/Redis-style queue semantics;
- multiple Laravel application replicas;
- distributed realtime state;
- advanced rate limiting;
- larger-scale caching.

Do not add Redis in the initial implementation simply because it is common in Laravel stacks.

---

## 4.2 Same Image, Different Laravel Processes

The following containers can use the same Laravel application image:

```text
app
queue
reverb
scheduler
```

with different commands.

Conceptual example:

```yaml
app:
  build: .

queue:
  build: .
  command: php artisan queue:work

reverb:
  build: .
  command: php artisan reverb:start

scheduler:
  build: .
  command: php artisan schedule:work
```

---

## 4.3 Compose Files

Recommended layout:

```text
compose.yaml
compose.dev.yaml
compose.prod.yaml
```

### Development

Development configuration may include:

- source bind mounts;
- Vite dev server;
- hot module reload;
- debug logging;
- local development database;
- development-only ports.

### Production

Production configuration should include:

- built frontend assets;
- Nginx public entry point;
- compiled Laravel dependencies;
- persistent PostgreSQL volume;
- health checks;
- restart policies;
- no unnecessary public database ports;
- secret/environment handling;
- backups.

---

# 5. Repository Structure

Recommended initial structure:

```text
rapid-mind/
│
├── app/
│   ├── Domain/
│   │   ├── Assessment/
│   │   ├── Triage/
│   │   ├── Emergency/
│   │   ├── Patient/
│   │   └── Referral/
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   └── Requests/
│   │
│   ├── Models/
│   ├── Policies/
│   ├── Events/
│   ├── Listeners/
│   ├── Jobs/
│   └── Services/
│
├── bootstrap/
├── config/
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
│
├── resources/
│   ├── js/
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   ├── Relawan/
│   │   │   ├── Healthcare/
│   │   │   └── Admin/
│   │   │
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── composables/
│   │   ├── offline/
│   │   ├── services/
│   │   ├── stores/
│   │   └── domain/
│   │
│   └── css/
│
├── routes/
│   ├── web.php
│   ├── api.php
│   └── channels.php
│
├── tests/
│   ├── Feature/
│   └── Unit/
│
├── nginx/
├── docker/
│
├── compose.yaml
├── compose.dev.yaml
├── compose.prod.yaml
├── Dockerfile
├── .env.example
├── composer.json
├── package.json
└── README.md
```

---

# 6. Authentication Architecture

RAPID-MIND will use JWT instead of Laravel's default session-based authentication.

## 6.1 Token Model

Use two token classes:

### Access Token

- Short-lived.
- Used in authenticated API requests.
- Recommended starting lifetime: approximately 15 minutes.

### Refresh Token

- Longer-lived.
- Used only to obtain a new access token.
- Recommended starting lifetime: approximately 7–30 days.
- Must use rotation.

Conceptual flow:

```text
POST /api/auth/login
        │
        ├── Access JWT
        └── Refresh JWT
```

Normal API request:

```text
Authorization: Bearer <access-token>
```

Refresh flow:

```text
Expired access token
        │
        ▼
POST /api/auth/refresh
        │
        ▼
Validate refresh token
        │
        ▼
Rotate refresh token
        │
        ├── new access token
        └── new refresh token
```

---

## 6.2 JWT Claims

JWT payload should remain minimal.

Example:

```json
{
  "sub": "user-uuid",
  "role": "RELAWAN",
  "jti": "token-uuid",
  "ver": 1,
  "iat": 1790672400,
  "exp": 1790673300,
  "iss": "rapid-mind",
  "aud": "rapid-mind-web"
}
```

Never store the following inside JWT payloads:

- NIK;
- SRQ answers;
- patient clinical history;
- GPS history;
- diagnosis;
- assessment records;
- sensitive emergency information.

JWTs are signed, not automatically encrypted.

---

## 6.3 Token Storage

Preferred approach:

```text
Access JWT
→ browser memory
→ Authorization header

Refresh JWT
→ Secure + HttpOnly + SameSite cookie
```

Do not intentionally persist long-lived authentication tokens in:

```text
localStorage
IndexedDB
```

Offline assessment data and authentication credentials must be treated separately.

---

## 6.4 Revocation

Add revocation support through:

```text
token_version
jti
user active status
```

Example user fields:

```text
id
name
email
password
role
token_version
is_active
```

When security-sensitive events occur, increment `token_version`.

Typical triggers:

- password reset;
- lost volunteer device;
- role changed;
- user disabled;
- suspected compromise;
- force logout on all devices.

---

# 7. RBAC

Initial roles:

```text
RELAWAN
HEALTHCARE
ADMIN
```

Initial user table may use a simple role field.

Do not create a complex permission matrix until granular roles are actually needed.

Later possible expansion:

```text
Doctor
Psychiatrist
Nurse
PSC Operator
BPBD Admin
Dinkes Admin
Super Admin
```

At that stage the application may move to role/permission tables or a package such as `spatie/laravel-permission`.

---

## 7.1 Frontend Authorization

Frontend role checks are used for:

- routing;
- navigation;
- visible actions;
- role-specific layouts;
- UX.

Example:

```text
RELAWAN
→ /relawan

HEALTHCARE
→ /healthcare

ADMIN
→ /admin
```

---

## 7.2 Backend Authorization

Backend authorization is the real security boundary.

Every sensitive route must independently enforce the user's permission.

Conceptual example:

```php
Route::middleware([
    'auth.jwt',
    'role:healthcare'
])->group(function () {
    // healthcare-only endpoints
});
```

A user manually entering an Admin or Healthcare URL must not gain access to the underlying data.

---

# 8. Offline-First Architecture

The Relawan interface must remain operational when the server is unavailable.

The main write path should be:

```text
UI
 ↓
IndexedDB
 ↓
local outbox
 ↓
sync process
 ↓
Laravel API
 ↓
PostgreSQL
```

Not:

```text
UI
 ↓
Laravel API
 ↓
Database
```

The local device is responsible for safely preserving unsynchronized work.

---

## 8.1 Offline-Capable Features

The following should work without an internet connection:

- PFA guide;
- patient lookup from locally cached records where available;
- new local patient record;
- SRQ-20 form;
- risk-factor assessment;
- function assessment;
- local triage calculation;
- T0 local handling;
- saving assessments;
- viewing unsynchronized items;
- synchronization status.

Features requiring the server can show unavailable/offline states instead of breaking the workflow.

---

## 8.2 Local IndexedDB Stores

Initial local stores may include:

```text
patients
assessments
srq_responses
risk_responses
function_responses
emergency_events
outbox
sync_metadata
```

Sensitive offline records should eventually be protected with appropriate local encryption/key handling.

---

## 8.3 Sync Triggers

Do not rely only on Background Sync API.

Trigger synchronization through multiple paths:

```text
submit
→ immediate sync attempt

network restored
→ sync attempt

app resume
→ sync attempt

app startup
→ sync attempt

background sync
→ when supported
```

---

## 8.4 Conflict Handling

Every offline-created object should use stable identifiers.

Recommended approach:

```text
UUID generated client-side
created_at_client
updated_at_client
synced_at
server_version
```

Do not rely only on NIK as the database identity.

NIK can be a patient identifier, but system records should have UUID primary keys.

Conflict strategy should be explicitly defined by entity.

Examples:

- immutable assessment submission → append new version;
- patient demographic correction → version-aware update;
- T0 event → append-only event history;
- clinical validation → new validation record, not overwrite of original event.

---

# 9. Offline Authentication Behavior

JWT expiry must not destroy field work.

Example condition:

```text
12:00 login
12:15 access token expires
12:10 internet is lost
12:30 volunteer continues assessment
```

Expected behavior:

```text
Authenticated while online
        │
        ▼
device loses network
        │
        ▼
offline field mode
        │
        ├── PFA remains available
        ├── assessment remains available
        ├── triage works locally
        ├── IndexedDB continues working
        └── synchronization waits
```

When network returns:

```text
network restored
        │
        ▼
try token refresh
        │
        ├── success
        │     ↓
        │   sync outbox
        │
        └── failure
              ↓
           require login
              ↓
        preserve unsynced data
```

A failed login or expired JWT must **never delete unsynchronized assessments**.

---

# 10. Triage Engine

The triage logic must be isolated from controllers and UI components.

Recommended backend structure:

```text
app/Domain/Triage/
├── TriageCalculator.php
├── SrqCalculator.php
├── RiskCalculator.php
├── FunctionCalculator.php
├── RedFlagDetector.php
└── TriageResult.php
```

The current workflow defines:

```text
SRQ-20          0–20
Risk Factor     0–8
Function        0–9
---------------------
Total           0–37
```

Triage:

```text
T3 = 0–6
T2 = 7–14
T1 = >= 15
     OR severe functional impairment condition
```

T0 does not belong to the normal score threshold.

T0 is an override/emergency state.

---

# 11. Dual Triage Calculation

Because Relawan must work offline, triage logic must exist in two places.

## Client

TypeScript implementation:

```text
resources/js/domain/triage/
```

Used for:

- offline calculation;
- instant result display;
- local T0 behavior.

## Server

PHP implementation:

```text
app/Domain/Triage/
```

Used as canonical authority.

Synchronization flow:

```text
offline assessment
        ↓
client calculates triage
        ↓
result shown to volunteer
        ↓
record synchronized
        ↓
Laravel recalculates
        ↓
canonical result stored
```

The server must never trust a client-provided score without recalculating it.

Automated tests must ensure PHP and TypeScript implementations return identical expected outputs for the same fixtures.

---

# 12. T0 Emergency Architecture

T0 must be treated as an emergency event, not merely a high score.

Conceptual state:

```text
Normal Assessment
    ↓
T1 / T2 / T3

Emergency Trigger
    ↓
T0-SUSPECT
    ↓
Healthcare Validation
    ↓
T0-CONFIRMED
or
downgraded to T1/T2
```

---

## 12.1 T0 Trigger Sources

T0 may be triggered through:

- SRQ-20 item #17 according to the configured safety rule;
- persistent Red Flag button;
- other configured emergency indicators.

The final clinical/emergency trigger rules must remain explicit and testable.

---

## 12.2 T0 Event Flow

Online:

```text
Volunteer
   │
   ▼
T0 Trigger
   │
   ▼
Verification Gate
   │
   ▼
Create T0-Suspect Event
   │
   ▼
Laravel API
   │
   ├── PostgreSQL
   │
   ├── Queue
   │
   └── Reverb
           │
           ▼
Healthcare Dashboard
```

Offline:

```text
Volunteer
   │
   ▼
T0 Trigger
   │
   ▼
Local Emergency Event
   │
   ├── visual/audio/vibration guidance
   ├── priority IndexedDB record
   └── high-priority outbox
```

When connectivity returns:

```text
Priority T0 event
   ↓
sync before normal queued records
   ↓
Laravel API
   ↓
Healthcare realtime alert
```

---

# 13. SMS / GSM Fallback

Do not assume that a pure PWA can silently send an SMS.

The desired fallback concept is:

```text
Tier 1
Internet available
→ Laravel API + Reverb

Tier 2
Internet unavailable but GSM/SMS available
→ native-assisted SMS flow

Tier 3
Fully offline
→ priority local queue + physical instructions
```

For the initial website/PWA prototype:

- implement Tier 1;
- implement Tier 3;
- represent Tier 2 through a safe native handoff or prototype abstraction.

If guaranteed automatic SMS is later required, add a native Android wrapper such as Capacitor or a dedicated field application.

Do not claim browser capabilities that cannot be guaranteed.

---

# 14. Realtime Architecture

Use:

```text
Laravel Reverb
+
Laravel Echo
```

for live events.

Potential private channels:

```text
private-healthcare.facility.{facilityId}
private-admin.region.{regionId}
private-volunteer.{userId}
```

Example event flow:

```text
T0-Suspect created
      │
      ▼
Laravel Event
      │
      ▼
Queue / Broadcast
      │
      ▼
Reverb
      │
      ▼
authorized Healthcare users
```

Admin users may receive aggregated operational events, while Healthcare receives patient-specific operational alerts according to authorization rules.

---

# 15. Initial Database Direction

The exact schema will be designed separately, but the first domain model should include the following areas.

## Identity / Access

```text
users
refresh_tokens
user_sessions / token registry (if required)
```

## Organization / Location

```text
regions
shelters
healthcare_facilities
```

## Volunteer Operations

```text
volunteers
volunteer_assignments
volunteer_locations
```

## Patient

```text
patients
patient_identifiers
patient_contacts
```

## Assessment

```text
assessments
srq_responses
risk_assessments
risk_responses
function_assessments
function_responses
triage_results
```

## Emergency

```text
emergency_events
emergency_verifications
emergency_dispatches
```

## Clinical

```text
clinical_validations
clinical_notes
referrals
referral_status_history
```

## Logistics

```text
resource_types
resource_requests
resource_allocations
```

## System

```text
audit_logs
sync_events
```

---

# 16. Important Data Modeling Rules

## 16.1 Do Not Overwrite System Recommendation

Example:

```text
system_recommendation = T0_SUSPECT
clinical_validation    = T1
```

Store them separately.

The original recommendation is part of the audit history.

---

## 16.2 T0 Event Is Separate From Assessment

`emergency_events` must not simply be another field inside the assessment record.

T0 can occur:

- during PFA;
- before SRQ completion;
- during assessment;
- independently from the normal score engine.

---

## 16.3 Use UUIDs

Use UUIDs for major system entities.

Examples:

```text
user_id
patient_id
assessment_id
emergency_event_id
referral_id
facility_id
shelter_id
```

NIK is a patient identifier, not the universal primary key.

---

## 16.4 Auditability

Important transitions should be append-only or logged.

Examples:

```text
T0-Suspect created
T0 reviewed
T0 confirmed
T0 downgraded
ambulance requested
ambulance dispatched
patient arrived
referral completed
```

Store:

```text
actor
timestamp
previous state
new state
reason
metadata
```

---

# 17. Security Baseline

RAPID-MIND handles highly sensitive data.

Initial security requirements:

- HTTPS in deployment;
- password hashing using Laravel-supported secure defaults;
- JWT access tokens with short expiration;
- refresh-token rotation;
- refresh-token revocation;
- HttpOnly/Secure refresh cookie;
- no sensitive clinical information in JWT;
- backend-enforced RBAC;
- private Reverb channels;
- database not publicly exposed;
- audit logs for clinical/emergency actions;
- secure secret storage;
- no secrets committed to Git;
- validation for every API request;
- rate limiting on login and sensitive endpoints;
- explicit CORS configuration if required;
- CSP/XSS mitigation strategy;
- regular backups.

Offline IndexedDB security requires a separate implementation review because the browser must retain sensitive data in field conditions.

---

# 18. Backup and Database Operations

Docker volume persistence is not a backup strategy.

Production must eventually include:

```text
persistent PostgreSQL volume
+
scheduled pg_dump
+
off-host backup destination
+
restore procedure
+
migration procedure
```

The team must test restore operations, not only backup creation.

---

# 19. Testing Strategy

## 19.1 Unit Tests

Highest-priority unit tests:

- SRQ score calculation;
- risk score calculation;
- function score calculation;
- T1/T2/T3 thresholds;
- functional override;
- T0 override;
- client/server fixture parity;
- JWT validation;
- role middleware;
- emergency state transitions.

---

## 19.2 Feature Tests

Test:

- login;
- token refresh;
- logout;
- forced token revocation;
- Relawan endpoint restrictions;
- Healthcare endpoint restrictions;
- Admin endpoint restrictions;
- patient creation;
- assessment submission;
- T0 creation;
- clinical validation;
- referral transitions.

---

## 19.3 E2E Tests

Playwright should cover critical user journeys.

### Relawan

```text
login
→ PFA
→ patient
→ assessment
→ triage result
→ offline save
→ reconnect
→ sync
```

### Emergency

```text
Relawan login
→ T0 trigger
→ verification
→ Healthcare receives alert
→ Healthcare validates
→ status updated
```

### Admin

```text
Admin login
→ dashboard
→ map
→ filter region
→ inspect shelter
→ view aggregate trend
```

---

# 20. Development Phases

The order below is intentionally risk-first rather than screen-first.

---

## Phase 0 — Project Foundation

Goal:

Create a repeatable Docker-based development environment.

Tasks:

- initialize Laravel;
- install Vue/Inertia/TypeScript;
- configure Tailwind;
- configure Docker;
- create Nginx;
- create PostgreSQL/PostGIS;
- configure Laravel database connection;
- setup Vite;
- setup test framework;
- create `.env.example`;
- create seed process;
- add health checks.

Exit criteria:

```text
docker compose up -d --build
```

starts a working local application and database.

---

## Phase 1 — Authentication and RBAC

Goal:

Establish secure role-aware application access.

Tasks:

- user model;
- roles;
- JWT package/infrastructure;
- login endpoint;
- refresh-token endpoint;
- logout;
- logout-all;
- token rotation;
- token revocation;
- token version;
- role middleware;
- role redirect;
- role-specific layouts.

Exit criteria:

Three test users can log in and only access their allowed role area.

---

## Phase 2 — Core Domain & Database

Goal:

Establish canonical entities before building large interfaces.

Tasks:

- region;
- shelter;
- healthcare facility;
- volunteer;
- patient;
- assessment;
- SRQ response;
- risk response;
- function response;
- triage result;
- emergency event;
- clinical validation;
- referral;
- audit log.

Add migrations, models, factories, and seed data.

Exit criteria:

Core workflow can be represented correctly at the database/domain level.

---

## Phase 3 — Triage Engine

Goal:

Make scoring deterministic and independently testable.

Tasks:

- PHP triage engine;
- TypeScript triage engine;
- T0 detector;
- test fixtures;
- cross-language parity tests;
- API validation.

Exit criteria:

All test fixtures produce expected T0/T1/T2/T3 outcomes in both PHP and TypeScript.

---

## Phase 4 — Relawan PWA Shell

Goal:

Create the field-facing mobile foundation.

Tasks:

- mobile layout;
- bottom/top navigation;
- connection indicator;
- sync indicator;
- persistent T0 button;
- PWA manifest;
- Service Worker;
- app shell caching;
- IndexedDB initialization.

Exit criteria:

Relawan app installs as a PWA and core shell opens offline.

---

## Phase 5 — PFA Workflow

Goal:

Implement Day 1–3 PFA functionality.

Tasks:

- LOOK cards;
- LISTEN cards;
- grounding interaction;
- LINK cards;
- emergency shortcut integration.

Exit criteria:

PFA module works fully offline after initial application load.

---

## Phase 6 — Assessment Workflow

Goal:

Implement Day 4–30 structured assessment.

Tasks:

- patient identification;
- NIK/manual identity;
- optional QR entry;
- verbal/non-verbal mode;
- SRQ-20;
- risk-factor assessment;
- function assessment;
- local triage result;
- clinical disclaimer;
- save locally.

Exit criteria:

A complete assessment can be performed without connectivity and stored locally.

---

## Phase 7 — Offline Queue & Sync

Goal:

Make offline operation reliable.

Tasks:

- outbox;
- sync metadata;
- retry strategy;
- connectivity hooks;
- app-resume sync;
- app-start sync;
- server idempotency;
- conflict rules;
- priority ordering;
- visible sync status.

Exit criteria:

An offline assessment survives reload/restart and synchronizes correctly once connectivity returns.

---

## Phase 8 — T0 Emergency Flow

Goal:

Implement the highest-risk operational path.

Tasks:

- persistent emergency FAB;
- emergency verification gate;
- T0-Suspect creation;
- offline T0 queue;
- priority synchronization;
- local emergency guidance;
- emergency audit trail;
- Reverb event broadcast.

Exit criteria:

Online T0 reaches Healthcare in realtime, while offline T0 is preserved and prioritized for later synchronization.

---

## Phase 9 — Healthcare Dashboard

Goal:

Enable operational emergency and clinical handling.

Tasks:

- emergency queue;
- realtime T0 notification;
- alert sound control;
- patient clinical detail;
- assessment history;
- T0 verification;
- confirm referral;
- downgrade to T1/T2;
- referral queue;
- referral status tracking.

Exit criteria:

Healthcare can receive, review, validate, and progress a T0 case.

---

## Phase 10 — Admin Dashboard

Goal:

Provide macro-level monitoring.

Tasks:

- KPI cards;
- PostGIS queries;
- MapLibre map;
- shelter markers;
- triage distribution;
- heatmap;
- 30-day trend;
- patient aggregate table;
- volunteer locations;
- resource/logistics view;
- filters.

Exit criteria:

Admin can understand regional conditions without accessing actions reserved for Healthcare.

---

## Phase 11 — Security, Audit, Reliability

Goal:

Harden the prototype into a deployable system.

Tasks:

- audit coverage;
- security headers;
- rate limiting;
- refresh-token hardening;
- private WebSocket authorization;
- IndexedDB protection review;
- backup jobs;
- restore test;
- error handling;
- observability/logging;
- health checks.

---

## Phase 12 — Deployment & Handoff

Goal:

Make the application easy to give to another team.

Deliverables:

- production Compose file;
- `.env.example`;
- database migration procedure;
- seed/demo data;
- deployment guide;
- backup guide;
- restore guide;
- test command documentation;
- architecture documentation;
- workflow documentation.

Ideal team onboarding:

```bash
git clone ...
cp .env.example .env
docker compose up -d --build
docker compose exec app php artisan migrate --seed
```

---

# 21. Suggested Build Priority

If development time is limited, prioritize:

```text
1. Docker foundation
2. JWT + RBAC
3. Database/domain
4. Triage engine
5. Relawan PWA
6. Offline assessment
7. T0 emergency
8. Healthcare dashboard
9. Realtime
10. Admin analytics/map
11. Logistics
12. Optional features
```

The critical path is:

```text
Relawan
→ offline assessment
→ triage
→ T0
→ Healthcare response
```

Admin analytics should not delay the core emergency workflow.

---

# 22. Features to Defer From MVP

Unless needed for judging/demo requirements, defer:

- speech-to-text;
- NLP automatic risk inference;
- native automatic SMS transmission;
- integrated video calling;
- complex volunteer tracking history;
- advanced logistics optimization;
- Redis;
- multiple API replicas;
- multi-region deployment;
- complex permission matrices;
- sophisticated AI features.

Speech-to-text may later be added as an assistive feature, but manual human confirmation must remain authoritative.

---

# 23. UI Principles to Carry Into the Next Design Phase

These are architecture-level constraints that should guide the upcoming UI discussion.

## Relawan

- mobile first;
- high contrast;
- very large tap targets;
- minimal typing;
- clearly visible offline state;
- clearly visible sync state;
- persistent emergency access;
- never block urgent workflows with secondary UI;
- assessment progress should be obvious;
- unsynced data must be visible to the volunteer.

## Healthcare

- emergency-first hierarchy;
- T0 should be impossible to miss;
- priority queue over analytics;
- patient detail should support fast clinical validation;
- actions must be clearly auditable;
- avoid dashboard clutter around emergency workflows.

## Admin

- macro overview first;
- map is central;
- regional trends and filters;
- less patient-level operational detail than Healthcare;
- clear separation between analytics and direct clinical actions.

---

# 24. Current Architectural Decisions

The following decisions are considered accepted unless changed later:

- Docker-first deployment.
- Docker Compose is the canonical local/deployment orchestration method.
- One Laravel repository.
- One Laravel application.
- One user-facing website.
- Three role-specific interfaces.
- Laravel 13 backend.
- Vue 3 + Inertia + TypeScript frontend.
- JWT authentication.
- PostgreSQL + PostGIS.
- Eloquent ORM.
- Reverb/Echo for realtime.
- IndexedDB/Dexie for volunteer offline storage.
- Workbox/Service Worker for PWA behavior.
- MapLibre for geospatial UI.
- ECharts for analytics.
- Nginx as reverse proxy.
- T0 is a separate emergency state/event.
- T0-Suspect must be clinically validated by Healthcare.
- Server triage calculation is canonical.
- Client triage calculation exists for offline operation.
- Unsynchronized field data must survive auth/network failures.
- SMS auto-fallback is not assumed to be guaranteed by a pure PWA.

---

# 25. Next Design Discussion

The next project phase should define the UI/UX system before implementation begins.

Recommended discussion order:

```text
1. Overall visual direction
2. Design system
3. Global navigation
4. Login
5. Relawan mobile shell
6. PFA
7. Assessment
8. Triage result
9. T0 emergency modal
10. Healthcare dashboard
11. Healthcare patient workspace
12. Admin command center
13. Map + analytics
14. Responsive behavior
15. Offline/sync states
16. Empty/loading/error states
```

The UI should be designed around the actual workflow and operational risk, not merely around conventional dashboard patterns.
