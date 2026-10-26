---
title: Theming
description: Customise the editor's visual style — background, tokens, and typography — via CSS variables.
sidebar:
  order: 5
---

The aggregated `style.css` ships with the SDK's default visual layer. Override CSS custom properties on `.workflow-builder-root`, the editor's element. The container the editor's popups (Modal, Menu, Tooltip, Select, DatePicker) render in carries the same class, so one block reaches them too.

Overrides on `:root` are ignored for public variables and themed tokens; only tokens the design system itself declares on `:root` (primitives such as `--wb-ds-colors-*`, canvas geometry) work there. CSS variables inherit through the DOM, not the React tree: custom layouts passed as Root children inherit the overrides, but portals created by host or plugin code outside the editor do not. To theme the editor from your own variables, see the bridge example in [Upgrade to 4.0](/get-started/upgrade-to-4/#move-variable-overrides-to-workflow-builder-root).

## Typography

Built-in text uses bundled type styles. `wb-text-code` uses Inter for token names and IDs, while `wb-text-code-mono` uses a fixed-width system stack. `style.css` inlines Poppins latin 400 and 600 and references the remaining Poppins and Inter faces in the adjacent `assets` directory. Preserve that `dist` layout when copying the stylesheet. If a Content Security Policy (CSP) exists, allow both `data:` and `'self'` or the origin serving those assets in `font-src`, or in `default-src` when `font-src` is absent. No external font content delivery network (CDN) is contacted at runtime, so the SDK still works behind consent controls and in air-gapped deployments.

Other weights, Inter, and non-ASCII glyphs use `font-display: swap` assets. They can briefly appear in the fallback font while the matching file loads; preload the relevant `.woff2` files when that flash of unstyled text (FOUT) is unacceptable.

`--wb-public-font-family` controls the builder root and every Poppins-backed type role. The proportional `wb-text-code` role remains Inter. `--wb-public-font-family-mono` controls `wb-text-code-mono` and the syntax editor:

```css
.workflow-builder-root {
  --wb-public-font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --wb-public-font-family-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

Provide any replacement font yourself via `@font-face`, `@fontsource/<font>`, or an equivalent local source.

## Other tokens

The supported customization contract uses `--wb-public-*` for SDK controls and component overrides. Generated design tokens from `@workflowbuilder/ui` use `--wb-ds-*`; `--wb-sdk-*` is reserved for private SDK implementation details. See [Design System & Customization](/overview/features/design-system-and-customization/) for the full token map.

For the migration from `--ax-*`, see the [3.0 upgrade guide](/get-started/upgrade-to-3/).
