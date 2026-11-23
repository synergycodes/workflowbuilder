---
'@workflowbuilder/ui': minor
---

`Icon` renders icon data in the Iconify format (`IconData`, as exported by `@iconify-icons/*` packages) as an inline SVG sized `1em` in `currentColor`. The components' own icons now use it with data bundled into the package, so `@workflowbuilder/ui` no longer depends on `@phosphor-icons/react`. These icons take their color from CSS `color`: a `fill` rule on their `svg` no longer reaches the shapes.
