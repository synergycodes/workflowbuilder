---
title: Upgrade to 4.0
description: What changed between @workflowbuilder/sdk 3.0.0 and 4.0.0, and how to migrate an editor, its styles and the workflows it saved.
sidebar:
  order: 7
---

Version 4.0 settles the public API on one vocabulary and replaces the 3.x extension slots
with `builtInControls`, the `…Content` and `…MenuItem` components and the
`useWorkflowBuilderState()` / `useWorkflowBuilderActions()` hooks. Those are code changes:
TypeScript reports a renamed export, and the editor logs a `console.warn` naming the
replacement when it meets a removed slot or prop. The
[4.0 changelog](https://github.com/synergycodes/workflowbuilder/blob/main/packages/sdk/CHANGELOG.md)
lists every one of them with its replacement.

Three changes are silent: one separates the editor's styles from the host page's, one reaches
saved workflows rather than code, and one changes a path that TypeScript does not check. This
page walks through all three. `@workflowbuilder/ui` moves to 2.0.0 in the same release.

## Style boundary between the editor and the host page

Version 4.0 draws a boundary between the editor's styles and the host page's. In 3.x the SDK
wrote `data-theme` to `<html>`, reset `<body>`, and kept its component rules in a
cascade layer that any plain host rule could beat. In 4.0 the SDK writes nothing to `<html>` or
`<body>` apart from one popup container (a `display: contents` element that carries the editor's
class and theme), one hidden `<textarea>` that auto-growing text areas measure with and, while a modal is open, Base UI's scroll lock; its rules are scoped to the editor's element with enough weight to survive
host resets such as Bootstrap's reboot, Tailwind's preflight or `button { all: unset }`.

This section covers the host page, `--wb-*` overrides, custom CSS, code that reads the editor's
theme, and `@workflowbuilder/ui` used on its own.

### Give the editor a sized parent

The SDK no longer sets `margin`, `overflow` or `background-color` on `<body>`, and the canvas no
longer sizes itself to the window. The editor fills its parent, so the parent needs a height, or
the editor renders 0px tall. If your page background came from the SDK, set it yourself. The
same goes for the other page-wide rules 3.x shipped: themed scrollbars (`::-webkit-scrollbar`),
`button { cursor: pointer }` and the hidden spinners on number and time inputs now apply inside
the editor only. For a full-window editor:

```css
html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
}
```

For an editor inside a panel, give that panel a height instead (`height: 600px`, a flex or grid
track) and leave the page alone. In a custom layout the same applies to the element around
`<WorkflowBuilder.Canvas />`: the canvas fills it.

The editor element is now a real box with `position: relative` and `overflow: hidden`, where
3.x laid its children out against the page. Absolutely positioned content inside
`<WorkflowBuilder.Root>` (custom layouts, plugin overlays) is placed against the editor and
clipped at its edges. Render anything that must reach past the editor through a portal, or use
`position: fixed`.

### Move variable overrides to `.workflow-builder-root`

Theme and component variables now live on the editor's element, not on `:root`. An override
written on `:root` for 3.x is ignored by 4.0, because the editor's own value sits closer to the
elements that use it:

```css
/* 3.x */
:root {
  --wb-public-font-family: 'Inter', sans-serif;
}

/* 4.0 */
.workflow-builder-root {
  --wb-public-font-family: 'Inter', sans-serif;
}
```

This applies to `--wb-public-*` and to the themed `--wb-ds-*` tokens (those that differ between
light and dark). Primitives (`--wb-ds-colors-*`, `--wb-ds-space-*`, `--wb-ds-size-*`,
`--wb-ds-radius-*`, …) are the exception and stay on `:root`: the canvas geometry tokens declared
there read the spacing, size and radius primitives, so a primitive set on
`.workflow-builder-root` does not reach node and edge geometry. The editor's popups (menus,
selects, tooltips, modals, date pickers) render in a container that carries the same class, so
one `.workflow-builder-root` block reaches them too. The override wins whatever the stylesheet order, because the editor's defaults sit
in a cascade layer and yours do not. Two variables are the exception: the palette sets
`--wb-public-node-width` and the properties header sets `--wb-public-node-icon-padding` on their
own elements, so a value on `.workflow-builder-root` does not reach them.

