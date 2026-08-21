---
'@workflowbuilder/ui': minor
---

Variable defaults (`--ax-public-*` component defaults and the `--wb-*` design tokens in `tokens.css`) now ship inside the `ui.base` cascade layer. A plain `:root { --ax-…: … }` override in your app now wins regardless of stylesheet load order; previously a lazily loaded component stylesheet could silently restore the default.
