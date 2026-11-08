---
'@workflowbuilder/sdk': major
'@workflowbuilder/ui': major
---

Styles no longer leak between the editor and the host page. The SDK stops touching `<html>` and `<body>`, and every editor rule is scoped to `.workflow-builder-root` with enough weight to beat host resets such as Bootstrap's reboot or Tailwind's preflight. Separator, checkbox, radio, input and text area also declare the properties that `hr` and form resets set (`@tailwindcss/forms`, classless CSS), so those resets no longer add a second tick, a focus ring or extra margin. Text alignment, weight, wrapping, the cursor and scrollbar colours set on a host ancestor (such as Vite's `#root { text-align: center }`) no longer reach the editor.

Migration: give the editor a sized parent (it is now a positioned box that clips its contents); move `--wb-*` overrides from `:root` to `.workflow-builder-root`; select the theme with `[data-wb-theme]` or the new `theme` / `onThemeChange` props instead of `html[data-theme]`; wrap standalone `@workflowbuilder/ui` in `.workflow-builder-root` with `data-wb-theme`. See the [Upgrade to 4.0 guide](https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/).

Design tokens updated to design system 1.1.34: new run-status, code, node icon tile and badge tokens; nodes get 12px padding, dark-mode status colours are stronger and the edge label border is 1px. Date picker: the selected day's number is white on the accent fill in light mode, and today's date is readable in dark mode. The JSON editor in the import and export dialogs takes its colours from the new code tokens.
