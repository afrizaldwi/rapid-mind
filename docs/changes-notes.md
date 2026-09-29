# RAPID-MIND — Development Change Notes

**Document:** Implementation Change Notes & Technical Log  
**Date:** 2026-09-29  
**Branch:** `demo`  
**Milestone:** Phase 1 – 3 (Foundation, Domain Database Schema, & Triage Engine)

---

## 1. Executive Summary

This log documents the foundational changes implemented to establish the RAPID-MIND core architecture and domain models according to the project specifications (`workflow.md`, `RAPID_MIND_TECHNICAL_PLAN.md`, `RAPID_MIND_FINAL_SCREEN_INVENTORY_IMPLEMENTATION_HANDOFF.md`, and `AGENTS.md`).

Key achievements:
1. **Verified Docker Container Infrastructure**: All 6 Docker services (`app`, `queue`, `scheduler`, `reverb`, `nginx`, `postgres`) running and healthy with PostgreSQL 17 + PostGIS 3.5.
2. **Database Schema & Migrations**: 17 migration files created and executed against PostgreSQL, incorporating UUIDs for clinical entities and PostGIS geometry fields for shelters and regional polygons.
3. **Domain Enums**: 8 backed string enums covering role boundaries, triage levels, emergency states, red flag types, assessment modes, and referral lifecycles.
4. **Eloquent Domain Models**: 17 Eloquent models created/extended with strict type-casting, fillable attributes, and bidirectional relationships.
5. **Deterministic Triage Engine**: Implemented `app/Domain/Triage/` with 5 calculator services, Red Flag detectors, and immutable value objects.
6. **Unit Test Suite**: 14 automated PHPUnit unit tests covering scoring formulas, functional overrides, boundary conditions, and T0 Red Flag emergency safety gates (100% pass rate).

---

## 2. Infrastructure & Environment Verification

- **Docker Environment**:
  - `rapid-mind-app-1`: PHP 8.4-FPM (`docker/php/Dockerfile`), running as non-root user `app`.
  - `rapid-mind-postgres-1`: `postgis/postgis:17-3.5`, spatial extensions verified (`CREATE EXTENSION IF NOT EXISTS postgis`).
  - `rapid-mind-nginx-1`: Reverse proxy at port `8080`, configured with PHP-FPM socket and Reverb WebSocket path (`/apps/`).
  - `rapid-mind-queue-1`, `rapid-mind-scheduler-1`, `rapid-mind-reverb-1`: Operational background workers.
- **Workflow Compliance**: All PHP, Composer, and Artisan commands executed exclusively via `docker compose exec -T app ...`. Frontend build validated with `npm run build`.

---

## 3. Database Migrations (`database/migrations/`)

17 migrations were authored and migrated:

| Migration File | Target Table / Scope | Description & Key Schema Design |
|---|---|---|
| `2026_09_29_150000_create_regions_table.php` | `regions` | Regional boundaries with spatial `geometry(MultiPolygon, 4326)` column. |
| `2026_09_29_150001_create_shelters_table.php` | `shelters` | Evacuation centers (Posko Pengungsian) with spatial `location geometry(Point, 4326)`. |
| `2026_09_29_150002_create_healthcare_facilities_table.php` | `healthcare_facilities` | Faskes master records (Puskesmas, RS Rujukan, PSC 119). |
| `2026_09_29_150003_extend_users_table.php` | `users` | Adds `role` (enum: RELAWAN, HEALTHCARE, ADMIN), `token_version` (integer), `is_active` (boolean), `facility_id` (FK nullable), `shelter_id` (FK nullable). |
| `2026_09_29_150004_create_patients_table.php` | `patients` | Survivor profiles with UUID primary key (`id`), indexed `nik` (nullable), demographic fields, shelter linkage, and creator volunteer ID. |
| `2026_09_29_150005_create_assessments_table.php` | `assessments` | Assessment parent entity with UUID primary key (`id`), `status` (IN_PROGRESS, COMPLETED), `mode` (VERBAL, NON_VERBAL), session timestamps. |
| `2026_09_29_150006_create_srq_responses_table.php` | `srq_responses` | 20 individual SRQ questions per assessment with unique constraint on `[assessment_id, question_number]`. |
| `2026_09_29_150007_create_risk_responses_table.php` | `risk_responses` | 5 vulnerability factors (R1–R5) with indicator code, boolean status, and pre-calculated weight. Unique on `[assessment_id, indicator]`. |
| `2026_09_29_150008_create_function_responses_table.php` | `function_responses` | 3 daily functioning domains (F1–F3) scored at 0, 1, or 3. Unique on `[assessment_id, domain]`. |
| `2026_09_29_150009_create_triage_results_table.php` | `triage_results` | Auditable system triage recommendation: `srq_score`, `risk_score`, `function_score`, `total_score`, `system_recommendation`, `is_red_flag_override`, `red_flag_source`. |
| `2026_09_29_150010_create_emergency_events_table.php` | `emergency_events` | Standalone T0 emergency incidents with UUID primary key (`id`), `red_flag_type`, `status`, decimal coordinates (`latitude`, `longitude`), and shelter association. |
| `2026_09_29_150011_create_emergency_verifications_table.php` | `emergency_verifications` | Healthcare secondary tele-verification logs with `verified_by`, `method` (PHONE, VIDEO, FIELD_TEAM), and clinical determination. |
| `2026_09_29_150012_create_clinical_validations_table.php` | `clinical_validations` | Healthcare formal assessment validation: `validated_by`, `clinical_result`, free-text `diagnosis_notes`, `intervention_plan`, and `referral_required`. |
| `2026_09_29_150013_create_referrals_table.php` | `referrals` | Patient referral cases with UUID primary key (`id`), dispatch tracking, target facility FK, and initial status. |
| `2026_09_29_150014_create_referral_status_history_table.php` | `referral_status_history` | Append-only audit trail for referral lifecycle (Active → En Route → On Site → Transport → Completed). |
| `2026_09_29_150015_create_audit_logs_table.php` | `audit_logs` | Immutable audit trail for clinical and emergency status transitions with actor ID and `jsonb` old/new value snapshots. |
| `2026_09_29_150016_create_refresh_tokens_table.php` | `refresh_tokens` | JWT refresh token store with `jti` unique index, user FK, and revocation timestamp for token rotation. |

