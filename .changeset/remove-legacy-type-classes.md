---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

Remove the `ax-public-h1` through `ax-public-h12` and `ax-public-p1` through `ax-public-p12` typography classes; they have no one-to-one replacements, so migrate them to the `wb-text-{family}-{size}[-emphasized]` role that matches their semantic use. Migrate `ax-public-button-large`, `ax-public-button-medium`, `ax-public-button-small`, and `ax-public-button-extra-small` to `wb-text-label-xl-emphasized`, `wb-text-label-l-emphasized`, `wb-text-label-m-emphasized`, and `wb-text-label-s-emphasized`, respectively. Migrate `ax-public-edge-label-medium`, `ax-public-edge-label-small`, and `ax-public-edge-label-extra-small` to `wb-text-label-m`, `wb-text-label-m`, and `wb-text-label-s`, respectively.
