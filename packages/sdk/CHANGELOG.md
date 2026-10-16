# Changelog

## [3.0.0] - 2026-10-02

Design System 2.0. Components, design tokens, typography and the public CSS custom properties follow the new design library, and the bundled UI library is now the in-repo `@workflowbuilder/ui`, rebuilt on Base UI. Entries marked **Breaking** need action when upgrading from 2.3.0. The [3.0 upgrade guide](https://www.workflowbuilder.io/docs/get-started/upgrade-to-3/) walks through each of them.

### Added

- `useSetSelection` hook: returns a function that replaces the selection with the given nodes and edges, as a click does for one element.
- `showSnackbar` and `closeSnackbar`: put an app's own snackbars in the editor's snackbar stack, next to the SDK's. Each call shows its own snackbar unless it passes a `key`, `autoHideDuration: null` keeps it until it is closed, and both do nothing before an editor mounts.
- `PropertiesPanelFooter`: renders its children in the properties panel's footer from anywhere inside the panel's content, such as a JsonForms control. The footer disappears when it has nothing to show.
- `isStartNode?: boolean` on node data, marking the workflow's entry point. Declare it on the palette item (`NodeDefinition`) and the editor copies it into the node's `data` when the node is dropped, so execution integrations can read `data.isStartNode` instead of matching the node's xyflow `type` against `'start-node'`. `templateType` keeps selecting the visual template only.
- `JsonForms`, exported beside the other JsonForms primitives, so a custom control can render a separate schema and data with the editor's own renderers and validator.
- `Menu.TriggerButton`: an icon-only trigger that shows the pressed state while its `Menu` is open.
- `useSelfLoopApexY`, for custom edges that draw their own self-connecting loop.
- `wb-text-{family}-{size}[-emphasized]` utility classes for the Design System 2.0 type roles (40 styles: Display, Headline, Title, Body, Label, Node, UI/Code) in `@workflowbuilder/ui`. Poppins and Inter (for the `wb-text-code` role) now ship with `@workflowbuilder/ui` itself, so the classes work standalone; the SDK inherits the fonts through the UI package instead of bundling its own. The fortieth style is `wb-text-code-mono`, an additional monospace role not named in the design system.
- `closeLabel` on `Modal` and `expandLabel` / `collapseLabel` on `Collapsible`, all with English defaults. The SDK supplies its localized labels to these controls.
- `disabled?: boolean` on `WorkflowNodeTemplateProps`. The built-in templates forward it; see the palette entry under Changed for custom templates.

### Changed

- **Breaking.** Replace the design-token surface published as `--ax-*` custom properties with `--wb-ds-*` properties generated from the Design System 2.0 Figma variables, with renamed and re-scaled primitives, semantic colours per theme, and new canvas, shadow (effects) and component role sets. The upgrade guide maps token families and lists primitive changes; most old tokens have no direct counterpart.
  - Move every override of an `--ax-*` design token to the `--wb-ds-*` property listed for it in the upgrade guide. There are no compatibility aliases, and a token with no listed counterpart has none.
  - Expect a repainted palette wherever tokens are used unchanged: the brand accent is `#3969ff`, and the red, green and orange scales carry new values. Warning surfaces shift the most, because the orange scale was rebuilt around `--wb-ds-colors-orange-500` (`#fdac1b`).

  New in the export and used by the components: canvas node body and row metrics (`--wb-ds-canvas-node-body-*`, `--wb-ds-canvas-node-row-*`), node focus ring colours and shadow (`--wb-ds-canvas-node-focus-ring-*`, `--wb-ds-shadow-canvas-focus-ring-node-*`), selected list backgrounds (`--wb-ds-ui-bg-selected`, `--wb-ds-ui-bg-selected-hover`), ghost button label roles that hold WCAG AA on every tint (`--wb-ds-components-button-ghost-*-text-default`), and the size steps that button heights and icon sizes now resolve from.

- **Breaking.** Move the public component override surface from the `--ax-public-*` prefix to `--wb-public-*`, with no compatibility aliases.
  - Replace the `--ax-public-` prefix with `--wb-public-` in every consumer override.
  - Check each overridden name against the 3.0 upgrade guide's CSS custom property renames and removed-property list rather than renaming the prefix mechanically.
- **Breaking.** Split the SDK custom properties into a public override surface and a private one. The public controls take the `--wb-public-` prefix; everything else moves to `--wb-sdk-` and is no longer part of the supported surface.
  - Rename `--wb-background-color` to `--wb-public-background-color`, `--wb-font-family` to `--wb-public-font-family`, `--wb-transition` to `--wb-public-transition`, and the supported `--wb-scroll-*` properties to `--wb-public-scroll-*`; the previously documented `--wb-scroll-thumb-hover-color` was never consumed and has no counterpart.
  - Drop overrides of any other `--wb-<name>` property. They now live under `--wb-sdk-<name>`, which is private and may change without a major release.
- **Breaking.** Rebuild `Button` on the Design System 2.0 specification. It takes `variant`, `size` and `shape`, and composes its content from `prefixIcon`, `children` and `suffixIcon` instead of inferring a subtype from the children structure. The variant list is `primary`, `secondary`, `critical`, `success` and a ghost treatment of each; sizes are letter-based; `shape` is `default`, `square` or `round`. A warning `Snackbar` renders its action button as `secondary`.
  - Migrate variants: `gray` and the old outlined `secondary` both become the solid grey `secondary` (use `ghost-secondary` where the outlined treatment should stay), `error` becomes `critical`, `ghost-destructive` becomes `ghost-critical`, and `warning` becomes `critical` for destructive actions or `secondary` for cautionary ones.
  - Migrate sizes: `extra-large`, `large`, `medium`, `small`, `extra-small` become `xl`, `l`, `m`, `s`, `xs`. The `xx-small` and `xxx-small` steps are gone.
  - Replace `shape="circle"` with `shape="round"` on `Button`, which also gains `shape="square"`. `SegmentPicker` keeps `shape="circle"`; its default shape is now spelled `'default'` instead of the empty string, and the shape union is exported as `SegmentPickerShape`.
  - Rename `Variant` to `ButtonVariant`. `BaseRegularButtonProps` and the old label/icon/icon-and-label component subtypes are removed; `LabelButtonProps` and `IconButtonProps` are redefined for the new API.
  - Retarget public button overrides: the `gray`, `error`, `warning` and `ghost-destructive` variable families no longer exist, and the size suffixes in variable names follow the new scale. The `secondary` family now describes the solid grey variant, so overrides written for the old outlined `secondary` belong on `ghost-secondary`.
- **Breaking.** Rebuild `NavButton` on the Design System 2.0 specification: it takes `size`, `variant` (`square`, `round`, `plain`), `prefixIcon`, `suffixIcon` and `children` instead of inferring a subtype from the children structure, and the selected state no longer shares a treatment with the pointer-down state.
  - Pass icons through `prefixIcon` or `suffixIcon`. An icon passed as `children` is rendered as label content, not as an icon.
  - Migrate sizes to the letter scale.
  - Move an icon passed as `SegmentPicker.Item` children to an explicit icon slot. `SegmentPicker` keeps its API but adopts the new slots.
- **Breaking.** Rebuild the form controls on one field composition. `Input`, `TextArea`, `Select` and `DatePicker` render inside a shared `Field` that provides an associated label, helper text, a required marker and the visual state, so a label no longer has to be wired up by hand. `Input` and `TextArea` take letter sizes, icon slots and an optional clear action; `Select` and `DatePicker` gain `label`, `helperText`, `state`, `isRequired` and `id`, and paint a disabled background.
  - Replace the boolean `error` prop on `Input` and `TextArea` with `state="critical"`. `state` also carries `success` and `read-only`.
  - Replace `startAdornment` and `endAdornment` with `prefixIcon` and `suffixIcon`.
  - Migrate `Input` and `TextArea` sizes from `large`, `medium`, `small` to `l`, `m`, `s`; `xs` is new. `Select`'s `size` and `DatePicker`'s `inputSize` keep the word-based scale and map it internally.
  - Retarget the public control variables: the `Input` `-error` families and `TextArea` background and border `-error` properties become `-critical` (`Select` keeps `-error`), and the size suffixes in `--wb-public-input-padding-*`, `--wb-public-input-gap-*` and `--wb-public-input-border-radius-*` follow the letter scale (`-medium` becomes `-m`, and so on); `TextArea`'s error text-colour override is removed.

  New public properties cover the states the old surface had no lever for: success and hover borders, disabled backgrounds, icon and placeholder colours, and the label, helper and required-marker colours of the field composition.

- **Breaking.** Stop resetting the font of the whole document. Typography is bound to the built-in type roles and to the public `--wb-public-font-family` lever, so setting that one variable rethemes both the roles and the builder root. Small text on SDK surfaces takes an explicit 10px, 11px or 12px role per surface, including the 12px code editor text that now matches the code role.
  - Set the font on host pages that relied on the SDK stylesheet for it; the SDK only styles its own subtree now.
  - Set `--wb-public-font-family` instead of overriding font declarations on SDK elements. The previous per-element overrides no longer reach every surface.
- **Breaking.** Ship the fonts as `.woff2` assets next to the stylesheets, with only the two dominant faces inlined.
  - Preserve the published `dist/assets` directory next to copied stylesheets so their relative font URLs keep resolving.
  - If a Content Security Policy exists, allow `data:` and `'self'` or the serving origin in `font-src`, or in `default-src` when `font-src` is absent.

  Both packages ship the SIL Open Font License texts (`OFL-poppins.txt`, `OFL-inter.txt`) in `dist/assets` next to the font files, so copying that directory keeps the redistribution licensed. Only Poppins latin 400 and 600 are inline. Other weights, Inter, and non-ASCII glyphs use `font-display: swap` assets and may briefly render in the fallback font; preload the relevant files when that flash of unstyled text (FOUT) is unacceptable.

- **Breaking.** Place the apex of a self-connecting edge 48px above the source node's top edge, for any node height. `SELF_CONNECTING_EDGE_LABEL_OFFSET` is now `48` and is measured from that edge, and `SelfConnectingEdge` no longer takes `nodeHeight` (the node height alone cannot place the apex, since ports sit at a fixed offset inside the header rather than at mid-height). Previously the loop was drawn a flat 100px above the source port, which on a 64px node put the apex 68px above its top edge.
  - Drop the `nodeHeight` prop from any custom use of `SelfConnectingEdge`; the component reads the node position from the React Flow store.
- **Breaking.** Show the properties panel's Delete button only when `onDeleteClick` is passed, so a decorator on the `'PropertiesBar'` slot can remove it.
  - Call `onDeleteClick?.()` in a decorator that calls `onDeleteClick`.
- **Breaking.** Render palette entries in the canvas Node states instead of their own styling: hover is the Node Hover state, the drag preview is the default state, and entries that cannot be added (read-only mode) render the Node Disabled state instead of a faded copy.
  - Forward `disabled` to `NodePanel.Root`, `NodeIcon` and `NodeDescription` in custom node templates, otherwise the palette entry looks draggable while the palette is locked (the wrapper no longer fades it).
- **Breaking.** Declare a single top-level cascade layer in the SDK stylesheet: XYFlow's stylesheet and the SDK resets moved from the `ext-lib` / `reset` layers into `ui.base`, and the file opens with the same `@layer ui.base, ui.component;` statement as every `@workflowbuilder/ui` stylesheet. Component styling no longer depends on stylesheet load order.
  - If you targeted the removed `reset` / `ext-lib` layer names, use plain unlayered CSS, which wins over all library layers.
- Bundle the in-repo `@workflowbuilder/ui`, rebuilt on [Base UI](https://base-ui.com/), instead of `@synergycodes/overflow-ui@1.0.0-beta.27` (built on MUI / Mantine / Emotion / Floating UI). `@base-ui/react` is now a regular dependency of the SDK (installed automatically, not bundled) rather than an inlined implementation detail. Bundled component visuals and interaction details change accordingly. The SDK's exported symbols are unchanged, but public types deriving from the UI library (`InputControlProps`, `TextAreaControlProps`) now build on `@workflowbuilder/ui` type shapes (picked keys unchanged). The internal DOM structure and class names of all bundled UI changed (MUI Base and Mantine to Base UI), so styles or tests written against those internal class names may need updating. Modal open and close now run their enter and exit fade transitions (previously the dialog appeared and disappeared instantly).
- Show two different SDK snackbars of the same variant together instead of dropping the second.
- Leave the runtime `measured` node sizes and the `dragging` flag out of saved and exported diagrams (`getStoreDataForIntegration`, the localStorage/API/props integrations). Nodes are measured again on load, so stored data cannot carry stale dimensions.
- Make canvas node shells a fixed 241px wide, down from 16.125rem (258px at the default root font size), so their width no longer scales with the root font size.
- Align node sections and the rows inside them (Decision branches, AI tool rows) with the design library: 8px padding and gap everywhere, 4px row radius and 8px section radius, where before the rows used 12/10px padding and a 6px radius. Padding, gap and radius bind to the `canvas/node/body-*` and `canvas/node/row-*` roles instead of raw spacing primitives. A row carries the content background (`canvas/node/bg-content-default`) and its label renders at Body/S Emphasized; the border a row used to draw is gone, and only the section and the AI tools wrapper outline, with `canvas/node/stroke-default`.
- Let decision branch rows and AI tool rows fill the width their section offers, as the design library's `Node / Row` does, instead of capping it with a width derived from the node shell. At the default node width a row measures 205px. Long labels truncate at the section edge instead of overflowing it, and branch rows are spaced with the node body gap (8px) like tool rows. The derived cap survives only in the vertical (DOWN) layout, where a branch row has no design master and an uncapped label would widen the node.
- Show the full label of decision branch rows and AI tool rows as a native tooltip (`title`), so a clipped row stays readable.
- Render the dynamic-conditions counter tag with the UI `Chip` component. It keeps the same neutral surface colours and takes the DS 2.0 chip metrics: a 10px label (was 12px) in a 20px-tall pill with slightly tighter padding.
- Take the colour of the canvas grid dots from the design tokens instead of the React Flow default.
- Use the `secondary` button variant for the import dialog's "Ignore and import" action instead of the removed `warning` variant.

### Removed

- **Breaking.** Remove the legacy typography utility classes in favour of the Design System 2.0 type roles.
  - `ax-public-h1` through `ax-public-h12` and `ax-public-p1` through `ax-public-p12` have no one-to-one replacement. Migrate each to the `wb-text-{family}-{size}[-emphasized]` role that matches its semantic use.
  - Migrate `ax-public-button-large`, `ax-public-button-medium`, `ax-public-button-small` and `ax-public-button-extra-small` to `wb-text-label-xl-emphasized`, `wb-text-label-l-emphasized`, `wb-text-label-m-emphasized` and `wb-text-label-s-emphasized`.
  - Migrate `ax-public-edge-label-medium`, `ax-public-edge-label-small` and `ax-public-edge-label-extra-small` to `wb-text-label-m`, `wb-text-label-m` and `wb-text-label-s`.

### Fixed

- Stop `ModalProvider` from touching `document` during server-side rendering; the modal portal mounts after hydration. Fixes `ReferenceError: document is not defined` when the editor renders in SSR frameworks such as Next.js.
- Fix CSS variable names that pointed at non-existent tokens: the variables-settings modal picks up its token-defined colors, spacing, and radii, and diagram edge labels use their intended hover/selection colors.
- Mark the current language as selected in the language menu (`menuitemradio` with `aria-checked`).
- Keep the app bar's folder label on one line while the diagram title is being edited. The title already carried `white-space: nowrap`; the label next to it did not, so the wider edit field pushed it over two lines.
- Restore the 8px gap between controls stacked in a nested `VerticalLayout` in the properties form, such as the two selects under the AI Agent node's Operational Settings. The nested layout referenced a class its stylesheet never declared, so its children rendered as plain blocks with no gap. The root layout was never affected: `.json-form-container > div` gives it a 16px gap on its own.

## [2.3.0] - 2026-08-12

### Added

- `logo` and `logoHref` props on `<WorkflowBuilder.Root>`. `logo` accepts an image URL, `{ light, dark }` per-theme URLs, or a custom element and replaces the built-in app-bar logo; `logoHref` wraps it in a link.
- `maxRows` option on the `TextArea` uischema control, capping how far the field auto-grows.

### Changed

- Slim the base install to `@workflowbuilder/sdk @xyflow/react zustand`. `@jsonforms/core`, `@jsonforms/react`, `i18next`, `react-i18next`, `i18next-browser-languagedetector` and `immer` moved from peer to regular dependencies and install automatically. JsonForms authoring primitives (`withJsonFormsControlProps`, `rankWith`, `useJsonForms`, `RuleEffect`, `ControlProps`, …) are now re-exported from `@workflowbuilder/sdk`, so custom renderers need no extra installs.
- Drop the decision node's node-level output port; branches are its only outputs. Edges drawn from the old bare `source` handle lose their connection point.

### Fixed

- Add vertical spacing between branch cards in the decision properties panel. The accordion layout no longer lays out classless child divs, so custom controls should style their own root.
- Stop the language selector from showing "EN" while the UI renders Polish for regional locales (e.g. `pl-PL`).

## [2.2.0] - 2026-06-29

### Added

- Keyboard zoom in the editor: `Ctrl/Cmd` with `+`/`=` zooms in and `Ctrl/Cmd` with `-` zooms out while the canvas is focused.

### Changed

- Render the app bar's "Duplicate to Drafts" menu item only when an `onDuplicateClick` handler is provided, removing the default no-op button.

### Fixed

- Stop the delete confirmation modal from opening when Delete or Backspace is pressed with nothing selected.
- Surface validation errors when nodes load before the palette. A race between node and palette loading previously dropped newly applicable errors (for example, for fields not evaluated earlier), so the node showed only a "!" indicator until selected.
- Block edge creation in read-only mode.
- Block cut and paste in the diagram in read-only mode; copying is still allowed.
- Use the SDK's own `templateSelector.title` string for the template selector modal title instead of an unrelated plugin translation key.

## [2.1.0] - 2026-06-16

### Added

- `isValidConnection` and `reactFlowProps` props on `<WorkflowBuilder.Root>`. `isValidConnection` validates connections as the user draws them; `reactFlowProps` forwards extra props to the ReactFlow canvas.
- `useWorkflowBuilderActions()` hook for custom layouts that omit `<WorkflowBuilder.TopBar />`, exposing the imperative save / import / export / settings / read-only / theme / layout-direction actions. Also exports the `WorkflowBuilderActions`, `LayoutChangeOptions`, and `Theme` types. See [Custom toolbar without the app bar](https://www.workflowbuilder.io/docs/guides/configuring-the-editor/#custom-toolbar-without-the-app-bar).
- `edgeTemplates` prop on `<WorkflowBuilder.Root>` for custom edge renderers. Pass a `{ [edgeType]: Component }` map of components taking ReactFlow's `EdgeProps`; edges whose `type` matches a key render with your component, and unregistered types fall back to the built-in `labelEdge`. Also exports the `WorkflowBuilderEdgeTemplates` type.

### Fixed

- Re-measure node internals when `layoutDirection` changes, so edges re-route to the new handle positions instead of the stale ones React Flow had cached.
- Theme now lives in a shared store applied to the DOM on `<WorkflowBuilder.Root>` mount, so a persisted theme paints on first load even without the app bar and multiple consumers stay in sync. Reads of `document` / `localStorage` are guarded, so importing the SDK server-side no longer throws.

## [2.0.1] - 2026-05-29

### Fixed

- Stop `NodeProperties` from pushing a phantom undo entry when JsonForms re-emits `onChange` after an external `data` change (e.g. just after `undo()`), which previously cleared `future` and broke redo.
- Remove nested `var(var(...))` from palette `variables.css` that broke strict CSS parsers (e.g. Lightning CSS / Next.js Turbopack).
- Drop `nodeId` from handle IDs. Compound nodes (decision, AI agent, conditional) can now declare default ports statically (e.g. in JSON-defined `defaultProperties`) and copy/paste no longer requires custom handle rewriting after a node ID change. `getHandleId({ nodeId })` still compiles. The argument is optional, marked `@deprecated`, and ignored at runtime. Diagrams saved with the 2.0.0 `<nodeId>:<handleType>[:inner:<innerId>]` format are auto-migrated to the new `<handleType>[:inner:<innerId>]` form on `setDiagramModel` and `setStoreDataFromIntegration`.
- Stabilize horizontal port Y on built-in node templates so multi-line descriptions no longer shift the port and bend edges between adjacent nodes. Pins the resulting port to the NodeIcon's vertical center via a global CSS rule scoped to a SDK-owned anchor class. Also fixes a latent bug where `DecisionNodeTemplate` hardcoded `Position.Right` on the source handle instead of honoring `layoutDirection`.

## [2.0.0] - 2026-05-22

First public npm release. The major bump continues the Workflow Builder version line (1.0 / 1.1 / 1.2 shipped as a monorepo bundled with the app); the redistribution as a standalone React SDK package is the breaking change that justifies 2.0.

### Added

- `<WorkflowBuilder.Root>` compound component with `TopBar`, `Palette`, `Canvas`, `PropertiesPanel`, and `DefaultLayout` subcomponents.
- Plugin API: `registerComponentDecorator`, `registerFunctionDecorator`, `registerPluginTranslation`.
- Integration types: `IntegrationStrategy`, `OnSaveExternal`, `IntegrationDataFormat`.
- Bundled CSS (`@workflowbuilder/sdk/style.css`) covering the editor, `@xyflow/react`, and `@synergycodes/overflow-ui` styles.
- Type definitions bundled into a single `dist/index.d.ts` — all required types (icons, domain models, plugin API) are inlined, no extra installs needed.

### Changed

- Distribution model: editor is now consumed via `npm install @workflowbuilder/sdk` instead of cloning the monorepo. Consumers no longer need monorepo tooling, tsconfig paths, or workspace symlinks.

[3.0.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/3.0.0
[2.3.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.3.0
[2.2.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.2.0
[2.1.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.1.0
[2.0.1]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.0.1
[2.0.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.0.0
