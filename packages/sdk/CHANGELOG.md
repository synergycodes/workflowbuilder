# Changelog

## 2.0.1

### Patch Changes

- c78e841: fix: stop `NodeProperties` from pushing a phantom undo entry when JsonForms re-emits `onChange` after an external `data` change (e.g. just after `undo()`), which previously cleared `future` and broke redo.
- 81fd0e2: fix: remove nested `var(var(...))` from palette `variables.css` that broke strict CSS parsers (e.g. Lightning CSS / Next.js Turbopack).

All notable changes to `@workflowbuilder/sdk` are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[2.0.0]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/2.0.0
