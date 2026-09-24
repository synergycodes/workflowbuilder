# Ship common font faces inline and the rest as assets

### Title: Ship common font faces inline and the rest as assets

### Proposed by: Jan Librowski

### Date: 31.08.2026

## Context

Vite library mode inlined all twelve Poppins and Inter font faces as base64.
The built stylesheet consequently carried approximately 382 KB of fonts:
`index.css` was 509 KB, and the SDK stylesheet that bundles it was 591 KB.
Most consumers need only the Poppins 400 and 600 latin faces declared by the
typography classes, while the other weights, Inter, and extended latin subsets
can load on demand.

## Decision

Generate the twelve `@font-face` rules after Vite finishes. Keep Poppins 400
and 600 latin inline, and copy the other ten `.woff2` files into `dist/assets`.
Apply fontsource's subset-specific unicode ranges and `font-display: swap` so a
browser requests only the faces needed by the document. Ship the Poppins and
Inter SIL Open Font License 1.1 texts beside the font assets.

This reduces `index.css` from 509 KB to 150 KB and the SDK stylesheet from 591
KB to 230 KB while preserving existing imports and immediate rendering for the
two common faces.

## Alternative Options Considered

- **Keep everything inline.** Rejected because every consumer would continue
  downloading approximately 382 KB of font data before using any face.
- **Ship everything as assets.** Rejected because even the common Poppins 400
  and 600 latin faces would require additional requests before normal UI text
  renders.
- **Patch the Vite configuration.** Rejected because Vite library mode ignores
  the normal asset inline limit, so configuration alone cannot produce the
  required mix of inline and emitted faces.
- **Use a CDN.** Rejected because it adds an external runtime dependency,
  changes Content Security Policy requirements, and prevents the package from
  remaining self-contained.

## Consequences

- Consumers that define `font-src` in Content Security Policy must allow
  `'self'` or the package-serving origin instead of relying only on `data:`.
- Consumers that copy stylesheets must preserve the relative `dist/assets`
  layout.
- A future refactor that simplifies the pipeline back to fontsource CSS imports
  can silently reintroduce approximately 382 KB of inline font data.
- The build must keep the font asset references and shipped license files in
  sync with `FONT_FACES`.

## Status

accepted
