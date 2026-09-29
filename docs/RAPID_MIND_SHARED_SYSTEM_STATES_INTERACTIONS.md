# RAPID-MIND — Shared Cross-Role System States & Interaction Patterns

**Document type:** UI/UX design specification  
**Scope:** Shared operational states, persistence semantics, synchronization, loading, errors, confirmations, realtime behavior, conflicts, feedback, timestamps, accessibility, and responsive interaction patterns  
**Product language:** Bahasa Indonesia  
**Discussion/design language:** English  
**Design direction:** Operational Humanitarian UI  
**Status:** Design baseline for final screen inventory and implementation handoff

---

# 1. Source Constraints

This design must remain consistent with:

1. `RAPID_MIND_TECHNICAL_PLAN.md`
2. `workflow.md`
3. `RAPID_MIND_VISUAL_FOUNDATION.md`
4. `RAPID_MIND_RELAWAN_SHELL_NAVIGATION.md`
5. `RAPID_MIND_T0_EMERGENCY_INTERACTION.md`
6. `RAPID_MIND_HEALTHCARE_WORKSPACE.md`
7. `RAPID_MIND_REFERRAL_RESPONSE_INTERACTION.md`
8. `RAPID_MIND_ADMIN_WORKSPACE.md`
9. `RAPID_MIND_AUTH_PROVISIONING.md`

The role-specific design documents remain established baselines.

This document does not redesign:

- role responsibilities;
- the technical architecture;
- JWT authentication;
- Relawan assessment structure;
- T0 clinical/emergency semantics;
- Healthcare validation authority;
- referral/dispatch domain states;
- Admin information architecture;
- visual palette;
- typography;
- triage logic.

Its purpose is to define a coherent cross-role interaction model without incorrectly forcing identical behavior onto Relawan, Healthcare, and Admin.

---

# 2. Core Principle

RAPID-MIND must share **semantics**, not blindly share identical components or behavior.

The same operational concept may need different presentation depending on role and device.

Example:

```text
Koneksi ke server terputus
```

may appear as:

```text
RELAWAN
→ compact mobile operational status

HEALTHCARE
→ persistent desktop workspace banner

ADMIN
→ command-center status region
```

The meaning stays consistent.

The physical presentation may differ.

---

# 3. Do Not Use One Global Status Enum

Do not model the entire application with one state such as:

```text
LOADING
OFFLINE
SYNCING
STALE
ERROR
SUCCESS
```

These concepts describe different dimensions and can coexist.

Example:

```text
Assessment complete
+
Tersimpan di perangkat
+
Menunggu sinkronisasi
+
Mode lapangan offline
```

This is not contradictory.

The application therefore uses multiple independent state dimensions.

---

# 4. Canonical State Dimensions

Use the following conceptual dimensions.

## 4.1 Domain State

What is happening operationally?

Examples:

```text
T0-Suspect
T0-Confirmed
T1
T2

Belum diakui
Sedang ditinjau

Rujukan Aktif
Menuju lokasi
Tiba
Selesai

Akun Aktif
Akun Nonaktif
```

Domain state is not a connectivity or persistence state.

---

## 4.2 Data Durability

Where is the user's work safely stored?

Typical Relawan states:

```text
saving locally
saved locally
local persistence failed
```

Healthcare/Admin generally rely on server-confirmed persistence rather than local offline durability.

---

## 4.3 Synchronization / Server Commit

Has data reached and been accepted by the server?

Typical Relawan concepts:

```text
pending synchronization
synchronizing
synchronized
sync attempt failed
```

Healthcare/Admin mutation success generally means the server has confirmed the action.

---

## 4.4 Connectivity / Freshness

Can the current UI communicate with the server, and how current is the displayed information?

Conceptual states:

```text
connected/current
realtime disconnected
server unavailable
offline
stale / freshness uncertain
```

---

## 4.5 Authentication State

Can authenticated server operations continue?

Canonical authentication states remain:

```text
AUTHENTICATED
REFRESHING_SESSION
OFFLINE_FIELD_MODE
REAUTHENTICATION_REQUIRED
ACCOUNT_INACTIVE
SERVER_UNAVAILABLE
```

