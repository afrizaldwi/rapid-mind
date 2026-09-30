# RAPID-MIND — Technical Architecture & Development Plan

**Project:** RAPID-MIND  
**Document type:** Technical architecture + implementation plan  
**Status:** Working baseline for development  
**Primary source:** `workflow.md`  
**Last updated:** 2026-10-01

---

# Current Demo Sprint Execution Anchor — 1 October 2026

This section defines the **authoritative implementation sequence for the `demo` branch**. It takes precedence over the older broad development-phase ordering (Section 20 below) for day-to-day implementation sequencing. It does NOT replace the permanent architecture, clinical decision-support rules, or UX specifications.

---

## 1. Current Repository Checkpoint

- **Branch:** `demo`
- **Current Repository Checkpoint:** `953c5fc230400ff18d42b625fd0ad13dd7c5b2b8` (`docs(healthcare): record browser verification checkpoint`)
- **Healthcare Implementation Checkpoint:** `ce38ba6cad97af146a7244d1e8f4835806f14d6e` (`feat(healthcare): complete operational validation and referral workflow`)

### Verification Baseline
- **Laravel Test Suite:** `90 passed, 1,052 assertions` (`docker compose exec -T app php artisan test`)
- **Vue TypeScript Check:** `vue-tsc --noEmit` PASS (0 errors)
- **Frontend Production Build:** `npm run build` PASS (clean asset manifest, standard large-chunk advisory warning for Map/Analytics assets)
- **Git Formatting / Diff Check:** `git diff --check` PASS (clean, no trailing whitespace or EOF issues)
- **Healthcare Antigravity Browser Verification:** **PASS** for directly testable selected prototype scope (Gates A, B1–B7, C1–C3, C6, D, E, F, G, I)
- **User Manual Final Retest:** **NOT YET PERFORMED** (pending project owner verification prior to final team demo)

### Explicit Browser NDVs (Preserved as Not Directly Verified, Not Failures)
- **B8 — Missing-phone T0 fallback:** NDV (all existing demo T0 emergencies were reported by a volunteer with a provisioned phone number; covered by automated test `selected emergency exposes contact but queue does not and missing phone renders fallback`).
- **C4 — T1-before-T2 priority ordering:** NDV (initial demo worklist contained only one unvalidated assessment; covered by automated test `worklist prioritizes oldest t1 then t2 and keeps t3 in patient history`).
- **C5 — Same-category FIFO ordering:** NDV (single unvalidated assessment in initial demo worklist; covered by automated test `worklist prioritizes oldest t1 then t2 and keeps t3 in patient history`).
- **H — Historical referral to inactive Faskes:** NDV (all historical demo referrals point to active `RSUD Candi`; covered by automated test `historical referral remains readable after facility becomes inactive`).

---

## 2. Completed & Stable Functional Areas

The following areas represent the current implemented functional baseline. Verification depth varies by area; known incomplete capabilities remain explicitly assigned to Phases A–D below. Do not broadly redesign these areas unless the active phase requires a focused integration change or a concrete defect is found:

### Foundation
- Laravel 13 + Vue 3 + Inertia.js + TypeScript application structure.
- PostgreSQL + PostGIS spatial infrastructure in Docker Compose.
- Docker Compose service topology (`app`, `queue`, `scheduler`, `reverb`, `nginx`, `postgres`).
- Role-based session authentication with strict `ADMIN`, `RELAWAN`, and `HEALTHCARE` boundary enforcement.

### Relawan Functional Baseline
- Mobile-first Relawan shell, responsive navigation, and header status.
- Psychological First Aid (PFA) Look, Listen, Link guidebook and 5-4-3-2-1 grounding exercises.
- Patient demographic intake and structured assessment session lifecycle.
- SRQ-20 questionnaire (20 binary items with individual question review).
- 5 weighted vulnerability risk factors (R1–R5).
- 3 daily functioning domains (F1–F3, scored 0/1/3).
- Deterministic system triage recommendation engine with auditable component score breakdown and clinical disclaimer.
- Persistent floating T0 Red Flag emergency shortcut and 3-step confirmation/verification modal.
- Client-side IndexedDB/Dexie schema, draft persistence, outbox abstraction, and sync manager baseline.
- Web Speech API speech-to-text (STT) voice assistance baseline.
*(Note: Offline/PWA sync, local-first T0 outbox persistence, and clinical STT safety hardening are NOT complete and are explicitly addressed in Phases B and C below).*

