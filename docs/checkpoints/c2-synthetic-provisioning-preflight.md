# C2 synthetic provisioning — completed after owner authorization

9 November 2026. **C2 NOT ACCEPTED; C3 not started.** Database backup COMPLETE;
frontend publication COMPLETE / HTTP VERIFIED. Synthetic provisioning COMPLETE;
clinical browser acceptance NOT TESTED. Earlier preflight/failed-attempt records are
historical. Current authorized provisioning and backend changes are recorded below.

## Current completion status — supersedes historical gates below

Provisioning COMPLETE / HTTP AND DATABASE VERIFIED. Owner confirmed all local
rapid_mind data is disposable dummy data and accepted the existing audit gap;
provenance/preservation approvals below describe an earlier stage, not current
requirements. No unnecessary reset/deletion/reassignment was performed.
Scopes6/7 active, mappings6→6/7→7. Healthcare IDs30/31; Relawan IDs32/33.
All four real web logins passed; scoped channel auth200/foreign403; reciprocal
patient reads200/404. Two new unfinished HTTP assessment fixtures route correctly
and preserve four SRQ states in PostgreSQL. Browser testing NOT TESTED.

The subsequent owner instruction authorized a narrowly tested backend-only
non-routable phone exception, implemented in C2SyntheticPhone and Admin
ProvisioningController. Exact names/emails/contacts, creation-only, local/testing
DB/URL guards; strict production/existing-user validation preserved.
13 focused phone/Admin tests234 assertions and9 C2 tests186 assertions passed.
No frontend update was needed. Credentials are Git-ignored under
storage/app/private/c2-acceptance (0700; credentials.json0600), never printed.
Audit111/112 record mappings; no account/activation audit added. Current counts:
users15,patients27,assessments19,emergencies42,shares0,audits112.
Refer to the Antigravity handoff for identities, fixture UUIDs, allowed writes and
remaining browser evidence. C2 NOT ACCEPTED; C3 not started.

## Historical preflight — read with superseding completion status above

## Provenance and scope evidence

Actual Laravel target verified in a READ ONLY repeatable-read transaction:
local / pgsql / rapid_mind. Only selected organization/user metadata, scoped audit
metadata and aggregate clinical counts were inspected; no clinical row details,
credentials, password hashes or token/private configuration were returned.

| Kind / ID | Name | Active | Mapping | Created timestamp as stored |
| --- | --- | --- | --- | --- |
| Posko 6 | Posko Final 88a4387 A | no | NULL | 2026-10-03 06:26:39 |
| Posko 7 | Posko Final 88a4387 B | no | NULL | 2026-10-03 06:30:46 |
| Facility 6 | Faskes Final 88a4387 A | no | n/a | 2026-10-03 06:27:39 |
| Facility 7 | Faskes Final 88a4387 B | no | n/a | 2026-10-03 06:32:08 |

Both Posko have region_id 1 and non-null locations. Facility 6 is Puskesmas and
facility 7 is RS; both have nonempty required addresses. Keep existing names,
addresses, types, region and exact coordinates unchanged during later activation.

Scope 6 has no current users. Scope 7 has inactive Relawan ID 27 (Posko 7) and
inactive Healthcare ID 28 (facility 7); leave every field on both users unchanged.
Neither owns assessments/emergencies. There are zero cases originating from Posko
6/7, zero responsible-facility assignments to 6/7, and zero shares to either.
All 17 assessments and 42 emergencies remain UNRESOLVED with NULL case scope.
All seven primary facility mappings are currently NULL.

Relevant audit metadata:

- Audit 47, actor 21, VOLUNTEER_REASSIGNED, User 27, stored timestamp
  2026-10-03 06:30:58; change keys shelter_id.
- Audit 48, actor 21, HEALTHCARE_REASSIGNED, User 28, stored timestamp
  2026-10-03 06:32:24; change keys facility_id.

