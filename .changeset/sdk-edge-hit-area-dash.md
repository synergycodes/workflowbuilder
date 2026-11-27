---
'@workflowbuilder/sdk': patch
---

Edges can be hovered and selected along their whole length on a page whose CSS dashes SVG paths (`svg path { stroke-dasharray: … }`) and when an edge is `animated`. A solid edge also stays solid on such a page. To dash an `EnhancedBaseEdge` yourself, use `style`, `lineType` or a rule in the id form (`#app .workflow-builder-root .my-edge`); a plain class no longer does.
