# RAPID-MIND — Visual Foundation

**Status:** Design system baseline  
**Scope:** Core color system and typography  
**Design direction:** Operational Humanitarian UI  
**Project:** RAPID-MIND

---

## 1. Design Intent

RAPID-MIND uses a deliberately restrained visual system so operational states, clinical priorities, and emergency events remain visually dominant.

The general interface uses only five core colors. Triage colors T0–T3 are treated as semantic exceptions because they communicate clinically and operationally meaningful states.

The interface should remain:

- calm by default;
- high contrast;
- easy to scan under pressure;
- suitable for outdoor mobile use;
- suitable for dense desktop clinical and command-center layouts;
- visually consistent across Relawan, Healthcare, and Admin roles;
- explicit about status rather than relying on color alone.

---

# 2. Core Color System

## 2.1 Core Palette

| Token | Name | Hex | Primary Usage |
|---|---|---:|---|
| `color-ink` | Ink | `#0F172A` | Primary text, headings, high-emphasis labels, structural desktop navigation |
| `color-primary` | Teal | `#0F766E` | Primary CTA, active navigation, links, selected controls, normal positive interaction |
| `color-muted` | Slate | `#64748B` | Secondary text, metadata, disabled content, low-priority labels |
| `color-canvas` | Soft Gray | `#F1F5F9` | Application background, secondary regions, grouped content areas |
| `color-surface` | White | `#FFFFFF` | Cards, forms, panels, data surfaces |

### Recommended visual balance

Typical screens should approximately use:

- **70–80%** White / Soft Gray
- **15–20%** Ink / Slate
- **5–10%** Teal

Teal should remain an interaction color, not decorative filler.

---

## 2.2 Derived States

Derived states should use opacity, brightness, or contrast adjustments of the existing palette rather than introducing additional hues.

Examples:

- subtle border → Ink at ~12% opacity;
- standard border → Ink at ~20% opacity;
- strong divider → Ink at ~30% opacity;
- selected background → Teal at ~8–12% opacity;
- disabled background → Ink at very low opacity over White;
- hover state → Teal with slightly increased contrast;
- pressed state → Teal with stronger contrast.

Do not create separate named blue, cyan, purple, or decorative orange families.

---

## 2.3 Core Color Usage Rules

### Ink — `#0F172A`

Use for:

- primary body text;
- page titles;
- section headings;
- strong labels;
- desktop structural navigation where strong contrast is required;
- iconography that should not compete with semantic states.

Avoid using Ink as a decorative fill across large areas unless needed for a desktop navigation shell.

### Teal — `#0F766E`

Use for:

- primary buttons;
- active navigation;
- selected inputs;
- hyperlinks;
- normal success-like interaction states;
- syncing states;
- standard informational emphasis.

Do not use Teal for T0–T3 triage meaning.

### Slate — `#64748B`

Use for:

- supporting text;
- timestamps;
- captions;
- metadata;
- disabled labels;
- normal offline indicators when data remains safely stored locally.

### Soft Gray — `#F1F5F9`

Use for:

- app background;
- grouped sections;
- secondary panels;
- subtle table or list grouping.

### White — `#FFFFFF`

Use for:

- cards;
- question panels;
- clinical records;
- dashboard surfaces;
- form surfaces;
- map-side panels.

---

# 3. Triage Semantic Palette

T0–T3 are explicit semantic exceptions to the five-color core system.

| State | Meaning | Main Color |
|---|---|---:|
| **T0** | Emergency / Critical Emergency | `#991B1B` |
| **T1** | High Risk | `#C2410C` |
| **T2** | Moderate Risk | `#A16207` |
| **T3** | Low Risk | `#15803D` |

Optional deeper T0 emphasis:

- `#7F1D1D`

Use the deeper T0 color only for selected confirmed-emergency emphasis where needed. Do not make users distinguish T0-Suspect from T0-Confirmed solely by two similar shades of red.

---

## 3.1 T0 Must Remain Structurally Distinct

T0 is not just a more severe version of T1.

T0 should be differentiated using:

- color;
- emergency iconography;
- explicit text label;
- dedicated panel structure;
- timestamp/transmission state;
- high-priority placement;
- emergency actions.

Example:

> **EMERGENCY — T0 SUSPECT**  
> Belum divalidasi tenaga kesehatan

Avoid representing T0 only as a small status badge.

---

## 3.2 Protect Emergency Red

Saturated red should not be used as the normal brand or primary action color.

Do **not** use T0 red for:

- normal Save buttons;
- normal active navigation;
- ordinary selected tabs;
- decorative highlights;
- generic charts;
- routine sync states;
- standard success/failure communication where a neutral treatment is sufficient.

The goal is to preserve maximum visual salience for real emergency conditions.

---

# 4. System Status Colors Without Expanding the Palette

RAPID-MIND should avoid assigning a unique hue to every operational state.

## Online / Synced

Use Teal.

Example:

> ✓ Tersinkron

## Syncing

Use Teal.

Example:

> ↻ Menyinkronkan 3 data…

## Offline, Data Safe Locally

Use Slate or Ink plus explicit wording.

Example:

> Offline • 3 data tersimpan di perangkat

Offline is an expected operating mode and should not automatically look like a failure.

## Sync Failed

Use an error treatment with explicit text while keeping the message calm if local data remains safe.

Example:

> Sinkronisasi gagal • Data tetap aman di perangkat

## Local Storage Failure

Treat this as significantly more severe because data loss becomes possible.

Example:

