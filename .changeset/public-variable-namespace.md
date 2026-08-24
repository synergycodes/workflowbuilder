---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

Public component CSS variables move one-to-one from `--ax-public-*` to `--wb-public-*`, with no compatibility aliases. Replace that prefix in consumer overrides; the `.ax-public-*` typography classes are unchanged.