### Healthcare Functional Baseline
- Emergency-first desktop workspace with T0 queue and incident detail view.
- 2-step T0 acknowledgement and secondary tele-verification logging (Phone, Video, Field Team).
- Clinical classification: T0 confirmation or supported clinical downgrade to T1/T2 with free-text diagnosis notes.
- Reporting Relawan contact on selected T0 incident detail via native `tel:` protocol link (with queue privacy).
- Dedicated Validasi Asesmen worklist with segregated `Perlu Divalidasi` and `Selesai` sections.
- Selected validation review displaying full clinical evidence, score breakdown, prior assessments, and clinical disclaimer.
- Immutable stored clinical validation decisions.
- Explicit active-Faskes selection for new non-T0 clinical referrals (rejection of unselected or inactive destinations).
- Patient longitudinal referral history with distinct provenance: `Sumber: Darurat T0` vs `Sumber: Validasi Asesmen`.
- Multi-stage referral dispatch lifecycle tracking and append-only status history.

### Admin Functional Baseline
- Regional command center summary with macro KPI cards and dynamic operational shelter table.
- Interactive MapLibre GL JS geospatial map with shelter/facility markers and detail popups.
- Longitudinal ECharts analytical charts and 30-day mental health trend lines.
- Dedicated master data management for Posko (Shelters) with PostGIS coordinate pair validation.
- Dedicated master data management for Healthcare Organizations (Faskes) with zero-count accuracy.
- Dedicated account provisioning for Relawan (with required Indonesian phone normalization) and Healthcare users (no role selector).
- Strict active-assignment deactivation guards preventing deactivation of Posko/Faskes with active personnel.
- Reassignment audit logs and retained inactive current assignment edge-case handling.

---

## 3. Remaining Execution Sequence

To complete the end-to-end competition prototype safely without scope creep, remaining work is organized into **four sequential implementation phases (Phases A–D)** followed by a final end-to-end verification sequence.

```mermaid
flowchart TD
    PhaseA["Phase A: Healthcare Realtime & Referral/Dispatch Completion"]
    PhaseB["Phase B: Relawan Offline / PWA Completion"]
    PhaseC["Phase C: STT Safety & Interaction Hardening"]
    PhaseD["Phase D: Cross-Role Integration Hardening"]
    FinalVerif["Final Verification & End-to-End Rehearsal"]

    PhaseA --> PhaseB --> PhaseC --> PhaseD --> FinalVerif
```

---

### Phase A — Healthcare Realtime + Referral/Dispatch Completion

#### Goal
Verify and harden the existing realtime reception path and complete referral/dispatch handling from a newly triggered T0 emergency through Healthcare operational response without requiring manual page reloads.

#### Existing Foundation
- Reverb WebSocket service running in Docker Compose (`rapid-mind-reverb-1`).
- `@laravel/echo-vue` configured via `configureEcho({ broadcaster: 'reverb' })` in `resources/js/app.ts`.
- Private `emergencies` broadcast channel authorized for `HEALTHCARE` and `ADMIN` in `routes/channels.php`.
- `App\Events\EmergencyCreated` event dispatched upon Relawan T0 submission.
- `resources/js/layouts/HealthcareLayout.vue` already imports `echo` and `useConnectionStatus` from `@laravel/echo-vue`, subscribes to the private `emergencies` channel, listens for `EmergencyCreated`, plays a finite ~0.3-second audio notification, calls `router.reload()` for `pendingT0Count`, and when the current component is `Healthcare/Emergencies/Index`, also reloads `emergencies`, while displaying basic Reverb connected/not-connected state.

#### Current Gaps to Address
- The Healthcare layout already consumes `EmergencyCreated` and refreshes the authoritative Inertia queue automatically when the emergency page is open. However, this behavior has not yet been directly multi-browser verified as a complete realtime arrival path.
- Reconnect reconciliation is incomplete: a period of disconnected Reverb can miss events, and there is no explicit authoritative reconciliation triggered specifically when the WebSocket reconnects.
- The current connection UI is basic connected/not-connected state and does not yet clearly distinguish connected, reconnecting/stale realtime, and broader server availability.

