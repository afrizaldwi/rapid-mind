# RAPID-MIND — Healthcare Referral & Response Interaction Design

**Document type:** UI/UX design specification  
**Scope:** Healthcare referral, emergency response/dispatch, referral queue, patient referral history, realtime/concurrency behavior, and cross-role authority boundaries  
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

The technical plan remains the architectural constraint.

The visual foundation remains locked unless later usability or accessibility testing identifies a concrete problem.

The Relawan shell/navigation document remains the current Relawan interaction baseline.

The T0 emergency interaction document remains the current Relawan emergency baseline.

The Healthcare workspace document remains the current Healthcare operational baseline.

This document closes the remaining high-level Healthcare referral/response interaction gap. It does not define a complete real-world hospital referral-management system.

---

# 2. Role Terminology

RAPID-MIND uses three application roles:

```text
ADMIN
RELAWAN
HEALTHCARE
```

`HEALTHCARE` is the canonical Role 2 name.

Healthcare users may operationally represent authorized personnel from organizations such as:

```text
Hospital / RS
Puskesmas
PSC 119
other approved Healthcare/Faskes organizations
```

`Hospital` is therefore treated as an organization/facility concept rather than a separate application role.

There is no fourth `HOSPITAL` role.

---

# 3. Provisioning and Authority Boundary

## 3.1 Admin as the Sole Provisioning Authority

Admin is the only role that may provision normal operational users and Healthcare/Faskes organization records.

Conceptually:

```text
ADMIN
├── creates/manages Relawan accounts
├── creates/manages Healthcare accounts
├── creates/manages Healthcare/Faskes organization records
└── associates Healthcare users with their organization/facility
```

Do not provide:

```text
public registration
Relawan self-registration
Healthcare self-registration
Relawan-created users
Healthcare-created users
Healthcare-created facility master records
```

## 3.2 Operational Authority Remains Separate

Administrative provisioning must not give Admin patient-specific clinical authority.

Use:

```text
Admin
→ controls who may operate and which organizations exist

Relawan
→ performs field support/assessment
→ creates T0-Suspect

Healthcare
→ acknowledges T0
→ performs secondary/clinical validation
→ records clinical classification
→ creates referrals
→ manages patient-specific dispatch/response
```

Do not require Admin approval for:

```text
T0 acknowledgement
secondary verification
T0 confirmation
T0 downgrade
referral creation
patient-specific dispatch progression
```

---

# 4. Core Referral/Response Principle

The following concepts are independent:

```text
Clinical Classification
≠
Referral
≠
Dispatch
```

They must not be stored or presented as one combined operational status.

Examples of valid combinations:

```text
T0-Confirmed
+
Belum ada rujukan
+
Belum ada tim ditugaskan
```

```text
T0-Confirmed
+
Rujukan aktif
+
Belum ada tim ditugaskan
```

```text
T0-Confirmed
+
Belum ada rujukan
+
Tim ditugaskan
```

```text
T0-Confirmed
+
Rujukan aktif
+
Tim menuju lokasi
```

Updating a referral or dispatch state must never silently modify the patient's clinical classification.

---

# 5. Relationship to the Existing T0 Sequence

The auditable emergency sequence remains:

```text
original T0-Suspect
→ Healthcare acknowledgement
→ secondary verification
→ clinical validation
→ referral/dispatch history
```

The original `T0-Suspect` must never be overwritten.

A Healthcare validation creates a separate clinical record.

Referral records and dispatch records are also separate downstream records.

---

# 6. Post-`T0-Confirmed` Interaction

After Healthcare records:

```text
T0-Confirmed
```

the emergency remains active and moves into operational follow-up.

Conceptually:

```text
Darurat
→ Tindak Lanjut
```

The focused incident workspace shows:

