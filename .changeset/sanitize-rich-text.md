---
'@workflowbuilder/sdk': patch
---

The `RichText` form element now sanitizes its HTML with DOMPurify and keeps only inline formatting (`b`, `strong`, `i`, `em`, `u`, `s`, `code`, `br`) and links (`a`). Other tags, such as `p`, `ul` or `img`, are removed.
