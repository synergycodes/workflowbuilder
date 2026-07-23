---
'@workflowbuilder/sdk': minor
---

Slimmer install: the base install is now `@workflowbuilder/sdk @xyflow/react zustand`. `@jsonforms/core`, `@jsonforms/react`, `i18next`, `react-i18next`, `i18next-browser-languagedetector` and `immer` moved from peer to regular dependencies and install automatically. JsonForms authoring primitives (`withJsonFormsControlProps`, `rankWith`, `useJsonForms`, `RuleEffect`, `ControlProps`, …) are now re-exported from `@workflowbuilder/sdk`, so custom renderers need no extra installs.