```text
TINDAK LANJUT DARURAT

Status Klinis
T0 — Darurat terkonfirmasi

RUJUKAN
Belum ada rujukan

[ BUAT RUJUKAN ]

RESPONS LAPANGAN
Belum ada tim ditugaskan

[ TUGASKAN TIM ]
```

Saving `T0-Confirmed` must not automatically create:

```text
referral
dispatch
ambulance assignment
team assignment
transport state
```

`T0-Confirmed` means Healthcare has clinically validated the emergency.

It does not mean a response resource is already moving.

---

# 7. `Buat Rujukan` and `Tugaskan Tim`

These remain separate actions.

## 7.1 `Buat Rujukan`

Meaning:

```text
record a care/facility handoff decision
```

## 7.2 `Tugaskan Tim`

Meaning:

```text
assign a medical/mobile/transport response resource
```

Do not collapse them.

A selected destination facility does not automatically mean a mobile unit has been assigned.

A mobile team assignment does not automatically mean a referral destination already exists.

---

# 8. Valid T0 Follow-Up Combinations

## 8.1 Referral + Dispatch

Supported for a T0 requiring both care/facility handoff and field response.

Example:

```text
T0-Confirmed

Referral
→ RSUD X

Dispatch
→ PSC Unit 02
```

## 8.2 Dispatch Without Referral Initially

Valid as an intermediate operational state.

Example:

```text
T0-Confirmed
+
Tim PSC ditugaskan
+
Belum ada rujukan
```

This means field response has started while a facility handoff has not yet been recorded.

Do not invent a policy stating that every such case may permanently complete without referral.

## 8.3 Referral Without Dispatch

Valid as an intermediate state.

Example:

```text
T0-Confirmed
+
Rujukan → RSUD X
+
Belum ada tim ditugaskan
```

Do not invent unsupported policy about self-transport, private transport, or mandatory ambulance use.

---

# 9. Referral Model

## 9.1 Minimum Referral Data

Required:

```text
patient reference
source validation/event
destination facility
referral status
created_by
created_at
```

Optional:

```text
short referral note
```

`source validation/event` should point to the actual source record, for example:

```text
T0-Confirmed validation record
validated T1 record
validated T2 record
```

Do not store only an ambiguous string when a real source record exists.

## 9.2 Destination Facility

Referral destination must come from the Admin-managed Healthcare/Faskes organization registry.

Conceptually:

```text
ADMIN
creates/manages facility master data

        ↓

HEALTHCARE
selects existing facility when creating a referral
```

Healthcare must not create arbitrary new facility master records from the referral form.

## 9.3 Example Referral Creation Surface

```text
BUAT RUJUKAN

Penyintas
Siti Aminah

Sumber
T0-Confirmed
29 Sep 2026 • 16:49

Tujuan Fasilitas
[ Pilih fasilitas ▾ ]

Catatan rujukan
[ opsional ]

[ BUAT RUJUKAN ]
```

---

# 10. Referral State Model

The competition prototype should use a deliberately minimal referral lifecycle:

```text
No referral
→ Aktif
→ Selesai
```

`Belum ada rujukan` represents absence of a referral record.

It is not a referral lifecycle state.

## 10.1 Meaning of `Aktif`

A referral exists and remains operationally open inside RAPID-MIND.

## 10.2 Meaning of `Selesai`

The RAPID-MIND referral work item has been recorded as operationally completed by Healthcare.

`Selesai` must not automatically imply:

```text
hospital formally accepted the patient
patient was admitted
legal handoff was completed
treatment was completed
bed availability was confirmed
receiving physician accepted the case
```

Those processes are outside the currently defined prototype scope.

---

# 11. Referral States Deliberately Not Added

Do not currently introduce:

```text
Dikirim
Menunggu Penerimaan
Diterima RS
Ditolak RS
Menunggu Tempat Tidur
Diterima Dokter
Transfer Antar-Fasilitas
```

The sources do not define the real operational protocol required to give these states reliable meaning.

---

# 12. Emergency Response / Dispatch Model