Authentication is independent from local data durability.

---

## 4.6 Action State

What is one specific user action doing?

Examples:

```text
idle
processing
completed
validation error
failed
blocked by conflict
```

Action state should not replace domain state.

---

# 5. Critical Semantic Separation

Lock the following principle:

```text
Local persistence
≠
Server acceptance
≠
Synchronization
≠
Realtime freshness
```

Each answers a different question.

```text
Local persistence
→ Is the work safe on this device?

Server acceptance
→ Did the server accept this operation?

Synchronization
→ Has local data been transmitted and reconciled?

Realtime freshness
→ Is the currently displayed server data up to date?
```

Do not merge these into one ambiguous `Saved` or `Online` status.

---

# 6. Relawan Persistence Terminology

Use these canonical user-facing terms.

| Meaning | Bahasa Indonesia |
|---|---|
| local write running | `Menyimpan di perangkat…` |
| safely persisted locally | `Tersimpan di perangkat` |
| completed but not yet synchronized | `Menunggu sinkronisasi` |
| synchronization running | `Menyinkronkan 3 data…` |
| synchronized | `Tersinkron` |
| previous sync attempt failed | `Sinkronisasi belum berhasil` |
| local persistence failed | `Data belum tersimpan di perangkat` |

Do not use plain:

```text
Tersimpan
```

for Relawan when the user could interpret that as server-confirmed.

---

# 7. Routine Relawan Autosave

Every meaningful assessment answer is locally persisted.

The normal interaction should be:

```text
answer selected
↓
local save
↓
continue
```

Do not flash a success toast after every answer.

Do not require a `Simpan` button for every question.

The shell, draft/status surface, or workflow detail may expose persistence status when operationally relevant.

---

# 8. Local Persistence Failure

This state is more serious than synchronization failure.

Compare:

```text
Sinkronisasi belum berhasil
```

with:

```text
Data belum tersimpan di perangkat
```

The first means the user's work is still safe locally.

The second means continued work may risk data loss.

Local persistence failure therefore requires:

```text
persistent visible warning
clear consequence
clear recovery/retry guidance
```

Do not use only a disappearing toast.

---

# 9. Healthcare and Admin Save Semantics

Healthcare and Admin are server-oriented mutation environments.

Use:

```text
Menyimpan…
Perubahan tersimpan
Gagal menyimpan
```

For these roles:

```text
button clicked
≠
saved
```

and:

```text
request sent
≠
saved
```

Only confirmed server success may produce:

```text
Perubahan tersimpan
```

Do not create a generic offline mutation queue for Healthcare or Admin.

---

# 10. Server Receipt vs Business Processing

Technical receipt and operational handling must remain distinct.

For T0:

```text
Diterima sistem
```

means the server received the emergency event.

It does not mean:

```text
Healthcare melihat kasus
Healthcare mengakui kasus
Healthcare memvalidasi kasus
ambulans dikirim
rujukan diterima
```

The same principle applies elsewhere.

Transport-level success is not equivalent to workflow completion.

---

# 11. Connectivity and Freshness Model

Use the following conceptual connectivity/freshness states:

```text
CONNECTED_CURRENT
REALTIME_DISCONNECTED
SERVER_UNAVAILABLE
OFFLINE
```

The UI language remains role-appropriate.

---

# 12. Normal Connected State

Healthcare/Admin may use subtle status such as:

```text
Realtime aktif
```

Do not visually overemphasize healthy normal connectivity.

---

# 13. Realtime Disconnected

If automatic realtime updates stop while ordinary API communication still works:

```text
Realtime terputus

Pembaruan otomatis sementara tidak tersedia.
Terakhir diperbarui 17:08:14
```

Do not treat this automatically as total server failure.

Some state-changing actions may still be allowed if the API remains reachable and the data can be safely validated before submission.

---

# 14. Server/API Unavailable

Use:

```text
Koneksi ke server terputus

Data di layar mungkin tidak terbaru.
Terakhir diperbarui 17:08:14
```

