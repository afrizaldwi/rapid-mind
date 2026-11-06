# RAPID-MIND Agent Instructions

## Project

RAPID-MIND is a competition prototype for disaster mental-health response.

It is:

```text
one repository
one Laravel application
one user-facing website
three role-specific experiences
```

Canonical roles:

```text
ADMIN
RELAWAN
HEALTHCARE
```

There is no separate `HOSPITAL` role.

RAPID-MIND is a decision-support system, not an autonomous diagnostic system.

---

## Current Priorities: P0–P2 Safety

The immediate target is a secure, reliable localhost competition demonstration.
Work in narrow checkpoints, in this priority order:

- **P0 — privacy and T0 safety:** AES-256-GCM encryption of offline clinical
  data with correct key lifecycle, verified real-user activation/migration and
  plaintext cleanup, offline lock/recovery, and reliable emergency delivery.
- **P1 — non-verbal observations:** multiple observational reasons and optional
  explanation where appropriate, preserved through offline drafts and sync and
  visible to Healthcare. Observations are neither diagnoses nor scoring inputs.
- **P2 — four-state SRQ safety:** preserve `YES`, `NO`, `UNCLEAR`, `UNANSWERED`
  across client, storage, API, server, and Healthcare. Unresolved required answers
  must not produce a definitive score or score-based triage recommendation.
  Apparent SRQ-17 `YES` requires explicit human confirmation; keep manual T0
  available independently of assessment completion.

Use real persistence and the established Reverb/Echo infrastructure. Preserve
correct business transitions and safety controls throughout the workflow.
Do not expand into Admin/heatmap, STT enhancements, deployment, hospital-wide
EMR features, or other backlog work unless the owner explicitly chooses it.
Passing a checkpoint does not automatically authorize the next phase.

---

## Source of Truth

Always inspect the existing repository before changing code.

For requirements, use this priority:

```text
1. Explicit current instructions from the project owner
2. Later-approved safety requirements and explicit agreed decisions
3. Approved dedicated domain/UX specifications and final screen inventory
4. docs/workflow.md — original functional vision, subject to later decisions
5. Technical plan — architecture baseline and implementation sequence
6. Actual repository source — evidence of current implementation
```

When sources conflict, identify the conflicting requirements explicitly. Do not
silently rewrite clinical policy or replace a working architectural decision.
Specific later-approved requirements supersede older conflicting concepts,
including older workflow/technical-plan language about deferred encryption,
automatic SMS, or binary-only SRQ. Document age alone is not approval.
A requirement in `docs/workflow.md` does not prove that a feature exists or was
tested. Use source inspection and appropriately scoped verification for status.

Dedicated specifications include:

```text
RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md
RAPID_MIND_T0_EMERGENCY_INTERACTION.md
RAPID_MIND_HEALTHCARE_WORKSPACE.md
RAPID_MIND_REFERRAL_RESPONSE_INTERACTION.md
RAPID_MIND_ADMIN_WORKSPACE.md
RAPID_MIND_AUTH_PROVISIONING.md
RAPID_MIND_OFFLINE_SECURITY_DESIGN.md
RAPID_MIND_VISUAL_FOUNDATION.md
```

Locate specifications by basename; they may exist outside the Git repository.
Report unavailable sources rather than inventing their requirements.

When available, use the local `.agents/skills/rapid-mind/SKILL.md` and its
references for context. The skill is optional and may be absent for other
contributors; the safety and execution rules in this file remain self-contained.

Do not invent clinical thresholds, Red Flag rules, scoring formulas, diagnosis categories, or operational policies not supported by the project sources.

---

## Mandatory Docker Workflow

**This project uses Docker.**

PHP, Composer, Laravel, PostgreSQL/PostGIS, Reverb, queue workers, and the scheduler are expected to run through Docker.

Do not install or depend on host PHP or host PostgreSQL.

Do not use host commands such as:

```text
php artisan ...
composer ...
```

when working with the Laravel application.