## 12.1 Minimum Dispatch Data

Required:

```text
emergency_event reference
response team/unit
target location
assigned_by
assigned_at
dispatch state
```

Optional:

```text
linked referral
short operational note
```

A referral is not required before creating dispatch.

## 12.2 Target Location

Use the existing T0 location context where available.

Potential sources:

```text
device GPS
assigned Posko location
manual location description
```

Do not require the Healthcare user to re-enter location information that already exists in the emergency event.

## 12.3 Response Team / Unit

For the current prototype:

```text
response team/unit records are preconfigured operational resources
```

Healthcare selects an existing team/unit.

The detailed CRUD/master-data ownership of these team/unit records remains deferred.

Do not add a large fleet-management workflow to Healthcare.

---

# 13. Dispatch State Model

Lock the high-level progression:

```text
No dispatch
→ Ditugaskan
→ Menuju lokasi
→ Tiba di lokasi
→ Transportasi
→ Selesai
```

## 13.1 `No dispatch`

UI wording:

```text
Belum ada tim ditugaskan
```

This means no dispatch record currently exists.

It is not a dispatch lifecycle status.

## 13.2 `Ditugaskan`

A response team/unit has been assigned to the emergency.

## 13.3 `Menuju lokasi`

The assigned resource has begun moving toward the patient/location.

## 13.4 `Tiba di lokasi`

The resource has arrived at the emergency location.

Use `Tiba di lokasi` as the general product wording rather than hardcoding `Tiba di Posko`, because T0 location may be GPS-based, Posko-based, or manually described.

The specific location may still be displayed:

```text
Tiba di lokasi
Posko Candi
```

## 13.5 `Transportasi`

The response has entered the transport stage where applicable.

## 13.6 `Selesai`

The active dispatch work item is operationally completed inside RAPID-MIND.

The detailed real-world completion criteria remain outside the current source definition.

---

# 14. Transport Branching Remains Open

The current workflow includes:

```text
Menuju Lokasi
→ Tiba di Posko/lokasi
→ Transportasi
→ Selesai
```

However, the sources do not sufficiently establish whether every response must always enter `Transportasi`.

Do not yet lock a rule such as:

```text
every dispatch MUST use:
Tiba → Transportasi → Selesai
```

A future approved protocol may determine whether some responses can be completed at the scene.

---

# 15. No `Dibatalkan` State Yet

Do not currently add:

```text
Dibatalkan
```

A correct cancellation model would require unresolved policy such as:

```text
who may cancel
whether cancellation is allowed after departure
whether another team replaces the cancelled team
whether the linked referral remains active
required cancellation reason
what the Relawan should be told
```

These questions are not sufficiently defined by the current sources.

Cancellation/reassignment remains deliberately deferred.

---

# 16. Updating Dispatch Must Not Modify Clinical Classification

Dispatch controls operate only on the response/dispatch record.

Example:

```text
RESPONS LAPANGAN

PSC Unit 02

Status saat ini
Menuju lokasi

[ TANDAI TIBA DI LOKASI ]
```

The action creates:

```text
dispatch:
Menuju lokasi
→ Tiba di lokasi
```

It must not create or modify:

```text
T0-Suspect
T0-Confirmed
T1
T2
clinical validation record
system recommendation
```

Clinical classification may only change through the appropriate Healthcare clinical-validation workflow.

---

# 17. Example Dispatch Interaction

Assigned:

```text
RESPONS LAPANGAN

PSC Unit 02

DITUGASKAN

Ditugaskan oleh Dimas
16:51

[ MULAI MENUJU LOKASI ]
```

En route:

```text
RESPONS LAPANGAN

PSC Unit 02

MENUJU LOKASI

Dimulai 16:56

[ TANDAI TIBA DI LOKASI ]
```

Arrived:

```text
RESPONS LAPANGAN

PSC Unit 02

TIBA DI LOKASI

17:08

[ MULAI TRANSPORTASI ]
```

Transport:

```text
RESPONS LAPANGAN

PSC Unit 02

TRANSPORTASI

Tujuan
RSUD A

[ SELESAIKAN RESPONS ]
```

Routine forward progress does not require repeated confirmation dialogs.

A terminal action such as `SELESAIKAN RESPONS` may use a concise confirmation/review because it removes the item from active operational work.

---

# 18. T1 Referral

T1 does not automatically use the T0 emergency dispatch workflow.

Normal direction:

```text
T1 system recommendation
↓
Validasi
↓
Healthcare review
↓
Referral required?
        │
        ├── No
        │
        └── Yes
             ↓
          Buat Rujukan
```

Example:

```text
T1
Referral → specialist / facility
Dispatch → none
```

Do not automatically expose emergency dispatch controls merely because a T1 referral exists.

If non-emergency transport is required later, it should be defined through a separate approved requirement.

---

# 19. T2 Referral

T2 may produce a referral after a Healthcare decision.

Conceptually:

```text
System recommendation: T2
↓
Healthcare validation
↓
Rujukan diperlukan?
[ Ya / Tidak ]
```

If yes:

```text
[ BUAT RUJUKAN ]
```

This does not create a policy that all T2 cases require referral.

The clinical criteria for when a T2 requires referral remain outside the currently approved source material.

---

# 20. Global `Rujukan` Workspace

The global Healthcare `Rujukan` destination remains operational.

Use:

```text
RUJUKAN

[ AKTIF ] [ SELESAI ]

Cari pasien...                  Filter ▾

PASIEN        TUJUAN       SUMBER       STATUS      DIPERBARUI

Siti Aminah   RSUD A       T0           Aktif       16:58
Budi Santoso  RSUD B       T1           Aktif       15:42
Rina ...      Puskesmas C  T2           Aktif       14:18
```

The row should remain compact and scannable.

## 20.1 Referral Queue Row

Minimum information:

```text
patient
destination
source classification/context
current referral status
created/updated time
```

Masked identifier may be shown where disambiguation is needed.

Do not put the following directly in every row:

```text
full SRQ answers
full clinical notes
complete Red Flag narrative
complete audit history
technical IDs
```

---

# 21. Referral Detail

A referral detail surface may show:

```text
RUJUKAN

Siti Aminah
NIK 3515••••••••4821

STATUS
Aktif

TUJUAN
RSUD A

SUMBER
T0-Confirmed
29 Sep 2026 • 16:49

DIBUAT
dr. Rina
16:51

CATATAN
...

RESPONS LAPANGAN
PSC Unit 02
Menuju lokasi

RIWAYAT RUJUKAN

16:51
Rujukan dibuat
dr. Rina
```

Dispatch may be summarized here when linked.

Dispatch status remains separate from referral status.

---

# 22. Patient `Rujukan`

`Pasien → Rujukan` is longitudinal rather than operational.

Example:

```text
29 Sep 2026

RSUD A
Aktif

Sumber
T0-Confirmed • 16:49

Dibuat
16:51 • dr. Rina

[ LIHAT RUJUKAN ]
```

Historical example:

```text
22 Sep 2026

RSUD B
Selesai

Sumber
Validasi T1

[ LIHAT RUJUKAN ]
```

Completed records do not disappear.

---

# 23. Global `Rujukan` vs Patient `Rujukan`

Lock:

```text
Global Rujukan
= operational work queue
```

```text
Pasien → Rujukan
= longitudinal patient record
```

The global workspace answers:

```text
Which referrals currently require operational attention?
```

The patient workspace answers:

```text
What referrals has this patient had, what created them, and what happened?
```

---

# 24. Referral and Dispatch Inside the Active T0 Workspace

After T0 confirmation:

```text
T0-CONFIRMED
Siti Aminah

Dikonfirmasi 16:49
oleh dr. Rina


RUJUKAN

Belum ada rujukan

[ BUAT RUJUKAN ]


RESPONS LAPANGAN

Belum ada tim ditugaskan

[ TUGASKAN TIM ]
```

After both exist:

```text
T0-CONFIRMED
Siti Aminah

Dikonfirmasi 16:49
oleh dr. Rina


RUJUKAN

RSUD A
Aktif
Dibuat 16:51

[ LIHAT RUJUKAN ]


RESPONS LAPANGAN

PSC Unit 02
MENUJU LOKASI
Sejak 16:56

[ TANDAI TIBA DI LOKASI ]
```

Referral and response panels are sibling downstream sections.

Neither panel modifies the T0 clinical classification.

---

# 25. Incident Timeline

The T0 incident keeps an auditable sequence.

Example:

```text
RIWAYAT KEJADIAN

16:42
T0-Suspect dibuat
Ahmad Fauzi • Relawan

16:43
Diterima sistem

16:45
Kasus diakui
dr. Rina

16:46
Verifikasi sekunder dimulai
dr. Rina

16:49
T0 dikonfirmasi
dr. Rina

16:51
Rujukan dibuat
Tujuan: RSUD A

16:52
PSC Unit 02 ditugaskan

16:56
Tim menuju lokasi

17:08
Tim tiba di lokasi
```

Do not rewrite earlier events when later states change.

---

# 26. Auditability

Important clinical/referral/dispatch transitions must be attributable.

Store conceptually:

```text
actor
timestamp
previous_state
new_state
reason
metadata
```

## 26.1 Reason

Do not require a reason for every routine forward transition.

Examples that normally do not need a mandatory reason:

```text
Ditugaskan → Menuju lokasi
Menuju lokasi → Tiba di lokasi
```

Reasons become more important for exceptional future actions such as:

```text
correction
cancellation
reassignment
rollback
```

if those workflows are later approved.

Corrections create additional audit events rather than silently rewriting historical records.

---

# 27. Multiple Healthcare Users

Use soft ownership.

Authorized Healthcare users may read an incident already being handled by another user.

Example:

```text
Ditangani oleh
dr. Rina
```

Formal case-transfer workflow remains outside the current scope.

## 27.1 Stale Mutation Protection

If another user changes the same operational resource while someone is editing:

```text
Data telah diperbarui oleh pengguna lain.

Muat data terbaru sebelum melakukan perubahan.

[ MUAT PEMBARUAN ]
```

A stale form must not overwrite a newer canonical state.

Concurrency protection should apply independently to:

```text
clinical validation
referral
team assignment
dispatch progress
```

---

# 28. Realtime Behavior

Normal state:

```text
Realtime aktif
```

Realtime updates may affect:

```text
T0 queue
active incident
referral state
dispatch state
Relawan-facing response milestone
```

A realtime update must not steal keyboard focus or automatically replace the currently active form.

---

# 29. Realtime Disconnection

If the realtime channel disconnects but the server/API remains reachable:

```text
Realtime terputus

Pembaruan otomatis sementara tidak tersedia.
Terakhir diperbarui 17:08:14
```

Keep currently loaded information visible.

Before committing a state-changing action, verify against the latest server state.

On realtime reconnection, refresh/reconcile canonical state before treating the workspace as fully current.

---

# 30. Server/API Unavailable

If the Healthcare client cannot reach the server:

```text
Koneksi ke server terputus

Data di layar mungkin tidak terbaru.
Terakhir diperbarui 17:08:14
```

Healthcare is not currently designed as a fully offline-first clinical mutation environment.

Therefore actions such as:

```text
BUAT RUJUKAN
TUGASKAN TIM
MULAI MENUJU LOKASI
TANDAI TIBA DI LOKASI
MULAI TRANSPORTASI
SELESAIKAN RESPONS
```

must not falsely appear successful when the server cannot persist them.

