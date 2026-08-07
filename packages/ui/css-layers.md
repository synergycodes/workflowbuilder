# CSS layers

`@workflowbuilder/ui` emits all of its styles into two ordered cascade layers:

```css
@layer ui.base, ui.component;
```

`ui.base` holds resets, primitives, and vendored third-party stylesheets
(react-day-picker); `ui.component` holds component styles. Declaring the order
before any rule from either layer guarantees that `ui.component` always wins
over `ui.base`, and that unlayered consumer styles win over both.

## Establishing the order

The order is fixed by the **first** `@layer` declaration the browser sees, so
the declaration must load before any component rule. To make that hold on
every path, the build (`combine-css-bundle.mts`) stamps the full order
statement at the top of **every** emitted stylesheet - the combined
`index.css`, `styles.css`, and each per-component file in `dist/assets/`.
Duplicate statements are no-ops (the first occurrence fixes the order, later
ones confirm it), so any import order and any bundler is safe:

- importing from the package root just works - whichever injected chunk
  stylesheet loads first carries the statement;
- per-component subpath imports just work for the same reason (import
  `@workflowbuilder/ui/styles.css` once if you also want the reset and
  typography);
- copying a single built file out of the package keeps it self-contained.

Do **not** replace the stamped statement with a shared `@import`: a relative
import breaks silently when a file is copied out alone, and constructed
stylesheets ignore `@import` entirely.

`scripts/check-built-css.ts` fails the build if any dist stylesheet stops
leading with the statement, uses an unknown layer name, or ships rules outside
`@layer`.

## box-sizing

`box-sizing: border-box` is injected into every styling rule of every
`*.module.css` at build time by `postcss-box-sizing.mts` - you will not find
the declarations in source. Rationale and rejected alternatives:
`postcss-box-sizing.decision-log.md`.

## Third-party CSS

Stylesheets we don't author join `ui.base` at import time, e.g.
`@import 'react-day-picker/style.css' layer(ui.base);` (see
`date-picker/variables.css`). Their defaults then lose to our `ui.component`
theming by layer order alone - no unlayered escape hatches, no specificity
arithmetic against upstream selectors.
