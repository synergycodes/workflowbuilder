---
'@workflowbuilder/sdk': patch
---

fix: editor store is now a global module-level singleton. Imperative reads —
`useStore.getState()` and the `getStore*` / `setStore*` action helpers built on
it — no longer throw "Imperative store access before <WorkflowBuilder.Root>
mount" when called during a descendant's render or layout effect. `useStore`
(selector hook) and `useStore.{getState,setState,subscribe}` keep their exact
signatures, so consumer code is unchanged. Sequential `<WorkflowBuilder.Root>`
remounts (mount → save → unmount → mount next) reset to a clean state on mount.
