# Style boundary between the editor and its host page (4.0)

Status: accepted, ships in 4.0 (breaking).
Scope: `@workflowbuilder/ui`, `@workflowbuilder/sdk`, `packages/tokens`.
Supersedes: the "Note on consumer CSS resets" in `packages/sdk/DECISION-LOG.md` §4, and the layer
contract described in `packages/ui/css-layers.md` for everything except variable defaults.

This log explains why the 4.0 style boundary looks the way it does. It is written for reviewers who were
not part of the discussions. Every decision lists what was chosen, why, what was rejected, and what it
costs if the reasoning turns out wrong.

---

## 1. The problem

In 3.x the editor and the page that embeds it ("the host") leaked styles in both directions.

### 1.1 Host to editor

Every `@workflowbuilder/ui` component wrapped its rules in `@layer ui.component`. In the cascade an
unlayered rule beats a layered rule **regardless of specificity**. Almost every global reset a host
ships is unlayered, so a bare `button { … }` on the host page beat our `._button_x { … }` inside the
layer. The layers were inherited from the earlier component kits this library grew out of, where they
were a feature: "your unlayered styles always win". That promise suits an app author styling their own
kit. It does not suit an SDK dropped into somebody else's page.

The SDK package's own CSS modules were unlayered, so they survived tag resets. Only UI-library controls,
typography roles and vendored stylesheets were exposed. Popups were exposed as well, because they
rendered under `<body>` with no root class.

### 1.2 Editor to host

Importing `style.css` changed the host page before the editor was even mounted, and the changes stayed
after it unmounted:

- `body { margin: 0; background-color: …; overflow: hidden }`. It existed because the canvas was sized
  `100vw × 100vh` and the SDK root was `display: contents`, so the SDK had no box of its own. A
  viewport-sized canvas inside a smaller host box overflowed it, and hiding body overflow covered the
  symptom.
- Global `::-webkit-scrollbar*`, `input[type='number' | 'time']` and `button { cursor: pointer }` rules.

The SDK also wrote to the host document from JavaScript:

- `data-theme` on `<html>`, on every mount and every toggle. The token CSS was keyed on
  `html[data-theme]`, so the attribute could not simply be skipped. When another library on the same
  page also used `data-theme` on `<html>`, the two overwrote each other.
- `lang` on `<html>`, whenever the editor's language changed.
- `wb-modal-open` on `<body>` while a modal was open.
- A full-page `body:has(…)::before` backdrop while the variable picker was open, which dimmed the whole
  host page.
- Snackbars and every Base UI popup mounted under `<body>` without the root class.

### 1.3 Observed on 3.x

All measurements come from a separate host app that installs the packed SDK tarball like a customer
would (section 7).

| Scenario                                                     | 3.x symptom                                                                                                                                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap 5 reboot                                           | Editor buttons radius 0 (expected 6px / 4px), button/input/textarea font 16px / line-height 24px (expected 12 / 12), properties-panel `hr` margins 16/16 (expected 0/0, 20/4)                |
| Tailwind v3 preflight                                        | Font 16 / 24 in controls                                                                                                                                                                     |
| Eric Meyer reset                                             | Whole editor in the browser serif font (`div, span { font: inherit }` beat the layered root font), input wrappers lost border and padding, panel spacing collapsed, buttons square           |
| `button { all: unset }`                                      | Buttons lost background, border, padding and display. The "Delete node" button lost `position: relative`, so its `::after` red frame attached to the properties panel and outlined all of it |
| Scoped host rule `.app button { text-transform: uppercase }` | Editor buttons uppercase, font 16px (0,1,1 beat the hashed class 0,1,0)                                                                                                                      |
| Editor in a 600px box on a scrolling page                    | Canvas 1536×674 inside a 1268×600 box, overflowing it; page could not be scrolled by the user                                                                                                |
| Any host, editor route opened then closed                    | Body `overflow: hidden` and host number inputs without spinners remained after closing                                                                                                       |
| Host owns `<html data-theme>`                                | SDK overwrote the host's stored `dark` with `light` on mount                                                                                                                                 |
| Host sets `<html lang="de">`                                 | Overwritten when the user switched the editor language                                                                                                                                       |
| Variable picker open                                         | Entire host page dimmed                                                                                                                                                                      |
| Popups (Select, Menu, Tooltip, DatePicker, snackbars)        | Mounted under `<body>` with no root class: inherited host fonts and lost every rule scoped to the root                                                                                       |

---

## 2. Goals and non-goals

Goals

- **G1. The editor touches nothing outside the elements it owns.** Nothing in `style.css` or in the
  SDK's JavaScript changes `html`, `body` or host elements, and nothing stays behind after unmount.
- **G2. Ordinary host CSS does not change the editor.** This covers tag, universal, attribute and
  class-scoped resets, with or without a wrapper class, and includes popups.
- **G3. One documented place to theme.** Variable overrides written there win regardless of load order
  and reach the popups.
- **G4. Internal ordering does not depend on chunk load order.** Vendored CSS loses to UI components,
  and UI components lose to SDK modules, in any order of arrival. This is what `ui.base` /
  `ui.component` used to guarantee.
- **G5. Hosts can drive the editor's theme** in lockstep with their own.
- **G6. The build fails** if a rule that breaks G1 or G2 is reintroduced.

