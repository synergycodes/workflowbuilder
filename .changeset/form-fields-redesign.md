---
'@workflowbuilder/ui': major
'@workflowbuilder/sdk': minor
---

Form controls are rebuilt on one field composition. `Input`, `TextArea`, `Select` and `DatePicker` render inside a shared `Field` that provides an associated label, helper text, a required marker and the visual state, so a label no longer has to be wired up by hand. `Input` and `TextArea` take letter sizes, icon slots and an optional clear action; `Select` and `DatePicker` gain `label`, `helperText`, `state`, `isRequired` and `id`, and paint a disabled background.

Breaking changes:

- Replace the boolean `error` prop on `Input` and `TextArea` with `state="critical"`. `state` also carries `success` and `read-only`.
- Replace `startAdornment` and `endAdornment` with `prefixIcon` and `suffixIcon`.
- Migrate `Input` and `TextArea` sizes from `large`, `medium`, `small` to `l`, `m`, `s`; `xs` is new. `Select` and `DatePicker` keep the word-based `size` prop and map it internally.
- Retarget the public control variables: the `-error` families become `-critical`, and the size suffixes in `--wb-public-input-padding-*`, `--wb-public-input-gap-*` and `--wb-public-input-border-radius-*` follow the letter scale (`-medium` becomes `-m`, and so on).

New public properties cover the states the old surface had no lever for: success and hover borders, disabled backgrounds, icon and placeholder colours, and the label, helper and required-marker colours of the field composition.
