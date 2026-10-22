---
'@workflowbuilder/sdk': major
---

The 3.x way of extending the app bar, the palette and the properties panel is removed; `builtInControls`, the `…Content` and `…MenuItem` components, `useWorkflowBuilderState()` and `useWorkflowBuilderActions()` are the only way. Using a removed element logs a `console.warn` naming its replacement, in production too. Removed, with the replacement:

- the `OptionalAppBarTools` slot -> `AppBarToolsContent`, plus `builtInControls={{ save: false }}` to hide Save;
- the `OptionalAppBarControls` slot -> `AppBarControlsContent`;
- the `OptionalFooterContent` slot -> `PaletteFooterContent`;
- the `getControlsDotsItems` function decorator -> `AppBarMenuItem`, plus `builtInControls` to hide `export` and `import`;
- `onDuplicateClick` on `ProjectSelectionProps` -> `ProjectMenuItem`;
- `onMenuHeaderClick` on `PropertiesBarProps` -> `PropertiesPanelMenuItem`;
- the `PropertiesPanelFooter` alias -> `PropertiesPanelFooterContent`;
- `ProjectSelection`, `ProjectSelectionProps` and the `'ProjectSelection'` slot -> no direct replacement: menu items go through `ProjectMenuItem`, `builtInControls` hides `settings` and `documentRename`, and an own title is built from `useWorkflowBuilderState().documentName` with `renameDocument` and `openSettings` from `useWorkflowBuilderActions()`.
