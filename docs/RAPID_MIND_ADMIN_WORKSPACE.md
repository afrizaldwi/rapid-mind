# RAPID-MIND — Admin Workspace & Operations Design

**Document type:** UI/UX design specification  
**Scope:** Admin / BPBD / Dinkes macro workspace, geospatial monitoring, regional analytics, provisioning, Posko/Relawan operations, limited logistics/resource coordination, and Admin authority boundaries  
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

The technical plan remains the architectural constraint.

The visual foundation remains locked unless later usability or accessibility testing identifies a concrete problem.

The Relawan, T0, Healthcare, and referral/response documents remain the current role-specific interaction baselines unless explicitly revised.

This document does not redefine:

- the technical architecture;
- triage thresholds;
- clinical authority;
- the existing visual palette;
- typography;
- Relawan field interaction;
- Healthcare clinical/referral/dispatch interaction.

---

# 2. Core Admin Principles

Admin is a **macro operational and analytical role**.

Admin is not a second Healthcare dashboard.

Admin is responsible for:

```text
provisioning
geospatial monitoring
regional analytics
volunteer / Posko management
limited resource / logistics coordination
organization / facility master data
executive-level operational reporting
```

Admin is not responsible for:

```text
patient-specific clinical validation
T0 acknowledgement
T0 confirmation / downgrade
clinical diagnosis
patient-specific referral decisions
patient-specific dispatch progression
clinical record editing
```

The role boundary is:

```text
Admin
→ controls who may operate
→ controls organization / facility master data
→ monitors regional conditions
→ manages Relawan / Posko operational assignment
→ coordinates limited macro resource allocation

Relawan
→ performs PFA
→ performs structured field assessment
→ creates T0-Suspect

Healthcare
→ acknowledges T0
→ performs secondary / clinical validation
→ records clinical classification
→ creates referrals
→ performs patient-specific dispatch / response
```

Admin must remain capable of understanding operational pressure without needing access to Healthcare's patient-level clinical workspace.

---

# 3. Source Conflict Resolution

The older `workflow.md` sketches some Admin behavior such as:

- patient-level longitudinal master tables;
- individual T0 map points;
- blinking/pulsing T0 markers.

Those concepts are not carried forward literally.

Later project baselines establish that:

- Admin should operate at macro / regional level;
- identifiable patient clinical records belong to Healthcare;
- red is protected for emergency semantics;
- permanent flashing/pulsing should not be used;
- Admin should be analytical and geospatial rather than an EMR.

Therefore this Admin design preserves the **operational intent** of the earlier workflow while using:

```text
aggregate Posko / area monitoring
instead of patient-level clinical browsing
```

and:

```text
static high-salience T0 representation
instead of permanent flashing
```

---

# 4. Admin Information Architecture

## Final Direction

Use four permanent top-level Admin destinations:

```text
Ringkasan
Relawan
Faskes
Operasional
```

Do not expose every technical route or database entity as a permanent navigation destination.

---

## 4.1 Ringkasan

Purpose:

```text
macro geospatial monitoring
regional risk distribution
30-day longitudinal monitoring
operational pressure detection
filtered executive reporting
```

Contains:

```text
geospatial command center
T0 / T1 / T2 / T3 distribution
assessment volume
Posko / region distribution
dominant risk factors
30-day trend
operational filters
report / export actions
```

`Peta` and `Analitik` are not separate permanent top-level destinations.

They are two analytical surfaces within `Ringkasan`.

---

## 4.2 Relawan

Purpose:

```text
Relawan account provisioning
activation / deactivation
Posko assignment
Posko reassignment
operational assignment history
```

Relawan management is not an HR system.

---

## 4.3 Faskes

Purpose:

```text
Healthcare / Faskes organization registry
Healthcare account provisioning
organization association
activation / deactivation
```

Recommended internal views:

```text
Organisasi
Akun Healthcare
```

Organization and user management belong together operationally, but remain separate data concepts.

---

## 4.4 Operasional

Purpose:

```text
Posko master data
resource needs
resource allocation records
```

Recommended internal views:

```text
Posko
Sumber Daya
```

Do not turn this area into:

```text
warehouse software
procurement software
fleet management
government administration
```

---

# 5. Admin Landing Page

Admin lands on:

