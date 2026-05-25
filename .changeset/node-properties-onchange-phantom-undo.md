---
'@workflowbuilder/sdk': patch
---

fix: stop `NodeProperties` from pushing a phantom undo entry when JsonForms re-emits `onChange` after an external `data` change (e.g. just after `undo()`), which previously cleared `future` and broke redo.