That layer is now `wb-ui.base` (3.x used `ui.base` and `ui.component`), so it no longer collides
with a host layer named `ui`. If your CSS names `ui`, `ui.base` or `ui.component` in an `@layer`
statement, rename it or drop it: plain unlayered CSS beats the editor's defaults.

To follow your own theme, keep it on `:root` and bridge the values you want on the editor's
element. They flow in by inheritance and update when your theme changes:

```css
:root {
  --acme-font: 'Inter', sans-serif;
  --acme-canvas: #f4f6fb;
}

.workflow-builder-root {
  --wb-public-font-family: var(--acme-font);
  --wb-public-background-color: var(--acme-canvas);
}
```

### Select the theme with `data-wb-theme`

The SDK no longer writes `data-theme` to `<html>`. It sets `data-wb-theme="light"` or
`"dark"` on its own element and on the popup container. Selectors such as
`html[data-theme='dark'] .my-node` stop matching; use `[data-wb-theme='dark'] .my-node`.

A host that sets `data-theme` on `<html>` itself can keep it for its own purposes; the editor
no longer reads it. To drive the editor's theme from your app, pass the `theme` prop. It makes
the theme controlled: the editor shows that value and does not store its own. Add
`onThemeChange` to hear the editor's theme toggle:

```tsx
<WorkflowBuilder.Root theme={theme} onThemeChange={setTheme}>
```

Without `onThemeChange`, the theme is fixed at the value you pass.

### Removed and renamed tokens, and `<html lang>`

Chip color tokens now come in `bg` / `fg` pairs. A `var()` of an old name
resolves to nothing, so rename your overrides:

| Old                                      | New                                   |
| ---------------------------------------- | ------------------------------------- |
| `--wb-ds-components-chips-solid`         | `--wb-ds-components-chips-bg-solid`   |
| `--wb-ds-components-chips-solid-text`    | `--wb-ds-components-chips-fg-solid`   |
| `--wb-ds-components-chips-inset-outline` | `--wb-ds-components-chips-fg-outline` |

Two canvas tokens are gone with the design system update: `--wb-ds-canvas-edge-stroke-bold` and
`--wb-ds-canvas-edge-stroke-critical`. A `var()` of either now resolves to nothing. To keep the
previous look, use `var(--wb-ds-size-37)` (3px) for the bold stroke, and `var(--wb-ds-colors-red-500)`
in Light or `var(--wb-ds-colors-red-400)` in Dark for the critical one. `--wb-ds-canvas-edge-stroke-regular`
is now 1px: use `var(--wb-ds-size-25)` to keep 2px.

The SDK also stops writing `lang` to `<html>`. It sets `lang` on its own element and on the popup
container, from the language the editor resolved. If your page relied on the SDK for the document
language, set `<html lang="…">` yourself.

### Overriding editor internals

In 3.x any plain host rule beat the editor's layered rules, so `.my-app button { … }` could
restyle the editor's buttons by accident, and a reset could break them. In 4.0 every rule the
SDK and the UI library author carries the weight of one id selector, so plain host rules, resets
included, no longer reach them. If your 3.x CSS restyled editor elements with plain class rules on
purpose, those rules are now ignored; re-target them as shown below. Inherited text properties set
on a host ancestor (`text-align`, `font-weight`, `cursor`, `scrollbar-color`, …) also stop at the
editor's edge, including for your own content rendered inside it. The bundled third-party
stylesheets (React Flow's canvas, react-day-picker's calendar) keep their own selectors' weight, so
a host rule with a class and an element, such as `.app button { … }`, can still reach those
internals.

Variables remain the supported way to change the look. When you need to override an editor
element directly, use an id of your own plus the editor's class, or `!important`:

```css
#app .workflow-builder-root .my-node-title {
  font-weight: 700;
}
```

That selector ties with the SDK's single-class rules, so it wins when your CSS loads after the
SDK's `style.css`, which is the usual order, and it loses to SDK rules that carry a state or a
second class (`:hover`, `.a.b`). Repeating the class
(`#app .workflow-builder-root.workflow-builder-root .my-node-title`) adds one class of weight; the
one override that always wins is `!important`.

