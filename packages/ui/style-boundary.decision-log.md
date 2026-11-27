# Style boundary between the editor and its host page (4.0)

### Title: Style boundary between the editor and the host page

### Proposed by: Michał Miszczuk

### Date: 08.11.2026

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

`@layer wb-ui.base` now contains **only** custom-property declarations and `@font-face`. The order
statement `@layer wb-ui.base;` is still stamped first in every built file.

| What                                      | Selector                                            | Layer                |
| ----------------------------------------- | --------------------------------------------------- | -------------------- |
| Primitive tokens (raw scales)             | `:root`                                             | `wb-ui.base`         |
| Semantic and effect tokens                | `[data-wb-theme='light']`, `[data-wb-theme='dark']` | `wb-ui.base`         |
| `--wb-public-*` and `--wb-sdk-*` defaults | `[data-wb-theme]`                                   | `wb-ui.base`         |
| Host overrides                            | `.workflow-builder-root { --wb-…: … }`              | unlayered (host CSS) |

The selector is attribute-only, so `packages/tokens` does not need to know SDK class names, and a
standalone UI user can put the attribute on any ancestor. Sources write the defaults on
`[data-wb-theme]` themselves, and `postcss-layer-root-defaults.mts` only wraps them in the layer. The
first version kept `:root` in source and rewrote the selector at build time; that hidden rewrite went,
so the source shows what ships.

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
wrappers were removed mechanically, and the prefix is added in the build. What it skips and how it
treats the theme attribute and the editor box: `css-layers.md`, "The prefix ladder".

### 4.3 The ladder

The four prefixes and the weight each adds are tabled in `css-layers.md`, "The prefix ladder". What
the ladder is meant to guarantee:

- Each rung beats the rung below it by specificity, not by load order. This restores what
  `ui.base < ui.component` used to provide (G4).
- Every host rule without an ID or `!important` is below the base-file rung, because any ID beats any
  number of classes.
- Vendored rules are weightless on purpose. They beat host tag resets only by their own class selectors
  and lose to anything we write (decision 5.5).

**Why a made-up `#\#`.** `:is()` takes the specificity of its most specific argument. `:is(#\#,
.workflow-builder-root)` therefore weighs 1,0,0 but still matches through the class. The SDK never adds
an ID: hosts may already use IDs, and two editors' IDs would collide. The ID exists only inside the
stylesheet, as weight. It was `#wb` until a review showed that a host's real `id="wb"` matched it, so
editor rules (the `svg[fill]` reset) restyled host markup with ID weight; the id `#` is valid HTML but
nobody writes it.

### 4.4 The root box

`.workflow-builder-root-shell` was `display: contents`. It is now a real box:
`position: relative; width: 100%; height: 100%; overflow: hidden`, with the editor's background. The
text defaults sit on the `.workflow-builder-root` rule (5.9). The host sizes it. The canvas is
`100% × 100%` of its parent instead of `100vw × 100vh`. The `body` rule is gone: `overflow` moved onto
the box, and `margin` and `background-color` had no job left once the canvas stopped being
viewport-sized.

Geometry is on the shell class, not on `.workflow-builder-root`. The root class is shared with the popup
container, the modal popup and the drag preview, and geometry there would paint a full-height box under
`<body>`.

The shell rule and the picker backdrop carry the glued sdk prefix,
`:is(#\#, .workflow-builder-root).workflow-builder-root-shell`, at (1,1,0). At one class of weight a host's
`.app div { position: static; overflow: visible; height: auto }` collapsed the box, let the canvas spill over
host content and let the backdrop escape to dim the host page. The prefixer fails the build on a bare
`.workflow-builder-root-shell` or `.wb-portal` selector, and the checker reports either class behind a
combinator in the built CSS; only the cosmetic resets (`.workflow-builder-root button`, scrollbars, inputs)
keep one class of weight on purpose.

The remaining global rules (scrollbars, number and time inputs, button cursor) are scoped under the
root. `wb-modal-open` is toggled on the shell, never on `<body>`.

### 4.5 The popup container

The SDK creates one `<div class="workflow-builder-root wb-portal" data-wb-theme="…" lang="…">` under
`<body>` on mount and removes it on unmount. Everything that leaves the root box renders into it:

- Base UI `Select`, `Menu`, `Tooltip`, the DatePicker `Popover` and `Dialog`, through their `container`
  prop;
