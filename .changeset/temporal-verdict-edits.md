---
'@workflowbuilder/temporal': minor
---

A verdict's `resolution` may carry `edits`, keyed by context path (`nodes/<id>/<field>`, `global/<field>`, `trigger/…`, `variables/…`). Once the node's output has landed, the runner patches the execution context with them, so later nodes and their `{{…}}` templates read the edited values. Histories recorded by earlier versions replay unchanged.
