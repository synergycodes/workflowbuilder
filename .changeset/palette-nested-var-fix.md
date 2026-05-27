---
'@workflowbuilder/sdk': patch
---

fix: remove nested `var(var(...))` from palette `variables.css` that broke strict CSS parsers (e.g. Lightning CSS / Next.js Turbopack).