Non-goals

- **One `<WorkflowBuilder.Root>` per page.** This was already documented (module-level stores), so
  there is one popup container and one theme value per page.
- **No Shadow DOM** (see 3.1).
- **No iframe** (see 3.2).
- **No immunity against host rules with an ID selector or `!important`** that happen to match editor
  elements. Writing either is a deliberate act. It is documented as the boundary, and it is also the
  documented way for a host to override an editor internal on purpose.

---

## 3. Options considered and rejected

### 3.1 Shadow DOM

Shadow DOM isolates selectors but not inheritance. `color`, `font-*`, `letter-spacing`,
`text-transform` and `line-height` set on a host ancestor still flow into the shadow tree, which is
exactly the class of leak in the scoped-host rows above. Every popup would need a container inside the
shadow root. `@font-face` only works at document level. CSS that plugin authors write for their own
decorated components could no longer reach those components. It would also change how hosts query and
test the editor's DOM. That is a large surface change for a partial fix.

### 3.2 iframe

An iframe gives real isolation, but the editor is not a widget with a message API. Hosts pass React
props and callbacks, render their own React children inside `Root`, register plugins and custom node
components, and theme through CSS variables. None of that crosses a frame boundary without a bridge
layer we would have to design and support. Popups would be clipped to the frame, and sizing, focus and
drag-and-drop between host and editor get harder.

### 3.3 Keep the layers and tell hosts to avoid global resets

