---
'@workflowbuilder/sdk': major
'@workflowbuilder/ui': minor
---

SDK text now binds explicit type roles, while deprecated UI typography classes carry their bundled Poppins family, allowing the document-wide font reset to be removed without mixed editor typography. `--wb-font-family` no longer rethemes built-in editor text; apply it explicitly to consumer-owned surfaces that need it.
