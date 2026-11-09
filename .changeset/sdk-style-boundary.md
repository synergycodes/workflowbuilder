---
'@workflowbuilder/sdk': major
'@workflowbuilder/ui': major
---

Styles no longer leak between the editor and the host page. The SDK writes nothing to `<html>` or `<body>` apart from a popup container, every editor rule is scoped to `.workflow-builder-root` with enough weight to beat host resets (Bootstrap's reboot, Tailwind's preflight, `@tailwindcss/forms`, classless CSS), inherited text properties and scrollbar colours set on a host ancestor stop at the editor's edge, and a host `svg { fill }` rule no longer recolours the editor's icons. `@workflowbuilder/ui` exports `PortalContainerProvider` and `usePortalContainer` so popups and overlays render inside a themed container.

Migration: give the editor a sized parent (it is now a positioned box that clips its contents); move `--wb-*` overrides from `:root` to `.workflow-builder-root`; select the theme with `[data-wb-theme]` or the new `theme` / `onThemeChange` props instead of `html[data-theme]`; re-target host CSS that restyled editor elements with plain class rules, which are now ignored; wrap standalone `@workflowbuilder/ui` in `.workflow-builder-root` with `data-wb-theme`; the defaults layer is now `wb-ui.base`, so rename any `ui.base` / `ui.component` in your own `@layer` statements. See the [Upgrade to 4.0 guide](https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/).

Design tokens updated to design system 1.1.34: new run-status, code, node icon tile and badge tokens; nodes get 12px padding, dark-mode status colours are stronger and the edge label border is 1px. Date picker: the selected day's number is white on the accent fill in light mode, and today's date is readable in dark mode. The JSON editor in the import and export dialogs takes its colours from the new code tokens.