There are no Shelter/HealthcareFacility entity audit records. Current controllers
also lack organization creation/activation audit entries. Repository searches for
the exact 88a4387/name markers found only the later C2 planning report, not a
creation script, fixture manifest or original browser evidence. Creation timestamps,
user reassignment audits, inactive state and names do not establish synthetic origin.
**Synthetic provenance is NOT ESTABLISHED. Owner confirmation is required before
reusing all four organization rows.** No inference of disposability is made.
If confirmation is unavailable, stop and prepare a separately approved dedicated
organization alternative; do not silently create extra scopes.

## Exact proposed changes — NOT EXECUTED

Use a valid Admin session and the existing validated Admin forms/routes, not SQL
inserts, seeders or an unvalidated controller bypass. Expected actor is the existing
approved synthetic Admin; reconfirm active ADMIN identity before any write. No
clinical-record reads or unrelated Admin analytics are needed.

1. PUT /admin/facilities/organizations/6: is_active false → true; retain existing
   name/type/address. Inspect result before the next operation.
2. PUT /admin/facilities/organizations/7: same activation, preserving other fields.
3. PUT /admin/operations/posko/6: is_active false → true and primary_facility_id
   NULL → 6. Preserve name, region_id=1, address and current latitude/longitude.
4. PUT /admin/operations/posko/7: is_active false → true and primary_facility_id
   NULL → 7. Preserve the other fields as above.
5. POST /admin/volunteers: C2 Relawan A, c2-relawan-a@example.invalid,
   shelter_id=6, is_active=true, owner-supplied private phone/password/confirmation.
6. POST /admin/volunteers: C2 Relawan B, c2-relawan-b@example.invalid,
   shelter_id=7, is_active=true, privately supplied phone/password/confirmation.
7. POST /admin/facilities/users: C2 Healthcare A,
   c2-healthcare-a@example.invalid, facility_id=6, is_active=true,
   privately supplied password/confirmation.
8. POST /admin/facilities/users: C2 Healthcare B,
   c2-healthcare-b@example.invalid, facility_id=7, is_active=true,
   privately supplied password/confirmation.

These are four updates and four new users, not eight pre-authorized operations.
Each request is independently validated/transactional; the entire plan is not one
transaction. Normal updated_at timestamps on changed organizations and new user
IDs/timestamps are expected. Do not predict user IDs. Keep the opposite assignment
field NULL; keep every existing user's assignment/status/version unchanged.
Do not submit empty coordinates: ShelterManagementController::saveLocation clears
location when latitude/longitude are omitted. Use the current form-loaded values
and compare the exact stored geometry after each update. No geographic edits.

No case assignment, share, historical transfer, demographic change, synthetic
patient/assessment/emergency creation or browser clinical test is included.
Other Posko mappings (IDs 1–5) remain NULL. All 59 historical cases remain untouched.

## Accounts, validation and credential handling

Current read-only checks found zero exact/case-insensitive email matches, zero
case-insensitive display-name matches and zero cross-name/email login collisions
for each proposed account. All four proposed .invalid emails passed the existing
Laravel email validator. Recheck uniqueness immediately before execution.

There is no separate username field. Login accepts name OR email; names are not
unique at database/validation level. These distinct unused display names are
proposed to avoid ambiguity; email is uniquely validated and constrained. Routes
choose fixed RELAWAN/HEALTHCARE roles; a client role field must not determine role.
Assignment must exist and be active, rechecked under lock inside account creation.
No HOSPITAL role and no additional Admin account.

Passwords are required on creation, at least 8 characters, and confirmed. User's
hashed password cast handles storage; do not prehash or bypass model validation.
Owner supplies four private initial passwords through the protected Admin form;
never place them in reports, command arguments, screenshots, logs or evidence.
No new reset/enforced-first-change behavior is assumed. Do not print stored hashes.

