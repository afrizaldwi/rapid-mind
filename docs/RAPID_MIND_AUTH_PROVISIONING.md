# RAPID-MIND — Authentication & Account Provisioning UX

**Document type:** UI/UX design specification  
**Scope:** Universal login, role routing, authentication states, Relawan offline continuity, account provisioning, credential lifecycle, revocation, logout, and account lifecycle  
**Product language:** Bahasa Indonesia  
**Discussion/design language:** English  
**Design direction:** Operational Humanitarian UI  
**Status:** Design baseline for the next UI/UX phase

---

# 1. Source Constraints

This design is derived from and must remain consistent with:

1. `RAPID_MIND_TECHNICAL_PLAN.md`
2. `workflow.md`
3. `RAPID_MIND_VISUAL_FOUNDATION.md`
4. `RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md`
5. `RAPID_MIND_T0_EMERGENCY_INTERACTION.md`
6. `RAPID_MIND_HEALTHCARE_WORKSPACE.md`
7. `RAPID_MIND_REFERRAL_RESPONSE_INTERACTION.md`
8. `RAPID_MIND_ADMIN_WORKSPACE.md`

The technical plan remains the architectural constraint.

The role-specific design documents remain established baselines.

This document does not redefine:

- the technical stack;
- the JWT architecture;
- triage logic;
- role authority;
- Healthcare clinical workflows;
- Relawan field workflows;
- Admin macro-operational responsibilities;
- the visual palette or typography.

The purpose of this document is to close the authentication, provisioning, session, revocation, and offline-auth UX/state model before implementation begins.

---

# 2. Canonical Role Model

RAPID-MIND uses three application roles:

```text
ADMIN
RELAWAN
HEALTHCARE
```

There is no separate `HOSPITAL` role.

Healthcare users belong to Healthcare/Faskes organizations such as:

```text
Hospital / RS
Puskesmas
PSC 119
other approved Healthcare/Faskes organizations
```

For the competition prototype:

```text
1 Healthcare/Faskes organization
→ many Healthcare users
```

and:

```text
1 Healthcare user
→ 1 primary organization
```

Do not introduce a complex permission matrix unless a concrete future requirement requires it.

---

# 3. Provisioning Authority

Admin is the sole normal provisioning authority.

```text
ADMIN
├── creates/manages Relawan accounts
├── creates/manages Healthcare accounts
├── creates/manages Healthcare/Faskes organizations
└── associates Healthcare users with organizations/facilities
```

RAPID-MIND does not provide:

```text
public registration
Relawan self-registration
Healthcare self-registration
Relawan-created users
Healthcare-created users
Healthcare-created facility master records
```

Authentication and provisioning must preserve the role boundaries already established elsewhere in the system.

---

# 4. Technical Authentication Baseline

RAPID-MIND uses:

```text
JWT access token
+
JWT refresh token
```

Preferred storage model:

```text
Access JWT
→ browser memory
→ Authorization header
```

```text
Refresh JWT
→ Secure + HttpOnly + SameSite cookie
```

Do not intentionally persist long-lived authentication credentials in:

```text
localStorage
IndexedDB
```

The architecture also uses concepts including:

```text
token_version
jti
user active status
refresh-token rotation
revocation
role-aware routing
backend authorization
```

Backend authorization is the real security boundary.

Frontend role routing only provides navigation and UX behavior.

---

# 5. Core Authentication Principle

Authentication state must not destroy legitimate Relawan field work.

The application must distinguish:

```text
server-authenticated state
```

from:

```text
offline field continuity
```

A Relawan who was previously authenticated may continue permitted local workflows while offline even if the access token expires.

This does not mean the device still has a valid server-authenticated session.

The correct conceptual state is:

```text
OFFLINE_FIELD_MODE
```

not:

```text
AUTHENTICATED
```

Server synchronization requires valid server authentication.

Local field continuity does not.

---

# 6. Universal Login

RAPID-MIND uses one shared login screen for all roles.

Recommended structure:

```text
RAPID-MIND

Email atau username
[________________________]

Kata sandi
[________________________] [Tampilkan]

[ MASUK ]

Lupa kredensial? Hubungi Admin.
```

Do not include:

```text
role selector
organization selector
public registration
social login
remember-me checkbox
decorative dashboard content
```

The application determines the authenticated user's role after login.

Normal browser/password-manager support should remain enabled.

---

# 7. Login Submission State

After the user submits valid-looking credentials:

```text
Memeriksa akses…
```

The system then validates:

```text
credentials
account status
role
required role relationship
```

The user does not manually choose their role.

---

# 8. Post-Login Role Routing

Successful authentication routes to:

```text
ADMIN
→ Ringkasan
```

```text
RELAWAN
→ Beranda
```

```text
HEALTHCARE
→ Darurat
```

No intermediary role-selection screen is used.

---

# 9. Invalid or Incomplete Account Configuration

Authentication may succeed while account configuration remains unusable.

The application must distinguish authentication from operational eligibility.

## 9.1 Unsupported Role

Example:

```text
Akun tidak memiliki akses RAPID-MIND yang valid.

Hubungi Admin.
```

Do not load a partial workspace.

## 9.2 Healthcare Without Required Organization

Example:

```text
Akun Healthcare belum terhubung
ke Faskes yang aktif.

Hubungi Admin.
```

Do not allow Healthcare to manually choose an organization during login.

## 9.3 Relawan With Missing Required Operational Context

If required Relawan account context such as an active operational assignment is missing, show an account-configuration state rather than a broken field workflow.

Existing unsynchronized local Relawan work must remain preserved.

---

# 10. Wrong-Role URL Access

Frontend routing is not the security boundary.

Example:

```text
RELAWAN user
→ manually opens /admin/*
```

Expected behavior:

```text
backend rejects unauthorized access
↓
protected data is not returned
↓
frontend shows access-denied state
```

Recommended message:

```text
Anda tidak memiliki akses ke halaman ini.

[ Kembali ke Beranda ]
```

Equivalent role-appropriate navigation may be used for Healthcare or Admin.

---

# 11. Login Error Model

Authentication failures should not all use the same generic message when different user actions are required.

## 11.1 Wrong Credentials

Use:

```text
Email/username atau kata sandi tidak sesuai.
```

Do not reveal whether the username or password individually was incorrect.

## 11.2 Account Inactive

Use:

```text
Akun Anda sedang nonaktif.

Hubungi Admin.
```

## 11.3 Network Unavailable

Fresh login cannot proceed without the server.

Use:

```text
Tidak dapat masuk tanpa koneksi.

Login memerlukan koneksi ke server RAPID-MIND.
```

A previously authenticated eligible Relawan device may instead offer offline field continuity.

## 11.4 Server Unavailable

Use:

```text
Server RAPID-MIND belum dapat dihubungi.

Coba lagi.
```

Do not label this as an invalid password or expired account.

## 11.5 Session Expired

Use:

```text
Sesi berakhir.

Silakan masuk kembali.
```

## 11.6 Credential Revoked

Require reauthentication.

Avoid exposing internal token or revocation details.

## 11.7 Unexpected Authentication Failure

Use a generic authentication failure with retry.

Do not expose stack traces, token internals, server implementation details, or security-sensitive diagnostic information.

---

# 12. Fresh Offline Login

A fresh login requires server authentication.

If:

```text
device offline
+
no eligible previous local field continuity
```

then:

```text
login unavailable
```

RAPID-MIND must not implement local verification of the normal server password merely to support offline login.

The application must not store the user's normal password for offline verification.

---

# 13. Previously Authenticated Relawan Device

A previously authenticated Relawan device may support:

```text
OFFLINE_FIELD_MODE
```

when the server cannot be reached.

The exact technical mechanism used to establish offline continuity must be designed securely during implementation.

It must not rely on storing:

```text
normal password
refresh JWT in IndexedDB
long-lived access token in IndexedDB
```

This is a technical follow-up item.

---

# 14. Offline Field Mode

Recommended shell wording:

