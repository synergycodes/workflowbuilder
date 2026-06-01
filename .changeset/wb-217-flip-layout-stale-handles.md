---
'@workflowbuilder/sdk': patch
---

fix: re-measure node internals when `layoutDirection` changes. React Flow caches each handle's measured bounds; when the direction flipped, the cache stayed stale and edges kept routing to the old port positions on every node that had already been mounted. The `DiagramContainer` now calls `updateNodeInternals` for all mounted nodes whenever `layoutDirection` changes, so handle positions, edge routing, and the new `toggleLayoutDirection` action all stay in sync.
