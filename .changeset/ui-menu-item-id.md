---
'@workflowbuilder/ui': minor
---

`MenuItemProps` gains an optional `id` that keys the row, so two items of one `Menu` may share a `label`. Without an `id` the row is keyed by its `label`, as before.
