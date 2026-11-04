---
'@workflowbuilder/sdk': patch
---

Menu and Select popups get a 1px subtle border, and the Date Picker dropdown border switches to the subtle stroke. The variable suggestions list takes its border color, radius and shadow from the `--wb-public-list-box-*` variables, so it matches Menu and Select (8px radius instead of `--wb-public-input-border-radius-m`).