- notistack snackbars, through `domRoot`;
- the SDK's own portals: the modal and its backdrop, and the drag preview;
- the Ace read-only tooltip and the react-mentions variable picker popup (decision 5.13).

`@workflowbuilder/ui` exposes this through `PortalContainerProvider` / `usePortalContainer`: the provider
takes the element itself, `null` while it does not exist yet. Without a provider, components fall back
to `document.body`, so standalone use and existing tests keep working. The SDK's own portals read the
same hook, so the element lives in one context. That context is keyed on
`Symbol.for('@workflowbuilder/ui/portal-container@2')` on `globalThis`, because the SDK bundles the UI
library and a host that imports `@workflowbuilder/ui` itself loads a second copy of the module; the `@2`
is the version of the value's shape and changes only with it.

Because the container carries the root class and the theme attribute, prefixed rules, `.wb-text-*`
roles, tokens and host overrides on `.workflow-builder-root` all reach popups with no extra work. The
container is not positioned and has no `transform`, `isolation` or `zoom`, so popup positioning and
stacking behave as they did under `<body>`.

The container is `display: contents`: it generates no box, so a host's body layout never sees it. As a
plain block it was an extra flex child under `body { display: flex; gap }` and a blank full-viewport
section under `body > div { min-height: 100vh }`, with no popup open. Class, theme, `lang` and inherited
properties still reach the popups, which are positioned fixed or by floating-ui and need no box.

### 4.6 Theme and language

- `data-wb-theme` and `lang` are written on the shell and on the popup container, and nowhere else. The
  SDK no longer reads or writes anything on `<html>`, apart from Base UI's scroll lock while a modal is
  open (6.4).
- The theme lives in two small zustand stores: the user's persisted choice and the host's controlled
  value. Only the first is wired to storage, so a controlled value can never reach `localStorage` and no
  guard is needed. Components read both through `useTheme()`, so a theme change re-renders only those
  components and not the whole tree, as a React context would. The DOM attribute is synced in
  `useLayoutEffect`, so the first paint is already themed.
- New controlled props on `<WorkflowBuilder.Root>`: `theme="light" | "dark"` and
  `onThemeChange(theme)`. When `theme` is passed, the SDK renders that value, calls `onThemeChange` from
  its own toggle, and persists nothing. `theme` without `onThemeChange` pins the value; Root warns once,
  since the toggle then does nothing, and points at `builtInControls={{ themeToggle: false }}`. Without
  `theme`, behaviour is as before: the value is persisted under `localStorage['wb-theme']`, now applied
  to SDK elements only. `useWorkflowBuilderActions().setTheme` stays as the imperative path.
  `builtInControls.themeToggle` hides the toggle in the app bar, the more menu and the settings modal.
- Accepted limit: Root registers the host's callback in its own layout effect, which runs after its
  children's. A `setTheme` a plugin makes from `useLayoutEffect` while the editor mounts therefore takes
  the uncontrolled path (`localStorage`, no `onThemeChange`). From `useEffect` or later it is routed
  correctly. Registering earlier needs a store write during render, which notifies subscribers.
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
dist as part of `build:lib`, so a rule that breaks the boundary fails the build instead of a host page.
Every check and what it guards is listed in `built-css-pitfalls.md`, one section per message. Two checks
depend on the package: public-default placement runs on the UI dist only, because the SDK legitimately
writes scoped overrides such as `--wb-public-node-width` in the palette, and the SDK prefix is
refused in the UI dist, where no rule may outrank a UI component.

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
- **Rejected:** keeping them in `wb-ui.base`, where any unlayered host reset beats them; giving them the UI
  prefix, which would make them tie with our overrides and depend on order again.
- **Cost if wrong:** a scoped host rule such as `.app button` (0,1,1) beats a vendored rule of 0,1,0.
  Where that matters, the UI module restates the property at UI strength (decision 5.11).
- **Accepted limit:** this includes React Flow's layout, so `.app div { position: static }` misplaces
  nodes, ports and edges. Raising only the layout declarations was considered and deferred: they would
  tie at (1,2,0) with the UI handle rules that move ports. A host rule that broad is the host's to
  scope (follow-up: react-flow-layout-weight).