```text
Mode lapangan offline • 3 data tersimpan
```

This is a Relawan-only operational state.

## 14.1 Available

The user may continue:

```text
PFA
locally cached patient data
new local patient records
SRQ-20
Faktor Risiko
Fungsi Harian
local triage calculation
T0 local creation
local drafts
unsynchronized records
IndexedDB-backed saving
```

## 14.2 Unavailable

Server-dependent functions remain unavailable:

```text
fresh server lookup
uncached remote history
server synchronization
password change
account-security changes
remote administrative data
```

The UI should explain that local work remains safe even though server access is unavailable.

---

# 15. Access Token Expiry While Offline

Example:

```text
Relawan authenticated online
↓
network disappears
↓
access token expires
↓
Relawan remains in permitted local field work
```

Do not force the Relawan out of an active field workflow merely because the access token expires.

Local storage continues working.

Synchronization waits.

---

# 16. Network Restoration

When connectivity returns:

```text
OFFLINE_FIELD_MODE
↓
network detected
↓
Memulihkan sesi…
↓
refresh attempt
```

## 16.1 Refresh Succeeds

```text
AUTHENTICATED
↓
synchronization resumes
```

High-priority T0 outbox items should retain their existing synchronization priority.

## 16.2 Refresh Fails and Login Is Required

Use:

```text
Perlu masuk kembali untuk sinkronisasi.

Data tetap aman di perangkat.
```

Local unsynchronized records remain preserved.

## 16.3 Server Explicitly Reports Account Inactive or Revoked

Once the client receives an authoritative server rejection:

```text
new authenticated server operations stop
synchronization stops
local records remain preserved
reauthentication/Admin intervention required
```

Do not continue presenting the user as normally authenticated.

---

# 17. Shared Authentication Connectivity States

Lock the following conceptual states:

```text
AUTHENTICATED
REFRESHING_SESSION
OFFLINE_FIELD_MODE
REAUTHENTICATION_REQUIRED
ACCOUNT_INACTIVE
SERVER_UNAVAILABLE
```

These states must remain semantically distinct.

In particular:

```text
SERVER_UNAVAILABLE
≠
REAUTHENTICATION_REQUIRED
≠
ACCOUNT_INACTIVE
```

and:

```text
OFFLINE_FIELD_MODE
≠
normal server authentication
```

---

# 18. Session Expiration During Relawan Assessment

If Relawan is offline:

```text
continue assessment
→ autosave locally
→ preserve work
```

If Relawan is online but silent session recovery fails:

```text
current field work remains locally saved
→ server synchronization pauses
→ reauthentication required
```

Do not show false synchronization success.

---

# 19. Session Expiration During Relawan T0

T0 preserves the existing emergency architecture:

```text
create locally first
→ transmission second
```

If authentication prevents transmission:

```text
T0 tersimpan di perangkat

Belum dapat dikirim ke Healthcare.
```

The local emergency event and emergency guidance remain available.

Authentication failure must never delete the T0 event.

---

# 20. Session Expiration During Healthcare Work

Healthcare is not an offline-first mutation environment.

If session recovery fails while the user is editing:

```text
do not show success
do not silently submit stale mutations
preserve visible form input where practical
request reauthentication
return to the same context where practical
require explicit save again
```

Sensitive clinical mutations should not silently retry after reauthentication without renewed user intent.

---

# 21. Session Expiration During Admin Work

Admin follows the same principle as Healthcare.

If session recovery fails while an Admin form is open:

```text
retain visible unsaved input where practical
do not claim success
request reauthentication
return to context
explicitly submit again
```

No general Admin offline mutation queue is required.

---

# 22. Account Provisioning Entry Points

Use dedicated Admin workflows.

## Relawan

```text
Admin
→ Relawan
→ Tambah Relawan
```

## Healthcare

```text
Admin
→ Faskes
→ Akun Healthcare
→ Tambah Akun
```

Do not create one generic account form with a role selector.

---

# 23. Relawan Account Creation

Minimum form:

```text
Nama *
Email atau username *
Posko awal *
Status akun *
```

