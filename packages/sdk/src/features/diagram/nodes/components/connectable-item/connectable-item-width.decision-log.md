### Title: Derive the ConnectableItem width from the real container insets

### Proposed by: Jan Librowski

### Date: 07.09.2026

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

The design system does not specify a width for these items (register: node geometry gaps). Any cap
is therefore a provisional implementation decision, to be revisited when the design provides one.

## Decision

The cap is derived from named insets between the node's outer edge and the item:

```css
max-width: calc(
  var(--wb-public-node-width) - 2 * (var(--wb-public-node-padding) + var(--wb-public-node-border-size)) - 2 *
    var(--wb-sdk-connectable-item-inset)
);
```

`--wb-sdk-connectable-item-inset` is the horizontal inset (one side) added by the container that
wraps the items. It defaults to `0rem` and each wrapping container declares its own value:

- `NodeSection` sets it to its padding plus border width, so Decision branches inside a section get
  `241 - 2 x (8 + 1) - 2 x (10 + 1) = 201px` (with the previous 258px shell: 218px).
- The AI template wraps its tool rows in `NodeInfoWrapper` (padding 0.625rem plus a 1px border
  per side), which therefore declares the same inset, so tool rows get
  `241 - 2 x (8 + 1) - 2 x (10 + 1) = 201px` as well. The default `0rem` applies only to a
  container that adds no horizontal padding.

The variable is not cumulative: a wrapper declares the inset it adds itself, and a container that
adds horizontal padding without declaring it lets its rows exceed the visible width by that padding.

## Consequences

- Item width follows the shell geometry exactly and can no longer exceed the space its container
  actually offers.
- The variable makes the nesting explicit and reviewable per container instead of encoding it in a
  single global multiplier.
- Provisional until the design specifies the item width; recorded as a decision made without a
  design in the DS 2.0 divergence register. The design's node body matrix (row padding 8px,
  radius 4px) is a separate follow-up and does not change this derivation.
