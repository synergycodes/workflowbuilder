---
'@workflowbuilder/sdk': major
---

Store fields read through `useStore` are renamed: `isSidebarExpanded` -> `isPaletteOpen`, `toggleSidebar` -> `setPaletteOpen`, `isReadOnlyMode` -> `isReadOnly`, `setToggleReadOnlyMode` -> `setReadOnly`. `useWorkflowBuilderState()` and `useWorkflowBuilderActions()` are the supported way to read and change this state.