- **Extent, from the bed:** any host rule heavier than one class that sets `position`, `display` or
  `transform` on the editor's divs (`.app div { position: relative }`, `#app div`,
  `.app div { display: block }`); bare `div` and `*` rules, and `overflow`, `width`, `height` and
  `pointer-events`, do not. Prefixing all 106 React Flow rules with the ID shielded these in a
  simulation, but ties with our handle and edge overrides and outweighs a consumer's plain
  `.react-flow__*` rules. A class-only prefix (the root class repeated) avoids the tie.

### 5.6 Base files are weightless inside the ID prefix

- **What:** `typography.css` (the `.wb-text-*` roles) and `base-button.module.css` are emitted as
  `:is(#\#, .workflow-builder-root) :where(…)`, which is exactly 1,0,0.
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

### 5.9 Root text is prefixed: every inherited text property stops at the editor

- **What:** The `.workflow-builder-root` rule sets the editor's colour, font family, `font-size: 1rem`,
  `line-height: normal` and every other inherited text property (weight, style, alignment, indent,
  transform, letter and word spacing, wrapping, shadow, cursor), plus `scrollbar-color`, prefixed at SDK
  strength. `scrollbar-width` is not restated: it does not inherit, and no element with the root class scrolls.
- **Why:** In 3.x the root's layered `font-family` lost to Meyer's unlayered `div { font: inherit }` on
  the root element itself, so the whole editor rendered in serif. Inherited text values must be set by a
  rule that beats host element rules on the root, and the root must not inherit the host body's
  line-height or font size. `1rem` keeps the editor in step with the token scale (also `rem`). The
  remaining properties were added after the bed showed Vite's template `#root { text-align: center }`
  centring node titles and field labels, and a host `scrollbar-color` on `html` making Chrome drop the
  editor's `::-webkit-scrollbar` theme (Chrome ignores it on any element that has the standard property).