The initial credential is generated as part of provisioning rather than entered as permanent user profile data.

Do not require:

```text
NIK
date of birth
residential address
family details
emergency contact
HR information
```

unless a future approved requirement establishes an operational need.

---

# 24. Relawan Posko Selection

`Posko awal` should contain active Posko records.

If no active Posko exists:

```text
Tidak ada Posko aktif yang dapat dipilih.

[ Kelola Posko ]
```

Do not silently create an incomplete Relawan operational account merely to bypass missing Posko data.

---

# 25. Relawan Provisioning Success

Recommended result:

```text
Akun berhasil dibuat

Nama
Login
Posko
Status

Kredensial sementara
••••••••••

[ Salin kredensial ]
```

The credential is available from this success state only.

Normal account detail must not provide a way to retrieve the user's current password.

---

# 26. Healthcare Account Creation

Minimum form:

```text
Nama *
Email atau username *
Faskes / organisasi *
Status akun *
```

The prototype uses the broad:

```text
HEALTHCARE
```

role.

Do not introduce:

```text
Doctor
Nurse
Psychiatrist
PSC Operator
Facility Admin
```

as permission roles during this prototype phase.

---

# 27. Healthcare Organization Selection

Only active Healthcare/Faskes organizations may be selected.

If none exist:

```text
Belum ada Faskes aktif.

Buat atau aktifkan organisasi terlebih dahulu.

[ Kelola Organisasi ]
```

Healthcare users cannot create their own organization.

Organization creation remains an Admin responsibility.

---

# 28. Duplicate Login Handling

Duplicate login/email blocks account creation.

Show:

```text
field-level explanation
+
path to the existing account where appropriate
```

Do not silently create another operational identity.

---

# 29. Initial Credential Strategy

Use:

```text
system-generated temporary credential
```

rather than:

```text
Admin-selected permanent password
```

Rationale:

- reduces password reuse by Admin;
- discourages simple/shared initial passwords;
- avoids making Admin the long-term password custodian;
- creates a clean credential-reset model.

---

# 30. Temporary Credential Visibility

Provisioning flow:

```text
account created
↓
temporary credential generated
↓
displayed once
↓
Admin may copy it
↓
Admin delivers it to the user outside RAPID-MIND
```

Do not automatically send the credential through email or SMS because the current prototype does not define those delivery systems.

Do not store or display temporary credentials in audit history.

If the credential is lost:

```text
Reset kredensial
```

not:

```text
Lihat password
```

---

# 31. First Login

Newly provisioned users follow:

```text
temporary credential
↓
successful login
↓
required password change
↓
role workspace
```

This prevents a temporary credential from becoming a permanent user password.

---

# 32. First-Login Password Change

Recommended screen:

```text
Buat Kata Sandi Baru

Kata sandi baru
[________________]

Konfirmasi kata sandi baru
[________________]

[ SIMPAN DAN LANJUTKAN ]
```

The temporary password does not need to be entered again because it was already used for authentication.

---

# 33. Connectivity Failure During First Login

Password initialization requires the server.

If connectivity disappears:

```text
Perubahan kata sandi memerlukan koneksi.

Coba lagi ketika koneksi tersedia.
```

A never-before-initialized account does not gain offline field continuity from a partially completed first login.

---

# 34. User-Initiated Password Change

Password change belongs inside the account/profile menu.

Do not create a primary navigation destination for it.

Use:

```text
Kata sandi saat ini
Kata sandi baru
Konfirmasi kata sandi baru
```

On successful password change:

```text
current device
→ receives a fresh valid session
```

```text
other existing sessions
→ invalidated
```

This is consistent with the existing `token_version` revocation model.

---

# 35. Forgotten Credential / Account Recovery

The competition prototype does not implement:

```text
email reset
SMS OTP
magic link
security questions
recovery codes
support-desk workflow
```

Instead:

```text
Lupa kredensial?
→ Hubungi Admin
```

Admin may reset credentials for Relawan and Healthcare accounts.

