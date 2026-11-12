---
'@workflowbuilder/sdk': minor
---

`Shift+1` zooms the canvas to fit every node, next to the existing `Ctrl++` / `Ctrl+-` zoom shortcuts. It fires only while the canvas has focus, like the other canvas shortcuts. `useKeyPress` gains a `withShift` option and also matches `keyCode` against `event.code`, so layout-independent bindings such as `'Digit1'` work.