---

## 4. Backed Enums (`app/Enums/`)

Created 8 native PHP 8.4 backed string enums:

1. `UserRole`: `RELAWAN`, `HEALTHCARE`, `ADMIN`.
2. `TriageCategory`: `T0_SUSPECT`, `T0_CONFIRMED`, `T1`, `T2`, `T3`.
3. `EmergencyStatus`: `PENDING`, `ACKNOWLEDGED`, `REVIEWING`, `CONFIRMED`, `DOWNGRADED`, `RESOLVED`.
4. `RedFlagType`: `SUICIDAL_IDEATION`, `PSYCHOSIS`, `SEVERE_AGITATION`, `MEDICAL_CRISIS`.
5. `AssessmentStatus`: `IN_PROGRESS`, `COMPLETED`.
6. `ReferralStatus`: `ACTIVE`, `EN_ROUTE`, `ON_SITE`, `TRANSPORT`, `COMPLETED`.
7. `AssessmentMode`: `VERBAL`, `NON_VERBAL`.
8. `VerificationMethod`: `PHONE`, `VIDEO`, `FIELD_TEAM`.

---

## 5. Eloquent Domain Models (`app/Models/`)

### 5.1 Updated Core Model
- `User.php`:
  - Added fillable fields: `role`, `token_version`, `is_active`, `facility_id`, `shelter_id`.
  - Added attribute casting: `role` → `UserRole::class`, `is_active` → `'boolean'`, `token_version` → `'integer'`.
  - Defined relationships: `facility()` (BelongsTo `HealthcareFacility`), `shelter()` (BelongsTo `Shelter`), `assessments()` (HasMany `Assessment`), `emergencyEvents()` (HasMany `EmergencyEvent`).

### 5.2 Newly Implemented Domain Models
- `Region.php`: BelongsTo/HasMany hierarchy for administrative disaster operational zones.
- `Shelter.php`: Posko pengungsian master linked to Region, Volunteers (`users`), and Patients.
- `HealthcareFacility.php`: Healthcare / Faskes facility organizational model.
- `Patient.php`: UUID-identified survivor entity using `Illuminate\Database\Eloquent\Concerns\HasUuids`. Links to assessments and emergencies.
- `Assessment.php`: Assessment container using `HasUuids` with status/mode enum casting, linking SRQ, Risk, Functioning, and Triage results.
- `SrqResponse.php`: Normalized 20-item binary questionnaire responses.
- `RiskResponse.php`: Weighted vulnerability factors (R1–R5).
- `FunctionResponse.php`: 3-domain functional impairment metrics (F1–F3).
- `TriageResult.php`: Decision-support triage score output with `TriageCategory` enum casting.
- `EmergencyEvent.php`: High-priority T0 emergency event using `HasUuids` with decimal coordinate casting and emergency status enums.
- `EmergencyVerification.php`: Secondary triage verification by qualified Healthcare personnel.
- `ClinicalValidation.php`: Healthcare clinical assessment validation record (separated from volunteer recommendation).
- `Referral.php`: Referral logistics coordination entity using `HasUuids`.
- `ReferralStatusHistory.php`: Audit tracking for dispatch/transport status changes.
- `AuditLog.php`: Global audit log with `jsonb` array casting.

*Bugfix Note on UUID Models*: Corrected `Patient`, `Assessment`, `EmergencyEvent`, and `Referral` by removing redundant `protected $primaryKey = 'uuid'` declaration. In Laravel's `HasUuids` trait, the primary key column default is `'id'`, ensuring direct alignment with `$table->uuid('id')->primary()`.

---

## 6. Triage Calculation Engine (`app/Domain/Triage/`)

Isolated domain logic separated from HTTP controllers to allow independent testing and synchronization verification.

### 6.1 Components
1. `SrqCalculator.php`:
   - Iterates questions 1 to 20; increments score by 1 for each affirmative (`true`) answer. Range: `0–20`.
