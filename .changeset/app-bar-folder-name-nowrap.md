---
'@workflowbuilder/sdk': patch
---

The app bar's folder label no longer wraps onto a second line while the diagram title is being edited. The title already carried `white-space: nowrap`; the label next to it did not, so the wider edit field pushed it over two lines.
