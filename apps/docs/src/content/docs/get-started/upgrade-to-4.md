---
title: Upgrade to 4.0
description: What changed between @workflowbuilder/sdk 3.x and 4.0, and how to migrate the host page, theme overrides and custom CSS.
sidebar:
  order: 6
---

Version 4.0 draws a boundary between the editor's styles and the host page's. In 3.x the SDK
wrote `data-theme` to `<html>`, reset `<body>`, and kept its component rules in a
cascade layer that any plain host rule could beat. In 4.0 the SDK changes nothing outside its
own element, and its rules are scoped to that element with enough weight to survive host
resets such as Bootstrap's reboot, Tailwind's preflight or `button { all: unset }`.

An editor that sits in a sized container and keeps the default look upgrades by bumping the
version. Read on if the editor relied on the SDK to size the page, if you override `--wb-*`
variables or style editor internals, if your code reads the editor's theme, or if you use
`@workflowbuilder/ui` on its own. `@workflowbuilder/ui` moves to 2.0.0 in the same release.

## Give the editor a sized parent

The SDK no longer sets `margin`, `overflow` or `background-color` on `<body>`, and the canvas no
longer sizes itself to the window. The editor fills its parent, so the parent needs a height, or
the editor renders 0px tall. If your page background came from the SDK, set it yourself. For a
full-window editor:

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

## Move variable overrides to `.workflow-builder-root`

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
light and dark). Tokens that live on `:root`, such as primitives like `--wb-ds-colors-acc1-500`
and the canvas geometry, still work there, but `.workflow-builder-root` is the one place that
works for every `--wb-*` override. The editor's popups (menus, selects, tooltips,
modals, date pickers) render in a container that carries the same class, so one block reaches
them too. The override wins whatever the stylesheet order, because the editor's defaults sit
in a cascade layer and yours do not.

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

## Select the theme with `data-wb-theme`

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

## Overriding editor internals

In 3.x any plain host rule beat the editor's layered rules, so `.my-app button { … }` could
restyle the editor's buttons by accident, and a reset could break them. In 4.0 every rule the
SDK and the UI library author carries the weight of one id selector, so plain host rules, resets
included, no longer reach them. The bundled third-party stylesheets (React Flow's canvas,
react-day-picker's calendar) keep their own selectors' weight, so a host rule with a class and an
element, such as `.app button { … }`, can still reach those internals.

Variables remain the supported way to change the look. When you need to override an editor
element directly, outweigh its rule with an id of your own plus the editor's class, or use
`!important`:

```css
#app .workflow-builder-root .my-node-title {
  font-weight: 700;
}
```

Class names inside the editor are generated and can change between releases, so prefer your
own classes, for example on custom node templates, as the target.

## Use `@workflowbuilder/ui` on its own

The UI library's rules are scoped the same way. Components rendered outside
`<WorkflowBuilder.Root>` need an ancestor with the class and a theme:

```html
<div class="workflow-builder-root" data-wb-theme="light">
  <!-- @workflowbuilder/ui components -->
</div>
```

Popups render under `<body>` by default, outside that wrapper. Give them a container with the
same class and theme, and pass a ref to it to `PortalContainerProvider` around your components
(example in the [UI Library overview](/ui-library/overview/#theming)). Inside
`<WorkflowBuilder.Root>` the SDK does both for you.

## Known limits

- **Id selectors and `!important` in host CSS still win.** A host rule with an id, such as
  `#app button { … }`, outweighs the editor's rules if it matches inside the editor.
- **Third-party internals keep their own weight.** React Flow's canvas and react-day-picker's
  calendar rules are bundled as they are, so a host rule with a class, such as
  `.app button { … }`, can still reach them.
- **The editor follows the root font size.** Sizes are in `rem`, so a host that scales
  `html { font-size: 62.5% }` scales the editor with it. The editor is designed for the
  browser default of 16px.
- **Box sizing is a weak default.** The editor applies `box-sizing: border-box` to its
  contents with zero weight. Any host `box-sizing` rule wins, including inside custom nodes
  and panels.

## SCSS and Angular

Custom properties pass through SCSS unchanged. To use an SCSS variable as the value,
interpolate it: `--wb-public-font-family: #{$font-stack};`.

In Angular, write the `.workflow-builder-root { … }` block in a global stylesheet (for
example `styles.scss`) or in a component with `ViewEncapsulation.None`. With the default
emulated encapsulation Angular rewrites the selector to
`.workflow-builder-root[_ngcontent-…]`, which the React-rendered editor element never
carries, so the block would match nothing.

## Where to go next

- [Theming](/get-started/theming/) for the override surface.
- [Design tokens](/ui-library/design-tokens/) for the token set.
- [Upgrade to 3.0](/get-started/upgrade-to-3/) if you are coming from 2.x.
