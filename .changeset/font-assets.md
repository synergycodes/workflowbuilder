---
'@workflowbuilder/ui': minor
'@workflowbuilder/sdk': minor
---

Fonts now ship as `.woff2` assets next to the stylesheets, with only the two dominant faces inlined.
A Content-Security-Policy that lists `font-src` now needs `'self'` or the serving origin instead of `data:`.
