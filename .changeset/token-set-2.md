---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': major
---

The design-token theming surface exposed as `--ax-*` custom properties is removed from `tokens.css` and replaced by generated `--wb-*` properties from the refreshed Figma variables: renamed and re-scaled primitives, semantic tokens per theme, and new canvas and shadow (effects) sets. Consumers who overrode `--ax-*` design tokens must move those overrides to the corresponding `--wb-*` properties.

The `--ax-public-*` per-component override surface changes as well. Public button variables migrate the `gray`, `error`, and `ghost-destructive` families to `secondary`, `critical`, and `ghost-critical`, and their size suffixes move to `-xl`...`-xs`. Input and TextArea replace their `-error` variables with `-critical` variables and add public variables for success, hover, disabled backgrounds, icons, placeholders, field composition, and letter-sized control metrics. Every remaining `--ax-public-*` variable keeps its name and now defaults to the refreshed tokens.

Component visuals pick up the refreshed palette (brand `#3969FF`, updated reds/greens/oranges).
