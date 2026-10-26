---
'@workflowbuilder/sdk': major
'@workflowbuilder/ui': major
---

Styles no longer leak between the editor and the host page. The SDK stops touching `<html>` and `<body>`, and every editor rule is scoped to `.workflow-builder-root` with enough weight to beat host resets such as Bootstrap's reboot or Tailwind's preflight.

Migration: give the editor a sized parent; move `--wb-*` overrides from `:root` to `.workflow-builder-root`; select the theme with `[data-wb-theme]` or the new `theme` / `onThemeChange` props instead of `html[data-theme]`; wrap standalone `@workflowbuilder/ui` in `.workflow-builder-root` with `data-wb-theme`. See the [Upgrade to 4.0 guide](https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/).