For Healthcare/Admin:

```text
mutations are blocked
```

Do not falsely show success.

Existing displayed data may remain visible for reference, but its freshness must be explicit.

---

# 15. Relawan Offline State

Relawan offline operation is a legitimate field mode.

Recommended wording:

```text
Mode lapangan offline • 3 data tersimpan
```

or, where authentication context is not the focus:

```text
Offline • 3 data tersimpan
```

Offline must not automatically look like a destructive system error when local data is safe.

---

# 16. Stale Data

Staleness is a separate concept.

Do not assume:

```text
offline
=
stale
```

A page can be stale because realtime updates stopped even if internet connectivity remains available.

Use:

```text
Data mungkin tidak terbaru
```

and, where relevant:

```text
Terakhir diperbarui 17:08:14
```

Healthcare emergency queues and Admin monitoring surfaces should expose freshness clearly when it matters operationally.

---

# 17. Loading Model

Use four distinct loading patterns:

```text
INITIAL LOAD
SECTION LOAD
BACKGROUND REFRESH
ACTION PROCESSING
```

Do not use one global spinner for all loading behavior.

---

# 18. Initial Load

On initial page load:

```text
render stable shell/layout
↓
load meaningful content
```

Use structural skeletons/placeholders where they help preserve spatial context.

Avoid blank-page spinners when the surrounding shell can already be rendered.

---

# 19. Section Load

Only the affected region should enter loading state.

Examples:

```text
Admin changes analytics period
→ chart region reloads

Healthcare opens patient history
→ history section loads

Relawan opens local Data detail
→ relevant detail loads
```

Do not block unrelated navigation or content.

---

# 20. Background Refresh

Existing usable data remains visible while fresher data is requested.

Do not replace the entire screen with a loader during:

```text
realtime refresh
periodic refetch
silent data refresh
```

If freshness becomes uncertain, expose that condition separately.

---

# 21. Action Processing

The initiating control should show activity.

Examples:

```text
[ MENYIMPAN… ]
[ MENGIRIM… ]
[ MEMPROSES… ]
```

Disable duplicate activation when appropriate.

Do not rely on an unrelated global spinner.

---

# 22. Avoid Artificial Loading Indicators

If an operation resolves nearly instantly, do not flash a spinner or `Loading…` state briefly.

Do not create permanent spinners simply to represent realtime connection.

Feedback should correspond to meaningful wait time or actual background activity.

---

# 23. Empty State Structure

A useful empty state should answer:

```text
What is absent?
Is that normal or exceptional?
What can the user do next?
```

Do not default to:

```text
Tidak ada data
```

when a more precise message is possible.

---

# 24. Relawan Empty-State Examples

Normal synchronized state:

```text
Belum ada data menunggu sinkronisasi.

Semua data yang selesai telah tersinkron.
```

No CTA is required if no action is needed.

---

# 25. Healthcare Empty-State Examples

Emergency queue:

```text
Belum ada T0 yang memerlukan respons.
```

Do not use celebratory language.

An empty emergency queue is simply an operational state.

---

# 26. Admin Empty-State Examples

Filtered analytics:

```text
Belum ada data untuk filter dan periode ini.

[ Reset Filter ]
```

Search:

```text
Tidak ada hasil untuk “Siti”.

Periksa kembali nama atau NIK.
```

---

# 27. Empty Is Not Error

Lock this distinction:

```text
No current T0
→ EMPTY

T0 queue failed to load
→ ERROR
```

These states must not look identical.

A broken Healthcare queue must never be mistaken for an absence of emergencies.

---

# 28. Mutation Feedback Hierarchy

The changed operational state should be the primary confirmation.

Example:

```text
BELUM DIAKUI
↓
Sudah diakui oleh dr. Rina • 16:45
```

This is stronger than relying only on:

```text
Berhasil
```

Likewise:

```text
Status akun
Aktif
↓
Nonaktif
```

with updated metadata is the primary Admin confirmation.

Toast is supplementary.

---

# 29. Toast Usage

