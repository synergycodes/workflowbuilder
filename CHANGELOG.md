# Changelog

## Version 2.0.0

### New:

- Workflow Builder is now distributed as a standalone npm package, `@workflowbuilder/sdk`, with a clean React component API (`<WorkflowBuilder.Root>` plus optional `TopBar` / `Palette` / `Canvas` / `PropertiesPanel` slots). Consumers install one package plus three peer deps instead of cloning the monorepo. This redistribution model is the headline change that justifies the major bump.
- Workflow execution backend (reference implementation): Hono REST + SSE server, Drizzle/Postgres, Temporal-backed worker, AI agent / decision / trigger executors.
- AI Studio reference app. A full executable workflow product showing play/stop/reset toolbar, per-node execution highlighting, log panel, and node detail panel.
- Per-node error policy with `continue` / `route` / `fail` semantics and an explicit `errorRoute` handle on the canvas.
- Global variables (variable store, persistence, dark-mode-aware picker integration).
- Node outputs and the variable picker. Nodes can now declare an output schema, and downstream nodes reference those outputs from dedicated Variable picker input controls in the properties panel. The reference execution backend resolves the references end-to-end at runtime, so values flow through the graph without custom wiring. Full picker documentation added.
- Custom node templates: consumers register per-type renderers via the new `nodeTemplates` prop.
- Title variant for sidebar Label control (semibold + primary color). Supplies the previously missing header variant.
- Disabled state for sidebar controls.
- Logger abstraction lets embedders plug their own log sink (default adapter: console).

### Improvements:

- JSON Schema validation is now CSP-safe. Ajv replaced with `@cfworker/json-schema` (interpreter-based, no `new Function()`), so the editor runs under strict Content Security Policy.
- Documentation site restructured into an audience-based information architecture (Overview / Get Started / Guides / Plugins / Built-in Nodes / UISchema Reference / API Reference) with an auto-generated TypeDoc API reference and hand-written UISchema + Data schema references.
- See-also sections and external-link rehype added across the documentation.
- Onboarding rewritten around `pnpm preflight` plus three explicit paths (UI-only demo, full reference stack, embed-the-SDK).
- Reference backend now binds to `127.0.0.1` by default and ships behind a "local development only" disclaimer.

### Fixes:

- SVG icons no longer clipped at non-default sizes.
- SVG icon REM-based width handling.
- Locale string fixes.
- Saving status if-statement handling.

## Version 1.2.0

### New:

- A new, robust documentation site has been created using Astro - https://www.workflowbuilder.io/docs/overview/
- New element RichText added, allowing passing HTML to forms in the sidebar (e.g., when we need to add context to a field with an additional link)
- A new variable picker for text has been added

### Improvements:

- Fit to view actions now take into account opened panels and don't hide content behind them
- The selected node/edge sidebar can now be closed to show more of the canvas if needed
- The loaded diagram is revalidated, and new errors are shown if the diagram configuration has changed (for example, if a node now has new fields)
- Workflow builder styles now use box-sizing: border-box by default
- Dependecies were updated (e.g, @xyflow/react to 12.10.0)
- Added misisng decision and tool ids to simplyfie parsing of flows by flow engines
- Nodes in panels expect all properties to be filled with default values

### Fixes:

- Removing a tool or a branch removes attached edges (they can be restored by clicking "Undo")
- Templates cannot be changed in read-only mode
- The "Add tool" and "Add branch" buttons on nodes are now working correctly
- Only a new element is now selected after copying
- Fixed a bug that blocked rendering of the form when loading nodes with the sidebar open
- Fixed an issue with saving on close

### Plugins:

- **New** - Analytics – new tracking mechanism based on Microsoft Clarity.
- **New** - Diagram validation - Additional logic for working with JSON forms, adding diagram-based validation (e.g., detecting when a node that uses variables from previous nodes is not connected to them, or when required edges are missing).
- Undo/redo — improvements to history logic to prevent duplicate history items
- Flow runner - Improved documentation and more tests for the workflow runner
- Improvement development mode for plugins
