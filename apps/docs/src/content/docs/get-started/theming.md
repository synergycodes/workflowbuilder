---
title: Theming
description: Customise the editor's visual style — background, tokens, and typography — via CSS variables.
sidebar:
  order: 5
---

The aggregated `style.css` ships with the SDK's default visual layer. Override CSS custom properties on `:root` (or a higher-priority selector) to customise.

CSS variables inherit through the DOM, not the React tree. Modal, Menu, Tooltip, Select, and DatePicker surfaces mount under `document.body`, so app-shell-scoped overrides do not reach them. This applies to all theme tokens, including backgrounds and component overrides; use `:root` or apply the overrides to the portal container too. Custom layouts passed as Root children and SDK-owned body portals join the builder's font scope, but portals created by host or plugin code remain outside it.

## Typography

Built-in text uses bundled type styles. `wb-text-code` uses Inter for token names and IDs, while `wb-text-code-mono` uses a fixed-width system stack. `style.css` inlines Poppins latin 400 and 600 and references the remaining Poppins and Inter faces in the adjacent `assets` directory. Preserve that `dist` layout when copying the stylesheet. If a Content Security Policy (CSP) exists, allow both `data:` and `'self'` or the origin serving those assets in `font-src`, or in `default-src` when `font-src` is absent. No external font content delivery network (CDN) is contacted at runtime, so the SDK still works behind consent controls and in air-gapped deployments.

Other weights, Inter, and non-ASCII glyphs use `font-display: swap` assets. They can briefly appear in the fallback font while the matching file loads; preload the relevant `.woff2` files when that flash of unstyled text (FOUT) is unacceptable.

`--wb-public-font-family` controls the builder root and every Poppins-backed type role. The proportional `wb-text-code` role remains Inter. `--wb-public-font-family-mono` controls `wb-text-code-mono` and the syntax editor:

```css
:root {
  --wb-public-font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --wb-public-font-family-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

Provide any replacement font yourself via `@font-face`, `@fontsource/<font>`, or an equivalent local source.

## Snackbar position

Snackbars stack at the bottom centre of the viewport. `--wb-public-snackbar-offset-bottom` takes a CSS length, such as `120px`: the distance from the viewport bottom to the lowest snackbar (default `20px`). A stack too tall for the space above that distance stays on screen, pinned 20px below the viewport top, and overlaps what is beneath it. To keep snackbars clear of a docked panel, measure the panel against the viewport, update the value when the panel resizes, and remove it to restore the default. The example assumes a panel pinned to the viewport bottom; one that moves without resizing needs its own trigger:

```ts
const GAP = 12; // space between the panel and the lowest snackbar
const root = document.documentElement.style;
const update = () => {
  const offset = window.innerHeight - panel.getBoundingClientRect().top + GAP;
  root.setProperty('--wb-public-snackbar-offset-bottom', `${offset}px`);
};

update();
const observer = new ResizeObserver(update);
observer.observe(panel);

// When the panel goes away:
observer.disconnect();
root.removeProperty('--wb-public-snackbar-offset-bottom');
```

## Other tokens

The supported customization contract uses `--wb-public-*` for SDK controls and component overrides. Generated design tokens from `@workflowbuilder/ui` use `--wb-ds-*`; `--wb-sdk-*` is reserved for private SDK implementation details. See [Design System & Customization](/overview/features/design-system-and-customization/) for the full token map.

For the migration from `--ax-*`, see the [3.0 upgrade guide](/get-started/upgrade-to-3/).
