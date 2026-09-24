---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

The legacy typography utility classes are removed in favour of the Design System 2.0 type roles.

Breaking changes:

- `ax-public-h1` through `ax-public-h12` and `ax-public-p1` through `ax-public-p12` have no one-to-one replacement. Migrate each to the `wb-text-{family}-{size}[-emphasized]` role that matches its semantic use.
- Migrate `ax-public-button-large`, `ax-public-button-medium`, `ax-public-button-small` and `ax-public-button-extra-small` to `wb-text-label-xl-emphasized`, `wb-text-label-l-emphasized`, `wb-text-label-m-emphasized` and `wb-text-label-s-emphasized`.
- Migrate `ax-public-edge-label-medium`, `ax-public-edge-label-small` and `ax-public-edge-label-extra-small` to `wb-text-label-m`, `wb-text-label-m` and `wb-text-label-s`.
