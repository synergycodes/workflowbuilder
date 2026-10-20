---
'@workflowbuilder/sdk': patch
---

Dragging a node from the palette onto the canvas now works on touch devices. Generated ids fall back to `crypto.getRandomValues()` when `crypto.randomUUID()` is unavailable (e.g. plain HTTP on a LAN address), and the palette listens for pointer down instead of mouse down.