This was the decision recorded for 2.x (`packages/sdk/DECISION-LOG.md` §4). It failed in practice: a
host embedding the editor into an existing Bootstrap app hit it within weeks and patched individual
symptoms in its own global CSS, and the same report came back later from another host. Hosts often do
not control their resets: they come with a component library, a CMS theme or a design system. The
second argument in that note ("stripping layers changes internal cascade behaviour in ways that are hard
to verify") was valid. It is answered here by the specificity ladder (4.3), the built-CSS checker (4.8)
and the scenario matrix (section 7), not by keeping the layers.

### 3.4 `!important` on our declarations

This is the strongest option: it would even beat host `!important` written without layers. But it has
to exclude every property that is also set inline or animated, such as React Flow transforms, Base UI
popup positioning, Ace sizes and keyframe animations, and that list is easy to get wrong. It also
inverts the override story for hosts: a deliberate override would need `!important` too, and among
layered `!important` declarations the layer order flips. It was kept only as a fallback idea and was not
needed.

### 3.5 CSS `@scope`

`@scope (.workflow-builder-root) { button { … } }` limits where our rules apply, but adds no weight.
Specificity is compared before scope proximity, so a host `.app button` (0,1,1) still beats a scoped
`button` (0,0,1). It solves G1, which we already solve by scoping to the root class, and not G2. Browser
support also arrived late in one engine, so it is not something an SDK can rely on yet.

### 3.6 A plain class prefix: `.workflow-builder-root ._x`

This adds 0,1,0 to every rule. It beats tag and universal resets, but loses to any host rule that is
scoped one level deeper, such as `.app .content button` (0,2,1) against our `.workflow-builder-root
._button` (0,2,0). Real host CSS is full of selectors like that. Adding more classes only moves the
threshold. An ID-strength prefix puts our rules above every host selector that has no ID (see 4.3).

### 3.7 Keep `html[data-theme]` as a deprecated alias for one version

See decision 5.3.

### 3.8 Per-property "shields" through variables

The idea was to restate only the properties that host resets usually touch (radius, font size,
padding), as unlayered rules reading our variables. That is what the earlier host patch did. It covers
Bootstrap-style resets only. `*` and `div` resets would need every property routed through a variable,
and every new reset needs a new entry. Rejected as whack-a-mole.

---

## 4. The model as built

### 4.1 Variables stay layered, on the theme attribute

`@layer ui.base` now contains **only** custom-property declarations and `@font-face`. The order
statement `@layer ui.base;` is still stamped first in every built file.

| What                                      | Selector                                            | Layer                |
| ----------------------------------------- | --------------------------------------------------- | -------------------- |
| Primitive tokens (raw scales)             | `:root`                                             | `ui.base`            |
| Semantic and effect tokens                | `[data-wb-theme='light']`, `[data-wb-theme='dark']` | `ui.base`            |
| `--wb-public-*` and `--wb-sdk-*` defaults | `[data-wb-theme]`                                   | `ui.base`            |
| Host overrides                            | `.workflow-builder-root { --wb-…: … }`              | unlayered (host CSS) |

The selector is attribute-only, so `packages/tokens` does not need to know SDK class names, and a
standalone UI user can put the attribute on any ancestor. Sources still write `:root { --wb-public-… }`
and `postcss-layer-root-defaults.mts` rewrites them to `[data-wb-theme]`.

Two CSS rules shape this:

- **R1.** A custom property whose value contains `var()` is resolved on the element that declares it,
  and descendants inherit the result.
- **R2.** An element's own declaration of a property always beats a value it would inherit from a parent.

Most `--wb-public-*` defaults are `var(--wb-ds-<semantic>)`. Because of R1 they must be declared on the
same element as the semantic tokens they read, which is why they moved off `:root` together. Because of
R2, a host override must be written on that same element, or the layered default on the element wins
over the inherited host value. That element is `.workflow-builder-root` (decision 5.4).

### 4.2 Everything that paints is unlayered and prefixed at build time

A PostCSS step (`packages/ui/postcss-scope-prefix.mts`) runs in both the UI and the SDK builds and
prefixes every top-level rule outside `@layer`. Sources are not edited: the `@layer ui.component { … }`
wrappers were removed mechanically, and the prefix is added in the build.

The step skips the following:

- `@keyframes` steps and `@font-face`;
- `:root` and `[data-wb-theme]` default blocks;
- selectors that are already prefixed (the SDK build re-reads the minified UI dist);
- selectors that already start with `.workflow-builder-root`.

It descends into `@media`, `@supports` and `@container`. It prefixes top-level `:global(…)` outside the
wrapper. A selector that starts with a theme attribute gets a **compound** prefix,
`:is(#wb, .workflow-builder-root)[data-wb-theme='dark'] .x`, because the attribute and the class sit on
the same element.

### 4.3 The ladder

| Rung          | Prefix (exact)                                            | Weight the prefix adds                 | Typical total                           | Applied to                                                                  |
| ------------- | --------------------------------------------------------- | -------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| Vendored      | `:where(.workflow-builder-root) `                         | 0,0,0                                  | the vendored selector's own, e.g. 0,1,0 | React Flow and react-day-picker stylesheets                                 |
| Base files    | `:is(#wb, .workflow-builder-root) :where(…)`              | 1,0,0, and the wrapped selector adds 0 | exactly 1,0,0                           | `typography.css` (`.wb-text-*` roles), `base-button.module.css`             |
| UI components | `:is(#wb, .workflow-builder-root) `                       | 1,0,0                                  | 1,1,0 and up                            | every `@workflowbuilder/ui` module                                          |
| SDK modules   | `:is(#wb, .workflow-builder-root).workflow-builder-root ` | 1,1,0                                  | 1,2,0 and up                            | every `@workflowbuilder/sdk` module                                         |
| Host, no ID   | n/a                                                       | n/a                                    | at most 0,n,m                           | always below the base files and above vendored rules only by its own weight |

How to read it:

- Each rung beats the rung below it by specificity, not by load order. This restores what
  `ui.base < ui.component` used to provide (G4).
- Every host rule without an ID or `!important` is below the base-file rung, because any ID beats any
  number of classes.
- Vendored rules are weightless on purpose. They beat host tag resets only by their own class selectors
  and lose to anything we write (decision 5.5).

**Why a made-up `#wb`.** `:is()` takes the specificity of its most specific argument. `:is(#wb,
.workflow-builder-root)` therefore weighs 1,0,0 but still matches through the class. No element in the
DOM has `id="wb"`, and the SDK never adds an ID: hosts may already use IDs, and two editors' IDs would
collide. The ID exists only inside the stylesheet, as weight.

### 4.4 The root box

`.workflow-builder-root-shell` was `display: contents`. It is now a real box:
`position: relative; width: 100%; height: 100%; overflow: hidden`, with the editor's background, text
colour, font family, `font-size: 1rem` and `line-height: normal`. The host sizes it. The canvas is
`100% × 100%` of its parent instead of `100vw × 100vh`. The `body` rule is gone: `overflow` moved onto
the box, and `margin` and `background-color` had no job left once the canvas stopped being
viewport-sized.

Geometry is on the shell class, not on `.workflow-builder-root`. The root class is shared with the popup
container, the modal popup and the drag preview, and geometry there would paint a full-height box under
`<body>`.

The remaining global rules (scrollbars, number and time inputs, button cursor) are scoped under the
root. `wb-modal-open` is toggled on the shell and the popup container, never on `<body>`.

### 4.5 The popup container

The SDK creates one `<div class="workflow-builder-root wb-portal" data-wb-theme="…" lang="…">` under
`<body>` on mount and removes it on unmount. Everything that leaves the root box renders into it:

- Base UI `Select`, `Menu`, `Tooltip`, the DatePicker `Popover` and `Dialog`, through their `container`
  prop;
- notistack snackbars, through `domRoot`;
- the SDK's own portals: the modal and its backdrop, and the drag preview;
- the Ace read-only tooltip and the react-mentions variable picker popup (decision 5.13).

`@workflowbuilder/ui` exposes this through `PortalContainerProvider` / `usePortalContainer`. Without a
provider, components fall back to `document.body`, so standalone use and existing tests keep working.

Because the container carries the root class and the theme attribute, prefixed rules, `.wb-text-*`
roles, tokens and host overrides on `.workflow-builder-root` all reach popups with no extra work. The
container is not positioned and has no `transform`, `isolation` or `zoom`, so popup positioning and
stacking behave as they did under `<body>`.

### 4.6 Theme and language

- `data-wb-theme` and `lang` are written on the shell and on the popup container, and nowhere else. The
  SDK no longer reads or writes anything on `<html>`.
- The theme lives in a small zustand store. Components that read it subscribe to it, so a theme change
  re-renders only those components and not the whole tree, as a React context would. The DOM attribute
  is synced in `useLayoutEffect`, so the first paint is already themed.
- New controlled props on `<WorkflowBuilder.Root>`: `theme="light" | "dark"` and
  `onThemeChange(theme)`. When `theme` is passed, the SDK renders that value, calls `onThemeChange` from
  its own toggle, and persists nothing. Without it, behaviour is as before: the value is persisted under
  `localStorage['wb-theme']`, now applied to SDK elements only.
  `useWorkflowBuilderActions().setTheme` stays as the imperative path.
- `lang` is inherited and valid on any element, so assistive technology gets the editor's language for
  the editor's content while the host keeps its own `<html lang>`.

### 4.7 Overlay state as an attribute

While the variable picker is open, the root carries `data-wb-overlay="variable-picker"`. The editor dims
only its own box (decision 5.2). A host that wants the whole page dimmed opts in with one rule of its
own, for example
`body:has(.workflow-builder-root[data-wb-overlay]) .app-shell { filter: brightness(.6) }`. The value
space is open; `"modal"` is a natural next value.

### 4.8 The built-CSS checker

`packages/ui/scripts/check-stylesheet.ts` (a pure function with specs) runs on both the UI and the SDK
dist as part of `build:lib`. It fails the build on:

- **Unprefixed built CSS:** any unlayered rule that is not prefixed, not a variable-only `:root` or
  `[data-wb-theme]` block, and does not start with `.workflow-builder-root`. Unknown at-rules are flagged.
- **Painting rule inside `@layer`:** `ui.base` may hold only custom properties and `@font-face`,
  checked recursively through `@media` and `@supports`.
- **Unknown layer name:** `ui.component` no longer exists.
- **Missing leading `@layer ui.base;`.**

The earlier checks are kept: malformed `var()` arguments, unsanctioned variable namespaces, `@import` in
built CSS, missing `url()` targets, design tokens moved off `:root`, `--wb-public-*` / `--wb-sdk-*`
defaults left on `:root`, and mis-scoped public defaults. Each message links to a section of
`built-css-pitfalls.md`. The public-default placement check runs on the UI dist only, because the SDK
legitimately writes scoped overrides such as `--wb-public-node-gap: 0` in node templates.

---

## 5. Decisions

### 5.1 The host sizes the editor; no min-height fallback

- **What:** The root box is `100% × 100%` of its parent. If the parent has no height, the editor is 0px
  tall and React Flow logs its "parent container needs a width and a height" warning.
- **Why:** A fallback such as `min-height: 400px` would hide a misconfigured host behind an editor that
  looks almost right. The README already required a sized container; it is now a hard contract with the
  snippet `html, body, #root { height: 100% } body { margin: 0 }`, and the in-repo apps use it.
- **Rejected:** a `min-height` or `100vh` fallback, because it brings back the viewport coupling that
  caused the `body` rule in the first place.
- **Cost if wrong:** hosts that relied on the 3.x viewport-sized canvas in an unsized custom layout see
  an empty editor after upgrading. The changelog and upgrade guide call this out.

### 5.2 The variable-picker backdrop dims only the editor

- **What:** The backdrop is `position: absolute; inset: 0` on the shell (z-index 200), not a fixed
  `100vw × 100dvh` layer keyed on `body`. The open state is exposed as `data-wb-overlay` (4.7).
- **Why:** G1. Dimming the host page is a host decision. An attribute lets the host make that decision
  in plain CSS, without a new prop or callback.
- **Rejected:** keeping the page-wide backdrop (it breaks G1), or a Root prop or callback (more API for
  something CSS `:has()` already does; the SDK already depends on `:has()`).
- **Cost if wrong:** a host that wants page dimming writes one rule. A callback can be added later if a
  host needs more than styling.

### 5.3 Drop `html[data-theme]` with no alias

- **What:** Tokens and SDK rules key on `[data-wb-theme]` only. Nothing reads or writes
  `<html data-theme>`.
- **Why:**
  1. The generic attribute on the host's root element _is_ the collision. An alias keeps it alive.
  2. An alias doubles the token CSS. Its `html` copy would resolve on `<html>`, where the public
     defaults no longer live (R1), so it would only half work.
  3. 4.0 already breaks theming code (decision 5.4), so hosts change it once instead of in 4.0 and
     again in 4.1.
  4. The migration is short: remove `data-theme` from `<html>`, and pass `theme` if you drove the
     editor's theme through it.
- **Rejected:** a deprecated alias for one major version.
- **Cost if wrong:** hosts that styled their own content inside the editor with `html[data-theme='dark']
…` must switch to `[data-wb-theme='dark'] …`.

### 5.4 Variable overrides move from `:root` to `.workflow-builder-root`; primitives stay on `:root`

- **What:** The documented place for `--wb-ds-*` semantic and `--wb-public-*` overrides is
  `.workflow-builder-root`. Primitive tokens are still declared on `:root` and can still be overridden
  there.
- **Why:** R1 and R2 (4.1). Our defaults are declared on the element that carries `data-wb-theme`, so
  an override on `:root` is only an inherited value and loses to the element's own layered declaration.
  The same declaration on `.workflow-builder-root` is unlayered against our layered default on the same
  element, so it wins whatever the load order. Because the popup container carries the same class, the
  override reaches every popup. It also gives a clean bridge to a host theme:

  ```css
  :root {
    --acme-radius: 2px;
    --acme-brand: #0b5fff;
  } /* host theme, unchanged */

  .workflow-builder-root {
    /* one bridge block */
    --wb-public-button-border-radius-m: var(--acme-radius);
    --wb-ds-colors-acc1-500: var(--acme-brand);
  }
  ```

  The `var()` on the right is resolved on the editor's elements, which inherit the host's variables, so
  host theme switches flow through automatically.

- **Rejected:** keeping public and semantic defaults on `:root` while moving only the theme attribute.
  That makes the `var()` defaults resolve on `<html>`, where the semantic tokens no longer exist.
- **Cost if wrong:** 3.x `:root { --wb-… }` overrides of non-primitive variables are silently ignored.
  The upgrade guide shows the one-selector rewrite. SCSS hosts must interpolate (`#{$x}`) when assigning
  Sass values to custom properties. Angular hosts write the block in a global stylesheet or under
  `ViewEncapsulation.None`.

### 5.5 Vendored CSS is weightless

- **What:** React Flow and react-day-picker stylesheets are unlayered and prefixed with
  `:where(.workflow-builder-root)`.
- **Why:** They must beat host tag and universal resets (their own class selectors do that once they
  are out of the layer). They must lose to every UI and SDK rule that customises them, without depending
  on which chunk loads first. A weightless prefix keeps their original specificity, and the ID rung puts
  all our rules above them.
- **Rejected:** keeping them in `ui.base`, where any unlayered host reset beats them; giving them the UI
  prefix, which would make them tie with our overrides and depend on order again.
- **Cost if wrong:** a scoped host rule such as `.app button` (0,1,1) beats a vendored rule of 0,1,0.
  Where that matters, the UI module restates the property at UI strength (decision 5.11).

### 5.6 Base files are weightless inside the ID prefix

- **What:** `typography.css` (the `.wb-text-*` roles) and `base-button.module.css` are emitted as
  `:is(#wb, .workflow-builder-root) :where(…)`, which is exactly 1,0,0.
- **Why:** These were `ui.base` element styling that components refined. With layers gone, a component
  rule (1,1,0) must still beat them regardless of order, while they still beat every host rule without
  an ID. A flat 1,0,0 does both. Nested states are written as `&:where(:disabled)`, so they add nothing
  either. A pseudo-element is not allowed inside `:where()` (the browser drops the whole rule), so the
  plugin keeps the first pseudo-element and everything after it outside: `.button::after:hover` becomes
  `:where(.button)::after:hover`.
- **Rejected:** the normal UI prefix, which makes a role class (1,1,0) tie with the component that
  composes it, so the winner depends on order in the bundle.
- **Cost if wrong:** a component that wants to override a base property must use at least one class.
  All of them do.

### 5.7 SDK box-sizing is a weightless default

- **What:** `:where(.workflow-builder-root) *, ::before, ::after { box-sizing: border-box }`, 0,0,0.
  The SDK build does not run the per-rule box-sizing plugin that the UI build uses.
- **Why:** SDK elements need `border-box`. Host components rendered inside the editor (plugin children,
  custom node content) should keep 3.x sizing. A weightless universal rule gives both: any host
  `box-sizing` rule wins on host markup, and SDK modules that care set it themselves.
- **Rejected:** injecting `box-sizing` into every SDK rule and deleting the universal rule, which would
  change the sizing of host markup inside the editor.
- **Cost if wrong:** a host universal `* { box-sizing: content-box }` changes SDK elements that rely on
  the default. This is documented.

### 5.8 Variable-only component rules are prefixed

- **What:** Modifier rules that only set variables, such as `.primary { --button-bg: … }`, get the
  component prefix. Only `:root` and `[data-wb-theme]` default blocks are skipped.
- **Why:** These rules change how one element looks. Left unprefixed at 0,1,0, they would lose to the
  same component's base rule at 1,1,0, which declares the default value of the same variable, so every
  variant would render as the default.
- **Rejected:** skipping all variable-only rules (the first plan), because it breaks variants.
- **Cost if wrong:** none known. Host overrides on `.workflow-builder-root` are inherited values for
  these elements and never competed with modifier rules.

### 5.9 Root text is prefixed: `font-size: 1rem; line-height: normal`

- **What:** The shell sets the editor's font family, colour, `font-size: 1rem` and `line-height:
normal`, prefixed at SDK strength.
- **Why:** In 3.x the root's layered `font-family` lost to Meyer's unlayered `div { font: inherit }` on
  the root element itself, so the whole editor rendered in serif. Inherited text values must be set by a
  rule that beats host element rules on the root, and the root must not inherit the host body's
  line-height or font size. `1rem` keeps the editor in step with the token scale (also `rem`).
- **Rejected:** inheriting from the host body (the 3.x behaviour); layered root typography.
- **Cost if wrong:** see 6.2 (`rem` follows the host's root font size).

### 5.10 Text-property reset on our own roles, not on bare elements

- **What:** `text-transform: none`, `letter-spacing: normal`, `word-spacing: normal`,
  `text-shadow: none` and `text-decoration: none` are set on every `.wb-text-*` role (one
  `[class*='wb-text-']` rule in `typography.css`) and on the base button. The root sets the four inherited
  ones, so a host parent's values stop at the editor's edge. Nothing is set on bare `button`, `input`,
  `textarea`, `select` or `a` elements.
- **Why:** No component declared these properties, so a scoped host rule (`.app button {
text-transform: uppercase }`) or a parent's inherited `letter-spacing` had nothing to beat. The first
  fix reset them with `revert` on bare elements in `typography.css`, which as a base file carries 1,0,0.
  It was replaced because those selectors also matched **host** markup rendered inside the editor
  (plugin content, custom nodes, Root children): a host `.cta { text-transform: uppercase }` (0,1,0) lost
  to it, which breaks G1 from the inside. It also beat React Flow's weightless
  `.react-flow__attribution a { text-decoration: none }`, so the attribution link became underlined.
  Every text-bearing control we render already carries a `.wb-text-*` role (buttons through the size
  modules, fields through `input-font-size.module.css`), so the role classes are a precise hook.
- **Rejected:** bare-element resets; listing more properties on more elements.
- **Cost if wrong:** an SDK element that uses neither a `.wb-text-*` role nor the base button can still
  pick up a scoped host text rule. New components should compose a role.

### 5.11 DatePicker buttons: box restated at UI strength, background stays vendored

- **What:** The calendar's navigation and day buttons get their box restated in the UI date-picker
  module at UI strength: `display`, `align-items`, `justify-content`, `margin` and `padding` on both;
  `width`, `height` and `border-radius` on day buttons; `width`, `height`, `border: none` and
  `background: none` on the navigation buttons. The size variables (`--rdp-day_button-*`,
  `--rdp-nav_button-*`) are declared in the module with react-day-picker's own defaults, so stylelint can
  verify them. Day-button background, border and colour states stay in the vendored rules.
- **Why:** Under a host `.app button { all: unset }` (0,1,1), the weightless vendored rules lost, so the
  arrows and days lost their size and centring. Restating the box at UI strength fixes that. Background
  is not restated: react-day-picker colours selected, range-start, range-middle and range-end days
  through its own state selectors. A UI-strength background would beat all of those and flatten the
  range colours.
- **Rejected:** bumping the vendored prefix for the whole sheet (it breaks 5.5); restating everything.
- **Cost if wrong:** a host `all: unset` on buttons could still clear a day's background in states the
  vendored rules cover. It was not observed in testing.

### 5.12 Fit view measures the editor, not the window or the first `.react-flow`

- **What:** `fitDiagramView` computes padding from the canvas rect, not from
  `window.innerWidth/innerHeight`, and looks up `.react-flow` and `#viewport-bounds` inside
  `.workflow-builder-root-shell` (one Root per page), not in the whole document. The same function serves
  the `useFitView` hook and the `toggleLayoutDirection({ fitView: true })` action.
- **Why:** The window equals the canvas only when the editor fills the viewport. A document-wide query
  can pick a host element that happens to carry the same class.
- **Rejected:** none; the old code was only correct by accident.
- **Cost if wrong:** none known.

### 5.13 Ace tooltip and react-mentions popup render in the popup container

- **What:** Ace's tooltip and the variable picker's popup are mounted inside `.wb-portal`.
- **Why:** Both libraries mount to `<body>` by default. Outside the root class they lost our prefixed
  rules. The read-only tooltip showed as an unstyled bubble, and the picker popup had no
  `position`/`z-index` from our CSS and rendered under its own backdrop.
- **Rejected:** unprefixed global rules for these libraries' classes, which would break G1 and need a
  checker exception.
- **Cost if wrong:** Ace still injects its own unlayered, `.ace_`-prefixed `<style>` into `<head>` (6.3).

### 5.14 The popup container ref is rebuilt once the container exists; modal state resets on unmount

- **What:** The container element is created in the shell's layout effect and held in React state. Base
  UI components receive it through a ref object that is rebuilt (`useMemo` on the element) when the
  element appears. The modal store is reset when the Root unmounts.
- **Why:** Base UI's `FloatingPortal` resolves `container.current` in a layout effect keyed on the
  `container` prop's identity, so it reads a given ref object once. The shell's own layout effect runs
  after its children's, so a popup already open on the first commit would read `null`, fall back to
  `<body>` and stay there unthemed. A new ref object makes it resolve again. The modal store is a module
  singleton that outlives the Root: a modal open when the host navigated away came back open on the next
  mount, on the first commit, which is exactly that case.
- **Rejected:** a single stable ref (the bug above); a container created at module load (outlives the
  Root and stays in the host page).
- **Cost if wrong:** none observed; the remount scenario passes in the test bed.

### 5.15 The SDK prefix is one class above UI, not two IDs

- **What:** SDK modules use `:is(#wb, .workflow-builder-root).workflow-builder-root` (1,1,0 prefix), not a
  second ID.
- **Why:** The documented way for a host to override an editor internal on purpose is one ID of its own
  plus our class, for example `#app .workflow-builder-root ._x` (1,2,0 or more). A two-ID SDK prefix
  (2,x,y) would put every SDK rule above that, and hosts would need two IDs or `!important` for a
  routine override. One extra class is enough to keep SDK above UI, which is all the ladder needs.
- **Rejected:** `:is(#wb, …):is(#wb, …)` or a second made-up ID.
- **Cost if wrong:** an SDK rule with a short selector ties with a host override that has the same
  weight, and order decides. Host CSS normally loads after `style.css`, so the host wins, which is the
  intended direction. Inside the editor, a UI rule with two classes of its own (a state such as
  `.container.disabled`, 1,2,0) ties with a one-class SDK `className` override (1,2,0), and source order
  decides. The known cases are listed in 6.5 and are fixed per component rather than by a heavier prefix.

---

## 6. Known limits and follow-ups

### 6.1 Host IDs and `!important`

A host rule with an ID selector, or with `!important`, that matches editor elements still wins. This is
the documented boundary and the documented override path. Host CSS like `#root button { … }` will
restyle the editor's buttons.

### 6.2 `rem` follows the host's root font size

Tokens are in `rem`. A host with `html { font-size: 62.5% }` shrinks the editor: 7.5px text and 3.75px
radii instead of 12px and 6px. This is documented as an assumption that the root is 16px. A possible
follow-up is a `--wb-rem` base (`calc(var(--wb-rem, 1rem) * N)`), measured and compensated by the root
box at mount. It is not part of 4.0.

### 6.3 Third-party internals keep their own weight

Some styling comes from third-party code and is outside the prefix:

- inline styles: React Flow transforms, Base UI popup positioning, react-mentions measurements;
- Ace's injected `<style>`, which is unlayered but `.ace_`-prefixed.

Where a library styles inline, a host `!important` can still interfere. That is the same boundary as 6.1.

### 6.4 Modal scroll lock and full-window backdrop

While an SDK modal is open, Base UI applies its accessible-modal behaviour: inline `overflow: hidden` on
`html`/`body`, `scrollbar-gutter`, and `aria-hidden` on `<body>` siblings. The modal backdrop covers the
whole window. All of it reverts on close, and it is documented. A follow-up could make modals dim and
lock only the editor box, mirroring 5.2.

### 6.5 Open design items

- **Background states that tie.** The conditions form gives its fields a white background (`.input` in
  `conditions-form-field.module.css`), and the AI agent node gives its icon a gradient (`.icon` in
  `ai-agent-node-template.module.css`). Both are SDK `className` overrides on UI components whose
  disabled or critical states set a background with two classes. In 3.x the SDK always won, so a
  disabled or invalid field and a disabled AI icon never showed the design system's state colour. In 4.0
  they tie (5.15) and source order decides. The planned fix waits on the designer's answer to which
  colour is right: either exclude the states in the SDK rule (`.input:not(:disabled, [aria-invalid='true'])`,
  `.icon:not([data-disabled])`) or keep the SDK colour on purpose.
- **Values without a design-system role.** About twenty places in the SDK and UI use a primitive colour,
  another component's token or a raw value where a role token should be (save status, conditions form,
  template selector, syntax highlighting, the AI icon gradient, the variable text colour, avatar and
  status badge sizes). For most of them a fitting role token already exists and only needs the
  designer's confirmation; a few (syntax-highlighting colours, the AI gradient, the variable text colour)
  need new tokens. This predates 4.0 and is tracked separately.