The same rule applies to a class you pass through `className` to the UI library's Button, Checkbox
or Radio. 4.0 restates their `margin`, `min-width` and `min-height` to block host resets, so a plain
`.save-button { margin-top: 1rem }` no longer reaches them; write it as
`#app .workflow-builder-root .save-button { … }`. Icons that use `fill="currentColor"` are
restated the same way, shapes inside them included, so tint them through `color`; a direct `fill` or
`stroke` on such an icon or on its paths (`.my-icon path { fill: red }`) needs the id form too.
To colour single shapes without a rule, give the shape its own `fill` attribute or an inline style.

Class names inside the editor are generated and can change between releases, so prefer your
own classes, for example on custom node templates, as the target.

### Use `@workflowbuilder/ui` on its own

The UI library's rules are scoped the same way. Components rendered outside
`<WorkflowBuilder.Root>` need an ancestor with the class and a theme:

```html
<div class="workflow-builder-root" data-wb-theme="light">
  <!-- @workflowbuilder/ui components -->
</div>
```

Popups render under `<body>` by default, outside that wrapper. Give them a container with the
same class and theme, and pass that element to `PortalContainerProvider` around your components
(example in the [UI Library overview](/ui-library/overview/#theming)). Inside
`<WorkflowBuilder.Root>` the SDK does both for you. An overlay of your own that you portal out of
the canvas (a `createPortal` to `document.body`) lands outside the editor and loses its tokens.
Portal it into the editor's container instead; `usePortalContainer` comes from `@workflowbuilder/ui`
(add it to your dependencies). It returns `null` during server rendering, where no container
exists, so check it before portaling:

```tsx
import { usePortalContainer } from '@workflowbuilder/ui';

const container = usePortalContainer();
return container ? createPortal(overlay, container) : null;
```

### Known limits

- **Id selectors and `!important` in host CSS still win.** A host rule with an id and a class,
  such as `#app .cta { … }`, outweighs the editor's rules if it matches inside the editor (an id
  alone, `#app button`, beats only the editor's base styles). On a page
  that loads Bootstrap's utility classes, which are `!important`, the variable text field takes
  Bootstrap's border colour and its suggestions list loses its padding.
- **Third-party internals keep their own weight.** React Flow's canvas and react-day-picker's
  calendar rules are bundled as they are, so a host rule with a class, such as
  `.app button { … }`, can still reach them. That includes layout: a rule that sets `position`,
  `display` or `transform` on every div under a class or an id, such as
  `.app div { position: relative }` or `#app div { display: block }`, misplaces the canvas's
  nodes, ports and edges. A bare `div { … }` or `* { … }` rule does not. Keep such rules out of
  the editor without adding weight: `.app div:not(:where(.workflow-builder-root *))`.
- **The editor follows the root font size.** Sizes are in `rem`, so a host that scales
  `html { font-size: 62.5% }` scales the editor with it. The editor is designed for the
  browser default of 16px.
- **Box sizing is a weak default in SDK content.** The editor applies `box-sizing: border-box`
  to its panels, custom nodes and plugin content with zero weight, so any host `box-sizing` rule
  wins there. The UI library's own components declare it at full weight.
- **Icon shapes with their own paint still take host rules.** The editor restates the colour of
  icons that use `fill="currentColor"`. A shape that carries a colour of its own in a `fill` or
  `stroke` attribute, as in multi-colour artwork, still takes a host rule like
  `svg path { fill: … }`.
- **Properties the editor leaves unset still come from the host.** The editor's rules win only
  for what they declare; a host rule such as `p { line-height: 2 }` or `span { font-weight: 300 }`
  still applies to editor text that sets neither. The same holds for bare tag rules on boxes and
  SVG: `div { border: … }` frames the editor's layout boxes, and `svg { max-width: 50% }` or
  `rect { fill: … }` reaches the canvas background.

### SCSS and Angular

Custom properties pass through SCSS unchanged. To use an SCSS variable as the value,
interpolate it: `--wb-public-font-family: #{$font-stack};`.

In Angular, write the `.workflow-builder-root { … }` block in a global stylesheet (for
example `styles.scss`) or in a component with `ViewEncapsulation.None`. With the default
emulated encapsulation Angular rewrites the selector to
`.workflow-builder-root[_ngcontent-…]`, which the React-rendered editor element never
carries, so the block would match nothing.

## Date and time values

A `date`, `datetime` or `time` picked in the editor is stored as zone-less wall time: the
day and clock as written, the same for every viewer. 3.0.0 stored an instant instead.

| Type       | 3.0.0 stored                                                   | 4.0 stores         |
| ---------- | -------------------------------------------------------------- | ------------------ |
| `date`     | `YYYY-MM-DDTHH:mm:ss.sssZ`, the author's midnight moved to UTC | `YYYY-MM-DD`       |
| `datetime` | `YYYY-MM-DDTHH:mm:ss.sssZ`, the picked clock moved to UTC      | `YYYY-MM-DDTHH:mm` |
| `time`     | not available                                                  | `HH:mm`            |

A date picker has no clock, so an instant lands on another day in another zone; with wall
time the author and every reader see the same day and clock. Values that come from outside
a workflow (an upstream output declared as `format: 'date-time'`) keep their zone and stay
instants. When a condition compares a set value with an instant, the worker reads the set
value in the workflow zone, which is UTC for now. A bare time that arrives with a zone is
compared as the clock written in it, without conversion.

Declare the properties these pickers write as `type: 'date'`, `type: 'datetime'` or
`type: 'time'` in the node schema, inside nested objects too. The SDK validates them itself;
`type: 'string'` with `format: 'date'` or `format: 'time'` is standard JSON Schema and
rejects the stored shapes.

### Who is affected

Values picked in 3.0.0 sit in two places of a saved workflow:

- the right-hand value (`y`) of a condition row in a `DynamicConditions` or
  `DecisionBranches` control, for example `decisionBranches[0].conditions[1].y`;
- the `defaultValue` of a global variable of type `date` or `datetime`.

  4.0 does not convert them: it cannot know the zone they were picked in. It reads the clock
  written in the string and drops the offset, so each value shows off by its author's UTC
  offset at the time. A date picked as 15 January 2024 in Warsaw was stored as
  `2024-01-14T23:00:00.000Z` and now reads as 14 January, 23:00.

When a workflow with such values loads, the editor logs one warning naming the count, up to
three locations and the marker of this section:

```text
[@workflowbuilder/sdk] 1 date/datetime value(s) were saved by SDK 3.0 as UTC instants (YYYY-MM-DDTHH:mm:ss.sssZ). 4.0 shows the clock written in them, so each is off by its author's UTC offset: node 7c9e6679-7425-40de-944b-e07fc1f90ae7 · decisionBranches[0].conditions[1].y. Re-pick each in the editor or convert the stored data once, see https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/#date-and-time-values (migration: zone-less-date-time)
```

### What to do

- Re-pick each listed value in the editor. Saving writes the new shape, and the warning
  stops once no instant is left.
- Or convert the stored JSON once, when you know the zone the values were picked in: parse
  the instant, format it in that zone as `YYYY-MM-DD` for a `date` or `YYYY-MM-DDTHH:mm`
  for a `datetime` (`Intl.DateTimeFormat` with `timeZone`, or `date-fns-tz`), and write it
  back. The SDK ships no helper for this on purpose: only you know the zone.

A field that you move from the `DatePicker` form control to `VariableDynamic` carries the
same caveat for the values it already holds. `DatePicker` keeps writing `Date#toString()`
strings in 4.0, and the warning does not cover them.

## Custom errors shown through `globalControls`

The `MessageOnError` entry of `globalControls` listens on `#/properties/customError`. In
3.0.0 it listened on `#/properties/missingPreviousVariable` and carried a default `text`.

A custom error written to `properties.customErrors` with
`instancePath: '/missingPreviousVariable'` still marks the node with the exclamation mark,
but its message no longer shows in the properties panel. Change the path:

```ts
data.properties.customErrors = [
  {
    instancePath: '/customError',
    message: i18n.t('your.custom.message'),
    schemaPath: '',
    keyword: '',
    params: {},
  },
];
```

The message comes from the error itself; a `MessageOnError` of your own can still set `text`
to override it.

## Where to go next

- [Theming](/get-started/theming/) for the override surface.
- [Design tokens](/ui-library/design-tokens/) for the token set.
- [Use the variable picker](/guides/use-variable-picker/) for the `VariableDynamic` control
  and the variable types behind the date and time values.
- [Upgrade to 3.0](/get-started/upgrade-to-3/) if you come from 2.3.0.
