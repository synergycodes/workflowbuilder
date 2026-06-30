# Changelog

All notable changes to `@workflowbuilder/ui` are documented in this file.

## 1.0.0-beta.28

This beta moves the library into the Workflow Builder monorepo and publishes it
as `@workflowbuilder/ui` (previously `@synergycodes/overflow-ui`). It rebuilds
the library on [Base UI](https://base-ui.com/) and removes the previous MUI /
Mantine / Emotion / Floating UI stack. It contains breaking changes relative to
`@synergycodes/overflow-ui@1.0.0-beta.27`; read the sections below before
upgrading.

### Breaking changes

#### Dependencies

- Removed `@mui/material`, `@mui/base`, `@mantine/core`, `@mantine/dates`,
  `@emotion/*`, and `@floating-ui/react`.
- `react` / `react-dom` are the only **peer dependencies**. `@base-ui/react`
  (pinned to the validated `1.4.x` line) and `react-textarea-autosize` are
  regular dependencies that install automatically.
- `DatePicker` is rebuilt on `react-day-picker` + `date-fns`; `TextArea` on
  `react-textarea-autosize`. `date-fns`, `react-day-picker`, `clsx`, and the
  Phosphor icons are bundled into the package output.

#### Packaging

- The build moved from a single bundle to a **multi-entry build** with a
  per-component subpath export: `@workflowbuilder/ui/<component>` (e.g.
  `@workflowbuilder/ui/date-picker`).
- Importing from the package root still injects all required styles. Importing
  per-component entries injects only that component's CSS, so add
  `@workflowbuilder/ui/styles.css` once for the global layer order, reset, and
  typography.

#### Component API

- **DatePicker**: the prop surface no longer forwards the full Mantine prop set.
  It now accepts a curated list: `value`, `defaultValue`, `type`,
  `valueFormat`, `placeholder`, `error`, `size`, `disabled`, `minDate`,
  `maxDate`, `onChange`, `id`, `className`, `aria-label`, `aria-labelledby`.
  - `valueFormat` uses `date-fns` tokens (e.g. `dd/MM/yyyy`). The legacy
    `DD/MM/YYYY` (dayjs) default is accepted and converted for compatibility.
  - In `range` mode, `onChange` fires `null` while a range is mid-selection and
    emits the completed `[from, to]` tuple once both ends are picked.
- **Menu**: `onOpenChange` signature is now `(open: boolean, event?: Event)`.
  The MUI `slotProps` / passthrough surface is no longer available.
- **Select**: `onChange` signature is `(event, value)` - the event is the first
  argument, the selected value the second.
- **Switch**: `onChange` is `(checked: boolean, event: Event)`. The second
  argument is the native DOM event (previously typed as a React
  `ChangeEvent<HTMLInputElement>`, which never matched the value passed at
  runtime). The redundant `styles` prop was removed - use `className`.
- **SegmentPicker**: `onChange` is `(event: React.MouseEvent<HTMLButtonElement>, value: string)`.
- **Shape** (the `shape` prop on `Button` and `SegmentPicker`): the type is now
  `'default' | 'circle'` (was `'' | 'circle'`) - pass `'default'` instead of `''`.
- **Modal**: `className` and any forwarded HTML attributes now apply to the same
  root element (previously split across the outer and content elements).
- Transitions moved to the popup element, where Base UI sets
  `data-starting-style` / `data-ending-style`.

### Added

- `@workflowbuilder/ui/styles.css` - standalone global stylesheet (layer
  order, reset, typography) for per-component / subpath consumers.
- `Input` gains a typed `error` prop wired to the error state.
- `Snackbar` exposes proper `role="status"` / `aria-live` semantics.

### Fixed

- **DatePicker**: the calendar now ships `react-day-picker`'s stylesheet (it
  rendered unstyled before); selection, today, and day-hover states are themed
  to the design tokens, and the month-nav chevrons use a neutral color.
- **Accordion**: `onToggleOpen` no longer fires twice when the chevron is
  clicked.
- **IconSwitch**: the thumb icon now swaps in uncontrolled mode (it was stuck
  on the unchecked icon).
- **Button**: children that match no variant log a clear error instead of
  silently rendering nothing.