### 6.6 Standalone `@workflowbuilder/ui`

Prefixed rules need a `.workflow-builder-root` ancestor. Standalone users wrap their UI in
`<div class="workflow-builder-root" data-wb-theme="light|dark">`, and if they use popups, they give
`PortalContainerProvider` an element with the same class and attribute. There is one contract and no
second CSS artifact. The docs site does the same inside each example's shadow root.

---

## 7. How it was verified

### 7.1 The scenario matrix

A separate host app, outside this repo, installs the **packed** SDK tarball (`pnpm pack`) exactly as a
customer would. In-repo apps alias SDK sources and would not catch build-time problems. Each scenario is
a URL switch on that app, and computed values are read from the live DOM with a headless browser.

Hosts tested:

- Bootstrap 5.3 reboot plus extra tag rules;
- Tailwind v3 preflight;
- Eric Meyer reset;
- `button { all: unset }`;
- scoped `.app button { … }`;
- a parent with inherited text properties (`letter-spacing`, `text-transform`, `word-spacing`,
  `text-shadow`);
- `.app button { all: unset }`;
- no host CSS.

Layouts and features tested:

- **Layouts:** full-screen dialog; inline 600px box, both static and positioned; window resize.
- **Theme:** the host owns its own `<html data-theme>`, uses the bridge block, and drives the controlled
  `theme` / `onThemeChange` props.
