---
'@workflowbuilder/sdk': patch
---

Branch cards in the decision node's properties panel are now vertically spaced - the control's wrapper was an unstyled div, so the cards and the add-branch button rendered glued together outside an Accordion. The accordion layout's compensating `> div:not([class])` selector is removed along with it; a custom control relying on that undocumented behavior should style its own root.
