---
'@workflowbuilder/sdk': patch
---

Dragging a node from the palette onto the canvas now works on touch devices; the palette hands the dragged item over through pointer events instead of the HTML5 drag `dataTransfer`, which mobile browsers never deliver. Ids the editor generates for nodes, AI agent tools and variables also fall back to a `crypto.getRandomValues()`-based UUID when `crypto.randomUUID()` is unavailable, e.g. when the editor is opened over plain HTTP from a LAN address. The `draggedItem` and `setDraggedItem` fields are gone from the editor store returned by `useStore`; the in-flight palette item is internal to the palette now.
