---
'@workflowbuilder/sdk': minor
---

`PropertiesPanelFooter` is renamed to `PropertiesPanelFooterContent` and now renders its children in the properties panel footer from anywhere under `<WorkflowBuilder.Root>`, not only from inside the panel's content; `PropertiesPanelFooter` stays as a deprecated alias. The panel's Delete button shows only with `onDeleteClick`, and the footer disappears when it has nothing to show. A decorator that calls `onDeleteClick` now needs `onDeleteClick?.()`.
