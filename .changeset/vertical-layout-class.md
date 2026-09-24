---
'@workflowbuilder/sdk': patch
---

A nested `VerticalLayout` in the properties form referenced a class its stylesheet never declared, so its children rendered as plain blocks with no gap. The root layout was never affected: `.json-form-container > div` gives it a 16px gap on its own. Controls stacked in a nested vertical layout, such as the two selects under the AI Agent node's Operational Settings, now keep the 8px gap the layout defines.
