---
'@workflowbuilder/ui': major
---

`Button` no longer offers the `warning` and `ghost-warning` variants; `BUTTON_VARIANTS` and the `ButtonVariant` type shrink accordingly, and the `--wb-public-button-warning-*` and `--wb-public-button-ghost-warning-*` custom properties are gone. A warning `Snackbar` renders its action button as `secondary`.

Breaking changes:

- Replace `variant="warning"` with `critical` for destructive actions or `secondary` for cautionary secondary actions; replace `ghost-warning` with `ghost-critical` or `ghost-secondary`.
- Drop any overrides of the removed `--wb-public-button-warning-*` and `--wb-public-button-ghost-warning-*` properties.
