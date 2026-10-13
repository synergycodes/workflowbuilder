---
'@workflowbuilder/sdk': minor
---

New `PropertiesPanelFooterContent` renders its children in the properties panel footer from anywhere under `<WorkflowBuilder.Root>`, including a JsonForms control. The panel's Delete button shows only with `onDeleteClick`, and the footer disappears when it has nothing to show. A decorator that calls `onDeleteClick` now needs `onDeleteClick?.()`.