```text
Ringkasan
```

The landing page is the geospatial operational overview.

Its primary question is:

> Where is operational pressure concentrated, how is it changing, and where may personnel or resources need redistribution?

The map is the primary surface.

Supporting summaries exist only when they help interpret the map or operational situation.

Do not fill the landing page with decorative KPI cards simply because dashboards commonly use them.

Appropriate summary information may include:

```text
current T0 presence
T1 / T2 / T3 distribution
assessment volume
active Posko
Relawan distribution
resource-need count
```

Each summary must support a real RAPID-MIND operational decision.

---

# 6. Geospatial Command Center

## 6.1 Geographic Unit

The default geographic unit is:

```text
Posko / area
```

not:

```text
individual patient
```

Admin should not normally view individual survivor coordinates.

---

## 6.2 Map Content

A Posko marker may communicate:

```text
Posko identity
T0 presence / count
T1 / T2 / T3 distribution
assigned Relawan count
resource-need indicator where available
```

At broader zoom levels, Posko information may aggregate into:

```text
clusters
heatmap
area-level distribution
```

---

## 6.3 T0 Representation

T0 must remain highly visible but static.

Use:

```text
T0 icon
+
T0 red
+
explicit text / count
+
high map-layer priority
```

Example concept:

```text
⚠ T0 • 3
```

Do not use:

```text
permanent flashing
permanent pulsing
continuous glow
continuous animation
```

T0 meaning must never depend on color alone.

---

## 6.4 Posko Drill-Down

Selecting a Posko opens an aggregate operational summary.

Minimum content:

```text
Posko name
region
T0 / T1 / T2 / T3 counts
assessment volume
assigned Relawan
resource needs
recent trend
```

The drill-down must not become:

```text
Healthcare → Pasien
```

Do not expose:

```text
patient name
NIK
full SRQ answers
clinical notes
Red Flag narrative
clinical validation controls
referral controls
dispatch controls
```

---

# 7. Filters

Use a consistent global filter model for `Ringkasan`.

Minimum filters:

```text
Region
Posko
Periode
Triage
```

Filters apply consistently to:

```text
map
summary values
distribution charts
30-day trend
report / export result
```

Do not give every visualization an unrelated independent filter state unless later requirements justify it.

---

# 8. Admin Analytics

The minimum analytical set is:

```text
T0 / T1 / T2 / T3 distribution
assessment volume
regional / Posko distribution
30-day longitudinal trends
dominant risk factors
```

Do not initially create a separate detailed functional-impact dashboard.

Functional-impact information may be added later only if it supports a concrete operational decision or judging requirement.

Analytics must remain:

```text
aggregate
regional
Posko-oriented
time-oriented
```

not:

```text
clinical diagnosis
patient-level interpretation
```

---

# 9. Thirty-Day Longitudinal Monitoring

The 30-day view belongs inside:

```text
Ringkasan
```

It is not a separate permanent top-level page.

The longitudinal view should support aggregate daily trends such as:

```text
assessment volume
T0 count
T1 count
T2 count
T3 count
```

or proportional distributions when the denominator is trustworthy.

Admin may compare:

```text
selected Posko vs regional aggregate
Posko A vs Posko B
one period vs another period
```

Do not present raw counts as prevalence rates if RAPID-MIND does not have a reliable population denominator.

If a denominator is unavailable, label the values explicitly as:

```text
jumlah
```

rather than implying:

```text
prevalensi
persentase populasi
```

---

# 10. Admin Reporting

Do not create a separate full report-builder workspace for the competition prototype.

Reporting should be contextual.

Recommended pattern:

```text
current filters
↓
Ringkasan / analytical result
↓
Export / report action
```

The exported/report view should preserve:

```text
selected region
selected Posko
selected time period
selected triage filter
generation timestamp
```

A sophisticated configurable reporting engine remains outside MVP scope.

---

# 11. Relawan Management

The minimum Relawan management capabilities are:

```text
list / search
view account
create account
activate / deactivate
view current Posko assignment
assign Posko
reassign Posko
view assignment history
```

Keep three concepts separate:

```text
Relawan identity / account
≠
Relawan operational assignment
≠
patient data created by that Relawan
```

Do not include:

```text
salary
attendance
leave
performance rating
HR documents
family information
training certification system
continuous GPS history
patient clinical record browsing
```