Use Docker Compose.

Examples:

```bash
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan migrate:status
docker compose exec -T app php artisan route:list
docker compose exec -T app php artisan test
docker compose exec -T app composer show
```

For interactive commands, omit `-T` only when interaction is required.

Inspect `compose.yaml` before assuming service names.

Current infrastructure includes:

```text
app
queue
scheduler
reverb
nginx
postgres
```

The browser-facing application is served through Nginx.

Do not replace the Docker architecture with a host-native development setup.

---

## Dependency Installation

The project owner prefers to install dependencies personally. Agents must not
install, upgrade, remove, or modify dependencies or lockfiles without explicit
authorization from the owner.

PHP/Composer dependency commands must run inside Docker:

```bash
docker compose exec -T app composer require <package>
docker compose exec -T app composer install
```

Frontend dependencies may use the host Node/npm environment:

```bash
npm install <package>
npm install
```

When explicitly authorized, install only dependencies directly required by the task.

Do not perform broad package upgrades.

Do not replace existing libraries unnecessarily.

If adding a dependency:

- explain why it is needed in the completion report;
- update the appropriate lock file;
- verify the application still builds/tests.

---

## Git Rules

The project owner exclusively performs all mutating Git operations. Do not
execute or instruct another agent to execute them.

### Never run

```text
git add
git commit
git push
git pull
git merge
git rebase
git reset
git stash
git switch
git checkout
```

Do not perform equivalent Git mutations through another tool.

Read-only Git commands are allowed:

```text
git status
git diff
git diff --check
git log
git show
git branch
git rev-parse
```

Do not commit or push after completing work.

---

## Technology Baseline

Use the established stack:

```text
Laravel 13
Vue 3
Inertia.js
TypeScript
Tailwind CSS
PostgreSQL + PostGIS
Eloquent
Laravel Reverb + Echo
Laravel Queue
Laravel Scheduler
IndexedDB + Dexie
PWA / Service Worker
MapLibre
ECharts
Nginx
Docker Compose
```

Do not replace established technologies without explicit instruction.

---

## Role Boundaries

### Relawan

Relawan handles:

```text
PFA
patient context
structured assessment
SRQ-20
risk factors
daily function
system triage recommendation
T0-Suspect creation
offline/local field workflow
```

Relawan must not clinically confirm T0.

### Healthcare

Healthcare handles:

```text
T0 acknowledgement
secondary verification
clinical validation
T0 confirmation
supported downgrade
referral
patient-specific dispatch / response
patient history
```

Healthcare is emergency-first.

### Admin

Admin handles:

```text
account provisioning
Faskes organization management
Relawan / Posko assignment
regional monitoring
aggregate analytics
resource needs / allocation
operational reporting
```

Admin must not perform patient-specific clinical validation, T0 confirmation/downgrade, referral decisions, or dispatch progression.

---

## Approved Team Decisions — 2026-11-07 (Asia/Jakarta)

Relawan collects field information and submits its own T0-Suspect report, seeing
only that report and local/server delivery state. Healthcare receives necessary
case details only within authorized case/facility scope and performs secondary
and clinical verification. Role membership alone must not be treated as proof of
access to every patient's record. Internal Dispatch assignment is not evidence
of external vehicle contact, physical pickup or completed field response.

Healthcare may explicitly and auditably downgrade T0-Suspect to **T1, T2 or T3**.
This owner/team decision supersedes the earlier T1/T2-only product restriction;
it is not external clinical-protocol certification.

Official Admin case counts and geographic distribution must use Healthcare-
validated outcomes without identifiable patient information. Keep system
recommendations, unverified suspects and validated outcomes separate and correctly
labeled. Define counting unit, deduplication, category coverage and geographic/time
attribution before calling a mixed aggregate an official count. Current source
has gaps; see `docs/RAPID_MIND_ADMIN_WORKSPACE.md`. This documentation decision
neither fixes queries nor grants additional clinical-record access.

