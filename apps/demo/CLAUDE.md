# Demo

Reference app showcasing `@workflowbuilder/sdk`. React + Vite, port 4200.

> **Reference, not work surface**: this directory is the canonical example for SDK consumers, **not the place to build new apps**. Do not edit demo directly when extending the SDK — scaffold a sibling app via `/wb.create-app <your-name>` (it can copy nodes/templates/plugins from here as a starting point), then iterate in `apps/<your-name>/`. The target-aware `/wb.create-{node,plugin,template}` skills write into your app, not demo.

Demo composes the SDK with a curated palette, templates, and ~13 plugins. It is the canonical example for plugin authoring, custom node types, and integration patterns. Demo is **UI-only** — it does not import `@workflow-builder/execution-core`. Backend execution is owned by the `ai-studio` plugin.

## Node anatomy

Each node type lives in `src/app/data/nodes/<node-name>/`. Canonical pattern is 4 files:

| File                         | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `<node-name>.ts`             | `PaletteItem<Schema>` — label, type, icon, defaults, schemas, optional `outputSchema` |
| `schema.ts`                  | JSON Schema with `satisfies NodeSchema`; spreads `sharedProperties` from the SDK      |
| `uischema.ts`                | UI Schema using `getScope<Schema>` for type-safe scopes                               |
| `default-properties-data.ts` | Defaults aligned with the schema                                                      |

Nodes are registered in `src/app/data/palette.ts` (flat array of `PaletteItem`).

`sharedProperties`, `statusOptions`, `generalInformation`, and `globalControls` come from `@workflowbuilder/sdk`, not a local shared folder.

`action/` is the canonical reference (`src/app/data/nodes/action/`). `delay/` deviates with two extra files (`select-options.ts`, `conditional-validation.ts`) for if-then-else schema validation — only use when the canonical 4-file pattern can't express the case.

## Plugin model

Plugins live in `src/app/plugins/<plugin-name>/` and register via SDK decorators inside `<plugin-name>/plugin-exports.ts`:

| Decorator                                | Purpose                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `registerComponentDecorator(name, opts)` | Inject UI or hooks into a known slot (`OptionalHooks`, `OptionalAppChildren`, `OptionalNodeContent`, `OptionalAppBarTools`, …) |
| `registerFunctionDecorator(name, opts)`  | Intercept a registered function (e.g. `getPaletteData`, `getTemplates`) before/after                                           |
| `registerPluginTranslation(resource)`    | Add i18next strings under the `plugins.<name>` namespace                                                                       |

Plugin signature is `() => void` and the function runs once on first mount of `<WorkflowBuilder.Root plugins={[...]} />` (invoked synchronously inside a `useRef`-guarded first-render branch; deduplicated by `name` on strict-mode double-invoke).

Reference plugins:

- `flow-runner/` — in-browser execution via callable logic registry (Zustand)
- `ai-studio/` — backend execution + AI nodes (REST POST + SSE); see `hooks/use-backend-execution.ts`
- `__demo/` — minimal scaffold worth copying as a starter

## Templates

Pre-built diagrams in `src/app/data/templates/<name>.ts` exporting a `TemplateModel` (`{ id, name, value: DiagramModel, icon }`). Loaded via the templates picker.

## Backend integration (ai-studio plugin)

The `ai-studio` plugin talks to the backend at `BACKEND_URL` (`src/app/plugins/ai-studio/config.ts`):

| Method | Endpoint                     | Purpose             |
| ------ | ---------------------------- | ------------------- |
| POST   | `/api/workflows`             | Save workflow draft |
| POST   | `/api/workflows/:id/execute` | Trigger execution   |
| DELETE | `/api/executions/:id`        | Cancel execution    |

Live execution events stream over SSE from `/api/executions/:id/stream`.

## Typing patterns

- Node definitions use `satisfies NodeSchema` (not `: NodeSchema =`) for type inference
- UI schemas use `getScope<NodeSchemaType>` for type-safe property paths
- Import all node-authoring helpers (`sharedProperties`, `getScope`, `Icon`, etc.) from `@workflowbuilder/sdk`