Toast is suitable for brief, non-critical feedback where the resulting state is already otherwise visible.

Examples:

```text
Filter disimpan
Tautan disalin
Ekspor dimulai
```

Do not use toast as the only communication for:

```text
T0 transmission failure
local persistence failure
reauthentication required
server unavailable
clinical save failure
concurrency conflict
```

Those states require persistent UI.

---

# 30. Inline Messages

Use inline messages for local contextual problems.

Examples:

```text
field validation
duplicate email/username
missing required T0 reason
invalid Posko choice
form-level save failure
```

Place the message near the affected form or action.

Do not open a dialog for routine field validation.

---

# 31. Persistent Banners and Status Regions

Use persistent status UI for ongoing system conditions:

```text
Offline field mode
Server unavailable
Realtime disconnected
Reauthentication required
Stale data
Sync backlog
Sync failure
```

Persistent operational states should not be user-dismissible while the underlying problem remains active.

For example:

```text
Koneksi ke server terputus
```

must not permanently disappear because the user clicked `X` while the server is still unreachable.

---

# 32. Dialog Usage

Dialogs are appropriate when an accidental decision has meaningful consequence.

Use confirmation for actions such as:

```text
deactivate account
reset credential
logout all devices
force session revocation
leave incomplete T0 verification
complete a terminal operational process
discard meaningful unsaved server-form data
```

Do not use confirmation merely because an action writes data.

---

# 33. Avoid Confirmation Fatigue

Do not confirm routine reversible actions such as:

```text
SRQ answer selection
filter change
tab navigation
Verbal / Non-Verbal switch
opening patient detail
routine form save
ordinary informational acknowledgement
```

Frequent generic dialogs such as:

```text
Apakah Anda yakin?
```

reduce efficiency and weaken the salience of genuinely consequential confirmations.

---

# 34. Mobile Sheet vs Desktop Dialog/Panel

Relawan mobile contextual interaction may use:

```text
bottom sheet
full-height task sheet
```

when appropriate.

Examples:

```text
status detail
secondary field choice
contextual task step
```

Healthcare/Admin desktop should normally use:

```text
dialog
drawer
inline contextual panel
```

Do not force one physical presentation pattern across all roles.

---

# 35. Validation Model

Use this hierarchy:

```text
FIELD VALIDATION
→ next to the field

CROSS-FIELD VALIDATION
→ form/section message

SERVER VALIDATION
→ map to the relevant field where possible

UNEXPECTED MUTATION FAILURE
→ persistent form/action-level error
```

Example:

```text
Email atau username

admin01
Login ini sudah digunakan.
```

---

# 36. Failed Validation Must Preserve Input

A failed submission must not clear meaningful user input.

This is especially important for:

```text
Admin provisioning
Healthcare validation
referral creation
clinical notes
resource assignment
```

Expected behavior:

```text
submit
↓
failure
↓
input remains
↓
error shown
↓
user corrects/retries
```

Sensitive fields may only be cleared when a specific security reason requires it.

---

# 37. Retry Strategy

Retry behavior depends on workflow type.

Do not use one global automatic retry policy.

---

# 38. Relawan Synchronization Retry

Automatic retry is appropriate because Relawan synchronization is intentionally asynchronous.

Possible retry triggers:

```text
connectivity restored
application resume
application startup
manual retry
supported background sync
```

The UI must continue to distinguish:

```text
data safe locally
```

from:

```text
server synchronization succeeded
```

---

# 39. T0 Retry

T0 synchronization has priority.

Retry must reuse the same stable emergency identifier.

Do not create duplicate emergency events when acknowledgement is lost or a retry occurs.

---

# 40. Healthcare/Admin Mutation Retry

Do not automatically replay an uncertain state-changing action after connectivity loss.

Example:

```text
user clicks SIMPAN
↓
connection becomes uncertain
↓
server result unknown
```

Do not silently replay the mutation later.

Instead:

```text
resolve current server state
↓
show current authoritative state
↓
require renewed user intent if another mutation is needed
```

This is especially important for clinical and administrative actions.

---