P1 reasons allow multiple selections and optional OTHER notes, without diagnosis,
scoring or automatic T0 effects. P2 remains four-state; three explicit UI choices
are permitted if unanswered remains separately represented. Current source has
four response controls. Apparent Q17 YES requires human confirmation before
persistence. These decisions do not close November Safety C1/C2/C3 acceptance.

---

## Critical Domain Rules

T0 is a separate emergency event, not merely a stronger T1.

Use:

```text
Relawan
→ T0-Suspect

Healthcare
→ acknowledgement
→ secondary verification
→ clinical result
```

The original T0-Suspect must remain auditable.

Do not silently overwrite it with Healthcare validation.

Keep these separate:

```text
Clinical classification
≠
Referral
≠
Dispatch
```

Also keep these concepts separate:

```text
local persistence
≠
server acceptance
≠
synchronization
≠
realtime freshness
```

Do not display successful synchronization when only a local save occurred.

Require the approved explicit human verification and final send action before
creating T0-Suspect. A first emergency tap, STT inference, or unconfirmed SRQ-17
interpretation must never silently create or transmit it.
Persist the emergency and a high-priority, idempotent outbox operation atomically
before attempting network delivery. Missing internet, GPS, or complete identity
must not prevent safe offline T0 creation. An SMS composer handoff is not proof
of sending or delivery; a browser-only PWA cannot guarantee silent SMS.

---

## Assessment and Clinical Safety

System triage is a recommendation.

Use user-facing wording such as:

```text
Rekomendasi Sistem
```

Do not present automated triage as a medical diagnosis.

Manual Relawan answers remain authoritative over STT suggestions.

STT must never silently:

```text
create T0
send T0
override manual answers
confirm clinical decisions
```

STT failure must not block manual completion of SRQ-20.
Keep unclear, unanswered, missing, and malformed evidence distinguishable; never
coerce it to NO or zero. Non-verbal observations must not change SRQ, risk,
function, integrated scoring, or T0 state by themselves.

---

## Privacy and Offline Data Safety

Authentication is not encryption. Protect clinical data, full NIK, private
notes, keys, and sensitive payloads from exposure through logs, unencrypted
IndexedDB, UI/service worker caches, broadcasts, analytics, and nonessential
notifications. Enforce server-side RBAC, facility/case scope, resource
authorization, and audit history; Admin receives permitted aggregates rather
than unrestricted patient-level clinical records.

Preserve unsynchronized fieldwork across token expiry, reload, supported offline
restart, and recoverable failures. Enforce owner isolation, lock/recovery, and
stale-client/cross-tab safeguards; ambiguous encryption state must fail closed
without silently falling back to plaintext or deleting unknown local data.
Real-user activation, migration, and plaintext cleanup need scoped authorization
and evidence, including an old-writer barrier. Synthetic fixtures alone do not
prove confidentiality or safe cutover of real-user storage.

---

## Realtime

Laravel Reverb + Echo are the established realtime solution.

Do not replace them.

Technical server receipt is different from Healthcare action.

For example:

```text
Diterima sistem
```

does not mean:

```text
Healthcare acknowledged
Healthcare reviewed
Healthcare validated
team dispatched
```

Represent business-state transitions explicitly.

---

## Visual Direction

All user-facing RAPID-MIND interface text is Bahasa Indonesia.

Visual direction:

```text
Operational Humanitarian UI
calm by default
action over decoration
field readability first
explicit status
emergency visually exceptional
```

Core colors:

```text
Ink       #0F172A
Teal      #0F766E
Slate     #64748B
Soft Gray #F1F5F9
White     #FFFFFF

T0        #991B1B
T1        #C2410C
T2        #A16207
T3        #15803D
```

Primary typeface:

```text
Inter Variable
```

Reserve red for emergency/high-severity semantics.

Do not use permanent flashing, pulsing, bouncing, or continuous emergency animation.

---

## Planning Snapshot — 2026-11-07 (Asia/Jakarta)

This is planning context, not verified completion or acceptance:

