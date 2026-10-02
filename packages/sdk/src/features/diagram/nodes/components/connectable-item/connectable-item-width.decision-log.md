### Title: Derive the ConnectableItem width from the real container insets

### Proposed by: Jan Librowski

### Date: 07.09.2026 (revised 14.09.2026, 15.09.2026 and 16.09.2026)

## Context

`ConnectableItem` (a node body row that carries its own port: Decision branches, AI tools) caps its
width with an absolute `max-width` computed from the public node width. The cap is needed because the
Decision template sets `min-width: max-content` on its body, so a long branch label would otherwise
widen the whole node instead of truncating.

The previous rule was:

```css
max-width: calc(
  var(--wb-public-node-width) - (6 * var(--wb-public-node-padding)) + 2 *
    var(--wb-sdk-connectable-item-horizontal-padding) + 2 * var(--wb-sdk-connectable-item-border-width)
);
```

Two problems surfaced while moving the node shell to the DS 2.0 geometry (width 241px):

- The `6 *` factor is not documented anywhere. It only approximates the real horizontal insets
  between the node edge and the item: shell padding plus border on both sides (2 x 9px) and the
  section padding plus border on both sides (2 x 11px), 40px in total against the 48px it subtracts.
- The `+ 2 * padding + 2 * border` terms assume content-box sizing. The SDK applies a global
  `box-sizing: border-box` reset (`packages/sdk/src/index.css`), so `max-width` already refers to
  the border box and the terms inflate the cap: at 241px the old rule allows 219px while only 201px
  are available inside a section, so a long label could overflow its section by 18px.

The design master `Node / Row` has no width of its own: it is `fill` inside the body, so the row is
as wide as its section. Design confirmed on 16.09.2026 that this is the rule and that no width role
will be added to the tokens.

## Decision

In the vertical list (RIGHT layout) the row fills its container, as in the design: `width: 100%`,
`min-width: 0`, no cap. The container is the section (or `NodeInfoWrapper` for AI tools), so the row
measures `241 - 2 x (8 + 1) - 2 x (8 + 1) = 205px`; the design draws 209 because a Figma stroke does
not take layout space while a CSS border does. 205 is the reference value for QA.

The horizontal branch row of the DOWN layout has no design master and keeps the derived cap, so a
long label cannot widen the node further than one row:

```css
max-width: calc(
  var(--wb-public-node-width) - 2 * (var(--wb-public-node-padding) + var(--wb-public-node-border-size)) - 2 *
    var(--wb-sdk-connectable-item-inset)
);
```

`--wb-sdk-connectable-item-inset` is the horizontal inset (one side) added by the container that
wraps the items. It defaults to `0rem` and each wrapping container declares its own value:

- `NodeSection` sets it to its padding plus border width (`canvas/node/body-h-pad` 8px + 1px), so a
  capped Decision branch gets 205px, the same as a filled one.
- `NodeInfoWrapper` (AI tools) declares the same inset. The default `0rem` applies only to a
  container that adds no horizontal padding.

Row padding, gap and radius themselves bind to `canvas/node/row-*`, section padding, gap and radius
to `canvas/node/body-*`; design confirmed that matrix (8 / 8 / 8 / 8, row radius 4) on 09.09.2026 and
published the roles in the 15.09.2026 export.

The variable is not cumulative: a wrapper declares the inset it adds itself, and a container that
adds horizontal padding without declaring it lets its rows exceed the visible width by that padding.

## Consequences

- In the vertical list the row width is whatever the section offers, with no number of its own to
  keep in sync with the shell.
- In the DOWN row the cap follows the shell geometry exactly, and the inset variable keeps the
  nesting explicit per container instead of a global multiplier.

## Status

Accepted. Revised 14.09.2026 (body matrix 8 / 8 / 4 applied, derived width 201 → 205px),
15.09.2026 (sections and rows bind to the `body-*` and `row-*` roles from the export) and 16.09.2026
(design confirmed the fill rule; vertical rows fill, the cap remains only for the DOWN row).
Closed: the row has no width role by design.
