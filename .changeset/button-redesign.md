---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': minor
---

`Button` is rebuilt on the Design System 2.0 specification. It takes `variant`, `size` and `shape`, and composes its content from `prefixIcon`, `children` and `suffixIcon` instead of inferring a subtype from the children structure. The variant list is `primary`, `secondary`, `critical`, `success` and a ghost treatment of each; sizes are letter-based; `shape` is `default`, `square` or `round`.

Breaking changes:

- Migrate variants: `gray` and the old outlined `secondary` both become the solid grey `secondary` (use `ghost-secondary` where the outlined treatment should stay), `error` becomes `critical`, `ghost-destructive` becomes `ghost-critical`, and `warning` becomes `critical` for destructive actions or `secondary` for cautionary ones.
- Migrate sizes: `extra-large`, `large`, `medium`, `small`, `extra-small` become `xl`, `l`, `m`, `s`, `xs`. The `xx-small` and `xxx-small` steps are gone.
- Replace `shape="circle"` with `shape="round"`.
- `Variant` is renamed to `ButtonVariant`. `BaseRegularButtonProps` and the old label/icon/icon-and-label component subtypes are removed; `LabelButtonProps` and `IconButtonProps` are redefined for the new API.
- Retarget public button overrides: the `gray`, `error`, `warning` and `ghost-destructive` variable families no longer exist, and the size suffixes in variable names follow the new scale. The `secondary` family now describes the solid grey variant, so overrides written for the old outlined `secondary` belong on `ghost-secondary`.

A warning `Snackbar` renders its action button as `secondary`.
