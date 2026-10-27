---
'@workflowbuilder/sdk': minor
---

`PropertiesPanelFooterContent` renders its children in the properties panel footer from anywhere under `<WorkflowBuilder.Root>`, not only from inside the panel's content. The panel's Delete button shows only with `onDeleteClick`, and the footer disappears when it has nothing to show. A decorator that calls `onDeleteClick` now needs `onDeleteClick?.()`.
