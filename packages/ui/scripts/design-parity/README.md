# Design parity checks

Deterministic comparison of the built component CSS against the geometry of the Design System 2.0
masters in Figma. No browser, no screenshots: both sides are numbers.

## How it works

1. `nodes.json` lists the Figma nodes that act as sources (file key + node id + description).
2. `pnpm design-parity:fetch` (needs `FIGMA_TOKEN`, a personal access token with file read scope)
   reads those nodes through the Figma REST API and writes `expectations.json`: size, padding, item
   spacing, corner radius, stroke weight and the `boundVariables` ids per node. The snapshot is
   committed so the check runs offline and CI does not need a Figma token; refresh it whenever the
   masters change (the file's `lastModified` is recorded).
3. `checks.json` maps each Figma value to a sum of resolved CSS custom properties from
   `dist/tokens.css` and `dist/index.css` (`var()` chains are followed, `rem` is converted at 16px).
4. `pnpm check:design-parity` compares them with a 0.5px tolerance and fails the run on any mismatch.

Run `pnpm build` first: the check reads the built package, like `check:built-css`.

## Adding a check

Add the node to `nodes.json`, refresh the snapshot, then add a row to `checks.json`: `figma` is a
dot path into the node record (`width`, `paddingLeft`, `itemSpacing`, `cornerRadius`,
`strokeWeight`, `children.0.strokeWeight`, ...), `css` is a list of `[customProperty, factor]` pairs
that are summed (for example the port outer size is `size + 2 * border`).

## Limits

- Geometry only. `boundVariables` carries Figma variable ids, not names; mapping ids to token names
  needs the variable export from the WB Audit Figma plugin (the Variables REST API is not available
  on this plan). A binding-level check ("this part is bound to this token") is the next step once
  that export lives next to `expectations.json`.
- Values are compared at the root font size of 16px. A public variable overridden by a consumer is
  outside the scope of the check.
