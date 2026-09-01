---
'@workflowbuilder/ui': major
---

Generated Figma design tokens move from `--ax-<token>` to `--wb-ds-<token>` with no compatibility aliases. Replace the generated-token prefix in consumer overrides; public component variables migrate separately from `--ax-public-*` to `--wb-public-*`.