#### Required Implementation
1. **Realtime Emergency Reception Verification & Hardening:**
   - Verify and harden the existing layout-level `emergencies` subscription and reload behavior rather than introducing a redundant second subscription in `Healthcare/Emergencies/Index.vue` (prefer one subscription owner to avoid duplicate audio alerts, duplicate reloads, or duplicate event handling).
   - Ensure newly created T0 incidents update the open Healthcare queue in real time without a user-initiated browser refresh.
   - Deduplicate incoming emergencies and guard against race conditions.
   - Newly arrived T0 appears in the correct `PENDING` urgent queue state.
   - Retain the finite (~0.3s) audio notification and non-continuous visual attention indicator (strictly no infinite pulsing or disruptive loops).
2. **Connection State & Reconnect Reconciliation:**
   - Enhance the connection state UI to clearly distinguish connected, reconnecting/stale realtime, and broader server availability.
   - Graceful fallback when Reverb is disconnected without representing WebSocket disconnection as total server failure.
   - On WebSocket reconnect, perform explicit reconciliation against authoritative server state to catch events missed during disconnection.
3. **Privacy & Domain Integrity:**
   - Maintain privacy boundaries: queue list conceals volunteer contact; only selected emergency detail renders contact.
   - Preserve existing 2-step acknowledgement, tele-verification, and classification behavior.
4. **Referral / Dispatch Progression Completion:**
   - Inspect and enforce the existing referral status lifecycle:
     ```text
     ACTIVE
     → EN_ROUTE
     → ON_SITE
     → TRANSPORT
     → COMPLETED
     ```
     corresponding to Indonesian presentation (`Aktif Terbit`, `Ambulans Menuju Posko`, `Tiba di Posko`, `Perjalanan ke RS`, `Selesai di RS`).
   - Enforce valid forward state transitions; prevent backward or illegal status jumps.
   - Preserve append-only `referral_status_history` and immutable audit logs.
   - Preserve idempotency and replay protection.
   - Do not add `CANCELLED` or another state merely because it appears useful; a new state may only be introduced if an approved project specification explicitly requires it and the user agrees to the domain change.
   - Add response-team assignment only if supported by concrete existing model semantics; do not invent speculative ambulance dispatch policies.
   - Do not redesign the Healthcare workspace.

#### Verification Gate
- **Multi-Browser Test:**
  - Browser A: Logged in as Healthcare with queue already open on `/healthcare/emergencies`.
  - Browser B: Logged in as Relawan, submits a new T0 emergency.
  - Expected: Browser A updates automatically without user-initiated refresh.
- **Resilience:** Disconnect/reconnect WebSocket and verify reconciliation; verify duplicate events do not create multiple rows.

---

### Phase B — Relawan Offline/PWA Completion

#### Goal
Finish the required field-operational local-first behavior for frontline volunteers using the existing Dexie/IndexedDB outbox architecture.

#### Existing Foundation
- `resources/js/offline/db.ts` (IndexedDB schema via Dexie).
- `resources/js/offline/assessmentDraft.ts` (local draft persistence).
- `resources/js/offline/syncManager.ts` (outbox queue and synchronization manager).
- Data workspace (`/relawan/data`) with server-backed in-progress assessments, completed assessments, and a manual `Sinkronkan` action through `syncManager`.

#### Current Gaps to Address
- Relawan shell header does not dynamically reflect real sync-manager queue counts.
- T0 emergency creation is not fully local-first (must be guaranteed persisted locally before server sync).
- Priority-capable outbox infrastructure already exists and sorts lower numeric priority first, but the T0 submission flow is not currently wired through the local-first emergency outbox path. Therefore emergency priority exists as infrastructure but is not yet exercised by actual T0 creation (assessment server mutations also need source inspection during Phase B before claiming complete outbox integration).
- A production PWA/service-worker offline shell is not currently configured in Vite. Phase B must determine and implement the minimum approved PWA/offline-shell solution required by the final handoff, then verify it directly.

#### Required Implementation
1. **Local-First T0 & Assessment Persistence:**
   - T0 emergency submission must persist locally to IndexedDB before server transmission is attempted.
   - Routine assessment sessions must save complete responses locally to outbox, with source inspection of assessment server mutations to ensure full outbox coverage.
   - Interrupted assessments must support deterministic recovery on page reload or device restart.
   - Client-generated UUIDs ensure idempotency and prevent duplicate records upon server replay.
2. **Prioritized Outbox Synchronization:**
   - Wire actual T0 creation through the local-first emergency outbox path to exercise existing priority queueing (priority 1 emergencies synchronized before priority 2 routine assessments).
   - Distinct, explicit status states: `Local Saved` ≠ `Syncing` ≠ `Server Confirmed`.
   - Never display "Tersinkron" when records remain in local outbox.