> Data belum berhasil disimpan di perangkat

## Warnings

When a true caution state requires color, restrained reuse of T2 amber is acceptable.

Use this sparingly so T2 remains meaningful as a triage state.

---

# 5. Typography

## 5.1 Primary Typeface

**Primary family:** Inter Variable

Recommended fallback stack:

```css
Inter, system-ui, sans-serif
```

The font should be bundled locally with the application rather than depending on a remote font service.

### Why Inter

Inter is appropriate because it provides:

- high legibility at small sizes;
- strong numeric rendering;
- good performance in dense desktop interfaces;
- good readability for large field-assessment questions;
- broad weight support;
- consistent appearance across mobile and desktop.

No decorative secondary font is required.

---

## 5.2 Type Scale

| Style | Desktop Size / Line Height | Mobile Size / Line Height | Recommended Usage |
|---|---|---|---|
| Display | 32 / 40 | 28 / 36 | Rare executive/dashboard headline |
| H1 | 28 / 36 | 24 / 32 | Page or screen title |
| H2 | 22 / 30 | 22 / 30 | Major section title |
| H3 | 18 / 26 | 18 / 26 | Card or panel title |
| Assessment Question | 20 / 30 | 20 / 30 | SRQ-20 and frontline assessment questions |
| Body | 16 / 24 | 16 / 24 | Default interface content |
| Compact | 14 / 20 | 14 / 20 | Dense desktop tables and metadata |
| Caption | 12 / 16 | 12 / 16 | Timestamp and low-priority technical metadata |

### Rules

- Do not reduce frontline assessment instructions below 14px merely to fit more content.
- Prefer scrolling over sacrificing readability.
- Default Relawan body content should remain 16px.
- Assessment questions should generally use 20px.
- Dense Healthcare/Admin tables may use 14px where scanning density matters.

---

## 5.3 Font Weights

Recommended hierarchy:

| Weight | Usage |
|---|---|
| 400 | Default body content |
| 500 | Labels, secondary emphasis, navigation |
| 600 | Headings, primary actions, important labels |
| 700 | Major KPIs and emergency headings only |

Avoid excessive bold text. If most of a screen is bold, hierarchy becomes unclear.

---

## 5.4 Numeric Typography

Use tabular numerals for:

- KPIs;
- queue counts;
- timestamps where alignment matters;
- assessment scores;
- trend tables;
- longitudinal statistics.

Recommended CSS behavior:

```css
font-variant-numeric: tabular-nums;
```

---

# 6. Typography by Role

## Relawan

Prioritize readability and conversational pacing.

Typical hierarchy:

- Screen title → H1
- Assessment question → Assessment Question
- Guidance → Body
- Supporting note → Compact
- Timestamp/sync metadata → Caption or Compact

Avoid dense table typography in the frontline PWA.

## Healthcare

Use a denser hierarchy while preserving clinical scanability.

Typical hierarchy:

- Workspace title → H1/H2
- Patient identity → H2/H3
- Clinical labels → Compact / Medium
- Assessment values → Body or Compact
- Queue rows → Compact
- Emergency headings → H2/H3 with strong weight

## Admin

Use compact typography for operational density.

Typical hierarchy:

- Command-center title → H1
- KPI values → Display/H1
- KPI labels → Compact
- Map labels → Compact
- Filter controls → Compact
- Trend annotations → Caption/Compact

---

# 7. Typography Accessibility Rules

Typography should remain usable under field and command-center conditions.

Requirements:

- minimum body size of 16px for core Relawan content;
- no color-only semantic communication;
- sufficient contrast between text and background;
- support browser zoom to at least 200% without clipped controls;
- avoid long all-uppercase text;
- avoid very light font weights;
- use clear line spacing for instructions and clinical content;
- preserve visible focus states for keyboard users in Healthcare/Admin;
- pair audio alerts with visible text alerts.

---

# 8. Alignment With RAPID-MIND Interaction Model

The reduced visual palette supports the system's three role-specific experiences:

### Relawan

- mostly White / Soft Gray surfaces;
- Ink questions;
- Teal interaction;
- Slate secondary guidance;
- T0 red visible without competing decorative colors;
- T1–T3 only where triage meaning is required.

### Healthcare

- neutral workspace;
- Teal for standard actions;
- Ink and Slate for clinical records;
- T0 red reserved for emergency queue priority;
- T1–T3 appear only where clinically relevant.

### Admin

- neutral command-center shell;
- Teal filters and controls;
- subdued panels;
- T0–T3 reserved for geospatial and analytics meaning;
- surrounding UI should visually recede so map data remains dominant.

---

# 9. Final Locked Palette

## Core UI

```text
Ink       #0F172A
Teal      #0F766E
Slate     #64748B
Soft Gray #F1F5F9
White     #FFFFFF
```

## Triage Semantic Exception

```text
T0        #991B1B
T1        #C2410C
T2        #A16207
T3        #15803D
```

Optional deep T0 emphasis:

```text
T0 Deep   #7F1D1D
```

---

# 10. Current Decision Status

The following are considered locked for the next UI/UX design phase unless later usability testing requires revision:

- five-color core UI palette;
- T0–T3 semantic exception palette;
- Teal as the standard interaction color;
- Red protected for emergency/high-severity semantics;
- Inter Variable as the primary typeface;
- 16px default Relawan body text;
- 20px assessment-question text;
- restrained typography weights;
- compact typography allowed for Healthcare/Admin desktop data density.

Next design topic:

**Relawan mobile application shell and navigation.**
