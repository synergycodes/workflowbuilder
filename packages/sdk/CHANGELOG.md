# Changelog

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

[2.2.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.2.0
[2.1.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.1.0
[2.0.1]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.0.1
[2.0.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.0.0