**Missing input:** both Relawan accounts require a phone number accepted by
IndonesianPhone::normalize (Indonesian mobile format, normalized to +62).
Owner must provide controlled test contact values privately and confirm they may
be used for these synthetic accounts. Do not invent arbitrary reachable numbers,
reuse somebody's contact implicitly or contact them. No SMS/call is authorized.
Healthcare creation has no phone requirement. Default UI examples are not approval.

## Expected audit effects and known gap

- Exactly two SHELTER_PRIMARY_FACILITY_CHANGED rows, entities Shelter 6 and 7,
  primary_facility_id NULL → 6/7, attributed to the approved Admin. They are inside
  the Posko update transactions.
- Facility activation and Posko active-flag changes do not create separate audit
  rows. Their updated_at timestamps change as normal.
- The existing ProvisioningController::store does not emit account-creation audit
  rows. Reassignment audits are only in the update path; no existing user is moved.
  No observer/provider introducing extra creation audits was found.
- Expected audit count under the existing workflow is **110 → 112**, users
  **11 → 15**, organizations unchanged at seven of each. Do not manufacture
  account-creation logs or claim these four new accounts are fully audit-covered.

Owner must review this existing audit limitation. If creation/activation auditing
is required before provisioning, that needs a separately scoped source change and
its own verification/publication consideration; source is unchanged here. Do not
silently extend the frozen application or insert ad-hoc audit rows.

## Baseline record counts

| Table | Baseline |
| --- | ---: |
| shelters | 7 |
| healthcare_facilities | 7 |
| users | 11 |
| patients | 25 |
| assessments | 17 |
| srq_responses | 280 |
| risk_responses | 70 |
| function_responses | 42 |
| triage_results | 14 |
| emergency_events | 42 |
| emergency_verifications | 56 |
| clinical_validations | 5 |
| referrals | 14 |
| referral_status_history | 37 |
| emergency_dispatches | 0 |
| emergency_dispatch_history | 0 |
| clinical_case_shares | 0 |
| audit_logs | 110 |

## Verification and stop-on-error plan

Before execution, reconfirm the approved Admin identity, local pgsql rapid_mind,
provenance confirmation, empty candidate memberships except inactive 27/28,
organization values, all primary mappings and email/name uniqueness. Capture
private preservation fingerprints and aggregate counts without printing private
clinical/user values. Do not recreate backups, rebuild/publish assets, restart
services or repeat session-retirement checks.

After EACH request inspect HTTP/validation outcome and read back only its intended
organization/new-account fields. Verify the correct active scope; preserve original
organization attributes and geography. New account role must be server-selected,
assignment correct, token_version=1, no opposite assignment. Verify password
handling without printing the password/hash. Account login tests are not part of
this provisioning plan; organization provisioning does not establish browser E2E.

At completion compare historical clinical counts/fingerprints, all 59 unresolved
routing rows, existing users (especially 27/28), other five mappings and clinical
shares. Only the two expected mapping audit rows and four new user rows may appear
in these domain baselines. Admin authentication/session/cache writes are distinct
operational effects and require explicit execution authorization; never report them
as clinical data changes. Verify those effects separately from domain counts.

Any validation error, unexpected membership, extra/missing row, audit mismatch,
coordinate change, access error or ambiguous response means STOP. No automatic
retry of account POSTs, rollback, deactivate/delete cleanup, seeding or recovery.
Report actual committed partial progress and wait for owner direction. Never infer
failure/success from a lost HTTP response; inspect the exact intended new alias
read-only before proposing a separately authorized next action.

## Remaining owner gate

Explicit confirmation that Posko 6/7 and facilities 6/7 are synthetic and approved
for reuse; approval of the eight specified Admin requests and necessary Admin
session effects; review/acceptance of the existing creation/activation audit gap
or a separate audit-change requirement; privately supplied credentials and two
controlled test telephone values. No provisioning approval has been inferred.
Stop here pending that approval. Clinical browser writes remain separately gated.
