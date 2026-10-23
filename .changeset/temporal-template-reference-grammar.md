---
'@workflowbuilder/temporal': minor
---

`resolveTemplate` accepts a reference only in the form the variable picker stores it: `{{namespace.path}}` with no whitespace inside the braces and no empty path segment. `{{ nodes.x }}`, `{{nodes.x }}` and `{{nodes.x? }}` now fail the node with `template_malformed`; whitespace is still accepted around the `|` and `:` of `| default:'…'`.
