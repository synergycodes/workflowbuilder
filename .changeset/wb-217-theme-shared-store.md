---
'@workflowbuilder/sdk': patch
---

fix: theme is now a shared store, applied to the DOM on load. Previously `useTheme` held per-component `useState`, so multiple consumers could desync and the persisted theme was only applied to the DOM by the app-bar toggle's mount effect. Theme now lives in a single module-level store (`useSyncExternalStore`), and the persisted value is applied to `document` on import, so a saved non-default theme paints correctly on first load even when `<WorkflowBuilder.TopBar />` is omitted.
