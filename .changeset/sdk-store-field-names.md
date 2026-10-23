---
'@workflowbuilder/sdk': major
---

Store fields read through `useStore` are renamed: `isSidebarExpanded` -> `isPaletteOpen`, `toggleSidebar` -> `setPaletteOpen`, `isReadOnlyMode` -> `isReadOnly`, `setToggleReadOnlyMode` -> `setReadOnly`. `setReadOnly` and `setPaletteOpen` take the new value; to toggle, call `toggleReadOnly()` or `togglePalette()` from `useWorkflowBuilderActions()`. `useWorkflowBuilderState()` and `useWorkflowBuilderActions()` are the supported way to read and change this state.