Do not silently queue these Healthcare mutations as if they were equivalent to the Relawan offline outbox.

---

# 31. Relawan-Facing Operational Updates

The Relawan should receive only useful operational milestones.

Safe/useful progression:

```text
Diterima sistem
```

```text
Menunggu peninjauan tenaga kesehatan
```

```text
Sedang ditinjau tenaga kesehatan
```

```text
T0 terkonfirmasi
```

When actual dispatch exists:

```text
Tim ditugaskan
```

```text
Tim menuju lokasi
```

```text
Tim tiba di lokasi
```

If Healthcare downgrades the event:

```text
Status diperbarui tenaga kesehatan

T1 — Prioritas asesmen klinis
```

or:

```text
Status diperbarui tenaga kesehatan

T2 — Tindak lanjut psikososial
```

Do not infer human review from `Diterima sistem`.

Do not show dispatch language before an actual dispatch transition exists.

---

# 32. Information Not Exposed to Relawan

Do not expose ordinary internal Healthcare information such as:

```text
internal Healthcare account IDs
backend record IDs
resource version numbers
concurrency metadata
internal clinical notes
internal referral notes
alternative facilities considered
dense audit history
other patients
other Healthcare queue contents
internal organization-management metadata
```

The Relawan interface should communicate what matters for field action rather than Healthcare administration.

---

# 33. Accessibility and Keyboard Operation

Healthcare referral/dispatch controls must support:

```text
visible keyboard focus
logical Tab order
Enter / Space activation
browser zoom
explicit text labels
no color-only meaning
```

Do not use drag-only or swipe-only state transitions.

Avoid designs such as:

```text
drag ambulance icon from "Menuju" to "Tiba"
```

Use explicit controls instead:

```text
[ MULAI MENUJU LOKASI ]

[ TANDAI TIBA DI LOKASI ]

[ MULAI TRANSPORTASI ]

[ SELESAIKAN RESPONS ]
```

New realtime emergency/referral updates must not steal keyboard focus.

Audio alerts must always have visible equivalents.

---

# 34. Visual Semantics

The existing visual foundation remains unchanged.

Use:

```text
Teal
→ normal actions
→ referral actions
→ normal dispatch progression controls

T0 Red
→ emergency/high-severity meaning
→ T0 classification/emergency emphasis
```

Do not make ordinary referral or dispatch actions red merely because they belong to a T0 case.

Do not introduce permanent pulsing/flashing/glowing for referral or dispatch progress.

---

# 35. Healthcare vs Admin Boundary

## Healthcare

Healthcare owns patient-specific operational work:

```text
T0 acknowledgement
secondary verification
clinical validation
T0 confirmation
downgrade to T1/T2
patient clinical context
referral creation
referral status
team assignment
dispatch progress
transport progress
patient-specific response history
```

## Admin

Admin owns:

```text
Relawan provisioning
Healthcare user provisioning
Healthcare/Faskes organization master data
regional heatmap
aggregate T0/T1/T2/T3 distribution
population-level trends
volunteer distribution
logistics/resource allocation
executive reporting
regional strategic monitoring
```

Admin may monitor operational aggregates but should not perform patient-specific clinical/dispatch progression from the analytical command center.

---

# 36. Completed Records Become Historical

Completion removes work from active operational queues, not from history.

Referral:

```text
Rujukan > Aktif
→ Selesai
→ remains in Rujukan > Selesai
→ remains in Pasien > Rujukan
```

Dispatch:

```text
active response
→ Selesai
→ leaves active response work
→ remains in the T0 incident timeline/history
```

Clinical:

```text
T0-Suspect
→ T0-Confirmed
```

does not delete the original `T0-Suspect`.

The complete provenance remains reconstructable.

---

# 37. Locked Decisions From This Discussion

The following are the current design baseline:

1. The canonical application roles are `ADMIN`, `RELAWAN`, and `HEALTHCARE`.
2. `Hospital` is an organization/facility concept, not a separate application role.
3. Admin is the sole normal provisioning authority for Relawan accounts, Healthcare accounts, and Healthcare/Faskes organization records.
4. Administrative provisioning does not give Admin patient-specific clinical authority.
5. Clinical classification, referral, and dispatch remain separate concepts.
6. `T0-Confirmed` does not automatically create referral or dispatch.
7. `T0-Confirmed + Belum ada tim ditugaskan` is a valid state.
8. `Buat Rujukan` and `Tugaskan Tim` remain separate actions.
9. T0 may have referral + dispatch.
10. T0 may have dispatch before referral is recorded.
11. T0 may have referral before dispatch is assigned.
12. Referral destination is selected from Admin-managed facility master data.
13. The MVP referral lifecycle is `Aktif → Selesai`.
14. `Belum ada rujukan` means no referral record exists.
15. The dispatch lifecycle is `Ditugaskan → Menuju lokasi → Tiba di lokasi → Transportasi → Selesai`.
16. `Belum ada tim ditugaskan` means no dispatch record exists.
17. `Dibatalkan` is not added until cancellation/reassignment policy exists.
18. Updating dispatch never modifies clinical classification.
19. T1 may create referral without emergency dispatch.
20. T2 may create referral following a Healthcare decision, but T2 does not automatically imply referral.
21. `Rujukan` exists as both a global operational queue and a patient longitudinal section.
22. Global referral rows remain compact.
23. Referral detail carries provenance and audit context.
24. Referral and dispatch appear as sibling downstream sections in the active T0 workspace.
25. Completed records move out of active work but remain historical.
26. Important transitions remain auditable.
27. Stale forms must not overwrite newer canonical server state.
28. Realtime disconnection is explicitly distinguished from server/API failure.
29. Healthcare state-changing actions must not falsely appear saved during server failure.
30. Relawan receives useful response milestones but not dense internal Healthcare details.
31. Healthcare referral/dispatch controls remain keyboard accessible.
32. Teal remains the standard interaction color; T0 red remains protected for emergency semantics.
33. Admin remains macro/provisioning-oriented; Healthcare remains patient/action-oriented.
34. The Healthcare high-level operational architecture is now sufficiently defined for the competition prototype.

---

# 38. Deliberately Deferred Scope

The following remain intentionally undefined because the current sources do not provide enough operational policy:

```text
hospital acceptance/rejection workflow
bed availability workflow
receiving physician acceptance
inter-facility transfer rules
referral eligibility rules
legal handoff/signature requirements
dispatch cancellation policy
response-team reassignment policy
ambulance fleet management
driver/crew scheduling
ETA/SLA calculations
non-emergency T1/T2 transport rules
whether every T0 dispatch must enter Transportasi
exact production criteria for referral completion
exact production criteria for dispatch completion
detailed response-team/unit master-data ownership
```

These are not blockers for the RAPID-MIND competition prototype.

They should only be introduced after an approved operational/clinical protocol defines them.

---

# 39. Healthcare High-Level UX Closure

With this document, the Healthcare high-level UX architecture consists of:

```text
Primary Navigation
Darurat | Validasi | Rujukan | Pasien

Emergency Architecture
Persistent Emergency Queue
+
One Focused Incident Workspace
+
Adaptive Contextual Rail

T0 Handling
T0-Suspect
→ acknowledgement
→ secondary verification
→ T0-Confirmed / T1 / T2

Referral
No referral
→ Aktif
→ Selesai

Dispatch
No dispatch
→ Ditugaskan
→ Menuju lokasi
→ Tiba di lokasi
→ Transportasi
→ Selesai
```

This is sufficient to move beyond Healthcare high-level operational modeling.

The next design discussions should focus on the remaining product-wide areas rather than expanding Healthcare into a complete hospital referral or ambulance-management system.
