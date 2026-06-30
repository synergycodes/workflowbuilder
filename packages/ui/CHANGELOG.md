# Changelog

All notable changes to `@workflowbuilder/ui` are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

> **Moved from `@synergycodes/overflow-ui`.** This library was previously
> published as
> [`@synergycodes/overflow-ui`](https://www.npmjs.com/package/@synergycodes/overflow-ui).
> It moved into the Workflow Builder monorepo, was rebuilt on
> [Base UI](https://base-ui.com/), and is released as `2.0.0` under the
> `@workflowbuilder/ui` name. The library's prior history lives in the old
> package's
> [changelog](https://github.com/synergycodes/overflow-ui/blob/main/packages/ui/CHANGELOG.md).

## [2.0.0]

First release of `@workflowbuilder/ui`: an accessible, themeable React
component library built on [Base UI](https://base-ui.com/), plus diagram
building blocks (node and edge parts). It is the styled layer behind the
Workflow Builder SDK.

### Highlights

- **Components**: Button, Input, TextArea, Select, Menu, Modal, Tooltip, Switch,
  IconSwitch, Checkbox, RadioButton, SegmentPicker, DatePicker, Accordion,
  Avatar, Snackbar, Status, Separator, plus the NodePanel / NodeIcon /
  NodeDescription / EdgeLabel diagram primitives.
- **Theming** via `--ax-*` design tokens, isolated in cascade layers
  (`@layer ui.base, ui.component`) so app styles win without `!important` and
  components retheme cleanly.
- **Multi-entry build** with per-component subpath exports
  (`@workflowbuilder/ui/<component>`). Importing from the package root injects
  all required styles; subpath imports inject only that component's CSS (add
  `@workflowbuilder/ui/styles.css` once for the global layer order, reset, and
  typography).
- **Dependencies**: `react` / `react-dom` are the only peer dependencies.
  `@base-ui/react` (pinned to the validated `1.4.x` line) and
  `react-textarea-autosize` are regular dependencies; `date-fns`,
  `react-day-picker`, `clsx`, and the Phosphor icons are bundled into the
  package output.

### Migrating from `@synergycodes/overflow-ui`

The library was rebuilt on Base UI (the previous MUI / Mantine / Emotion /
Floating UI stack is gone), so several public APIs changed:

- **Menu**: `onOpenChange` is `(open: boolean, event?: Event)`; the MUI
  `slotProps` / passthrough surface is removed.
- **Select**: `onChange` is `(event, value)`.
- **Switch**: `onChange` is `(checked: boolean, event: Event)`; the redundant
  `styles` prop is removed - use `className`.
- **SegmentPicker**: `onChange` is
  `(event: React.MouseEvent<HTMLButtonElement>, value: string)`.
- **DatePicker**: rebuilt on `react-day-picker` + `date-fns`. The prop surface
  is curated (`value`, `defaultValue`, `type`, `valueFormat`, `placeholder`,
  `error`, `size`, `disabled`, `minDate`, `maxDate`, `onChange`, `id`,
  `className`, `aria-label`, `aria-labelledby`). `valueFormat` uses `date-fns`
  tokens; the legacy dayjs `DD/MM/YYYY` default is accepted and converted.
- **Modal**: `className` and forwarded HTML attributes apply to the root element.
- **shape** prop (Button / SegmentPicker): the type is `'default' | 'circle'`
  (pass `'default'`, not `''`).

[2.0.0]: https://www.npmjs.com/package/@workflowbuilder/ui/v/2.0.0