- **C1 — acceptance pending:** implementation and isolated tests are reported;
  natural background/foreground lock acceptance remains unresolved, and native
  mobile background lock remains `NOT TESTED`.
- **C2 — local integration:** planned Relawan PWA → offline outbox/sync →
  Laravel/PostgreSQL → Healthcare checks, including realtime, authorization,
  replay/idempotency, failure semantics, and privacy.
- **C3 — safety acceptance:** planned final local P0–P2 regression and signoff,
  including unresolved C1 conditions.

Verify current source and evidence before using these labels. When the local
skill is available, keep detailed changing progress in its
`references/STATUS.md`, not a growing status log here. `IMPLEMENTED`, `PASS`,
`ACCEPTED`, and `NOT TESTED` are distinct; fixture/build success does not prove
live integration or real-device acceptance. Production deployment stays deferred.

---

## Temporary Demo Shortcuts

Temporary shortcuts are acceptable when they:

- materially help complete the demo;
- preserve core business semantics and all P0–P2 safety controls;
- are isolated enough to replace later;
- are reported clearly;
- are not presented as production-ready.

Potential acceptable shortcuts:

```text
seeded demo accounts
seeded synthetic data
simplified account lifecycle
minimal Admin analytics
minimal referral lifecycle
```

Critical encryption, privacy, authorization, data preservation, and emergency
integrity controls must not be deferred as demo shortcuts. Hosting and unrelated
production hardening may wait; these safety requirements may not.

Not acceptable:

```text
fake clinical transitions
hardcoded successful workflow results
removing role boundaries
claiming unsaved data is persisted
claiming realtime succeeded when it did not
claiming security exists when it does not
```

---

## Database

Use PostgreSQL/PostGIS through Docker.

Do not run destructive migrations, database resets, seeders, or state-changing
workflows without explicit authorization and verification that the environment
is safe.

Do not switch to SQLite for convenience.

Use synthetic demo identities only.

Do not commit real patient information.

NIK is not the universal primary key.

Use stable internal identifiers.

---

## Scope Discipline

Before editing:

1. inspect relevant existing code;
2. inspect related routes/models/services/tests;
3. inspect the applicable project specification;
4. make the smallest coherent change.

Do not:

- perform unrelated refactors;
- reformat the whole repository;
- replace working infrastructure;
- add speculative features;
- implement unrelated future phases;
- create giant controllers/components/services.

Prefer focused modules and components.

---

## Verification

Run verification appropriate to the task.

Use Google Antigravity as the preferred browser testing agent. Codex may
implement code and run static or automated checks, but browser testing must
have actual browser evidence before it is reported as performed.

Backend:

```bash
docker compose exec -T app php artisan test
```

Routes:

```bash
docker compose exec -T app php artisan route:list
```

Frontend:

```bash
npm run build
```

Use other existing lint/type-check commands when relevant.

Do not claim:

```text
browser tested
E2E tested
offline tested
realtime tested
mobile tested
```

unless actually verified.

Distinguish source inspection, automated testing, runtime testing, browser testing, and untested behavior.

For demo-critical flows, validate the actual end-to-end workflow when possible.

---

## Completion Report

After every task report:

```text
1. What changed
2. Files changed
3. Important decisions
4. Dependencies installed
5. Verification performed
6. Verification not performed
7. Known limitations / demo shortcuts
8. Suggested next task
```

Do not commit or push.

Work in narrow checkpoints. Stop after the requested checkpoint and report
exact files and results so the project owner can review before the next phase.

---

## First Steps for Every Task

```text
1. Read AGENTS.md
2. Read the current user request
3. Inspect relevant repository code
4. Read relevant project specifications
5. Check repository state with read-only Git commands when useful
6. Implement the smallest coherent solution
7. Run appropriate verification
8. Report accurately
```

Prioritize P0–P2 safety in the working Relawan → T0 → Healthcare workflow.
Stop at the requested checkpoint for owner review; preserve role/domain boundaries.
