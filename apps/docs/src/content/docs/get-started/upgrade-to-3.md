---
title: Upgrade to 3.0
description: What changed between @workflowbuilder/sdk 2.3.0 and 3.0.0, and how to migrate a themed or customised editor.
sidebar:
  order: 6
---

Version 3.0 replaces the component library the editor is built on and the design tokens
that style it. The exported SDK surface is almost unchanged, so an editor that uses the
defaults upgrades by bumping the version. An editor that overrides CSS custom properties,
uses `@workflowbuilder/ui` components directly, or styles the built-in ones needs the steps
below.

`@workflowbuilder/ui` is published for the first time in this release, as `1.0.0`. Until
now it reached consumers only bundled inside the SDK, so its version line starts here and
is independent of the SDK's.

## What replaced the bundled library

Version 2.3.0 bundled `@synergycodes/overflow-ui@1.0.0-beta.27`, built on MUI, Mantine and
Emotion. Version 3.0 bundles the in-repo `@workflowbuilder/ui`, rebuilt on
[Base UI](https://base-ui.com/). `@base-ui/react` installs automatically as a regular
dependency instead of being an inlined implementation detail.

Two consequences reach consumer code:

- The internal DOM structure and class names of every bundled component changed. Styles or
  tests written against those internal class names need updating.
- Public types that derive from the UI library (`InputControlProps`, `TextAreaControlProps`)
  build on `@workflowbuilder/ui` shapes. The picked keys are unchanged.

Modal open and close now run enter and exit fade transitions, where the dialog used to
appear and disappear instantly.

## CSS custom properties

Three families replace the single `--ax-*` namespace. Only the first two are part of the
supported surface:

| Family          | What it is                                                           | Override it?                            |
| --------------- | -------------------------------------------------------------------- | --------------------------------------- |
| `--wb-public-*` | Per-component overrides exposed by `@workflowbuilder/ui` and the SDK | Yes, this is the contract               |
| `--wb-ds-*`     | Design tokens generated from the Figma export                        | Yes, to retheme wholesale               |
| `--wb-sdk-*`    | Private SDK internals                                                | No, they change without a major release |

The renames:

| 2.3.0                     | 3.0                                           |
| ------------------------- | --------------------------------------------- |
| `--ax-public-<name>`      | `--wb-public-<name>`                          |
| `--ax-<token>`            | `--wb-ds-<token>`, where a counterpart exists |
| `--wb-background-color`   | `--wb-public-background-color`                |
| `--wb-transition`         | `--wb-public-transition`                      |
| `--wb-scroll-<name>`      | `--wb-public-scroll-<name>`                   |
| every other `--wb-<name>` | `--wb-sdk-<name>`, now private                |

Renaming the prefix is not enough on its own. The button, input, text area and select
families also rename variants and size suffixes, and some properties are gone. Check each
overridden name against the component sections below.

## Design tokens

The token export was rebuilt, not renamed. Of the 658 custom properties 2.3.0 published,
150 keep their name under the new prefix, 508 have no direct counterpart, and 419 roles are
new. The
[design tokens page](/ui-library/design-tokens/) documents the current set.

Only the primitive colour scales carry over by name. Everything else moved from a
per-component, per-size layer to a generic scale plus semantic role sets:

| 2.3.0 family                                                              | 3.0 counterpart                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `--ax-token-spacing-*`                                                    | `--wb-ds-space-*`, one generic scale instead of a value per component and size |
| `--ax-token-radius-*`                                                     | `--wb-ds-radius-*`, likewise                                                   |
| `--ax-token-shadow-*`                                                     | `--wb-ds-shadow-ui-*` and `--wb-ds-shadow-canvas-*`                            |
| `--ax-primitive-even-*`, `--ax-primitive-odd-*`, `--ax-primitive-4rule-*` | `--wb-ds-space-*` and `--wb-ds-size-*`                                         |
| `--ax-button-*`                                                           | `--wb-ds-components-button-*`                                                  |
| `--ax-chips-*`                                                            | `--wb-ds-components-chips-*`                                                   |
| `--ax-nav-*`                                                              | `--wb-ds-components-nav-*`                                                     |
| `--ax-snackbar-*`                                                         | `--wb-ds-components-snackbar-*`                                                |
| `--ax-dropzone-*`                                                         | `--wb-ds-components-dropzone-*`                                                |
| `--ax-tab-*`                                                              | `--wb-ds-components-tab-*`                                                     |
| `--ax-avatar-*`                                                           | `--wb-ds-components-avatar-*`                                                  |
| `--ax-datepicker-*`                                                       | `--wb-ds-components-datepicker-*`                                              |
| `--ax-tooltip-*`                                                          | `--wb-ds-components-tooltip-*`                                                 |
| `--ax-txt-*`                                                              | `--wb-ds-ui-text-*`                                                            |
| `--ax-ui-*`                                                               | `--wb-ds-ui-*`                                                                 |
| `--ax-input-*`, `--ax-label-*`, `--ax-link-*`, `--ax-dropdown-*`          | `--wb-ds-ui-bg-*`, `--wb-ds-ui-stroke-*` and `--wb-ds-ui-text-*` roles         |
| `--ax-node-*`                                                             | `--wb-ds-canvas-node-*`                                                        |
| `--ax-edge-*`                                                             | `--wb-ds-canvas-edge-*`                                                        |
| `--ax-widget-*`                                                           | `--wb-ds-canvas-widget-*`                                                      |
| `--ax-focus-*`                                                            | `--wb-ds-canvas-node-focus-ring-*` and `--wb-ds-ui-focus-*`                    |

The `acc6` and `acc7` colour scales are gone, and the `--ax-colors-orange-400-{10,20,30,50}`
alpha steps are replaced by `--wb-ds-colors-orange-500-*` on a rebuilt orange.

### Primitives that kept their name and changed value

These 88 tokens migrate by prefix alone, but repaint. The remaining 62 matched primitives
keep both their name and their value.

| Token                         | 2.x value   | 3.0 value                   |
| ----------------------------- | ----------- | --------------------------- |
| `--wb-ds-colors-acc1-100`     | `#e0f0fe`   | `#ccd9ff`                   |
| `--wb-ds-colors-acc1-200`     | `#bbe2fc`   | `#99b3ff`                   |
| `--wb-ds-colors-acc1-300`     | `#5fbefa`   | `#6b90ff`                   |
| `--wb-ds-colors-acc1-400`     | `#3ab0f6`   | `#527dff`                   |
| `--wb-ds-colors-acc1-50`      | `#f0f8ff`   | `#edf2ff`                   |
| `--wb-ds-colors-acc1-500`     | `#1096e7`   | `#3969ff`                   |
| `--wb-ds-colors-acc1-500-10`  | `#1096e71a` | `rgba(57, 105, 255, 0.1)`   |
| `--wb-ds-colors-acc1-500-20`  | `#1096e733` | `rgba(57, 105, 255, 0.2)`   |
| `--wb-ds-colors-acc1-500-30`  | `#1096e74d` | `rgba(57, 105, 255, 0.3)`   |
| `--wb-ds-colors-acc1-500-40`  | `#1096e766` | `rgba(57, 105, 255, 0.4)`   |
| `--wb-ds-colors-acc1-500-50`  | `#1096e780` | `rgba(57, 105, 255, 0.5)`   |
| `--wb-ds-colors-acc1-600`     | `#0477c5`   | `#144cf5`                   |
| `--wb-ds-colors-acc1-700`     | `#045fa0`   | `#0f3fcc`                   |
| `--wb-ds-colors-acc1-800`     | `#085184`   | `#11349c`                   |
| `--wb-ds-colors-acc1-900`     | `#0d446d`   | `#132c76`                   |
| `--wb-ds-colors-acc1-950`     | `#092b48`   | `#111f4b`                   |
| `--wb-ds-colors-acc1-950-10`  | `#092b481a` | `rgba(17, 31, 75, 0.1)`     |
| `--wb-ds-colors-acc1-950-20`  | `#092b4833` | `rgba(17, 31, 75, 0.2)`     |
| `--wb-ds-colors-acc1-950-30`  | `#092b484d` | `rgba(17, 31, 75, 0.3)`     |
| `--wb-ds-colors-acc1-950-40`  | `#092b4866` | `rgba(17, 31, 75, 0.4)`     |
| `--wb-ds-colors-acc1-950-50`  | `#092b4880` | `rgba(17, 31, 75, 0.5)`     |
| `--wb-ds-colors-acc2-500-10`  | `#ed4c461a` | `rgba(237, 76, 70, 0.1)`    |
| `--wb-ds-colors-acc2-500-20`  | `#ed4c4633` | `rgba(237, 76, 70, 0.2)`    |
| `--wb-ds-colors-acc2-500-30`  | `#ed4c464d` | `rgba(237, 76, 70, 0.3)`    |
| `--wb-ds-colors-acc2-500-40`  | `#ed4c4666` | `rgba(237, 76, 70, 0.4)`    |
| `--wb-ds-colors-acc2-500-50`  | `#ed4c4680` | `rgba(237, 76, 70, 0.5)`    |
| `--wb-ds-colors-acc2-950-10`  | `#440d0b1a` | `rgba(68, 13, 11, 0.1)`     |
| `--wb-ds-colors-acc2-950-20`  | `#440d0b33` | `rgba(68, 13, 11, 0.2)`     |
| `--wb-ds-colors-acc2-950-30`  | `#440d0b4d` | `rgba(68, 13, 11, 0.3)`     |
| `--wb-ds-colors-acc2-950-40`  | `#440d0b66` | `rgba(68, 13, 11, 0.4)`     |
| `--wb-ds-colors-acc2-950-50`  | `#440d0b80` | `rgba(68, 13, 11, 0.5)`     |
| `--wb-ds-colors-acc3-500-10`  | `#0bc1751a` | `rgba(11, 193, 117, 0.1)`   |
| `--wb-ds-colors-acc3-500-20`  | `#0bc17533` | `rgba(11, 193, 117, 0.2)`   |
| `--wb-ds-colors-acc3-500-30`  | `#0bc1754d` | `rgba(11, 193, 117, 0.3)`   |
| `--wb-ds-colors-acc3-500-40`  | `#0bc17566` | `rgba(11, 193, 117, 0.4)`   |
| `--wb-ds-colors-acc3-500-50`  | `#0bc17580` | `rgba(11, 193, 117, 0.5)`   |
| `--wb-ds-colors-acc4-500-10`  | `#ba5af21a` | `rgba(186, 90, 242, 0.1)`   |
| `--wb-ds-colors-acc4-500-20`  | `#ba5af233` | `rgba(186, 90, 242, 0.2)`   |
| `--wb-ds-colors-acc4-500-30`  | `#ba5af24d` | `rgba(186, 90, 242, 0.3)`   |
| `--wb-ds-colors-acc4-500-40`  | `#ba5af266` | `rgba(186, 90, 242, 0.4)`   |
| `--wb-ds-colors-acc4-500-50`  | `#ba5af280` | `rgba(186, 90, 242, 0.5)`   |
| `--wb-ds-colors-acc5-500-10`  | `#f4841b1a` | `rgba(244, 132, 27, 0.1)`   |
| `--wb-ds-colors-acc5-500-20`  | `#f4841b33` | `rgba(244, 132, 27, 0.2)`   |
| `--wb-ds-colors-acc5-500-30`  | `#f4841b4d` | `rgba(244, 132, 27, 0.3)`   |
| `--wb-ds-colors-acc5-500-40`  | `#f4841b66` | `rgba(244, 132, 27, 0.4)`   |
| `--wb-ds-colors-acc5-500-50`  | `#f4841b80` | `rgba(244, 132, 27, 0.5)`   |
| `--wb-ds-colors-blue-400-10`  | `#336dff1a` | `rgba(51, 109, 255, 0.1)`   |
| `--wb-ds-colors-blue-400-20`  | `#336dff33` | `rgba(51, 109, 255, 0.2)`   |
| `--wb-ds-colors-blue-400-30`  | `#336dff4d` | `rgba(51, 109, 255, 0.3)`   |
| `--wb-ds-colors-blue-400-50`  | `#336dff80` | `rgba(51, 109, 255, 0.5)`   |
| `--wb-ds-colors-gray-100-10`  | `#ffffff1a` | `rgba(255, 255, 255, 0.1)`  |
| `--wb-ds-colors-gray-100-20`  | `#ffffff33` | `rgba(255, 255, 255, 0.2)`  |
| `--wb-ds-colors-gray-100-30`  | `#ffffff4d` | `rgba(255, 255, 255, 0.3)`  |
| `--wb-ds-colors-gray-100-5`   | `#ffffff0d` | `rgba(255, 255, 255, 0.05)` |
| `--wb-ds-colors-gray-100-50`  | `#ffffff80` | `rgba(255, 255, 255, 0.5)`  |
| `--wb-ds-colors-gray-100-75`  | `#ffffffbf` | `rgba(255, 255, 255, 0.75)` |
| `--wb-ds-colors-gray-900-10`  | `#0707081a` | `rgba(7, 7, 8, 0.1)`        |
| `--wb-ds-colors-gray-900-20`  | `#07070833` | `rgba(7, 7, 8, 0.2)`        |
| `--wb-ds-colors-gray-900-30`  | `#0707084d` | `rgba(7, 7, 8, 0.3)`        |
| `--wb-ds-colors-gray-900-5`   | `#0707080d` | `rgba(7, 7, 8, 0.05)`       |
| `--wb-ds-colors-gray-900-50`  | `#07070880` | `rgba(7, 7, 8, 0.5)`        |
| `--wb-ds-colors-gray-900-75`  | `#07070880` | `rgba(7, 7, 8, 0.75)`       |
| `--wb-ds-colors-green-100`    | `#e9f7ee`   | `#dcfce7`                   |
| `--wb-ds-colors-green-200`    | `#c2edd1`   | `#bbf7d0`                   |
| `--wb-ds-colors-green-300`    | `#29974e`   | `#4ade80`                   |
| `--wb-ds-colors-green-400`    | `#007c29`   | `#16a34a`                   |
| `--wb-ds-colors-green-400-10` | `#007c291a` | `rgba(22, 163, 74, 0.1)`    |
| `--wb-ds-colors-green-400-20` | `#007c2933` | `rgba(22, 163, 74, 0.2)`    |
| `--wb-ds-colors-green-400-30` | `#007c294d` | `rgba(22, 163, 74, 0.3)`    |
| `--wb-ds-colors-green-400-50` | `#007c2980` | `rgba(22, 163, 74, 0.5)`    |
| `--wb-ds-colors-orange-100`   | `#f7f2e9`   | `#fff2e1`                   |
| `--wb-ds-colors-orange-200`   | `#eddfc2`   | `#fee3c0`                   |
| `--wb-ds-colors-orange-300`   | `#ffaf10`   | `#ffd195`                   |
| `--wb-ds-colors-orange-400`   | `#e59800`   | `#ffc26e`                   |
| `--wb-ds-colors-red-100`      | `#f7e9e9`   | `#fee2e2`                   |
| `--wb-ds-colors-red-100-10`   | `#f7e9e91a` | `rgba(254, 226, 226, 0.1)`  |
| `--wb-ds-colors-red-100-20`   | `#f7e9e933` | `rgba(254, 226, 226, 0.2)`  |
| `--wb-ds-colors-red-100-30`   | `#f7e9e94d` | `rgba(254, 226, 226, 0.3)`  |
| `--wb-ds-colors-red-100-50`   | `#f7e9e980` | `rgba(254, 226, 226, 0.5)`  |
| `--wb-ds-colors-red-200`      | `#edc2c2`   | `#fca5a5`                   |
| `--wb-ds-colors-red-300`      | `#deadad`   | `#f87171`                   |
| `--wb-ds-colors-red-400`      | `#962929`   | `#e02020`                   |
| `--wb-ds-colors-red-400-10`   | `#9629291a` | `rgba(224, 32, 32, 0.1)`    |
| `--wb-ds-colors-red-400-20`   | `#96292933` | `rgba(224, 32, 32, 0.2)`    |
| `--wb-ds-colors-red-400-30`   | `#9629294d` | `rgba(224, 32, 32, 0.3)`    |
| `--wb-ds-colors-red-400-50`   | `#96292980` | `rgba(224, 32, 32, 0.5)`    |
| `--wb-ds-colors-red-500`      | `#7d0000`   | `#c41a1a`                   |
| `--wb-ds-colors-red-600`      | `#670000`   | `#a51515`                   |

## Components

### Button

`Button` composes its content from `prefixIcon`, `children` and `suffixIcon` instead of
inferring a subtype from the children structure.

| 2.3.0 `variant`       | 3.0 `variant`                                                       |
| --------------------- | ------------------------------------------------------------------- |
| `primary`             | `primary`                                                           |
| `gray`                | `secondary`, now a solid grey                                       |
| `secondary`, outlined | `ghost-secondary`                                                   |
| `error`               | `critical`                                                          |
| `warning`             | `critical` for destructive actions, `secondary` for cautionary ones |
| `success`             | `success`                                                           |
| `ghost-destructive`   | `ghost-critical`                                                    |

Sizes `extra-large`, `large`, `medium`, `small` and `extra-small` become `xl`, `l`, `m`, `s`
and `xs`. The `xx-small` and `xxx-small` steps are gone. On `Button`, `shape="circle"`
becomes `shape="round"`, alongside the new `shape="square"`. `SegmentPicker` keeps the
`Shape` type it always had, so its `shape="circle"` stays as it is.

`Variant` is renamed to `ButtonVariant`. `BaseRegularButtonProps` and the label, icon and
icon-with-label component subtypes are removed; `LabelButtonProps` and `IconButtonProps` are
redefined for the new API.

Public button variables follow the same migration: the `gray`, `error`, `warning` and
`ghost-destructive` families no longer exist, and size suffixes follow the letter scale. The
`secondary` family now describes the solid grey variant, so an override written for the old
outlined `secondary` belongs on `ghost-secondary`.

### Input and TextArea

| 2.3.0                                 | 3.0                                         |
| ------------------------------------- | ------------------------------------------- |
| `error={true}`                        | `state="critical"`                          |
| `startAdornment`                      | `prefixIcon`                                |
| `endAdornment`                        | `suffixIcon`                                |
| `size="large" \| "medium" \| "small"` | `size="l" \| "m" \| "s"`, plus the new `xs` |

`state` also accepts `success` and `read-only`. Both controls render inside a shared `Field`
that supplies an associated label, helper text and a required marker, so `label`,
`helperText` and `isRequired` replace hand-wired markup.

The public variables follow: `-error` becomes `-critical`, and
`--wb-public-input-padding-medium`, `--wb-public-input-gap-medium` and
`--wb-public-input-border-radius-medium` become `-m`, with `-l`, `-s` and `-xs` alongside.

### Select and DatePicker

Both keep their existing props and gain `label`, `helperText`, `state`, `isRequired` and
`id` from the same field composition. Their `size` prop keeps the word-based scale and maps
to the letter scale internally. Both paint a disabled background they previously left
transparent.

### NavButton and SegmentPicker

`NavButton` takes `size`, `variant` (`square`, `round`, `plain`), `prefixIcon`, `suffixIcon`
and `children`. An icon passed as `children` is now rendered as label content, so move it to
`prefixIcon` or `suffixIcon`. Sizes follow the letter scale. The selected state no longer
shares a treatment with the pointer-down state.

`SegmentPicker` keeps its API but adopts the new slots, so an icon passed as
`SegmentPicker.Item` children must move to an explicit icon slot. `MenuTriggerButton` is new.

### Typography classes

| 2.3.0                              | 3.0                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ax-public-h1` … `ax-public-h12`   | no one-to-one replacement; pick the `wb-text-{family}-{size}[-emphasized]` role that matches the semantic use |
| `ax-public-p1` … `ax-public-p12`   | likewise                                                                                                      |
| `ax-public-button-large`           | `wb-text-label-xl-emphasized`                                                                                 |
| `ax-public-button-medium`          | `wb-text-label-l-emphasized`                                                                                  |
| `ax-public-button-small`           | `wb-text-label-m-emphasized`                                                                                  |
| `ax-public-button-extra-small`     | `wb-text-label-s-emphasized`                                                                                  |
| `ax-public-edge-label-medium`      | `wb-text-label-m`                                                                                             |
| `ax-public-edge-label-small`       | `wb-text-label-m`                                                                                             |
| `ax-public-edge-label-extra-small` | `wb-text-label-s`                                                                                             |

### Removed public properties

Most removals are covered by the renames above: a family that changed variant name or size
suffix is listed with its replacement. Three properties go away with no counterpart:

| Removed                                | What to do                                                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--wb-public-segment-picker-padding`   | `SegmentPicker` no longer pads its container, matching every variant of the design master. Space between segments comes from `--wb-public-segment-picker-gap`.                           |
| `--wb-public-modal-close-button-color` | The close control is a `NavButton` now and takes its colour from the button's own properties.                                                                                            |
| `--wb-public-textarea-root-color`      | Split by state: `--wb-public-textarea-color` for the value, `--wb-public-textarea-placeholder-color` for the placeholder and `--wb-public-textarea-color-disabled` for a disabled field. |

## Fonts

Poppins latin 400 and 600 are inlined in the stylesheet; every other weight, Inter and the
non-ASCII glyphs load from `.woff2` files in the `assets` directory next to it, together
with the SIL Open Font License texts. Preserve that `dist` layout when copying the
stylesheet somewhere else.

If a Content Security Policy exists, allow `data:` and `'self'` or the serving origin in
`font-src`, or in `default-src` when `font-src` is absent. No font CDN is contacted at
runtime.

## Behaviour

- **The SDK no longer resets the font of the whole document.** A host page that relied on
  the SDK stylesheet setting its font must set it itself. Use `--wb-public-font-family` to
  retheme the builder instead of overriding font declarations on SDK elements.
- **Saved diagrams no longer carry runtime sizes.** `getStoreDataForIntegration` and the
  localStorage, REST and callback integrations drop `measured` and `dragging`, so stored
  data cannot go stale. A diagram saved by 2.x opens once at a slightly different zoom,
  because the nodes are measured again before the view is fitted. Saving it again clears the
  old values.
- **Self-connecting edges loop 48px above the node's top edge**, for any node height, where
  2.3.0 drew them a flat 100px above the source port. `SelfConnectingEdge` no longer takes
  `nodeHeight`; it reads the node position from the React Flow store, and `useSelfLoopApexY`
  is exported for custom edges that draw their own loop.
- **Canvas nodes use the design geometry.** The node shell is 241px wide and no longer
  scales with the root font size. Node titles, subtitles and row labels truncate to one line
  and expose the full text through the browser's native tooltip.
- **Menus mark the current choice.** A menu with a selection renders its entries as a radio
  group (`menuitemradio` with `aria-checked`), and a selected entry uses a tinted background
  instead of a solid accent fill.
- **The single top-level cascade layer.** The SDK stylesheet declares
  `@layer ui.base, ui.component;` and moved the XYFlow stylesheet and its own resets into
  `ui.base`. If you targeted the removed `reset` or `ext-lib` layer names, plain unlayered
  CSS now wins over every library layer.

## Where to go next

- [Theming](/get-started/theming/) for the current override surface.
- [Design tokens](/ui-library/design-tokens/) for the generated token set.
- [UI Library](/ui-library/overview/) for each component's props and variables.