3. **UI & Shell Integration:**
   - Relawan layout header consumes real sync-manager state (`Tersinkron` vs `Pending Sync (N)` vs `Offline`).
   - Extend `/relawan/data` so it truthfully exposes local pending records, actual outbox counts/items where appropriate, and synchronization state (do not claim an outbox listing exists before it is implemented).
   - Native SMS fallback remains available as a manual device handoff only; do not invent automated SMS background sending.
   - Do NOT claim fresh-login offline authentication unless an explicit local credentials cache is implemented and verified.
4. **PWA Offline Shell:**
   - Determine and implement the minimum approved PWA/service-worker solution in Vite.
   - Verify Service Worker registers and caches essential PWA app shell assets for offline startup.
   - Offline form interactions must survive browser reload/restart without data loss.

#### Verification Gate
- **Actual Browser Offline Test:**
  - Online → switch network to Offline in DevTools.
  - Create/edit assessment and create T0 emergency.
  - Reload browser while offline: verify data survives.
  - Switch network to Online → trigger sync.
  - Verify authoritative server records created without duplicates.
  - Confirm T0 emergency is synchronized ahead of normal assessments.

---

### Phase C — STT Safety & Interaction Hardening

#### Goal
Retain Web Speech API speech-to-text as an assistive frontline accelerator while strictly enforcing the clinical-safety decision-support contract.

#### Existing Foundation
- `resources/js/Pages/Relawan/Assessment/Srq.vue` integrates browser Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) with `continuous = true`, `interimResults = true`, `lang = 'id-ID'`.
- Indonesian keyword dictionary matching positive symptom indicators.

#### Current Gaps to Address
- Current keyword matcher can directly mutate SRQ answers to `true` without explicit volunteer review.
- Spoken indications of suicide/danger (Q17) must not autonomously finalize answers or trigger T0 without volunteer agency.

#### Required Implementation
1. **Assistive Separation & Explicit Review:**
   - Realtime transcript and keyword detection must remain visual suggestions/hints; they must NEVER silently mutate confirmed SRQ answers.
   - Confirmed SRQ radio buttons (`YA` / `TIDAK`) remain strictly under manual volunteer control.
   - Manual Relawan selection is always authoritative over STT suggestions.
   - Uncertain or ambiguous STT interpretations must be visibly flagged as tentative suggestions.
2. **Q17 & Emergency Safety Contract:**
   - Spoken danger or suicidal ideation (Q17) detected by STT must present a prominent safety warning and offer a shortcut to the T0 Red Flag workflow.
   - STT must NEVER autonomously set Q17 to `YA`, finalize an assessment, or dispatch an emergency event on its own.
3. **Robustness & Degradation:**
   - Explicit listening state indicators (Idle vs Listening vs Processing).
   - Avoid permanent pulsing animations outside active microphone capture.
   - Safe degradation for unsupported browsers: hide or disable microphone button with clear explanation; manual form completion must remain 100% functional.
   - Recognition errors (network, permission denied, no speech) must show transient non-blocking alerts and never prevent manual completion.
   - Preserve local answer drafts regardless of STT state.
   - Do not introduce external third-party STT cloud APIs without explicit approval.

#### Verification Gate
- **Browser Verbal & Manual Tests:**
  - Verify spoken "Ya" produces suggestion without silently overwriting confirmed "Tidak".
  - Verify manual click overrides STT suggestion.
  - Verify Q17 spoken danger produces safety prompt without autonomous T0 dispatch.
  - Simulate microphone error / unsupported API and verify manual completion succeeds.

---

### Phase D — Cross-Role Integration Hardening

#### Goal
Execute targeted integration and stability hardening across all three role experiences, resolving edge cases rather than adding new features.

