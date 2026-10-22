---
'@workflowbuilder/sdk': major
---

The 3.x way of extending the editor header, the palette and the properties panel is removed; `builtInControls`, the `…Content` and `…MenuItem` components, `useWorkflowBuilderState()` and `useWorkflowBuilderActions()` are the only way. Using a removed element logs a `console.warn` naming its replacement, in production too. Removed, with the replacement:

- the `OptionalAppBarTools` slot -> `EditorHeaderToolsContent`, plus `builtInControls={{ save: false }}` to hide Save;
- the `OptionalAppBarControls` slot -> `EditorHeaderControlsContent`;
- the `OptionalFooterContent` slot -> `PaletteFooterContent`;
- the `getControlsDotsItems` function decorator -> `EditorHeaderMenuItem`, plus `builtInControls` to hide `export` and `import`;
- `onDuplicateClick` on `ProjectSelectionProps` -> `WorkflowMenuItem`;
- `onMenuHeaderClick` on `WorkflowBuilderPropertiesPanelProps` -> `PropertiesPanelMenuItem`;
- the `PropertiesPanelFooter` alias -> `PropertiesPanelFooterContent`;
- `ProjectSelection`, `ProjectSelectionProps` and the `'ProjectSelection'` slot -> no direct replacement: menu items go through `WorkflowMenuItem`, `builtInControls` hides `settings` and `workflowRename`, and an own title is built from `useWorkflowBuilderState().workflowName` with `setWorkflowName` and `openSettings` from `useWorkflowBuilderActions()`.