---

# 12. Relawan List

Minimum row information:

```text
Nama
Login / email
Posko saat ini
Status akun
```

Optional operational information may appear only where reliably defined.

Do not add an ambiguous:

```text
Online
```

indicator unless the system has actual presence data with clearly defined semantics.

Recommended filters:

```text
search
Posko
status
```

Full assignment history belongs in Relawan detail rather than in every row.

---

# 13. Relawan Provisioning

Minimum creation data:

```text
Nama
Email / username login
Posko awal
Status akun
Initial credential
```

Do not require unnecessary personal information such as:

```text
NIK
date of birth
residential address
family details
emergency contact
```

unless a future approved requirement establishes a real operational need.

---

## 13.1 Creation Feedback

After successful creation, show an explicit result containing:

```text
Akun berhasil dibuat

Nama
Login
Posko
Status
```

The initial credential may be shown through the approved provisioning mechanism.

RAPID-MIND must not provide a normal interface for retrieving an existing user's stored password.

The exact temporary-password / first-login / password-reset mechanism is deferred to:

```text
Authentication & Account Provisioning UX
```

---

## 13.2 Duplicate Account Handling

Duplicate login/email must block creation.

Show:

```text
field-level explanation
+
path to the existing account where appropriate
```

Do not silently create another operational identity.

---

# 14. Account Activation and Deactivation

Normal account lifecycle:

```text
Aktif
Nonaktif
```

Prefer deactivation over destructive deletion.

No ordinary `Hapus akun permanen` action is exposed in the MVP.

Historical records remain attributable to the original account.

---

## 14.1 Relawan Becomes Nonaktif

Expected behavior:

```text
new authenticated server operations stop once deactivation is recognized
historical assessments remain
historical T0 events remain
audit attribution remains
assignment history remains
```

Exact offline-auth behavior is deferred to the authentication UX design because Relawan is offline-capable.

---

## 14.2 Healthcare User Becomes Nonaktif

Expected behavior:

```text
server access is revoked
historical validation remains
historical referrals remain
historical dispatch actions remain
audit attribution remains
```

---

# 15. Healthcare / Faskes Organization Registry

Minimum organization information:

```text
Nama fasilitas
Jenis fasilitas
Alamat / lokasi
Region
Koordinat
Status Aktif / Nonaktif
```

Supported organization concepts may include:

```text
Rumah Sakit / RS
Puskesmas
PSC 119
other approved Healthcare / Faskes organization
```

Do not add unsupported hospital-information-system fields such as:

```text
bed capacity
specialties
accreditation
insurance
pharmacy inventory
operating rooms
physician schedules
```

---

# 16. Facility Lifecycle

Use:

```text
Aktif
Nonaktif
```

An inactive facility:

```text
remains visible in historical records
cannot be selected for new referrals
cannot receive new Healthcare account associations
```

For the prototype, facility deactivation should be blocked while active Healthcare users remain assigned.

Admin must first:

```text
reassign those users
or
deactivate those users
```

This prevents an ambiguous state where an active Healthcare operator belongs to an inactive facility.

Hard deletion is not a normal UI action.

---

# 17. Healthcare Account Provisioning

Minimum account creation data:

```text
Nama
Email / username
Healthcare / Faskes organization
Status
Initial credential
```

The prototype uses the broad:

```text
HEALTHCARE
```

role.

Do not introduce a complex clinical permission matrix such as:

```text
doctor
nurse
psychiatrist
PSC operator
facility administrator
```

until a later approved requirement establishes the need.

---

# 18. Organization ↔ Healthcare User Relationship

Lock the prototype relationship as:

```text
1 Healthcare / Faskes organization
→ many Healthcare users
```

and:

```text
1 Healthcare user
→ 1 primary organization
```

Demo data containing only one Healthcare user for a hospital must not become a structural one-to-one limitation.

Multi-organization membership remains deferred unless an operational requirement later needs it.

---

# 19. Posko Management

Admin manages minimum Posko master data:

```text
Nama Posko
Region
Alamat / petunjuk lokasi
Koordinat
Status Aktif / Nonaktif
```

Assigned Relawan are represented through assignment records.

Do not store assignment merely as an editable static property inside the Posko record.

