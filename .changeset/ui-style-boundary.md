---
'@workflowbuilder/ui': major
---

Component rules are no longer in a cascade layer: they are scoped to `.workflow-builder-root` at build time with enough weight to beat host resets (Bootstrap's reboot, Tailwind's preflight, `@tailwindcss/forms`, classless CSS), and `PortalContainerProvider` / `usePortalContainer` render popups and overlays inside a themed container. The date picker's selected and today's dates are readable in both themes.

Migration: wrap standalone components in `.workflow-builder-root` with `data-wb-theme` (the wrapper paints the theme's surface and text colour; `--wb-public-root-background-color` and `--wb-public-root-color` change that); move `--wb-*` overrides from `:root` to `.workflow-builder-root`; the defaults layer is now `wb-ui.base`, so rename any `ui.base` / `ui.component` in your own `@layer` statements. See the [Upgrade to 4.0 guide](https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/).