- **Root font size:** `html { font-size: 62.5% }`.
- **Popups:** Select, DatePicker, Menu, the confirm modal and the Settings modal.
- **Language:** switching the editor language.
- **Variable picker:** with a variable defined.
- **Ace:** the read-only Ace field.
- **Host markup:** a host button rendered inside `Root`.
- **Decoy:** a host element with class `react-flow` placed before the editor.
- **Lifecycle:** unmount and remount with a modal open.

| Round                                          | Result                                                                   | Highlights                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.x baseline                                   | every leak in 1.3 reproduced                                             | numbers in the table in 1.3                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| After root box, popup container and theme move | editor-to-host fixed; host-to-editor still open (expected at that stage) | page scrolls before, during and after; `<html>` untouched; one popup container                                                                                                                                                                                                                                                                                                                                                                                 |
| After unlayer and prefix                       | all host-reset rows fixed except two                                     | scoped `.app button` still uppercased (led to 5.10); variable picker under its backdrop (led to 5.13)                                                                                                                                                                                                                                                                                                                                                          |
| Acceptance                                     | all pass                                                                 | under every host: buttons 6px / 4px, text 12px / 12px, text properties normal, `hr` 0/0 20/4, Poppins everywhere, field boxes intact, "Delete node" frame on the button only; canvas = box (1262×594 in 1268×600, follows resize); stored host `dark` survives mount; bridge override applies, old `:root` override ignored; `lang` on shell and container only; picker above its backdrop, centred, host header not dimmed                                    |
| After review fixes                             | all pass                                                                 | parent text properties do not reach editor text or popups; host button inside the editor keeps its uppercase; DatePicker under `.app button { all: unset }`: arrows 36×36, days 42×42, centred, clickable; React Flow attribution link not underlined; modal open at unmount does not come back on remount, reopened modal in the container with theme and `lang`; Ace tooltip lifecycle with no console errors; fit view identical with and without the decoy |