---

# 20. Posko Operational Role

Posko provides context for:

```text
Relawan assignment
field assessment provenance
T0 location fallback
Admin geospatial aggregation
resource-need aggregation
```

T0 location precedence remains:

```text
1. Current device GPS
2. Assigned Posko location
3. Manual location description
```

Therefore accurate Posko coordinates are operational infrastructure.

---

# 21. Volunteer Assignment and Reassignment

A Relawan reassignment affects:

```text
current / future operational context
```

It must not rewrite:

```text
historical assessments
historical T0 events
historical patient provenance
```

Use a dedicated assignment history concept.

For the prototype, assignment history remains inside the Relawan detail surface.

Example:

```text
29 Sep 2026

Posko Waru
→ Posko Candi

oleh Admin ...
alasan ...
```

A reason is recommended when changing an existing assignment.

A reason is not required for initial assignment.

---

# 22. Logistics / Resource Management

The MVP uses:

```text
resource needs
+
resource allocation records
```

not full inventory management.

Minimum concept:

```text
Posko has / reports a need
↓
Admin sees the need
↓
Admin records an allocation
```

Minimum information may include:

```text
Resource type
Posko
Quantity needed
Need / request note
Allocated quantity
Allocation timestamp
Admin actor
```

The system may use configured MHPSS-related resource categories.

Do not invent:

```text
suppliers
purchase orders
procurement approval
warehouse receiving
stock reconciliation
accounting
pricing
budget management
```

---

# 23. Response Team / Unit Master Data

Do not build Admin CRUD for response-team/unit master data in the current prototype.

Response resources such as:

```text
PSC Unit 01
Ambulans 02
Tim Mobile A
```

remain:

```text
preconfigured operational resources
```

Healthcare may select them during dispatch.

Detailed ownership and CRUD are deliberately deferred.

Do not add:

```text
fleet management
crew scheduling
vehicle maintenance
dispatch center administration
```

---

# 24. Admin Visibility Into T0

Admin may see macro emergency information such as:

```text
active T0 count
T0 distribution by Posko / region
T0 trend
Posko location
high-level handling distribution
```

A high-level operational grouping may include:

```text
Belum diakui
Sedang ditangani
Tindak lanjut
```

if backed by actual Healthcare states.

Admin does not receive the patient-level emergency workspace.

Do not expose:

```text
patient name / NIK
full Red Flag narrative
full SRQ answers
clinical notes
T0 acknowledgement control
T0 confirmation control
downgrade control
patient referral actions
patient dispatch actions
```

---

# 25. Admin Visibility Into Patient Data

Lock the privacy boundary as:

```text
Admin
→ aggregate data by region / Posko / time

Healthcare
→ identifiable longitudinal patient record
```

The Admin baseline does not include:

```text
searchable patient master table
patient-level longitudinal clinical graph
patient-level clinical drill-down
```

A `patient aggregate table` may exist only as aggregated statistics, for example:

```text
Posko
assessment count
T0 / T1 / T2 / T3 distribution
time period
```

It must not become an Admin EMR.

---

# 26. Admin Tables and Search

Use a consistent table pattern.

## Relawan

Minimum row:

```text
Nama
Login
Posko
Status
```

Filters:

```text
search
Posko
status
```

---

## Healthcare Users

Minimum row:

```text
Nama
Login
Faskes
Status
```

Filters:

```text
search
Faskes
status
```

---

## Facilities

Minimum row:

```text
Nama
Jenis
Region
Status
```

Filters:

```text
search
jenis
region
status
```

---

## Posko

Minimum row:

```text
Nama
Region
Jumlah Relawan
Status
```

Filters:

```text
search
region
status
```

---

## Resource Needs

Minimum row:

```text
Posko
Jenis sumber daya
Jumlah
Pembaruan terakhir
```

Filters:

```text
Posko
jenis sumber daya
```

Do not place complete histories, technical IDs, or rarely needed metadata in every row.

Full information belongs in detail views.

---

# 27. Auditability

Important Admin actions must be attributable.

Examples:

```text
create user
activate / deactivate user
create facility
activate / deactivate facility
change Relawan Posko assignment
change Healthcare organization association
create / update Posko
record resource allocation
```

Store conceptually:

```text
actor
timestamp
previous state
new state
reason where appropriate
metadata
```

Do not require a reason for every routine action.

Require or strongly encourage a reason for exceptional state changes such as:

```text
deactivation
reassignment
association change
correction
```

---

## 27.1 Audit UI

Do not add a large permanent `Audit Log` navigation destination.

Each managed entity may expose:

```text
Riwayat perubahan
```

Example:

```text
16:20
Relawan dipindahkan
Posko Waru → Posko Candi
oleh Admin ...
alasan ...
```

This is sufficient for the competition prototype.

---

# 28. Realtime Admin Behavior

Realtime is justified for:

```text
Ringkasan map
T0 aggregate / count
regional T1 / T2 / T3 distribution
Posko operational summaries
Relawan distribution
resource-need summaries where applicable
```

Normal provisioning forms do not require realtime synchronization.

Account creation/edit forms and facility management may use normal server-backed CRUD behavior.

---

# 29. Realtime Disconnection

If the realtime channel disconnects while the server/API remains reachable:

```text
Realtime terputus

Pembaruan otomatis sementara tidak tersedia.
Terakhir diperbarui 17:08
```

Keep loaded information visible.

Do not clear the command center merely because realtime is temporarily unavailable.

On reconnection:

```text
refresh / reconcile canonical state
↓
resume realtime
```

---

# 30. Server / API Failure

If the Admin client cannot reach the server:

```text
Koneksi ke server terputus

Data di layar mungkin tidak terbaru.
Terakhir diperbarui 17:08
```

Admin is not designed as a Relawan-style offline mutation environment.

State-changing actions such as:

```text
create account
deactivate account
reassign Relawan
create facility
change organization
record allocation
```

must not falsely appear successful when persistence fails.

Do not silently queue Admin mutations as if they were Relawan offline field records.

---

# 31. Admin Accessibility

The Admin workspace must preserve:

```text
visible keyboard focus
logical Tab order
Enter / Space activation
browser zoom support
no color-only meaning
readable compact tables
no permanent pulsing / flashing
```

---

## 31.1 Maps

The map must not be the only way to access geographic operational information.

Provide an equivalent Posko / region list or summary.

Keyboard users must be able to:

```text
reach map-related filters
reach map/list controls
open Posko summaries
access the equivalent textual information
```

---

## 31.2 Charts

Charts must provide:

```text
explicit labels
values available through focus / interaction
textual summary
table equivalent where necessary
```

T0 / T1 / T2 / T3 must use:

```text
text
+
icon / structure
+
color
```

not color alone.

---

## 31.3 Tables

Tables must preserve:

```text
readable compact typography
clear headers
visible row/action focus
keyboard-accessible row actions
logical control order
```

---

## 31.4 Filters

Filters require:

```text
visible labels
clear active state
clear reset behavior
keyboard accessibility
```

Do not rely only on placeholder text.

---

# 32. Responsive Behavior

Admin is:

```text
desktop-optimized
```

not:

```text
mobile-first
```

The goal is to preserve functionality across narrower command-center devices without recreating the Relawan mobile shell.

---

## 32.1 Large Desktop

Allow simultaneous visibility of:

```text
primary navigation
central map
analytical side region
longitudinal / distribution region
```

---

## 32.2 Normal Laptop

Keep the map primary.

Secondary analytics may move into:

```text
tabs
collapsible panels
context drawer
stacked lower region
```

---

## 32.3 Tablet / Narrow Desktop

Recommended:

```text
navigation collapses
map becomes full-width
secondary analytical surfaces stack
detail panels become drawers
tables simplify or horizontally scroll where unavoidable
```

Do not force the entire command-center grid onto a narrow screen.

At 200% zoom, the layout may reflow rather than preserving every simultaneous panel.

---

# 33. Admin vs Healthcare Authority Matrix