# 41. Realtime Benign Updates

Remote updates that do not conflict with current editing may update the UI unobtrusively.

Examples:

```text
new T0 appears while another incident is open
Admin aggregate count changes
new referral appears in a queue
```

The current user context remains stable.

---

# 42. Realtime Updates Must Not Steal Focus

Incoming events must not automatically:

```text
open themselves
move keyboard focus
replace active patient
close current form
navigate user away
```

Use visible notification/queue changes instead.

Exception only if a future approved safety requirement explicitly establishes forced interruption.

---

# 43. Conflicting Remote Updates

If another authorized user changes the same operational record during editing:

```text
Data kasus telah diperbarui oleh pengguna lain.

Hasil terbaru perlu dimuat sebelum
Anda melakukan perubahan.

[ MUAT PEMBARUAN ]
```

Prevent the stale mutation from overwriting newer state.

Do not silently merge clinical or operational decisions.

Formal collaborative editing remains out of scope.

---

# 44. Optimistic UI

Use optimistic UI only for low-risk presentation/local interactions.

Safe examples:

```text
tab selection
filter selection
accordion open/close
local Relawan answer selection
```

Do not optimistically mark high-impact server actions as completed.

Examples:

```text
acknowledge T0
clinical validation
referral creation
dispatch transition
account deactivation
credential reset
Posko reassignment
Healthcare organization reassignment
```

For these:

```text
processing
↓
server confirmation
↓
authoritative visible state
```

---

# 45. Dirty Forms

Healthcare/Admin should track meaningful unsaved server-form edits.

If the user attempts to leave:

```text
Perubahan belum disimpan.

[ Tetap di Halaman ]
[ Keluar Tanpa Menyimpan ]
```

Do not mark a form dirty merely because:

```text
a field received focus
a panel expanded
a filter changed
```

---

# 46. Relawan Unfinished Workflow Navigation

Relawan assessment answers autosave locally.

Therefore normal navigation should not show:

```text
Unsaved changes
```

for already persisted answers.

An incomplete assessment instead becomes:

```text
Belum Selesai
```

and remains available to resume.

Only actions that would actually discard/delete data require destructive confirmation.

---

# 47. Full-Page Error Usage

Reserve a full-page error for cases where the requested surface cannot function.

Examples:

```text
unauthorized route
missing/nonexistent resource
critical initialization failure
unrecoverable page failure
```

Do not use a full-page error when only one part of the interface failed.

Examples that should usually remain localized:

```text
chart failed
one save failed
realtime disconnected
one API request timed out
```

---

# 48. Error Copy Principle

User-facing error messages should explain operational consequence and recovery.

Prefer:

```text
Sinkronisasi belum berhasil.
Data tetap aman di perangkat.
```

over:

```text
HTTP 503
```

Prefer:

```text
Perubahan belum tersimpan.
Coba lagi.
```

over:

```text
POST /api/referral failed
```

Technical diagnostics belong in logging/development tooling.

---

# 49. Severity Model

Do not equate every error with emergency severity.

Conceptually distinguish:

```text
INFORMATION
ATTENTION
RECOVERABLE ERROR
HIGH-RISK SYSTEM FAILURE
CLINICAL / T0 EMERGENCY
```

T0 semantic red must remain reserved for actual emergency/high-severity clinical meaning.

Generic application errors must not visually impersonate T0.

---

# 50. Sound, Haptic, and Motion

Lock the following principle:

```text
finite
intentional
paired with visible information
```

Do not use continuous:

```text
sirens
vibration
flashing
pulsing
glowing
```

Normal save/sync success requires no sound.

T0 may use stronger but finite salience according to the existing emergency-interaction baseline.

---

# 51. Color Semantics

Do not invent a new hue for every operational state.

Existing semantic palette remains authoritative.

Do not create unique colors solely for:

```text
loading
offline
syncing
empty
realtime
stale
success
```

Use text, iconography, structure, and the established palette.

Triage colors remain domain-specific.

---

# 52. Timestamp Presentation

Use operationally readable timestamps.

## Same-day event

```text
16:42
```

