---
'@workflowbuilder/sdk': major
---

Styles no longer leak between the editor and the host page: the SDK writes nothing to `<html>` or `<body>` apart from a popup container and, while a modal is open, Base UI's scroll lock, every editor rule is scoped to `.workflow-builder-root` with enough weight to beat host resets, and inherited text properties, `color-scheme`, scrollbar colours and `svg { fill }` rules from the host stop at the editor's edge. The JSON editor in the import and export dialogs takes its colours from the new code tokens.

Migration: give the editor a sized parent (it is now a positioned box that clips its contents); move `--wb-*` overrides from `:root` to `.workflow-builder-root`; select the theme with `[data-wb-theme]` or the new `theme` / `onThemeChange` props instead of `html[data-theme]`; re-target host CSS that restyled editor elements with plain class rules, which are now ignored; set `<html lang>` yourself, the SDK no longer does. See the [Upgrade to 4.0 guide](https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/).
