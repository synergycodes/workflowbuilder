---
'@workflowbuilder/temporal': minor
---

`resolveTemplate` is now exported, so executors outside this repository can resolve `{{namespace.path}}` references the same way the reference worker does.

A reference now resolves only through own properties, so a path such as `{{nodes.x.constructor}}`, `{{nodes.x.toString}}` or `{{nodes.x.__proto__}}` fails as `template_unresolved` (or takes its `?` / `default:` fallback) instead of reaching an inherited member. Array indices and an array's `length` still resolve.
