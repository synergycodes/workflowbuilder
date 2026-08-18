# WB Design System — Developer Migration Changelog

## Old DS → New DS (WB 2.0)

|                                     |                                                                                                                                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Old system (production, source)** | `Dv3nOrLqTgGEU7QB2SRDSL` — _WB · UI · Design System_ — [Figma link](https://www.figma.com/design/Dv3nOrLqTgGEU7QB2SRDSL/WB---UI---Design-System)                                                                                                                     |
| **New system (target)**             | `hfT6zrYS948n8LrEK9y3Wh` — _WB 2.0 · UI · Design System_ — [Figma link](https://www.figma.com/design/hfT6zrYS948n8LrEK9y3Wh/WB-2.0---UI---Design-System--in-progress-)                                                                                               |
| **Baseline comparison**             | 2026-05-29 (variable-by-variable diff, matched by internal ID)                                                                                                                                                                                                       |
| **Revisions folded in**             | 2026-06-10 (component domain restructure, `acc1` refresh, Nav Button rebind) · 2026-06-12 (drifted `wb/canvas/*` leaf names re-aligned: `-default` suffixes restored on 10 tokens by ID — names in this document were and remain correct)                            |
| **Compiled & live-verified**        | 2026-06-12 — collection counts, mode names, collection IDs, Tokens domain breakdown, and key values re-read directly from both Figma files via the Plugin API (see Appendix — Verification log)                                                                      |
| **Status**                          | **SINGLE SOURCE OF TRUTH.** This document supersedes all prior Polish-language changelogs (`wb-ds-changelog-dev-migration.md`, `wb-ds-changelog-dev-2026-06-10.md`). In case of any discrepancy with earlier documents or mapping files, **this document prevails.** |

**Purpose.** This is the single reference for re-pointing the entire codebase (CSS variables, Style Dictionary / Tokens Studio export, component props, enums, class names) from the old design system to the new one. All mappings were verified directly in the live Figma files, variable by variable, by internal ID.

> **How to read this document.** Variable renames in Figma preserve the internal ID, which made an exact diff possible: shared ID = rename, ID only in the old file = removed, ID only in the new file = added. Section 7 is the full 1:1 rename map — the heart of the migration. All "new" names in this document are the **final names after the 2026-06-10 restructure**; you do not need to apply two rounds of renames. The `⚠` marker means the **value/appearance changes**, not just the name.

---

## 1. TL;DR — the changes that touch code

1. **Collection architecture 3 → 4.** Old: `Primitives` + `Tokens` + `Numerals`. New: `Primitives` + `Tokens` + `Canvas` + `Effects`. The `Numerals` collection (dimensions) was dissolved and split.
2. **Full Tokens taxonomy replacement.** Flat dash-joined names (`wb/txt-primary-default`) → three top-level slash-namespace domains: `wb/ui/*` (global semantics), `wb/components/*` (per-component tokens), `wb/canvas/*` (canvas/diagram elements). Every single token name changed.
3. **Status terminology unified.** `error` → `critical`, `destructive` → `critical`, `information` → `info`. Abbreviations expanded: `txt` → `text`, `ico` / `icon-txt` → `icon`. This applies to token names, component variant labels, and should be mirrored in code enums and CSS classes.
4. **`red` / `green` / `orange` palettes fully refreshed** in Primitives (new hex values) and extended from a 100–400 scale to a full 50–950 scale. This changes the appearance of **every** status token.
5. **⚠ `acc1` (brand blue) fully refreshed (2026-06-10).** Anchor `acc1-500` = **`#3969FF`** (was `#1096E7`), for WCAG AA compliance of primary actions. Changes the appearance of every primary/brand element.
6. **Single source of truth for statuses.** Functional tokens (badge, edge, node focus, icons) re-pointed from accents `acc2/acc3/acc5` to the named families `red/green/orange`. 12 tokens actually change color.
7. **New semantic brand layer `wb/ui/brand/*`** (9 tokens) — the lead color now flows through a full Component → Semantic → Primitive chain instead of components aliasing `acc1` directly.
8. **`input` component → `text-field`; chips rebuilt as a "factory"** (the per-accent `chips-acc1..5-*` matrix is gone).
9. **Shadows and focus rings moved to the `Effects` collection** plus Effect Styles in a slash hierarchy (`shadow/ui/*`, `shadow/canvas/*`). The single `wb/shadow` token no longer exists.
10. **Typography rebuilt** — from `Heading/H1..12` + `Paragraph/P1..12` to a Material-3-style ramp (`Display / Headline / Title / Body / Label / Node` × `Emphasized`). No name or ID continuity; manual remapping required.

---

## 2. The numbers

| Collection / asset   | Old               | New (verified 2026-06-12)                                     | Delta                      |
| -------------------- | ----------------- | ------------------------------------------------------------- | -------------------------- |
| Primitives           | 154 (colors only) | 264 (colors + dimensions + `transparent`)                     | +110                       |
| Tokens (Light/Dark)  | 207               | 200 — `wb/ui/*` 55 · `wb/components/*` 105 · `wb/canvas/*` 40 | −7                         |
| Numerals             | 316               | — (dissolved)                                                 | −316                       |
| Canvas (dimensions)  | —                 | 56                                                            | +56                        |
| Effects (Light/Dark) | —                 | 29                                                            | +29                        |
| Text Styles          | 38                | 39                                                            | +1 (full name replacement) |
| Effect Styles        | 10                | 10                                                            | 0 (renamed)                |

**Change volume in Tokens:** 146 renames (2026-05-29 taxonomy) + 103 restructured paths (2026-06-10) · 61 removed by ID (+3 more on 2026-06-10) · 52 added by ID (+5 Nav Button backgrounds on 2026-06-10).

---

## 3. Collection architecture

### Old layout

```
Primitives (154, 1 mode)        → colors only (gray, blue, green, orange, red, acc1–acc5)
Tokens     (207, Light/Dark)    → semantic color layer, flat dash-joined names
Numerals   (316, 1 mode)        → dimensions: 266× token-spacing/token-radius with values
                                   baked per component (e.g. button-xl-h-pad-1) + 50 primitives
```

### New layout

```
Primitives (264, "Mode 1")      → colors (full 50–950 scales) + dimension primitives
                                   (space/*, radius/*, size/*, font-size/*) + transparent
Tokens     (200, Light/Dark)    → color semantics in three domains:
                                     wb/ui/*          = global foundations + brand layer
                                     wb/components/*  = per-component tokens
                                     wb/canvas/*      = canvas elements (node, port, edge, badge…)
Canvas     (56, "value")        → canvas element dimensions (node/port/edge/widget) → space/radius/size
Effects    (29, light/dark)     → shadow geometry components (x/y/blur/spread) + 1 shadow color
```

**Collection IDs (verified 2026-06-12):**

| Collection | Old file                         | New file                                                        |
| ---------- | -------------------------------- | --------------------------------------------------------------- |
| Primitives | `VariableCollectionId:17:332`    | `VariableCollectionId:17:332` _(same — the new file is a fork)_ |
| Tokens     | `VariableCollectionId:17:391`    | `VariableCollectionId:17:391` _(same)_                          |
| Numerals   | `VariableCollectionId:2666:3363` | — (dissolved)                                                   |
| Canvas     | —                                | `VariableCollectionId:7266:20`                                  |
| Effects    | —                                | `VariableCollectionId:9126:20`                                  |

**Implication for code:** if your build exports variables per collection (Style Dictionary / Tokens Studio / custom export), add two new sources (`Canvas`, `Effects`) and remove `Numerals`. The `Primitives` and `Tokens` collection IDs are identical in both files (see table above), which helps diffing — but every variable name changed regardless.

**Architectural rule worth knowing:** `wb/canvas/*` tokens alias **directly to Primitives**, deliberately bypassing the `wb/ui/*` semantic layer. The canvas is allowed to evolve independently of the UI. Do not "normalize" canvas tokens through UI semantics in code.

---

## 4. Naming conventions and terminology (find-replace rules)

| Rule                | Old                                     | New                                                                                                                          |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Domain              | none                                    | `wb/ui/*` (UI), `wb/components/*` (components), or `wb/canvas/*` (canvas)                                                    |
| Hierarchy separator | flat dash                               | slash namespace                                                                                                              |
| Component tokens    | `wb/{component}-*`                      | `wb/components/{component}/*`                                                                                                |
| Text                | `txt`                                   | `text`                                                                                                                       |
| Icon                | `ico`, `icon-txt`                       | `icon`                                                                                                                       |
| Error status        | `error`                                 | `critical`                                                                                                                   |
| Destructive action  | `destructive`                           | `critical`                                                                                                                   |
| Info status         | `information`                           | `info`                                                                                                                       |
| Text hierarchy      | `primary/secondary/tertiary/quaternary` | roles: `default/subtle/muted/ghost`                                                                                          |
| Backgrounds         | `ui-bg-primary/secondary/tertiary`      | `ui/bg/base/elevated/inset`                                                                                                  |
| Input               | `input-*`                               | `text-field-*`                                                                                                               |
| Pin tooltip / tour  | `pt-*`                                  | `tour/*`                                                                                                                     |
| Button leaf         | `{variant}-{color}-bg-{state}`          | nested path `{variant}/{color}/{state}` (fill is the default role; non-fill roles named explicitly, e.g. `…/stroke-default`) |

Additional rules:

- **`-default` suffixes are kept system-wide** (deliberate decision for searchability). `no suffix = default state` is _not_ the convention here — `default` is always explicit on default-state tokens within stateful families (single-state role tokens like `canvas/node/icon-primary`, `canvas/node/text`, `canvas/node/decor-primary` carry no state suffix by design). _Note: a temporary drift was detected on 2026-06-12 — ten `wb/canvas/_`default-state tokens had lost their`-default` suffix in the file; restored by ID the same day. If any token export was generated from the drifted state, regenerate it.\*
- Leaf names are flat and dash-joined (`ui/icon/action-default`, not `ui/icon/action/default`).
- **Typo cleanup:** the old system contains a misspelled token `wb/txt-destuctive-default` (missing "r") — `VariableID:1592:58782`, Tokens collection, old file. Verified **still present under the misspelled name on 2026-06-12**; a manual in-place rename to `wb/txt-destructive-default` is scheduled (rename preserves the ID, so both spellings are the same token). Whichever spelling your legacy export carries, it was a **duplicate of `wb/txt-error-default`** and has **no counterpart in the new system** — it merged into `wb/ui/text/critical-default`. Remove the key from code either way. The new file contains zero occurrences of either spelling (verified).
- For the 2026-06-10 restructure specifically, two global transforms cover almost everything: `wb/ui/components/` → `wb/components/` (all component tokens) and the button leaf transformation above. If you had already started consuming the interim `wb.ui.components.*` paths, re-point them.

---

## 5. Primitives — color value changes

This is the most important section for visual regression: changing a hex in Primitives **propagates to every aliasing token**, even when that token itself was never touched.

### 5.1 `red` / `green` / `orange` refresh ⚠ BREAKING (visually)

The old palettes were narrow (100–400) with muted hexes. The new ones are full 50–950 scales in the Tailwind/M3 style, with more vivid bases.

| Primitive    | Old hex           | New hex               |
| ------------ | ----------------- | --------------------- |
| `red-400`    | `#962929` (brick) | `#e02020` (vivid red) |
| `red-500`    | `#7d0000`         | `#c41a1a`             |
| `red-100`    | `#f7e9e9`         | `#fee2e2`             |
| `green-400`  | `#007c29`         | `#16a34a`             |
| `green-300`  | `#29974e`         | `#4ade80`             |
| `green-100`  | `#e9f7ee`         | `#dcfce7`             |
| `orange-400` | `#e59800`         | `#f59e0b`             |
| `orange-300` | `#ffaf10`         | `#fcd34d`             |
| `orange-100` | `#f7f2e9`         | `#fef3c7`             |

- `red`, `green`, `orange` extended to the full scale **50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950** (previously only 100–400 for green/orange, 100–600 for red).
- `blue` extended to **50–950** (was 100–600 + 350).

### 5.2 `acc1` (brand blue) refresh ⚠ BREAKING (visually) — revision 2026-06-10

**Motivation:** the old `acc1-500` (`#1096E7`) gave a white-text contrast of **3.21 — below WCAG AA** for normal text, so the default state of the primary button was inaccessible. The new palette is anchored at `acc1-500` = **`#3969FF`** (white text 4.53 ✓ AA). The primary button now passes full AA on default/hover/active **without shifting the ramp** (`brand/fill*` still aliases 500/600/700).

| Primitive  | Old hex   | New hex   | White-text contrast (new) |
| ---------- | --------- | --------- | ------------------------- |
| `acc1-50`  | `#F0F8FF` | `#EDF2FF` | — (tints)                 |
| `acc1-100` | `#E0F0FE` | `#CCD9FF` | —                         |
| `acc1-200` | `#BBE2FC` | `#99B3FF` | —                         |
| `acc1-300` | `#5FBEFA` | `#6B90FF` | 2.98                      |
| `acc1-400` | `#3AB0F6` | `#527DFF` | 3.66 (AA-large)           |
| `acc1-500` | `#1096E7` | `#3969FF` | **4.53 ✓ AA**             |
| `acc1-600` | `#0477C5` | `#144CF5` | **6.21 ✓ AA**             |
| `acc1-700` | `#045FA0` | `#0F3FCC` | **8.07 ✓ AA**             |
| `acc1-800` | `#085184` | `#11349C` | 10.53 (AAA)               |
| `acc1-900` | `#0D446D` | `#132C76` | 12.73 (AAA)               |
| `acc1-950` | `#092B48` | `#111F4B` | 15.89 (AAA)               |

Alpha variants follow the base (alpha preserved): `acc1-500-{10,20,30,40,50}` → `#3969FF` at the respective opacity; `acc1-950-{10..50}` → `#111F4B`. **21 value changes in total.** Names and IDs are unchanged — this is a pure value change.

**Propagation:** everything aliasing `acc1` directly or via `brand/*` — solid and ghost primary buttons, `text/action`, `text/info`, `icon/info`, `stroke/info`, focus rings (`acc1-500-40`), datepicker primary, chips `inset-outline`, info tooltip, logo (`brand/identity`). Bonus: `#3969FF` as link text on white also passes AA at 4.53.

**Visual regression required:** Buttons (solid + ghost primary), Text field focus, Datepicker, UI element focus rings, logo/identity, links.

### 5.3 New alpha steps and helpers (Added)

- `red-400-40` `#e0202066`, `green-400-40` `#16a34a66`, `orange-400-40` `#f59e0b66` — 40% alpha, used by node focus rings (so they alias named families, not accents).
- `gray-100-85` `#ffffffd9` — used by chips `overlay-outline`.
- Full alpha series for `green/orange/red-400-{10,20,30,50}` and `acc3/acc4/acc5-950-{10..50}`.
- `wb/colors/transparent` `rgba(0,0,0,0)` (2026-06-10) — reusable transparency primitive, used by no-fill component states (e.g. Nav Button default/disabled backgrounds). In CSS: `background: transparent`.

### 5.4 Value fixes

- `gray-900-75` corrected `#07070880` → `#070708bf` (the old value was bugged — 75% was actually 50%).

### 5.5 `acc2–acc5` unchanged

`acc2–acc5` values are untouched, but `acc2/acc3/acc5` **stop feeding status tokens** — they remain only in `canvas/widget-swatches/*`.

---

## 6. Status colors — single source of truth ⚠ (color change in 12 tokens)

The most important semantic change. In the old system the same status had two sources in Primitives (e.g. critical = `red-*` in some tokens, `acc2-*` in others — different hexes). In the new system, `critical/success/warning` alias **exclusively** to `red/green/orange`.

| Token (new name)                            | Old alias           | New alias        |
| ------------------------------------------- | ------------------- | ---------------- |
| `wb/canvas/badge-notify/critical-icon`      | `acc2-50`           | `red-50`         |
| `wb/canvas/badge-notify/success-bg-default` | `acc3-500`          | `green-500`      |
| `wb/canvas/badge-notify/success-icon`       | `acc3-50`           | `green-50`       |
| `wb/canvas/badge-notify/warning-bg-default` | `acc5-500`          | `orange-500`     |
| `wb/canvas/badge-notify/warning-icon`       | `acc5-50`           | `orange-50`      |
| `wb/canvas/edge/stroke-success`             | `acc3-500/400`      | `green-500/400`  |
| `wb/canvas/edge/stroke-warning`             | `acc5-500/400`      | `orange-500/400` |
| `wb/canvas/node/focus-critical`             | `acc2-500-40`       | `red-400-40`     |
| `wb/canvas/node/focus-success`              | `acc3-500-40`       | `green-400-40`   |
| `wb/canvas/node/focus-warning`              | `acc5-500-40`       | `orange-400-40`  |
| `wb/ui/icon/success-default`                | `acc3-600/500`      | `green-400/100`  |
| `wb/ui/icon/warning-default`                | `acc5-500/acc5-400` | `orange-400/100` |

---

## 7. Tokens — full rename map (OLD NAME → FINAL NEW NAME)

> General rule: renames were done by ID, so bindings inside the Figma components migrated automatically. **In code you must re-point manually.** Where the value also changes (via sections 5–6), the row carries `⚠`. All target names below are the final, post-2026-06-10 names.

### 7.1 Foundations — Text (`txt-*` → `ui/text/*`)

| Old                             | New                                                                   |
| ------------------------------- | --------------------------------------------------------------------- |
| `wb/txt-primary-default`        | `wb/ui/text/default`                                                  |
| `wb/txt-primary-inverse`        | `wb/ui/text/inverse-default`                                          |
| `wb/txt-primary-disabled`       | `wb/ui/text/disabled` ⚠ _(Light: `gray-100-75` → `gray-900-30`, fix)_ |
| `wb/txt-primary-white`          | `wb/ui/text/onaccent-default`                                         |
| `wb/txt-secondary-default`      | `wb/ui/text/subtle-default`                                           |
| `wb/txt-secondary-inverse`      | `wb/ui/text/inverse-subtle-default`                                   |
| `wb/txt-tertiary-default`       | `wb/ui/text/muted-default`                                            |
| `wb/txt-quaternary-default`     | `wb/ui/text/ghost-default`                                            |
| `wb/txt-tooltip-bw`             | `wb/ui/text/tooltip-default`                                          |
| `wb/txt-tooltip-blue`           | `wb/ui/text/tooltip-accent-default`                                   |
| `wb/txt-ghost-primary-default`  | `wb/ui/text/action-default` ⚠ _(brand `#3969FF`)_                     |
| `wb/txt-ghost-primary-disabled` | `wb/ui/text/action-disabled`                                          |
| `wb/txt-error-default`          | `wb/ui/text/critical-default` ⚠ _(red refreshed)_                     |
| `wb/txt-destructive-disabled`   | `wb/ui/text/critical-disabled`                                        |
| `wb/txt-success-default`        | `wb/ui/text/success-default` ⚠ _(green refreshed)_                    |
| `wb/txt-ghost-success-disabled` | `wb/ui/text/success-disabled`                                         |
| `wb/txt-info-default`           | `wb/ui/text/info-default` ⚠ _(acc1 refreshed)_                        |
| `wb/txt-warning-default`        | `wb/ui/text/warning-default` ⚠ _(orange refreshed)_                   |
| `wb/txt-ghost-warning-disabled` | `wb/ui/text/warning-disabled`                                         |

### 7.2 Foundations — Icon (`icon-*` → `ui/icon/*`)

| Old                       | New                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `wb/icon-primary-default` | `wb/ui/icon/action-default`                                                                                                                 |
| `wb/icon-txt-default`     | `wb/ui/icon/default` _(via interim `onsurface-default`, merged 2026-06-10; codeSyntax `--wb-icon-txt-default` now lives on `icon/default`)_ |
| `wb/icon-txt-inverse`     | `wb/ui/icon/inverse-default`                                                                                                                |
| `wb/icon-disabled`        | `wb/ui/icon/disabled`                                                                                                                       |
| `wb/icon-error-default`   | `wb/ui/icon/critical-default` ⚠ _(acc2 → red)_                                                                                              |
| `wb/icon-success-default` | `wb/ui/icon/success-default` ⚠ _(acc3 → green)_                                                                                             |
| `wb/icon-warning-default` | `wb/ui/icon/warning-default` ⚠ _(acc5 → orange)_                                                                                            |

### 7.3 Foundations — Stroke / Background / Focus

| Old                               | New                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `wb/ui-stroke-primary-default`    | `wb/ui/stroke/default`                                                         |
| `wb/ui-stroke-secondary-default`  | `wb/ui/stroke/subtle`                                                          |
| `wb/ui-stroke-primary-focus`      | `wb/ui/stroke/focus` ⚠ _(acc1 refreshed)_                                      |
| `wb/ui-stroke-primary-highlight`  | `wb/ui/stroke/highlight`                                                       |
| `wb/ui-separator-primary-default` | `wb/ui/stroke/divider`                                                         |
| `wb/ui-bg-primary-default`        | `wb/ui/bg/base`                                                                |
| `wb/ui-bg-secondary-default`      | `wb/ui/bg/elevated`                                                            |
| `wb/ui-bg-tertiary-default`       | `wb/ui/bg/inset`                                                               |
| `wb/ui-canvas-dots-default`       | `wb/ui/bg/canvas-dots`                                                         |
| `wb/ui-bg-tertiary-selected`      | `wb/components/selector/fill-checked`                                          |
| `wb/focus-ring-element`           | `wb/ui/focus-ring` _(flattened single token, 2026-06-10)_ ⚠ _(acc1 refreshed)_ |

### 7.4 Button — solid (`button-{primary,gray,red,green,orange}-*`)

> Color → status mapping: `red → critical`, `green → success`, `orange → warning`. **Disabled state consolidated**: four separate disabled tokens (`primary/gray/red/green`) → one shared `solid/disabled`. The shared disabled sits at the variant level, not the color level — intentional.

| Old                                                         | New                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `wb/button-primary-bg-{default,hover,active,focus,loading}` | `wb/components/button/solid/primary/{default,hover,active,focus,loading}` ⚠ _(acc1 `#3969FF`)_ |
| `wb/button-primary-bg-disabled`                             | `wb/components/button/solid/disabled`                                                          |
| `wb/button-gray-bg-{default,hover,active,focus,loading}`    | `wb/components/button/solid/gray/{…}`                                                          |
| `wb/button-gray-bg-disabled`                                | `wb/components/button/solid/disabled` _(consolidated)_                                         |
| `wb/button-red-bg-{default,hover,active,focus,loading}`     | `wb/components/button/solid/critical/{…}` ⚠                                                    |
| `wb/button-red-bg-disabled`                                 | `wb/components/button/solid/disabled` _(consolidated)_                                         |
| `wb/button-green-bg-{default,hover,active,focus,loading}`   | `wb/components/button/solid/success/{…}` ⚠                                                     |
| `wb/button-green-bg-disabled`                               | `wb/components/button/solid/disabled` _(consolidated)_                                         |
| `wb/button-orange-bg-{default,hover,active,focus,loading}`  | `wb/components/button/solid/warning/{…}` ⚠                                                     |

⚠ **Solid critical/success/warning color logic changed.** Old `button-green-bg-default` = `green-300`, hover = `green-400`. New `solid/success/default` = `green-500`, hover = `green-600`, active = `green-700` — full saturation plus correct darkening across states. Critical (`red-500/600/700`) and warning (`orange-500/600/700`) follow the same pattern. Button appearance changes noticeably.

### 7.5 Button — ghost (`button-ghost-{primary,success,warning,destructive}-*`)

| Old                                                                        | New                                                                                                                                           |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `wb/button-ghost-primary-bg-{default,hover,active,focus,loading,disabled}` | `wb/components/button/ghost/primary/{default,hover,active,focus,loading,disabled}` ⚠ _(primary now flows through `brand/_`, acc1 refreshed)\* |
| `wb/button-ghost-primary-stroke-default`                                   | `wb/components/button/ghost/primary/stroke-default` ⚠                                                                                         |
| `wb/button-ghost-success-bg-{…}`                                           | `wb/components/button/ghost/success/{…}`                                                                                                      |
| `wb/button-ghost-success-stroke-default`                                   | `wb/components/button/ghost/success/stroke-default`                                                                                           |
| `wb/button-ghost-warning-bg-{…}`                                           | `wb/components/button/ghost/warning/{…}`                                                                                                      |
| `wb/button-ghost-warning-stroke-default`                                   | `wb/components/button/ghost/warning/stroke-default`                                                                                           |
| `wb/button-ghost-destructive-bg-{…}`                                       | `wb/components/button/ghost/critical/{…}`                                                                                                     |
| `wb/button-ghost-destructive-stroke-default`                               | `wb/components/button/ghost/critical/stroke-default`                                                                                          |

In Style Dictionary terms, the button moved from a flat string to a nested structure: `wb.button-primary-bg-loading` → `wb.components.button.solid.primary.loading`.

### 7.6 Input → Text Field

| Old                               | New                                                          |
| --------------------------------- | ------------------------------------------------------------ |
| `wb/input-stroke-primary-default` | `wb/components/text-field/stroke-default`                    |
| `wb/input-stroke-primary-focus`   | `wb/components/text-field/stroke-focus` ⚠ _(acc1 refreshed)_ |
| `wb/input-stroke-primary-error`   | `wb/components/text-field/stroke-critical` ⚠                 |
| `wb/input-stroke-primary-success` | `wb/components/text-field/stroke-success` ⚠                  |
| `wb/input-bg-primary-error`       | `wb/components/text-field/bg-primary-critical` ⚠             |
| `wb/input-bg-primary-success`     | `wb/components/text-field/bg-primary-success` ⚠              |

### 7.7 Other UI components

| Old                                                                  | New                                                                                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `wb/nav-button-bg-primary-hover`                                     | `wb/components/nav-button/bg-primary-hover` _(see section 10 — this one old token split into three new state tokens)_ |
| `wb/nav-button-icon-primary-{default,hover,active,pressed,disabled}` | `wb/components/nav-button/icon-primary-{…}` ⚠ _(pressed: brand `#3969FF`)_                                            |
| `wb/snackbar-bg-information`                                         | `wb/components/snackbar/bg-info`                                                                                      |
| `wb/snackbar-bg-warning`                                             | `wb/components/snackbar/bg-warning`                                                                                   |
| `wb/snackbar-bg-success`                                             | `wb/components/snackbar/bg-success`                                                                                   |
| `wb/snackbar-bg-error`                                               | `wb/components/snackbar/bg-critical`                                                                                  |
| `wb/dropzone-bg-{default,hover,dragging}`                            | `wb/components/dropzone/bg-{default,hover,dragging}`                                                                  |
| `wb/dropzone-bg-error`                                               | `wb/components/dropzone/bg-critical`                                                                                  |
| `wb/dropzone-stroke-{default,hover,dragging}`                        | `wb/components/dropzone/stroke-{…}`                                                                                   |
| `wb/dropzone-stroke-error`                                           | `wb/components/dropzone/stroke-critical`                                                                              |
| `wb/dropdown-bg-primary-default`                                     | **removed** → use `wb/ui/bg/base` _(dropdown panels)_                                                                 |
| `wb/dropdown-bg-secondary-default`                                   | **removed** → use `wb/ui/bg/inset` _(embedded options)_                                                               |
| `wb/tooltip-bg-default`                                              | `wb/components/tooltip/bg-default`                                                                                    |
| `wb/tooltip-bg-blue`                                                 | `wb/components/tooltip/bg-info` _(no more literal color in the name)_ ⚠ _(acc1 refreshed)_                            |
| `wb/pt-bg-primary-default`                                           | `wb/components/tour/bg-primary-default`                                                                               |
| `wb/pt-stroke-primary-default`                                       | `wb/components/tour/stroke-default`                                                                                   |
| `wb/tab-stroke-{default,hover,active}`                               | `wb/components/tab/stroke-{…}`                                                                                        |
| `wb/avatar-fill-default`                                             | `wb/components/avatar/fill-default`                                                                                   |
| `wb/avatar-stroke-default`                                           | `wb/components/avatar/stroke-default`                                                                                 |
| `wb/datepicker-bg-primary`                                           | `wb/components/datepicker/bg-primary` ⚠ _(acc1-600 → acc1-500, plus acc1 refreshed)_                                  |
| `wb/datepicker-bg-secondary`                                         | `wb/components/datepicker/bg-secondary`                                                                               |
| `wb/scrollbar-bg-default`                                            | `wb/components/scrollbar/bg-default`                                                                                  |
| `wb/chips-neutral-txt`                                               | `wb/components/chips/solid-text`                                                                                      |

### 7.8 Canvas — badge-notify, widget-swatches, node focus

> These three groups were **moved into the `canvas/*` domain** (IDs preserved, so it's a rename, not a rebuild). Terminology: `error → critical`, `ico → icon`.

| Old                                   | New                                                |
| ------------------------------------- | -------------------------------------------------- |
| `wb/badge-notify-error-bg-default`    | `wb/canvas/badge-notify/critical-bg-default`       |
| `wb/badge-notify-error-ico-default`   | `wb/canvas/badge-notify/critical-icon` ⚠           |
| `wb/badge-notify-success-bg-default`  | `wb/canvas/badge-notify/success-bg-default` ⚠      |
| `wb/badge-notify-success-ico-default` | `wb/canvas/badge-notify/success-icon` ⚠            |
| `wb/badge-notify-warning-bg-default`  | `wb/canvas/badge-notify/warning-bg-default` ⚠      |
| `wb/badge-notify-warning-ico-default` | `wb/canvas/badge-notify/warning-icon` ⚠            |
| `wb/widget-swatches-acc1..6`          | `wb/canvas/widget-swatches/acc1..6`                |
| `wb/focus-ring-node-active`           | `wb/canvas/node/focus-active` ⚠ _(acc1 refreshed)_ |
| `wb/focus-ring-node-error`            | `wb/canvas/node/focus-critical` ⚠                  |
| `wb/focus-ring-node-success`          | `wb/canvas/node/focus-success` ⚠                   |
| `wb/focus-ring-node-warning`          | `wb/canvas/node/focus-warning` ⚠                   |

---

## 8. Tokens — removed (64) and their replacements

> Some of these are a **rebuild in the `canvas/*` domain** (old IDs deleted, new ones created). Functional continuity is preserved, but both the name **and the ID** changed — in code, treat them as a rename plus a possible value change.

### 8.1 Canvas: node / port / edge — rebuilt as `canvas/*` (Removed → re-created)

| Old token (removed)                                  | New equivalent (created)                    |
| ---------------------------------------------------- | ------------------------------------------- |
| `wb/node-bg-primary-{default,hover,active,disabled}` | `wb/canvas/node/bg-primary-{…}`             |
| `wb/node-bg-secondary-default`                       | `wb/canvas/node/bg-secondary-default`       |
| `wb/node-stroke-primary-{default,hover}`             | `wb/canvas/node/stroke-{default,hover}`     |
| `wb/node-icon-primary-default`                       | `wb/canvas/node/icon-primary`               |
| `wb/node-icon-primary-disabled`                      | _(none — handled by `wb/ui/icon/disabled`)_ |
| `wb/node-txt-disabled`                               | `wb/canvas/node/text-disabled`              |
| `wb/node-port-fill-{default,active}`                 | `wb/canvas/port/fill-{default,active}`      |
| `wb/node-port-stroke-{default,active}`               | `wb/canvas/port/stroke-{default,active}`    |
| `wb/edge-primary-default`                            | `wb/canvas/edge/stroke-default`             |
| `wb/edge-primary-hover`                              | `wb/canvas/edge/stroke-hover`               |
| `wb/edge-primary-active`                             | `wb/canvas/edge/stroke-active`              |
| `wb/edge-primary-disabled`                           | `wb/canvas/edge/stroke-disabled`            |
| `wb/edge-primary-error`                              | `wb/canvas/edge/stroke-critical` ⚠          |
| `wb/edge-primary-success`                            | `wb/canvas/edge/stroke-success` ⚠           |
| `wb/edge-primary-warning`                            | `wb/canvas/edge/stroke-warning` ⚠           |

New additions in `canvas/node/*` on top of the rebuild: `bg-content-default`, `text` (default), `text-subtle`, `decor-primary` (see section 9).

### 8.2 Chips — full rebuild as a "factory" (Removed)

The entire old per-accent matrix is gone: `chips-neutral-{bg,icon,x}` + `chips-acc1..5-{bg,stroke,txt,icon,x}` (28 variables). Only `chips-neutral-txt` survives, renamed to `chips/solid-text`. The new model (section 9.3) is 4 tokens: `solid`, `solid-text`, `overlay-outline`, `inset-outline`, with accent color composed via mix/accent at the component level. **This is a breaking change for any code that references `chips-accN-*` — chip coloring logic must be rebuilt.**

### 8.3 Other removals

| Removed token                                                                                                                             | Reason / replacement                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wb/shadow`                                                                                                                               | moved to the **Effects** collection → `wb/shadow/ui/color`                                                                                                                     |
| `wb/snackbar-bg-default`                                                                                                                  | neutral snackbar now uses a foundation background; separate `snackbar/stroke-*` tokens were added                                                                              |
| `wb/tab-stroke-line`                                                                                                                      | removed (tab line via `wb/ui/stroke/*`)                                                                                                                                        |
| `wb/icon-black`, `wb/icon-white`                                                                                                          | removed (literal colors; use `wb/ui/icon/default` / `onaccent`)                                                                                                                |
| `wb/dropdown-bg-destructive-default`, `…-hover`                                                                                           | removed (destructive dropdown variant retired)                                                                                                                                 |
| `wb/dropdown-bg-secondary-active`                                                                                                         | removed                                                                                                                                                                        |
| `wb/button-gray-bg-disabled`, `wb/button-green-bg-disabled`, `wb/button-red-bg-disabled`                                                  | consolidated into `wb/components/button/solid/disabled`                                                                                                                        |
| `wb/txt-destuctive-default` _(ID `1592:58782`; manual rename to `wb/txt-destructive-default` pending — same token under either spelling)_ | typo-duplicate of `txt-error-default`, merged into `wb/ui/text/critical-default`                                                                                               |
| `wb/dropdown-bg-primary-default`, `wb/dropdown-bg-secondary-default` _(2026-06-10)_                                                       | pass-through tokens deleted after re-pointing all consumers — panels → `wb/ui/bg/base`, embedded options → `wb/ui/bg/inset`. **Do not introduce `dropdown/*` keys into code.** |
| `wb/ui/icon/onsurface-default` _(2026-06-10)_                                                                                             | redundant duplicate of `wb/ui/icon/default` (same value and role) — merged; legacy `icon-txt-default` maps to `wb/ui/icon/default`                                             |

---

## 9. Tokens — added (57)

### 9.1 Semantic brand layer `wb/ui/brand/*` (9, NEW)

The missing link for the lead color. Primary components now alias `brand/*`, not `acc1` directly. This is a thin, role-named abstraction — if the brand color ever changes again, only the `brand/*` aliases move.

| Token                            | Alias         | Role                                                                                                        |
| -------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| `wb/ui/brand/fill`               | `acc1-500`    | primary surface (default)                                                                                   |
| `wb/ui/brand/fill-hover`         | `acc1-600`    | primary hover                                                                                               |
| `wb/ui/brand/fill-active`        | `acc1-700`    | primary pressed                                                                                             |
| `wb/ui/brand/fill-subtle`        | `acc1-500-10` | ghost-primary background                                                                                    |
| `wb/ui/brand/fill-subtle-hover`  | `acc1-500-20` | ghost hover                                                                                                 |
| `wb/ui/brand/fill-subtle-active` | `acc1-500-30` | ghost pressed                                                                                               |
| `wb/ui/brand/border`             | `acc1-500`    | primary outline/accent                                                                                      |
| `wb/ui/brand/text-on`            | `gray-100`    | text on brand surface (mode-independent; verified AA on all primary button states after the `acc1` refresh) |
| `wb/ui/brand/identity`           | `acc1-500`    | logo / brand identity                                                                                       |

### 9.2 UI foundations (NEW)

- `wb/ui/bg/app` (`gray-200`/`gray-900`) — application background (new level).
- `wb/ui/bg/canvas` (`gray-100`/`gray-800`) — canvas background.
- `wb/ui/bg/fill-{default,hover,active,disabled}` — interactive fills (new family).
- `wb/ui/icon/default` (`gray-900`/`gray-100`) — default icon color.
- `wb/ui/icon/subtle-default` (`gray-500`) — subtle icon.
- `wb/ui/icon/info-default` (`acc1-800`/`acc1-300`) — info icon.
- `wb/ui/stroke/info` (`acc1-500`/`acc1-400`), `wb/ui/stroke/warning` (`orange-300`/`orange-100`).

### 9.3 Chips factory (NEW)

- `wb/components/chips/solid` (`gray-300`/`gray-650`)
- `wb/components/chips/overlay-outline` (`gray-100-85`/`gray-900-75`) — for chips placed over imagery
- `wb/components/chips/inset-outline` (`→ brand/border`) — Outline variant stroke and label/icon accent
- (`chips/solid-text` is the renamed `chips-neutral-txt`)

### 9.4 Snackbar strokes (NEW)

- `wb/components/snackbar/stroke-{default,info,warning,success,critical}` — the old snackbar only had backgrounds; outlines are new.

### 9.5 Canvas — node / port / edge (NEW by ID)

24 `canvas/node/*`, `canvas/port/*`, `canvas/edge/*` tokens — the rebuild of old `node-*`/`edge-*` (section 8.1) plus genuinely new ones: `canvas/node/bg-content-default`, `canvas/node/text`, `canvas/node/text-subtle`, `canvas/node/decor-primary`.

### 9.6 Nav Button state set (NEW, 2026-06-10)

| Token                                          | Light →                | Dark →                 | Scopes                   |
| ---------------------------------------------- | ---------------------- | ---------------------- | ------------------------ |
| `wb/components/nav-button/bg-primary-default`  | `→ colors/transparent` | `→ colors/transparent` | `FRAME_FILL, SHAPE_FILL` |
| `wb/components/nav-button/bg-primary-pressed`  | `→ gray-900-5`         | `→ gray-100-5`         | `FRAME_FILL, SHAPE_FILL` |
| `wb/components/nav-button/bg-primary-active`   | `→ ui/brand/fill`      | `→ ui/brand/fill`      | `FRAME_FILL, SHAPE_FILL` |
| `wb/components/nav-button/bg-primary-focus`    | `→ gray-900-5`         | `→ gray-100-5`         | `FRAME_FILL, SHAPE_FILL` |
| `wb/components/nav-button/bg-primary-disabled` | `→ colors/transparent` | `→ colors/transparent` | `FRAME_FILL, SHAPE_FILL` |

The pre-existing `bg-primary-hover` completes the set — all 6 background states are now tokenized: default · hover · pressed · active · focus · disabled, alongside the 5 icon states (`icon-primary-{default,hover,active,pressed,disabled}`; Focus reuses `icon-primary-default` deliberately). Note: `bg-primary-pressed` and `bg-primary-focus` currently share the hover value (`gray-900-5`) — a candidate for differentiation, pending design decision.

---

## 10. Nav Button — legacy remote bindings → local tokens (2026-06-10)

The Nav Button component in the new file was discovered still hanging on **remote variables from the old, legacy DS library** (flat names). All 402 bindings are now local (0 remote). For code that consumed the old flat names, the mapping is **state-dependent**, because one old variable served three states:

| Legacy (old DS, remote)                                              | → New local token                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `wb/nav-button-icon-primary-default`                                 | `wb/components/nav-button/icon-primary-default`                       |
| `wb/nav-button-icon-primary-hover`                                   | `wb/components/nav-button/icon-primary-hover`                         |
| `wb/nav-button-icon-primary-active`                                  | `wb/components/nav-button/icon-primary-active`                        |
| `wb/nav-button-icon-primary-pressed`                                 | `wb/components/nav-button/icon-primary-pressed` ⚠ _(brand `#3969FF`)_ |
| `wb/nav-button-icon-primary-disabled`                                | `wb/components/nav-button/icon-primary-disabled`                      |
| `wb/nav-button-bg-primary-hover` _(Hover state)_                     | `wb/components/nav-button/bg-primary-hover`                           |
| `wb/nav-button-bg-primary-hover` _(Pressed state)_                   | `wb/components/nav-button/bg-primary-pressed`                         |
| `wb/nav-button-bg-primary-hover` _(Focus state)_                     | `wb/components/nav-button/bg-primary-focus`                           |
| `wb/button-primary-bg-default` _(Active background)_                 | `wb/components/nav-button/bg-primary-active` ⚠ _(brand `#3969FF`)_    |
| `wb/ui-bg-primary-default` _(white focus inner ring)_                | `wb/ui/bg/base`                                                       |
| `wb/pt-stroke-primary-default` _(focus ring, "No background" style)_ | `wb/ui/stroke/focus`                                                  |

**Visual changes (intended):** Active background and Pressed icon now use the new brand `#3969FF` instead of the stale legacy `#1096E7`. All other states changed source only (remote → local) with identical results. Placeholder icon fills (`#ffffff`) inside the swap slot remain unbound on purpose — a real icon brings its own color; do not treat them as Nav Button tokens.

> ⚠ **Watch-out for other components:** the same legacy-remote binding pattern may exist elsewhere in the file. A file-wide remote-binding audit is recommended before/while migrating each component.

---

## 11. Dimensions — Numerals → Primitives + Canvas

The old `Numerals` collection (316 variables: `token-spacing/*` and `token-radius/*` with values baked per component, e.g. `button-xl-h-pad-1`, plus 50 primitives) was **dissolved** and replaced with a two-layer model:

### 11.1 Dimension primitives in `Primitives` (NEW)

The naming is centesimal: **100 = 8px** (base of the scale), so `space-50` = 4px, `space-200` = 16px, etc.

- `wb/space/*` — scale: 0, 25 (2px), 37, 50 (4px), 62, 75, 87, 100 (8px), 112, 125, 137, 150, 175, 200 (16px), 250 (20px), 300, 400, 500, 600, 700 (56px), 800, 1000, 1200, plus `negative-{50,100,200}`. Scope: `GAP`.
  - The off-grid steps (`62/87/112/125/137`) are retained deliberately — they serve canvas zoom-level math. Do not round them to the grid.
- `wb/radius/*` — 0, 25, 50, 75, 100, 125, 150, 200, 250, 300, `full` (9999). Scope: `CORNER_RADIUS`.
- `wb/size/*` — 12 (1px), 25, 37, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 1000, 1200, 1600. Scope: `WIDTH_HEIGHT`.
- `wb/font-size/*` — 125 (10px) … 450 (36px).

There is no "Semantic Numerals" tier and there are no density modes — this is a deliberately primitive-only dimension scale.

### 11.2 `Canvas` collection (56, NEW) — canvas element dimensions

Dimension tokens for `node/port/edge/widget`, aliasing `space/*`, `radius/*`, `size/*`. All 56 variables are FLOAT (verified — no color variables in this collection; canvas colors live in `Tokens → wb/canvas/*`). Verified structure:

- `canvas/node/*` (16) — `gap-{sm,md,lg}`, `gap-inner`, `inset`, `shell-radius`, `content-radius`, `head-{gap,h-pad,v-pad,radius,icon,icon-radius}`, `badge-{h-pad,v-pad,radius}`
- `canvas/port/*` (2) — `gap`, `offset`
- `canvas/edge/*` (19) — `stroke-{regular,bold}`, `corner-radius`, `padding`, `label/gap`, plus the edge-label size set `label/{xs,s,m}-{h-pad-N,v-pad-N,radius}`
- `canvas/widget/*` (19) — `{s,m,l}-{pad,gap,radius}`, `element-radius`, `paragraph-{pad,gap}`, and nested widget-button sizes `button/{xxxs,xxs,xs}-*`

### 11.3 The spacing model — two layers

- **UI:** components bind `space/*` / `radius/*` primitives **directly** (no more component-baked `token-spacing/button-xl-h-pad-1`).
- **Canvas:** dedicated tokens in the `Canvas` collection.

**Implication for code:** every reference to the old `wb/token-spacing/*` or `wb/token-radius/*` is obsolete. UI spacing → `space/*`; canvas dimensions → the `Canvas` collection.

---

## 12. Shadows and focus — Effect Styles + Effects collection

### 12.1 Effect Styles — renamed into a slash hierarchy (10 → 10)

| Old                  | New                                |
| -------------------- | ---------------------------------- |
| `shadow-xs`          | `shadow/ui/xs`                     |
| `shadow-s`           | `shadow/ui/s`                      |
| `shadow-m`           | `shadow/ui/m`                      |
| `shadow-l`           | `shadow/ui/l`                      |
| `shadow-xl`          | `shadow/ui/xl`                     |
| `focus-ring-element` | `shadow/ui/focus-element`          |
| `focus-ring-active`  | `shadow/canvas/focus-node/active`  |
| `focus-ring-warning` | `shadow/canvas/focus-node/warning` |
| `focus-ring-error`   | `shadow/canvas/focus-node/error`   |
| `focus-ring-success` | `shadow/canvas/focus-node/success` |

> Note: the Effect Style `focus-node/error` keeps the old `error` term (color tokens already use `critical`) — a known naming mismatch, pending closure (verified still named `error` on 2026-06-12). If you build a code-side enum, prefer `critical` and map the style name.

### 12.2 New `Effects` collection (29 variables, `light`/`dark` modes)

Shadows decomposed into FLOAT variables (enables binding plus a shared color):

- `wb/shadow/ui/{xs,s,m,l,xl}/{x,y,blur,spread}` — 5 sizes × 4 geometry components.
- `wb/shadow/ui/focus-element/{x,y,blur,spread}` (spread 2).
- `wb/shadow/canvas/focus-node/{x,y,blur,spread}` (spread 4).
- `wb/shadow/ui/color` [COLOR] → `gray-900-20` (light) / `gray-900-50` (dark) — the one canonical UI shadow color (replaces the old `wb/shadow` from Tokens).

UI reference values: xs `y4 blur8 spread−2`, s `y8 blur16 spread−4`, m `y12 blur24 spread−6`, l `y16 blur32 spread−8`, xl `y24 blur48 spread−12`.

### 12.3 Known limitation — Effect Style color binding (open)

The Effect Styles' own color properties are **not yet bound to variables** (hardcoded RGBA inside the styles); dark-mode color binding is pending (pilot planned on `shadow/ui/m` first). For code, the source of truth for the shadow color is `wb/shadow/ui/color` in the Effects collection — bind to that, not to the RGBA snapshot in the style. Additionally, a large inline-shadow backlog remains in the design file (~800 custom one-offs plus 49 border-simulation shadows on toggles/checkboxes); these are not part of the tokenized shadow system and should not be reverse-engineered into tokens.

---

## 13. Typography — Text Styles (full replacement, 38 → 39)

The old and new name sets are **disjoint** — this is not a rename, it's a new ramp. Every typography class in code requires manual mapping.

| Old system (38)                                                 | New system (39)                                        |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| `Heading/H1` … `Heading/H12`                                    | `Display/{S,M,L}`, `Headline/{S,M,L}`, `Title/{S,M,L}` |
| `Paragraph/P1` … `Paragraph/P12`                                | `Body/{S,M,L}`                                         |
| `Button/Button {Large,Medium,Small,XtraSmall}` + `Txt` variants | (covered by `Label/*`)                                 |
| `Label/{Medium,Small,XtraSmall}`                                | `Label/{S,M,L,XL}`                                     |
| `KeyShortcut/Txt {Large,Medium,Small}`                          | (map onto `Label/*` or `UI/Code`)                      |
| —                                                               | `Node/{S,M,L}` _(new family for the canvas)_           |
| —                                                               | every family has an `… Emphasized` variant             |
| —                                                               | `UI/Code`                                              |

**Implication:** typography is the most manual part of the migration — there is no ID or name continuity. Recommended: build a mapping table from old H/P numbers to new roles (e.g. `Heading/H1` → `Display/L`, `Paragraph/P3` → `Body/M`) based on the real font sizes in both files before re-pointing.

---

## 14. Component library changes relevant to code (props / API)

These are Figma component changes that should be mirrored in component APIs, Storybook controls, and design-to-code mappings.

### 14.1 Property naming convention (Polaris-style)

All rebuilt components follow one convention:

- **BOOLEAN** properties carry clean names controlling visibility: `Prefix icon`, `Suffix icon`, `Label`, `Help text`, `Required`.
- **TEXT** and **INSTANCE_SWAP** properties carry the `↪️` prefix: `↪️ Label`, `↪️ Prefix icon`, `↪️ Suffix icon`, `↪️ Icon`, `↪️ Help content`, `↪️ Value content`.
- The `↪️` prefix is a Figma-panel affordance only — strip it when mapping to code props.

### 14.2 Button family

- Layout is no longer driven by mutually exclusive BOOL-VARIANT flags (`Text only`, `Icon + Text`, `Text + Icon`, `Icon + Text + Icon`, `Icon Square`, `Icon Round`). It is now composed via `Prefix icon` / `Suffix icon` booleans plus instance swaps, and a `Shape` variant axis: `Default` (text button) / `Square` / `Round` (icon-only).
- Variant axes: `Color` (Primary, Secondary, Success, Warning, Critical, Ghost-Primary, Ghost-Secondary, Ghost-Success, Ghost-Warning, Ghost-Critical — 10), `Size` (XL, L, M, S, XS — 5), `State` (Default, Hover, Active, Focus, Loading, Disabled — 6; icon shapes have no Loading), `Shape` (Default, Square, Round).
- Geometry reference for icon shapes: Square cornerRadius 4/4/6/8/8 for XS/S/M/L/XL; Round cornerRadius 9999.
- ⚠ Solid critical/success/warning buttons change appearance (full-saturation 500/600/700 ramp, section 7.4); all primary buttons change appearance (`#3969FF`).

### 14.3 Text inputs

- `Input` is now the **Text field** family: `Text field`, `Multiline field`, and the new **Number field** (Size L/M/S × 8 states) with a Polaris-style Stepper (two independent segments, 4 states each). The Stepper lives only in Number field — it was removed from Text field.
- The transient `border-focus` layer was removed from all field variants — focus is expressed via `stroke-focus` + focus shadow, not an extra border node.

### 14.4 Status vocabulary in variant labels

Variant property values across 10 components (419 variants) were renamed to match the token vocabulary: `Error` → `Critical`, `Destructive` → `Critical`, `Information` → `Info`. Mirror this in code enums, CSS state classes, and any design-to-code variant mapping. There are zero occurrences of the full word `information` left in the file.

### 14.5 Nav Button v2

Rebuilt as a 252-variant set with the full tokenized state model from section 9.6/10. Direct instances were migrated; a tail of nested instances inside other components may still point at the deprecated component inside the design file (Plugin API limitation) — irrelevant for code, but relevant if you scrape the file programmatically.

---

## 15. Breaking changes — summary for code

1. **All 207 old token names changed** (146 renamed + 61 removed/rebuilt). No old `wb/{txt|icon|ui-bg|button|node|edge|...}-*` path will resolve.
2. **Value changes independent of renames:** the `red/green/orange` refresh plus status unification (sections 5–6) changes the appearance of every critical/success/warning element, even where the token was not renamed.
3. **`acc1` — new values:** the entire brand blue palette was replaced (anchor `#3969FF`, section 5.2). Pure value change — names and IDs unchanged — but every primary/brand element looks different; visual regression required.
4. **Component domain:** all component tokens live under `wb/components/*` (not `wb/ui/components/*` — if you consumed the interim paths, re-point). Button uses nested `wb/components/button/{variant}/{color}/{state}`. `wb/ui/focus-ring/element` → `wb/ui/focus-ring`.
5. **Chips:** the per-accent model (`chips-accN-*`) is gone — chip coloring logic must be rebuilt around the 4-token factory.
6. **Input → Text Field:** name change plus component API change (section 14.3).
7. **`error`/`destructive`/`information` → `critical`/`info`** in token names, state enums, CSS classes, and variant labels.
8. **Shadows:** `wb/shadow` (Tokens) no longer exists — use Effect Styles `shadow/ui/*` or the `Effects` collection variables.
9. **Dimensions:** `wb/token-spacing/*` and `wb/token-radius/*` (Numerals) no longer exist — move to `space/*`/`radius/*` (UI) and the `Canvas` collection (canvas).
10. **Typography:** new ramp (`Display/Headline/Title/Body/Label/Node`) — full remapping of typography classes.
11. **Do not introduce removed keys:** `dropdown/bg-primary-default`, `dropdown/bg-secondary-default` (→ `ui/bg/base` / `ui/bg/inset`), `icon/onsurface-default` (→ `icon/default`), `txt-destuctive-default` (typo).

---

## 16. Recommended migration order (checklist)

1. [ ] Update the token export pipeline (Style Dictionary / Tokens Studio): add the `Canvas` and `Effects` collections, drop `Numerals`.
2. [ ] Replace **Primitives** (colors: full `red/green/orange/blue` scales with new hexes; **`acc1` per section 5.2**; dimension primitives `space/radius/size/font-size`; `transparent`). This is the foundation — everything else depends on it.
3. [ ] Introduce the `ui/brand/*` layer and re-point primary onto it.
4. [ ] Apply the rename map from section 7 (find-replace, ideally scripted from the tables). Two global transforms cover most cases: component prefix → `wb/components/`, button leaf → `{variant}/{color}/{state}`.
5. [ ] Handle the removals/rebuilds from section 8 (chips factory, node/edge/port under `canvas/*`, `solid/disabled` consolidation, deleted dropdown keys).
6. [ ] Add the new tokens from section 9 (brand layer, UI foundations, chips factory, snackbar strokes, canvas additions, nav-button state set).
7. [ ] Re-point Nav Button consumers using the state-dependent mapping in section 10.
8. [ ] Re-point shadows onto Effect Styles / the `Effects` collection (section 12); bind shadow color to `wb/shadow/ui/color`.
9. [ ] Remap typography (section 13) — requires a manual H/P → role table.
10. [ ] Migrate `error/destructive/information` → `critical/info` in enums, classes, and variant mappings (sections 4, 14.4).
11. [ ] Update component APIs to the Polaris-style prop model (section 14).
12. [ ] **Visual regression:** all critical/success/warning surfaces (new hexes), solid buttons (full-saturation 500/600/700), **everything primary/brand** (`#3969FF`: solid+ghost primary buttons, links/`text-action`, Text field focus, UI focus rings, logo/`brand/identity`, info tooltip/icon/stroke), datepicker primary, chips, node focus rings, Nav Button Active/Pressed.

---

## 17. Known gaps, tech debt, and watch-outs

- **Effect Style shadow colors are not yet variable-bound** (hardcoded RGBA inside the styles); dark-mode binding pending. Bind code to `wb/shadow/ui/color` regardless (section 12.3).
- **`shadow/canvas/focus-node/error`** Effect Style name retains the legacy `error` term — naming mismatch with the `critical` vocabulary, pending closure.
- **`wb/ui/brand/identity` scope** is flagged for expansion (tech debt) — currently equals `brand/fill`; treat as a separate semantic slot in code so a future split is cheap.
- **Nav Button `bg-primary-pressed` / `bg-primary-focus`** currently share the hover value — possible future differentiation.
- **Legacy-remote bindings** may exist in components beyond Nav Button — audit each component before wiring it to code (section 10).
- **Disabled-state contrast** is an intentional WCAG exception (disabled controls are exempt from contrast minima) — document it explicitly rather than "fixing" it.
- **Status palettes (critical/success/warning) for alerts/snackbars are intentionally non-vivid** in their surface usage — do not "harmonize" them with the vivid button ramp.

---

## Related artifacts (project files)

- `wb-ds-rename-mapping-29-05.md` — full old→new map by ID (2026-05-29 taxonomy; audit trail)
- `wb-ds-rename-mapping-10-06.md` — component domain restructure map (103 renames, 2026-06-10; audit trail)
- `ds-test-ii-audyt-usprawnien.md` (v3) — canonical design-side audit / session-restore document
- ~~`wb-ds-changelog-dev-migration.md`~~ and ~~`wb-ds-changelog-dev-2026-06-10.md`~~ — Polish-language changelogs, **superseded by this document** and scheduled for deletion. Do not reference them.

_Export-by-name reminder: if the build uses variable names as keys (Style Dictionary / Tokens Studio), every rename in this document is a downstream key change — update wherever names are hardcoded._

---

## Appendix — Verification log (2026-06-12)

All of the following was re-read live from both Figma files via the Plugin API on 2026-06-12:

| Check                   | Old file (`Dv3nOrLqTgGEU7QB2SRDSL`)                                                     | New file (`hfT6zrYS948n8LrEK9y3Wh`)                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Primitives              | 154 vars, mode `Mode 1`                                                                 | 264 vars, mode `Mode 1`                                                                                                                 |
| Tokens                  | 207 vars, modes `Light`/`Dark`                                                          | 200 vars, modes `Light`/`Dark`; domains `wb/ui/*` 55 · `wb/components/*` 105 · `wb/canvas/*` 40; names outside the three domains: **0** |
| Numerals                | 316 vars, mode `Mode 1`                                                                 | —                                                                                                                                       |
| Canvas                  | —                                                                                       | 56 vars (all FLOAT), mode `value`                                                                                                       |
| Effects                 | —                                                                                       | 29 vars, modes `light`/`dark`                                                                                                           |
| Text Styles             | 38                                                                                      | 39                                                                                                                                      |
| Effect Styles           | 10                                                                                      | 10 — names verified, including the `shadow/canvas/focus-node/error` mismatch                                                            |
| `acc1-500`              | —                                                                                       | `#3969FF` confirmed (RGB 57/105/255)                                                                                                    |
| `wb/colors/transparent` | —                                                                                       | present, `VariableID:10665:20`                                                                                                          |
| `destuctive` typo       | **still present** as `wb/txt-destuctive-default` (`1592:58782`) — manual rename pending | zero occurrences of either spelling                                                                                                     |