Admin account recovery remains an operational/deployment concern rather than a new Admin-hierarchy UI.

---

# 36. Admin-Initiated Credential Reset

Relawan and Healthcare account details expose:

```text
Reset kredensial
```

Flow:

```text
Admin chooses reset
↓
concise confirmation
↓
reason recorded where appropriate
↓
new temporary credential generated
↓
existing sessions invalidated
↓
password change required on next login
↓
temporary credential shown once
```

Admin must never retrieve the existing user's password.

---

# 37. Credential Reset Security Effect

Credential reset should cause:

```text
token_version increment
old credential invalidation
active server-session invalidation
```

The reset action must be auditable.

Temporary credential contents must not be recorded in audit logs.

---

# 38. Account Lifecycle

Normal account status:

```text
Aktif
Nonaktif
```

Prefer deactivation over destructive deletion.

No normal permanent account deletion exists in the competition prototype.

---

# 39. Relawan Deactivation While Online

When the server recognizes that the Relawan account is inactive:

```text
new authenticated server operations stop
synchronization stops
account-inactive state appears
```

Historical assessments and T0 events remain attributable to the original account.

Unsynchronized local work must not be silently deleted.

---

# 40. Relawan Deactivation While Offline

If:

```text
Admin deactivates Relawan
+
Relawan device is offline
```

the device cannot immediately receive that decision.

The local device may therefore remain in its existing offline field state until it contacts the server.

Once connectivity returns:

```text
server reports inactive
↓
synchronization stops
↓
account-inactive state
↓
local records remain preserved
```

Do not claim instantaneous remote revocation of a disconnected device.

---

# 41. Healthcare/Admin Deactivation

For server-dependent users:

```text
server access stops once deactivation is recognized
```

Active mutations must fail clearly rather than appear saved.

Historical Healthcare validation, referral, dispatch, and Admin audit attribution remain intact.

---

# 42. Reactivation

Reactivation does not automatically restore an old session.

The user signs in again.

For Relawan, legitimate account-owned unsynchronized local work may then become eligible for synchronization again.

---

# 43. Normal Logout

Online logout means:

```text
current access session ends
current refresh session revoked
return to login
```

Logout removes authentication access.

Logout does not mean:

```text
delete legitimate unsynchronized operational data
```

---

# 44. Relawan Data After Logout

After Relawan logout:

```text
unsynchronized local records remain on device
```

but:

```text
logged-out UI cannot access them
```

If another account logs into the same device, it must not see the previous account's local records.

Local offline data must therefore preserve account ownership/isolation.

---

# 45. Logout With Unsynchronized Relawan Data

Do not block logout permanently.

If pending records exist:

```text
3 data belum tersinkron

Logout tidak akan menghapus data tersebut.
Data akan tetap tersimpan di perangkat,
tetapi tidak dapat disinkronkan sampai Anda
masuk kembali dengan akun ini.

[ BATAL ]
[ LOGOUT & SIMPAN DATA ]
```

Do not include a normal:

```text
Discard unsynchronized data
```

action in the logout flow.

---

# 46. Offline Logout

Offline logout requires special handling because server-side refresh-token revocation cannot be completed immediately.

UX semantics:

```text
Logout while offline
↓
end local application session immediately
↓
lock/hide local account data
↓
prevent automatic restoration of the old application session
↓
complete server-side revocation when connectivity permits
```

The exact implementation mechanism remains a technical follow-up.

Potential implementation state may conceptually include a non-secret local marker such as:

```text
logout_pending
```

but this document does not prescribe its implementation.

Critical requirement:

> A user who logged out while offline must not be silently logged back in merely because the old refresh cookie later becomes reachable.

This requires implementation verification.

---

# 47. Logout All Sessions

Account/profile menu may provide:

```text
Logout
Logout semua perangkat
```

`Logout semua perangkat` uses the existing revocation / `token_version` concept.

A concise confirmation is appropriate because the action interrupts other sessions.

No full device/session inventory is needed.

---

# 48. Admin Forced Revocation

Admin account detail may expose:

```text
Paksa logout semua sesi
```

Use this for security or operational recovery situations.

Record a reason.

The action should invalidate existing sessions through the existing revocation mechanism.

---

# 49. Lost Relawan Device

Minimum operational response:

```text
Admin
→ deactivate account
and/or
→ force logout all sessions
and/or
→ reset credential
```

For a genuinely lost device, account deactivation is the safest first operational action.

Replacement-device flow may later use:

```text
reactivate account where appropriate
↓
reset credential
↓
login on replacement device
```

---

# 50. Lost Device Limitation

RAPID-MIND must not claim:

```text
remote wipe
```

unless a future implementation can actually guarantee it.

A disconnected lost device cannot immediately receive server revocation.

Locally stored IndexedDB data may physically remain on the device.

Protection of sensitive local data requires a separate implementation-level security review.

---

# 51. Session / Device Visibility

Do not build a full session-management system.

The competition prototype only needs:

```text
Logout
Logout semua perangkat
```

and Admin-level forced revocation.

Do not add:

```text
device list
browser list
IP history
city history
per-device revocation controls
trusted-device system
```

without a concrete operational need.

---

# 52. Role Changes

Do not expose role mutation as a normal Admin action.

Do not provide:

```text
Role
[ RELAWAN ▾ ]
```

Relawan and Healthcare accounts have different operational relationships and historical attribution.

Changing roles through a generic dropdown would create ambiguity around:

```text
Posko assignment
Healthcare organization membership
historical operational actions
authorization
auditability
```

Role mutation is deliberately deferred.

If role changes ever occur technically, the existing revocation mechanism can invalidate sessions.

---

# 53. Account Deletion

Do not expose:

```text
Hapus akun permanen
```

Use:

```text
Aktif
Nonaktif
```

Historical:

```text
assessments
T0 events
clinical validations
referrals
dispatch actions
audit logs
assignment history
```

must remain attributable.

---

# 54. Provisioning Auditability

At minimum, audit:

```text
account created
account activated
account deactivated
credential reset
Healthcare organization changed
Posko assignment changed
forced logout-all / revocation
```

Use the established audit principle:

```text
actor
timestamp
previous state
new state
reason
metadata where appropriate
```

---

# 55. Actions Requiring a Reason

A reason should normally be recorded for:

```text
account deactivation
credential reset
forced revocation
Healthcare organization reassignment
existing Posko reassignment
```

A reason is not required for routine initial account creation.

Do not log:

```text
passwords
temporary credential contents
refresh tokens
access tokens
```

---

# 56. Authentication UI State Examples

## Authenticated

```text
Normal role workspace
```

## Refreshing Session

```text
Memulihkan sesi…
```

Avoid blocking an active Relawan local workflow unnecessarily.

## Offline Field Mode

```text
Mode lapangan offline • 3 data tersimpan
```

## Reauthentication Required

```text
Perlu masuk kembali untuk sinkronisasi.

Data tetap aman di perangkat.
```

## Account Inactive

```text
Akun Anda sedang nonaktif.

Hubungi Admin.
```

## Server Unavailable

```text
Server RAPID-MIND belum dapat dihubungi.

Data di perangkat tetap aman.
```

The exact secondary wording should depend on whether local data exists and whether the current role supports offline work.

---

# 57. Accessibility

Authentication and provisioning screens must support:

```text
visible keyboard focus
logical Tab order
Enter / Space activation
clear labels
readable validation messages
no color-only meaning
browser zoom to at least 200%
normal password-manager behavior
```

Do not create custom password controls that break standard accessibility or browser behavior without a concrete security reason.

---

# 58. Responsive Behavior

Universal login must work well on:

```text
Relawan mobile
Healthcare desktop
Admin desktop
```

Use one responsive login system.

Admin provisioning remains a desktop-oriented management experience.

Do not redesign Admin provisioning forms as frontline mobile task flows.

---

# 59. Deliberately Deferred Scope

Do not implement in the competition prototype unless a future approved requirement establishes the need:

```text
automated email password recovery
SMS OTP recovery
magic-link login
MFA / 2FA
passkeys
hardware security keys
biometric login
device trust
OAuth social login
SAML/OIDC enterprise SSO
public/self-registration
Admin provisioning hierarchy
Super Admin UI
role mutation UI
complex permission matrices
multi-organization Healthcare membership
permanent account deletion
full session/device inventory
per-device selective revocation
remote device wipe
offline password verification
enterprise IAM audit console
automatic credential delivery infrastructure
```

The security mechanism for offline local-data protection remains an implementation-level technical review item.

---

# 60. Technical Follow-Up Items

The UX/state model is considered closed, but two areas require explicit technical verification during implementation.

## 60.1 Secure Cold-Start Offline Continuity

The implementation must determine how an eligible previously authenticated Relawan device enters offline field mode without persisting the normal password or long-lived authentication tokens insecurely.

## 60.2 Offline Logout With HttpOnly Refresh Cookie

The implementation must guarantee:

```text
offline logout
≠
automatic silent login when connectivity returns
```

Server revocation may be deferred until connectivity returns, but the local application must remember the user's logout intent securely enough to prevent accidental session restoration.

---

# 61. Locked Decisions Summary

The following are considered locked for the next design phase:

1. One universal login for all three roles.
2. No role selector on login.
3. No public/self-registration.
4. Admin is the sole normal provisioning authority.
5. Post-login routing is role-driven.
6. Backend authorization is the real security boundary.
7. `OFFLINE_FIELD_MODE` is distinct from normal authenticated state.
8. Fresh login requires server connectivity.
9. Relawan offline continuity must preserve permitted local work.
10. Authentication failure must never silently delete unsynchronized Relawan work.
11. Healthcare/Admin mutations must not falsely appear saved while authentication/server access is unavailable.
12. Dedicated Relawan and Healthcare provisioning flows are used.
13. System-generated temporary credentials are used.
14. Temporary credentials are shown once and are not retrievable later.
15. First login requires password change.
16. Admin can reset Relawan/Healthcare credentials.
17. Credential reset invalidates prior sessions.
18. Normal account lifecycle is `Aktif / Nonaktif`.
19. Deactivation is preferred over deletion.
20. Relawan logout preserves unsynchronized local data.
21. Logged-out local data remains inaccessible and account-isolated.
22. Offline logout must not silently restore the old session later.
23. `Logout semua perangkat` is supported without a full session-management UI.
24. Admin may force session revocation.
25. Lost-device response does not claim remote wipe.
26. Normal role mutation is not supported.
27. Permanent account deletion is not exposed.
28. Important provisioning/security changes remain auditable.
29. Accessibility and responsive behavior follow the established visual foundation.
30. Production code is not yet being written.

---

# 62. Next Design Topic

The next discussion should define:

# SHARED CROSS-ROLE SYSTEM STATES & INTERACTION PATTERNS

The objective is to create a consistent cross-role model for states and interactions that recur throughout RAPID-MIND without erasing the differences between Relawan, Healthcare, and Admin.

Topics should include:

1. global loading states;
2. empty states;
3. server-unavailable states;
4. offline states;
5. stale-data states;
6. synchronization states;
7. save / submit / mutation feedback;
8. local-save vs server-save distinction;
9. retry behavior;
10. destructive-action confirmation;
11. non-destructive confirmation;
12. inline validation;
13. banners, toasts, dialogs, sheets, and persistent notices;
14. realtime update behavior;
15. concurrency/conflict handling;
16. optimistic vs confirmed UI updates;
17. form-dirty behavior;
18. navigation during unfinished work;
19. global error handling;
20. accessibility for status changes;
21. sound/vibration/motion boundaries;
22. date/time and timestamp presentation;
23. identifiers and masking;
24. shared responsive behavior;
25. which interaction patterns must remain role-specific.

Do not turn this into a generic design-system component catalog.

Every shared pattern should answer:

```text
What operational ambiguity or failure mode does this solve?
```

The next phase should close those shared behaviors before the final screen inventory and implementation handoff.