- **Rejected:** inheriting from the host body (the 3.x behaviour); layered root typography.
- **Cost if wrong:** see 6.2 (`rem` follows the host's root font size).

### 5.10 Text-property reset on our own roles, not on bare elements

- **What:** `text-transform: none`, `letter-spacing: normal`, `word-spacing: normal`,
  `text-shadow: none` and `text-decoration: none` are set on every `.wb-text-*` role (one
  `[class*='wb-text-']` rule in `typography.css`) and on the base button. The root sets the inherited
  ones (5.9), so a host parent's values stop at the editor's edge. Nothing is set on bare `button`, `input`,
  `textarea`, `select` or `a` elements. Field labels and helpers are the exception: they set size, weight
  and line height in `field.module.css` and carry no role, so a host `label { text-transform }` still
  reaches them.
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

### 5.14 The popup container is passed as an element, created on the first render; modal state resets on unmount

- **What:** The container element is created once, in the shell's `useState` initialiser, so it exists
  from the first render, and `PortalContainerProvider` receives it directly. A layout effect appends it
  to `<body>` and removes it on unmount; a second one writes theme and language on it. It is `null`
  only without a DOM (server rendering). The modal store is reset when the Root unmounts.
- **Why:** A child that shows a snackbar or opens a popup from its mount effect needs the element to
  exist already: created in the shell's layout effect, which runs after its children's, it was `null`
  on the first commit and the snackbar had nowhere to render. Base UI's `FloatingPortal` treats a
  `null` container as "wait", so on the server popups wait for the client, while a ref object would
  resolve `.current` to `null` and fall back to `<body>`. The modal store is a module singleton that
  outlives the Root: a modal open when the host navigated away came back open on the next mount.
- **Rejected:** a ref prop with the object rebuilt on every change (the first version; it worked
  through a Base UI implementation detail and was about to become public API in `@workflowbuilder/ui`
  2.0); a container created in a layout effect and held in state (the second version; `null` on the
  first commit); a container created at module load (outlives the Root and stays in the host page).
- **Cost if wrong:** none observed; the remount scenario passes in the test bed.

### 5.15 The SDK prefix is one class above UI, not two IDs

- **What:** SDK modules use `:is(#\#, .workflow-builder-root).workflow-builder-root` (1,1,0 prefix), not a
  second ID.
- **Why:** The documented way for a host to override an editor internal on purpose is one ID of its own
  plus our class, for example `#app .workflow-builder-root ._x` (1,2,0 or more). A two-ID SDK prefix
  (2,x,y) would put every SDK rule above that, and hosts would need two IDs or `!important` for a
  routine override. One extra class is enough to keep SDK above UI, which is all the ladder needs.
- **Rejected:** `:is(#\#, …):is(#\#, …)` or a second made-up ID.
- **Cost if wrong:** an SDK rule with a short selector ties with a host override that has the same
  weight, and order decides. Host CSS normally loads after `style.css`, so the host wins, which is the
  intended direction. Inside the editor, a UI rule with two classes of its own (a state such as
  `.container.disabled`, 1,2,0) ties with a one-class SDK `className` override (1,2,0), and source order
  decides. The known cases are listed in 6.5 and are fixed per component rather than by a heavier prefix.

---

### 5.16 Form controls, labels and buttons declare what resets touch

- **What:** The checkbox and radio set `background-image: none; box-shadow: none`; the input and text
  area set `margin: 0; box-shadow: none` (the input also `height: auto; min-height: 0`); the field
  label and helper and the checkbox and radio `<label>` set `margin: 0`; the base button, the chip close
  button, the input and text area clear buttons and the calendar's day and arrow buttons set
  `margin: 0; min-width: auto; min-height: auto`; the Select and DatePicker triggers take the input
  height classes, so a host `button { min-height }` cannot grow them past the inputs beside them; the
  separator restates the `hr` defaults. Every value is the browser default or the height the control
  already has, so nothing changes visually.
- **Why:** A component rule wins only for the properties it declares (G2 covers declared properties, not
  gaps). `@tailwindcss/forms` paints its own tick with `background-image` and a `box-shadow` ring on
  `:focus`, Bootstrap 4 gives `label` a bottom margin, classless CSS gives inputs and buttons margins and
  heights, touch-target CSS gives every `button` a `min-height`. The bed showed a second tick, a second
  focus rectangle inside the field and taller inputs.
- **Rejected:** a bare-element reset (`button, input, label { … }`), for the reason in 5.10: it reaches
  host markup inside the editor. Also rejected: the button, checkbox and radio declarations at class
  weight (`:where(.workflow-builder-root) .button`, 0,1,0) so a consumer class could set them. That only
  ties with the consumer's class, and component CSS is injected after the host sheet, so the consumer
  still lost in the bed; a weight between tag and class (`button:is(button)`, 0,0,2) works but adds a
  second override story for three properties.
- **Cost if wrong:** a host that styled these properties on purpose through a tag rule now needs a rule
  with more weight, which is the documented override path. The same holds for a consumer class passed
  through `className` to Button, Checkbox or Radio: `margin`, `min-width` and `min-height` there need
  the id form (`#app .workflow-builder-root .x`), where 3.x honoured the plain class because it declared
  none of them. AI Studio's Run/Stop button was the first case.

### 5.17 Icon fill restated only for icons that ask for `currentColor`

- **What:** `:is(#\#, .workflow-builder-root) :where(svg[fill='currentColor']) { fill: currentColor }`
  in the SDK's `index.css`, at base weight (1,0,0).
- **Why:** Phosphor and the svgr icons colour themselves with the `fill="currentColor"` attribute, and a
  presentation attribute loses to any CSS rule, so a host `svg { fill: #555 }` recoloured 37 of 39
  gallery icons. Restating the value in CSS at base weight beats host rules and still loses to the three
  components that set their own fill.
- **Rejected:** a bare `svg { fill: currentColor }` for every `<svg>` in the editor. It also matched host
  icons rendered inside the editor; outline sets (Lucide, Heroicons outline, Feather) rely on
  `fill="none"`, and the bed showed an outline smiley turning into a solid disc. The attribute selector
  only restates what an icon already says about itself.
- **Shapes inside the icon:** two more rules at the same weight,
  `:where(svg[fill='currentColor'] :not([fill])) { fill: inherit }` and the same for `stroke`. A host
  `svg path { fill: yellow }` sets the paint on the shape itself, which beats the value the shape would
  inherit from the `<svg>`; the bed showed every node icon turning yellow. Shapes that carry their own
  `fill` or `stroke` attribute are skipped, so multi-colour artwork keeps its colours and stays open to
  such a host rule.
- **Shapes that say `currentColor` themselves:** a fourth rule restates `fill: currentColor` for
  `:where(svg[fill='currentColor'] [fill='currentColor'])`. The header logo puts the attribute on each
  path; its `<svg>` had `fill="none"`, so no rule above matched it and a host
  `svg path { stroke: red }` outlined it. The logo's `<svg>` now says `fill="currentColor"` as well.
- **Cost if wrong:** a host that colours the shapes of its own `fill="currentColor"` icon inside the
  editor with a plain rule (`.my-icon path { fill: red }`) loses to these rules and has to tint the icon
  through `color`. A host `svg { width; height }` still resizes icons whose wrapper sets no size (6.7).

## 6. Known limits and follow-ups

### 6.1 Host IDs and `!important`

A host rule with an ID selector, or with `!important`, that matches editor elements still wins. This is
the documented boundary and the documented override path. Host CSS like `#root button { … }` will
restyle the editor's buttons.

The variable text field is a visible case: its bundled dependency (`react-mentions-ts`) sets Tailwind-style
class names such as `border` and `p-0`, and Bootstrap's same-named utilities are `!important`. On a
Bootstrap page the field takes Bootstrap's border colour and loses its focus colour, and the suggestions
list loses its padding (follow-up: variable-text-utility-classes).

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

The outermost `.workflow-builder-root` paints the theme's base surface, text colour and font family
at base weight (`typography.css`), so a standalone dark wrapper is readable on a light host page. The
bed had shown the opposite: transparent, black, Times New Roman. Descendants that carry the class
(the SDK's layout box, the drag preview) are excluded, and the SDK's shell and modal set their own
surface at component weight. The surface and text colour go through `--wb-public-root-background-color`
and `--wb-public-root-color`, so a wrapper with a look of its own (a sidebar) sets the variables
instead of fighting the rule's weight with a class; the SDK's shell has the same in
`--wb-public-background-color`.

The same rule resets `letter-spacing`, `font-variant-numeric`, `font-feature-settings` and font
smoothing. The SDK's root rule already did; without the SDK the bed showed the wrapper and its popups
inheriting a host's `antialiased`, `tabular-nums` and `"ss01"` from `<body>`. Font size, weight and line
height are not reset here: a standalone wrapper can hold host content, and the components set their own.
The SDK's `host-inheritance.spec.mts` holds both lists: a property added to one rule fails there until it
is added to the other or named as SDK-only.

`useEdgeStyle` returns `fill: 'none'` for the same reason an icon's fill is restated (5.17): a
consumer's own edge path relied on a `fill="none"` attribute, which a host `svg path { fill }` beats.

### 6.7 Icon sizes come from SVG attributes

Phosphor icons size themselves with `width="1em" height="1em"`, which any host `svg { width; height }`
rule beats. Icons inside sized wrappers (buttons, inputs, chips, list items) keep their size; the
header logo, node icons, switch icons and the status badge icon do not, and the logo collapses to a
24px square under `svg { width: 24px }`. The fill is restated (5.17); the sizes are not, since a host
rule sizing every `<svg>` is rare (follow-up: icon-wrapper-sizes).

### 6.8 A hidden measuring `<textarea>` under `<body>`

`TextArea` grows with its content through `react-textarea-autosize`, which appends one `<textarea>` to
`<body>` to measure text height and reuses it for every field on the page. The library hides it with
inline `!important` styles (`visibility: hidden`, `height: 0`, `position: absolute`,
`z-index: -1000`) and marks it `aria-hidden`, so host CSS cannot show or size it. It predates 4.0. A
host notices it only by selecting elements, for example `body > textarea` in a test. Removing it means
replacing the library (follow-up: textarea-autosize-body-node).

---

## 7. How it was verified

A separate host app, outside this repo, installs the packed SDK and UI tarballs exactly as a customer
would, because the in-repo apps alias the SDK source and never see the built CSS. It puts the editor
into hostile pages (Bootstrap, Tailwind, Eric Meyer's reset, `button { all: unset }`, scoped `.app`
rules, inherited text properties, body layouts) and compares about 55 computed properties per element,
popups included, with the same page without host CSS. Every leak in 1.3 was reproduced there before it
was fixed and measured again after; the runs live in that app's results log and in the PR, not here.

Not covered by the host app: the decision, AI-agent and start node templates, the conditions form and
the syntax-highlighter node. The in-repo apps' test suites cover their behaviour.

What keeps the boundary from here on is in the repo: the checker (4.8) on every `build:lib` and PR;
the plugin specs; `prefix-strength.spec.mts` and the SDK's `postcss-pipeline.spec.mts` on real files;
`restated-defaults.spec.mts`, `root-resets.spec.ts` and the SDK's `host-inheritance.spec.mts` for the
declarations in 5.9, 5.16 and 5.17; and the
root-shell and portal-container specs for the DOM side.
