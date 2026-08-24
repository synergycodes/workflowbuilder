---
title: Theming
description: Customise the editor's visual style — fonts, background, tokens — via CSS variables on :root.
sidebar:
  order: 5
---

The aggregated `style.css` ships with the SDK's default visual layer. Override CSS custom properties on `:root` (or a higher-priority selector) to customise.

## Typography

`style.css` inlines Poppins latin 400 and 600 and references the remaining Poppins and Inter faces in the adjacent `assets` directory. Preserve that `dist` layout when copying the stylesheet. If a Content Security Policy (CSP) exists, allow both `data:` and `'self'` or the origin serving those assets in `font-src`, or in `default-src` when `font-src` is absent. No external font CDN is contacted at runtime, so the SDK still works behind consent controls and in air-gapped deployments.

Other weights, Inter, and non-ASCII glyphs use `font-display: swap` assets. They can briefly appear in the fallback font while the matching file loads; preload the relevant `.woff2` files when that flash of unstyled text (FOUT) is unacceptable.

Override `--wb-font-family` to use a different face:

```css
:root {
  --wb-font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```

Provide the font yourself (via `@font-face`, `@fontsource/<font>`, etc.) — the SDK only consumes the variable.

## Other tokens

The SDK exposes its own `--wb-*` variables (background, scrollbar, transitions), the generated design-token set from `@workflowbuilder/ui`, and `--wb-public-*` overrides for individual components. See [Design System & Customization](/overview/features/design-system-and-customization/) for the full token map.
