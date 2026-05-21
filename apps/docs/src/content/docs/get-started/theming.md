---
title: Theming
description: Customise the editor's visual style — fonts, background, tokens — via CSS variables on :root.
sidebar:
  order: 5
---

The aggregated `style.css` ships with the SDK's default visual layer. Override CSS custom properties on `:root` (or a higher-priority selector) to customise.

## Typography

Poppins is bundled into `style.css` as inline base64 woff2 (latin + latin-ext, weights 300–700). No external font CDN is contacted at runtime — works under strict CSP, behind GDPR-controlled consent flows, and in air-gapped deployments.

Override `--wb-font-family` to use a different face:

```css
:root {
  --wb-font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```

Provide the font yourself (via `@font-face`, `@fontsource/<font>`, etc.) — the SDK only consumes the variable.

## Other tokens

The SDK exposes a small surface of `--wb-*` variables (background, scrollbar, transitions) plus the larger `--ax-*` design-token set re-exported from `@synergycodes/overflow-ui`. See [Design System & Customization](/overview/features/design-system-and-customization/) for the full token map.
