# Changelog

All notable changes to `@workflowbuilder/sdk` are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[2.0.1]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.0.1
[2.0.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.0.0