or:

```text
Hari ini • 16:42
```

where context benefits.

## Historical event

```text
29 Sep 2026 • 16:42
```

## Relative time

```text
2 menit lalu
```

may supplement exact time.

Relative time should not replace absolute timestamps when emergency chronology, clinical review, or auditability matters.

---

# 53. Separate Important Event Times

Do not collapse distinct event timestamps.

For T0:

```text
Dibuat 16:42
Diterima 16:43
Diakui 16:45
```

represent different events.

Preserve these distinctions.

---

# 54. Timezone Presentation

For the competition prototype, use one configured operational timezone consistently.

Do not add timezone suffixes such as:

```text
WIB
```

to every routine timestamp when all users operate under the same configured timezone.

If the system later becomes multi-timezone, revisit this decision.

Backend timestamp storage remains a technical implementation concern.

---

# 55. Identifiers

Internal technical IDs should generally remain hidden from ordinary operational screens.

Prefer operational identity:

```text
name
masked NIK
Posko
facility
response unit
```

NIK remains a patient identifier, not a universal system identifier.

Healthcare may show full NIK where authorized and operationally necessary.

Admin aggregate surfaces should normally avoid patient-level identifiers.

---

# 56. Copying Identifiers

Do not add generic `Copy ID` actions across the product.

If stable event/case identifiers become useful for support or troubleshooting, expose them in an appropriate technical/detail surface rather than normal operational UI.

This remains deferred until a concrete need exists.

---

# 57. Accessibility for Dynamic State Changes

Dynamic states must not rely only on visual color change.

Meaningful state changes may require screen-reader announcement.

Examples:

```text
Data belum tersimpan di perangkat
Koneksi ke server terputus
T0 baru diterima
```

Do not announce every background refresh.

Realtime events must not automatically move keyboard focus.

---

# 58. Focus Management

Use focus intentionally.

Appropriate examples:

```text
dialog opens
→ move focus into dialog

dialog closes
→ return focus to invoking control

field validation on submit
→ focus first meaningful invalid field when appropriate
```

Do not move focus solely because:

```text
new realtime item arrived
background refresh completed
sync succeeded
chart updated
```

---

# 59. Responsive Shared Semantics

Meaning remains consistent across device classes.

Presentation may adapt.

Example:

```text
SERVER UNAVAILABLE
```

may appear as:

```text
Relawan mobile
→ compact shell/status surface

Healthcare desktop
→ persistent workspace banner

Admin desktop
→ command-center header/status region
```

Do not force identical physical component dimensions across roles.

---

# 60. Role-Specific Patterns That Must Remain Different

The following differences are intentional.

## Relawan

```text
offline-first
local persistence authoritative for continuity
autosave assessment answers
background synchronization
mobile-first
large touch targets
persistent T0 access
```

## Healthcare

```text
server-confirmed operational mutation
realtime emergency queue
concurrency protection
desktop clinical workspace
no general offline mutation queue
```

## Admin

```text
server-confirmed management mutation
desktop command center
analytics/map freshness
provisioning and resource management
no general offline mutation queue
```

Cross-role consistency must not erase these operational differences.

---

# 61. Canonical Cross-Role Hierarchy

Use this mental model:

```text
DOMAIN STATE
What is happening operationally?

DATA DURABILITY
Is the user's work safely stored?

SERVER COMMIT / SYNCHRONIZATION
Has the server accepted or synchronized it?

CONNECTIVITY / FRESHNESS
Can the interface reach the server and is data current?

AUTHENTICATION
Can authenticated server operations continue?

ACTION STATE
What is this specific interaction doing?
```

These dimensions may coexist.

---

# 62. Example — Relawan Assessment

```text
Assessment complete
+
Tersimpan di perangkat
+
Menunggu sinkronisasi
+
Mode lapangan offline
```

This is valid and expected.

---

# 63. Example — Healthcare Incident

```text
T0-Suspect
+
Sedang ditinjau
+
Realtime terputus
+
Terakhir diperbarui 17:08:14
```

The clinical/domain state remains distinct from data freshness.