#### Key Areas to Harden
1. **Idempotency & Replay:** Verify duplicate POST submissions for assessments, T0 emergencies, clinical validations, and referrals are rejected or safely deduplicated by stable IDs.
2. **Lifecycle State Integrity:** Prevent illegal transitions (e.g. validating an incomplete assessment, confirming an already downgraded emergency, or dispatching a completed referral).
3. **Concurrency & Realtime Resilience:** Verify graceful behavior during concurrent triage reviews, stale WebSocket sessions, and rapid role switching.
4. **Form Factor & Responsive Usability:** Verify Relawan PWA displays cleanly on mobile viewports (390px width); verify Healthcare and Admin cockpits display cleanly on desktop viewports (1280px+).
5. **Accessibility & Usability:** Basic keyboard navigation, visible focus indicators, valid form labels, and appropriate contrast across operational states.
6. **Error & Empty States:** Verify clear Indonesian messaging for empty worklists, network dropouts, and invalid deep links.
7. **No Scope Creep:** Do not turn this phase into a broad architecture refactor or full visual redesign.

---

## 4. Final Verification Sequence

Once Phases A through D are completed, the final verification sequence will be executed in this exact order:

```text
Phase A: Automated tests + Antigravity multi-browser realtime verification
→ Phase B: Automated tests + Antigravity offline / outbox sync verification
→ Phase C: Automated tests + Antigravity STT safety & manual override verification
→ Phase D: Automated tests + Cross-role integration verification
→ Final Antigravity cross-role end-to-end rehearsal
→ Project-owner manual retest
→ Final demo polish (only if concrete defects remain)
```

### Final Cross-Role Golden Demo Path:
```text
1. Login as Relawan
2. PFA reference & review
3. Patient demographic intake
4. Structured SRQ-20 assessment (with assistive STT)
5. Vulnerability risk factor checklist
6. Daily functioning evaluation
7. System triage recommendation generation (T1 / T2)
8. Emergency escalation: T0-Suspect creation via Red Flag shortcut
9. Realtime broadcast: Server dispatches EmergencyCreated over Reverb
10. Healthcare reception: Open emergency queue receives T0 without reload
11. Healthcare response: Review volunteer contact (tel:), 2-step acknowledgement, secondary tele-verification
12. Healthcare classification: T0 clinical confirmation or supported downgrade
13. Referral progression: Active facility dispatch tracking and status progression
14. Healthcare validation: Validasi worklist review of completed assessment, clinical decision, referral creation
15. Patient longitudinal profile: Verification of dual-provenance referral history (Darurat T0 vs Validasi Asesmen)
16. Admin visibility: Regional Command Center aggregates live KPIs, geospatial map, and longitudinal analytics
```

---

## 5. Scope Guardrails & Non-Negotiable Rules

All remaining implementation work must adhere strictly to these principles:
- **No Broad Redesigns:** Do not reopen completed Admin, Healthcare, or Relawan screens for aesthetic or architectural overhaul during Phases A–D.
- **Clinical Safety Boundaries:** System triage is a decision recommendation (*"Rekomendasi Sistem"*), NOT a medical diagnosis. Never represent automated scores as diagnoses.
- **No Diagnostic Taxonomy Invention:** Do not invent clinical thresholds, Red Flag rules, scoring formulas, or psychiatric diagnostic categories not supported by existing project sources.
- **Technology Preservation:** Do not replace Laravel Reverb + Echo with Pusher or external services. Do not replace Dexie + IndexedDB. Do not introduce Redis or external databases unless mandated.
- **Status Truthfulness:** Never claim "Tersinkron" when data is only saved locally. Never claim realtime delivery when WebSockets are disconnected. Never claim phone calls connected when only a `tel:` URI was rendered.
- **Git Rules:** The user performs all Git mutations. Never run `git add`, `git commit`, `git push`, `git checkout`, or any mutating Git command.
- **Dependency Rules:** Do not install dependencies without explicit user instruction. All PHP dependencies must run inside Docker; frontend dependencies run on the host.

---

## 6. Decision Rule for Remaining Tasks

Before starting any task in the remaining demo sprint:
1. **Read this Current Demo Sprint Execution Anchor.**
2. **Inspect the current `demo` branch codebase.**
3. **Read the applicable dedicated UX specification.**
4. **Confirm the requested task belongs to the active phase (Phase A, B, C, or D).**
5. **Implement the smallest coherent, working slice.**
6. **Run automated verification (`docker compose exec -T app php artisan test`, frontend build/lint).**
7. **Perform focused browser verification where required.**
8. **Update verification documentation only after concrete runtime evidence exists.**

If an issue belongs to a later phase and does not block the active phase, record it in documentation rather than expanding scope.

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

> The phase structure below remains the architectural/historical development plan. For the current `demo` sprint execution order, use the **Current Demo Sprint Execution Anchor — 1 October 2026** near the top of this document.

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
