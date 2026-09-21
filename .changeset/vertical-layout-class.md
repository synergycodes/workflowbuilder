---
'@workflowbuilder/sdk': patch
---

`VerticalLayout` in the properties form referenced a class its stylesheet never declared, so its children rendered as plain blocks with no gap. Controls stacked in a vertical layout, such as the two selects under the AI Agent node's Operational Settings, now keep the 8px gap the layout defines.