| Domain | Admin | Healthcare |
|---|---|---|
| Relawan accounts | View / create / change / deactivate | No management |
| Healthcare accounts | View / create / change / deactivate / associate facility | No provisioning |
| Healthcare/Faskes facility master | View / create / change / deactivate | View / select active facilities |
| Posko master data | View / create / change / deactivate | View where operationally relevant |
| Relawan → Posko assignment | View / assign / reassign | No management |
| Regional T0–T3 analytics | View | Not primary Healthcare function |
| Regional volunteer distribution | View / manage assignment context | Not primary Healthcare function |
| Resource / logistics allocation | View / create / change allocation records | No macro allocation authority defined |
| Patient clinical record | Aggregate only | View / create clinical records through authorized workflows |
| T0 acknowledgement | Aggregate visibility only | View / perform |
| Secondary verification | No | View / perform |
| T0 confirmation / downgrade | No | View / perform |
| Patient referral | Aggregate reporting only | View / create / progress |
| Patient-specific dispatch | Aggregate / high-level monitoring only | View / assign / progress |
| Response-team/unit master data | No CRUD in MVP | Select existing preconfigured records |
| Executive / regional reporting | View / export | Not a primary Healthcare function |

---

# 34. Deliberately Deferred Scope

Do not design or implement the following as part of the Admin MVP:

```text
full HR / personnel management
payroll
attendance
shift scheduling
performance ratings
training management
public registration
self-registration
granular Healthcare permission matrices
multi-facility Healthcare membership
Admin patient EMR
patient-level longitudinal clinical analytics
continuous individual Relawan GPS tracking history
hospital bed management
specialty / accreditation management
insurance management
hospital acceptance / rejection workflow
warehouse management
procurement
suppliers
purchase orders
accounting
stock reconciliation
fleet management
crew scheduling
response-team Admin CRUD
dispatch cancellation / reassignment
ETA / SLA calculations
advanced audit-search console
custom report builder
predictive hotspot analytics
unsupported prevalence calculations
```

These are either not supported by the source documents, explicitly unresolved, or would expand RAPID-MIND beyond the competition prototype's operational goal.

---

# 35. Final Admin Architecture

The locked high-level Admin model is:

```text
ADMIN

Ringkasan
├── Geospatial command center
├── Aggregate T0 / T1 / T2 / T3
├── Assessment / risk-factor summary
├── 30-day trends
└── Filtered report / export

Relawan
├── Accounts
├── Current Posko assignment
└── Assignment history

Faskes
├── Organization registry
└── Healthcare accounts

Operasional
├── Posko
└── Resource needs / allocations
```

This architecture is sufficient for the competition prototype because it directly supports:

```text
provisioning
geospatial monitoring
regional analytics
volunteer / Posko management
limited resource / logistics coordination
```

without duplicating Healthcare's patient-specific clinical workflow.

---

# 36. Decision Status

The following are now considered locked for the next design phase unless later usability, accessibility, or implementation constraints expose a concrete contradiction:

- four-destination Admin navigation;
- `Ringkasan` as the Admin landing page;
- map-first macro command center;
- Posko / area aggregation rather than patient-level map pins;
- static high-salience T0 representation without flashing;
- aggregate Admin analytics;
- 30-day monitoring inside `Ringkasan`;
- contextual reporting rather than a separate report-builder workspace;
- Relawan provisioning and Posko assignment under Admin;
- Admin-owned Healthcare/Faskes organization registry;
- one facility → many Healthcare users;
- one Healthcare user → one primary facility for the prototype;
- Admin-owned Posko master data;
- assignment-history preservation;
- resource needs + allocation records as the logistics MVP;
- preconfigured response-team/unit master records;
- no Admin patient-level clinical workspace;
- deactivation instead of routine destructive deletion;
- entity-level change history instead of a large audit console;
- realtime only where operationally useful;
- no offline Admin mutation queue;
- desktop-optimized responsive behavior;
- explicit Admin vs Healthcare authority separation.

---

# 37. Next Design Topic

The Admin operational-model gap is now considered closed.

The next pre-development topic is:

```text
Authentication & Account Provisioning UX
```

That discussion should close:

```text
universal login behavior
role-aware routing
initial account credentials
temporary password / first-login flow
password change / reset
logout
logout-all / forced revocation
inactive-account behavior
offline Relawan authentication continuity
expired access token behavior
refresh-token failure behavior
session / device visibility where necessary
provisioning feedback
duplicate account handling
cross-role authentication states
```

After that, the remaining pre-development topics are:

```text
1. Shared Cross-Role System States & Interaction Patterns
2. Final Screen Inventory + Implementation Handoff
```

Only after those interaction baselines are closed should implementation preparation become the primary workflow.