2. `RiskCalculator.php`:
   - Evaluates weighted vulnerability indicators:
     - **R1** (Loss of family / destroyed home): `2 points`
     - **R2** (Direct life-threatening trauma): `2 points`
     - **R3** (Vulnerable group - Elderly/Pregnant/Disabled): `1 point`
     - **R4** (Pre-existing psychiatric condition): `2 points`
     - **R5** (Discontinued chronic medication): `1 point`
   - Maximum risk score: `8 points`.
3. `FunctionCalculator.php`:
   - Evaluates WHODAS-adapted 3 domains:
     - **F1**: Perawatan Diri (*Self-Care*)
     - **F2**: Fungsi Peran & Sosial (*Social Functioning*)
     - **F3**: Akses Kebutuhan (*Daily Tasks*)
   - Scored on scale: `0` (independent), `1` (impaired/requires prompting), `3` (completely incapacitated).
   - Maximum functioning score: `9 points`.
4. `RedFlagDetector.php`:
   - Evaluates clinical safety triggers:
     - SRQ-20 Item #17 (`"Apakah Sdr memiliki pemikiran untuk mengakhiri hidup?"`) answered affirmative (`true`).
     - Manual frontline volunteer override (floating emergency FAB trigger).
   - Returns source indicator (`SRQ_Q17` or `MANUAL_RED_FLAG`).
5. `TriageResultValue.php`:
   - Immutable readonly DTO carrying: `srqScore`, `riskScore`, `functionScore`, `totalScore`, `recommendation`, `isRedFlagOverride`, `redFlagSource`.
6. `TriageCalculator.php`:
   - Master orchestrator:
     $$\text{Total Score} = \text{SRQ} (0-20) + \text{Risk} (0-8) + \text{Function} (0-9) \quad [0-37]$$
   - Classification logic:
     - **T0-Suspect**: Triggered if Red Flag is detected; bypasses numerical score thresholds.
     - **T1 (High Risk / Priority Clinical Assessment)**: $\text{Total Score} \geq 15$ OR $\text{Function Score} \geq 6$.
     - **T2 (Moderate Risk / Psychosocial Follow-Up)**: $\text{Total Score} \in [7, 14]$ (with $\text{Function Score} < 6$).
     - **T3 (Low Risk / Routine Community Support)**: $\text{Total Score} \in [0, 6]$ (with $\text{Function Score} < 6$).

---

## 7. Testing & Quality Assurance (`tests/Unit/Triage/`)

Created test suite `tests/Unit/Triage/TriageCalculatorTest.php` with 14 detailed tests and 40 assertions:

1. `t0_triggered_by_q17_yes`: Verified SRQ Q17 produces `TriageCategory::T0_SUSPECT` with `isRedFlagOverride = true` and source `SRQ_Q17`.
2. `t0_triggered_by_manual_red_flag`: Verified manual trigger bypasses scores and sets source `MANUAL_RED_FLAG`.
3. `t0_manual_takes_precedence_over_q17`: Verified explicit manual trigger priority.
4. `t1_by_high_total_score`: Verified total score $\geq 15$ outputs `TriageCategory::T1`.
5. `t1_by_exact_boundary_15`: Verified exact boundary condition of 15 points.
6. `t1_by_functional_override`: Verified low overall score with functional score $\geq 6$ (e.g., F1=3, F2=3) triggers `T1`.
7. `t1_by_functional_override_max_function`: Verified maximum functional impairment (score 9) forces `T1`.
8. `t2_at_lower_boundary`: Verified lower boundary of 7 points outputs `TriageCategory::T2`.
9. `t2_at_upper_boundary`: Verified upper boundary of 14 points outputs `TriageCategory::T2`.
10. `t3_zero_score`: Verified baseline clean profile outputs `TriageCategory::T3`.
11. `t3_at_upper_boundary`: Verified upper boundary of 6 points outputs `TriageCategory::T3`.
12. `score_breakdown_is_correct`: Verified component score arithmetic ($\text{SRQ} + \text{Risk} + \text{Function} = \text{Total}$).
13. `maximum_possible_score`: Verified score accumulation to 37 points with safety gate override.
14. `maximum_score_without_q17`: Verified non-emergency ceiling score (36 points) correctly classifies as `T1`.

**Test Execution**:
```bash
docker compose exec -T app php artisan test tests/Unit/Triage/
```
Result: **14 passed, 40 assertions, 0 failures (0.07s)**.

---

## 8. Current Status & Next Steps

Phases 1, 2, and the backend engine of Phase 3 are complete and verified.

### Next Implementation Steps:
1. **Demo Seeder (`DemoSeeder.php`)**: Seed deterministic accounts (`admin@rapidmind.id`, `relawan@rapidmind.id`, `nakes@rapidmind.id`), demo shelters, and initial synthetic patient records.
2. **Client-side Triage Parity (`resources/js/domain/triage/`)**: Implement identical TypeScript calculators for offline field operations.
3. **JWT Authentication & RBAC Middleware**: Install and configure `php-open-source-saver/jwt-auth`, configure guards, and create the universal login controller and Vue view (`/login`).
