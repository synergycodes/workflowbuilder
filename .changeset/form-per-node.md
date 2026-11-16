---
'@workflowbuilder/sdk': patch
---

Selecting another node no longer resets or replaces a Select value in its properties, and text typed for one node is no longer written to another. A condition keeps its "is equal" operator when the left operand changes type. The properties form now mounts anew for each selected node, so collapsed sections reset and custom `jsonForm` renderers lose their local state and run their mount and unmount effects on every selection change.
