---
'@workflowbuilder/sdk': minor
---

`builtInControls` on `<WorkflowBuilder.Root>` hides any built-in control by key (`save`, `readOnlyToggle`, `themeToggle`, `languageSelector`, `settings`, `documentRename`, `export`, `import`, `templates`, `paletteToggle`, `delete`, `propertiesPanelToggle`); every key defaults to `true`. Hiding a control does not block its action or keyboard shortcut. The language selector is now a built-in app bar control rather than a decorator, so plugin content placed `before` on `OptionalAppBarControls` renders before it. Auto-save now belongs to `<WorkflowBuilder.Root>`, so a custom layout without the top bar saves automatically as well.
