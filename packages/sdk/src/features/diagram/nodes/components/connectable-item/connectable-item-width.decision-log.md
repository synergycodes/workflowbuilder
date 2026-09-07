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

Two problems surfaced when the node shell moved to the DS 2.0 geometry (width 241px, padding 16px):

- The `6 *` factor is not documented anywhere. With the old 8px shell padding it happened to land
  near the real horizontal insets (2 x (8 + 1) shell + 2 x (10 + 1) section = 40px vs 48px); with
  16px it over-subtracts (96px against 58px of real insets), truncating labels about 65px earlier
  than the available space requires.
- The `+ 2 * padding + 2 * border` terms assume content-box sizing. The SDK applies a global
  `box-sizing: border-box` reset (`packages/sdk/src/index.css`), so `max-width` already refers to
  the border box and the terms inflate the cap.

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
  `241 - 2 x (16 + 1) - 2 x (10 + 1) = 185px` (previously `258 - 2 x (8 + 1) - 2 x (10 + 1) = 218px`).
- The AI template places its tool items directly in the content column without horizontal padding,
  so the default `0rem` applies there.

A new wrapper with horizontal padding must set the variable on its container; otherwise its items
may exceed the visible width by that padding.

## Consequences

- Item width follows the shell geometry exactly; the only shrink after the DS 2.0 change is the
  33px lost to the wider shell padding, not the 65px the magic factor would have produced.
- The variable makes the nesting explicit and reviewable per container instead of encoding it in a
  single global multiplier.
- Provisional until the design specifies the item width; recorded as a decision made without a
  design in the DS 2.0 divergence register.
