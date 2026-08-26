---
'@workflowbuilder/ui': major
---

Generated Figma design tokens move from `--wb-<token>` to `--wb-ds-<token>` with no compatibility aliases. Replace the generated-token prefix in consumer overrides; `--wb-public-*` component variables are unchanged.
