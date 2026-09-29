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

## Current Priority: Demo Sprint

The immediate priority is a working end-to-end prototype for a team demo.

Prefer a coherent working workflow over broad architectural completeness.

Critical demo path:

```text
Relawan
→ patient / assessment
→ SRQ-20
→ risk factors
→ daily function
→ system triage recommendation
→ T0-Suspect
→ Healthcare receives emergency
→ Healthcare validates
→ referral / follow-up
→ Admin observes aggregate operational state
```

During this sprint:

- prioritize working happy paths;
- use real persistence where practical;
- use real Reverb/Echo realtime where required;
- keep business-state transitions correct;
- allow temporary implementation shortcuts when clearly isolated;
- defer production-grade security hardening if it blocks the demo;
- do not represent temporary shortcuts as production-ready.

A smaller complete workflow is better than many unfinished screens.

---

## Source of Truth

Always inspect the existing repository before changing code.

For requirements, use this priority:

```text
1. Current user instruction
2. RAPID_MIND_FINAL_SCREEN_INVENTORY_IMPLEMENTATION_HANDOFF.md
3. Relevant dedicated UX specification
4. RAPID_MIND_SHARED_SYSTEM_STATES_INTERACTIONS.md
5. RAPID_MIND_VISUAL_FOUNDATION.md
6. RAPID_MIND_TECHNICAL_PLAN.md
7. workflow.md
```

Dedicated specifications include:

```text
RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md
RAPID_MIND_T0_EMERGENCY_INTERACTION.md
RAPID_MIND_HEALTHCARE_WORKSPACE.md
RAPID_MIND_REFERRAL_RESPONSE_INTERACTION.md
RAPID_MIND_ADMIN_WORKSPACE.md
RAPID_MIND_AUTH_PROVISIONING.md
```

These documents may exist outside the Git repository.

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

For this demo sprint, **Antigravity is allowed to install required dependencies**.

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

Only install dependencies that are directly required by the current task.

Do not perform broad package upgrades.

Do not replace existing libraries unnecessarily.

If adding a dependency:

- explain why it is needed in the completion report;
- update the appropriate lock file;
- verify the application still builds/tests.

---

## Git Rules

The user performs all Git mutations.

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

## Demo Build Priority

Unless the user gives a different task order:

```text
1. Application starts reliably
2. Minimal domain/database structure
3. Login and role entry
4. Relawan workflow
5. Assessment and triage
6. T0 creation
7. Healthcare realtime reception
8. Healthcare validation
9. Referral / follow-up
10. Admin aggregate visibility
11. Offline improvements
12. STT improvements
13. Visual polish
14. Security hardening
```

Admin analytics must not delay the Relawan → T0 → Healthcare workflow.

---

## Temporary Demo Shortcuts

Temporary shortcuts are acceptable when they:

- materially help complete the demo;
- preserve core business semantics;
- are isolated enough to replace later;
- are reported clearly;
- are not presented as production-ready.

Potential acceptable shortcuts:

```text
seeded demo accounts
seeded synthetic data
simplified account lifecycle
limited edge-case handling
minimal Admin analytics
minimal referral lifecycle
deferred advanced security
```

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

During the current demo sprint, prioritize a working end-to-end RAPID-MIND workflow while preserving the permanent role and domain boundaries.