---
'@workflowbuilder/sdk': patch
---

fix: drop `nodeId` from handle IDs. Compound nodes (decision, AI agent, conditional) can now declare default ports statically (e.g. in JSON-defined `defaultProperties`) and copy/paste no longer requires custom handle rewriting after a node ID change. `getHandleId({ nodeId })` still compiles — the argument is optional, marked `@deprecated`, and ignored at runtime. Diagrams saved with the 2.0.0 `<nodeId>:<handleType>[:inner:<innerId>]` format are auto-migrated to the new `<handleType>[:inner:<innerId>]` form on `setDiagramModel` and `setStoreDataFromIntegration`.
