---
'@workflowbuilder/ui': patch
---

`Input` and `TextArea` draw their placeholder in `ui/text/subtle-default`, the role the design library binds for it. It was on `ui/text/ghost-default`, the weakest step of the text hierarchy, which the library reserves for disabled-state fine print; the placeholder sat at 1.8:1 instead of 8:1.