---

# 64. Example — Admin Form

```text
Relawan Aktif
+
form has unsaved edits
+
server connected
```

Leaving the page may require dirty-form confirmation even though account domain state remains `Aktif`.

---

# 65. Deliberately Deferred Scope

Do not implement unless a future approved requirement creates a concrete need:

```text
Healthcare/Admin offline mutation queue
automatic clinical conflict merge
collaborative live cursors
Google-Docs-style co-editing
per-field user locking
global notification center
complex undo/redo for clinical decisions
configurable notification/sound preferences
custom sound themes
generic user-facing event bus
advanced technical diagnostic screens
routine exposure of internal record IDs
cross-timezone UI complexity
```

---

# 66. Locked Decisions Summary

The following are considered locked for the final design phase:

1. Shared semantics do not require identical components.
2. The application uses orthogonal state dimensions instead of one global status enum.
3. Domain state remains separate from technical/system state.
4. Local persistence, server acceptance, synchronization, and realtime freshness are distinct concepts.
5. Relawan uses explicit local-save and synchronization terminology.
6. `Tersimpan di perangkat` and `Tersinkron` must not be conflated.
7. Relawan routine answer autosave should be quiet unless state needs attention.
8. Local persistence failure is higher risk than sync failure.
9. Healthcare/Admin save success requires server confirmation.
10. Technical server receipt does not imply business/clinical handling.
11. Realtime disconnected and server unavailable are different states.
12. Offline Relawan operation may be a legitimate normal field mode.
13. Stale data is its own concept and should expose last-updated information where important.
14. Initial, section, background, and action loading patterns remain distinct.
15. Empty states must not look like errors.
16. The changed operational state is the primary success confirmation.
17. Toasts are supplementary, not the sole carrier of critical state.
18. Persistent system conditions use persistent status UI.
19. Dialogs are reserved for consequential decisions.
20. Routine interactions must not accumulate confirmation dialogs.
21. Relawan mobile may use sheets while Healthcare/Admin may use desktop panels/dialogs.
22. Validation errors stay near their context and preserve input.
23. Relawan synchronization may retry automatically.
24. T0 retry must remain idempotent using stable identifiers.
25. Healthcare/Admin state-changing mutations must not be blindly auto-replayed.
26. Benign realtime updates must not destroy current context.
27. Conflicting updates block stale writes and require loading current state.
28. Realtime events must not steal keyboard focus.
29. Optimistic UI is limited to low-risk interactions.
30. High-impact clinical/admin actions wait for server confirmation.
31. Healthcare/Admin meaningful unsaved edits use dirty-form protection.
32. Relawan assessment navigation does not use conventional unsaved-change warnings for locally persisted answers.
33. Full-page errors are reserved for unrecoverable page-level failure.
34. Error copy explains operational consequence, not technical internals.
35. Generic system errors must not visually impersonate T0.
36. Sound/haptic/motion feedback remains finite and has visible equivalents.
37. Existing color semantics remain authoritative.
38. Emergency/audit chronology uses explicit timestamps.
39. Internal technical IDs remain hidden from normal operational screens.
40. Dynamic state changes remain accessible without unnecessary focus movement.
41. Responsive presentation may differ while semantic meaning remains consistent.
42. Role-specific persistence/realtime behavior remains intentionally different.

---

# 67. Remaining Pre-Development Topic

The remaining UI/UX planning phase is:

# FINAL SCREEN INVENTORY + IMPLEMENTATION HANDOFF

This phase should produce the authoritative implementation-facing screen inventory and trace every established design decision into concrete routes, screens, overlays, responsive surfaces, system states, and implementation priorities.

The next discussion should not redesign already locked role-specific workflows unless a concrete contradiction is discovered.

The purpose is to answer:

```text
What exactly must be built?
Where does each screen live?
Which states must each screen support?
Which shared components/patterns can be reused?
Which interactions remain role-specific?
What is required for the competition prototype?
What is explicitly deferred?
In what order should implementation proceed?
```

The output should become the final UI/UX handoff document before production implementation begins.
