---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

Fonts now ship as `.woff2` assets next to the stylesheets, with only the two dominant faces inlined.

Breaking changes:

- Preserve the published `dist/assets` directory next to copied stylesheets so their relative font URLs keep resolving.
- If a Content Security Policy exists, allow `data:` and `'self'` or the serving origin in `font-src`, or in `default-src` when `font-src` is absent.

Only Poppins latin 400 and 600 are inline. Other weights, Inter, and non-ASCII glyphs use `font-display: swap` assets and may briefly render in the fallback font; preload the relevant files when that flash of unstyled text (FOUT) is unacceptable.
