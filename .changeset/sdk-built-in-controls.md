---
'@workflowbuilder/sdk': minor
---

`builtInControls` on `<WorkflowBuilder.Root>` hides any built-in control by key (`save`, `readOnlyToggle`, `themeToggle`, `languageSelector`, `settings`, `workflowRename`, `export`, `import`, `templates`, `paletteToggle`, `delete`, `propertiesPanelToggle`); every key defaults to `true`. Hiding a control does not block its action or keyboard shortcut. The language selector is now a built-in editor header control rather than a decorator, so own content placed before it through `EditorHeaderControlsContent` renders before it. Auto-save now belongs to `<WorkflowBuilder.Root>`, so a custom layout without the editor header saves automatically as well.
