---
'@workflowbuilder/ui': patch
---

`NodeDescription` keeps both the title and the subtitle on one line: long text is truncated with an ellipsis and exposed in full through the element's native tooltip, and the text no longer widens nodes whose body sizes to its content (for example the Decision node). Nodes keep the fixed design width and grow in height only.
