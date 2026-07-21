---
'@workflowbuilder/sdk': minor
---

Reduce the required peer dependencies from ten to four. `@jsonforms/core`, `@jsonforms/react`, `i18next`, `react-i18next`, `i18next-browser-languagedetector` and `immer` are now regular dependencies that install automatically, so the full install is `@workflowbuilder/sdk @xyflow/react zustand` on any package manager (`react`/`react-dom` stay peers but are already in any React app).