`html { font-size: 62.5% }` stays the documented boundary in every round (6.2).

Not covered by the host app: the decision, AI-agent and start node templates, the conditions form, and
the syntax-highlighter node. The in-repo apps' test suites cover their behaviour; a visual pass over them
is part of reviewing this change.

### 7.2 The build

`build:lib` runs the checker (4.8) on both dists and fails on any unprefixed unlayered rule, any
painting rule in a layer, or any `ui.component` layer. On the final build, the SDK `style.css` had:

- 817 rules prefixed with `:is(#wb, …)`;
- 0 `html[data-theme]` selectors;
- 0 `ui.component` blocks;
- 0 double prefixes.

PostCSS prefixer specs cover idempotency (UI to UI, UI to SDK, minified input), `:global()`, compound
theme selectors and skipped at-rules.

### 7.3 Regression cases from history

Earlier ordering bugs were rechecked against the ladder:

- React Flow handles rendering as raw dots;
- react-day-picker theming;
- `:root` defaults against late-loading chunks;
- decision-node ports.

All of them are now ordered by specificity rather than by layer or chunk order.

---

## 8. Changes in the repo's own apps

The in-repo apps are hosts too, so they had to adopt the same contract a customer does. They double as
working examples.

| App                              | What changed                                                                                                                                                                                   | Why                                                                                                                                                                                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Demo, AI Studio, starter example | `html, body, #root { height: 100% } body { margin: 0 }` in the app's own stylesheet (`global.css`, `host.css`)                                                                                 | The editor fills its parent (5.1). AI Studio imports it in `main.tsx`, not `app.tsx`, because its loading and error screens render before the app and use `100vh`                                                                                                          |
| Demo, AI Studio                  | `data-theme` removed from `<html>` in `index.html`                                                                                                                                             | Nothing reads it any more (5.3)                                                                                                                                                                                                                                            |
| Demo                             | Watermark dark style keyed on `[data-wb-theme='dark']`                                                                                                                                         | Same                                                                                                                                                                                                                                                                       |
| AI Studio                        | `highlighting.css`: the light/dark blocks and the shared block move from `html[data-theme]` / `:root` to `[data-wb-theme]`                                                                     | The shared block's variables resolve themed tokens (R1 in 4.1); on `:root` the status colours and node glow came out empty                                                                                                                                                 |
| AI Studio                        | `node-overrides.css` prefixed with `#root .workflow-builder-root`                                                                                                                              | The documented override pattern (6.1): the app's own id plus the class outweighs the UI rule it changes                                                                                                                                                                    |
| AI Studio                        | Loading and error screens wrapped in `.workflow-builder-root` with `data-wb-theme="light"`                                                                                                     | They render before the editor exists but use our tokens and type roles, which only resolve under that wrapper (6.6). Light matches the 3.x `<html data-theme="light">`                                                                                                     |
| Docs site                        | `ComponentPreview` puts `data-wb-theme="dark"` on the shadow host, a `.workflow-builder-root` wrapper inside the shadow root, and a per-preview popup container with `PortalContainerProvider` | The standalone-UI contract (6.6) inside a shadow root. The theme sits on the host element, not on `<html>`, because Starlight owns `<html>` and its page transitions can drop added attributes. One popup container per preview, because page transitions replace `<body>` |

Documentation: the changeset, a new "Upgrade to 4.0" guide, the SDK and UI READMEs, the theming and
design-token pages, `css-layers.md` and `built-css-pitfalls.md` describe the contract for customers.

### 8.1 Merging the concurrent API work

The editor-API changes developed in parallel (built-in controls, the actions API, `onLoad`) arrived
with a few 3.x assumptions that the merge adjusted:

- The new editor runtime called a hook that wrote the editor language to `<html lang>`. The call is
  removed; the root box and the popup container carry `lang` (4.6).
- A new SDK stylesheet (`area-target.module.css`) was wrapped in `@layer ui.component`. It is unlayered,
  and its deliberately weightless rule is written with the weightless prefix so a host class can still set
  `display`.
- `fitDiagramView`, extracted so actions can fit the view outside React, keeps the editor-scoped lookup
  (5.12).
- New tests that asserted the theme on `<html>` read the theme store instead.
