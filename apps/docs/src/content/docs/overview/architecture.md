---
title: Architecture
description: How Workflow Builder is structured — the SDK package, surrounding apps, plugin system, and data model.
---

## Tech stack

| Concern          | Library                                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| UI library       | [React](https://react.dev/)                                                       |
| UI components    | [`@workflowbuilder/ui`](/ui-library/overview/) on [Base UI](https://base-ui.com/) |
| Diagram engine   | [React Flow (xyflow)](https://reactflow.dev/)                                     |
| State management | [Zustand](https://zustand.docs.pmnd.rs/)                                          |
| Dynamic forms    | [JsonForms](https://jsonforms.io/)                                                |
| Build tool       | [Vite](https://vitejs.dev/)                                                       |
| Language         | TypeScript                                                                        |

All libraries are open-source with no additional license purchase required.

## Repository layout

The project is a pnpm workspace. The editor itself lives in a single distributable package (`packages/sdk`, eventually published to npm as `@workflowbuilder/sdk`); everything in `apps/` is either a consumer of that package, an optional execution-side service, or developer tooling.

```
packages/
└── sdk/               # The editor — distributed as @workflowbuilder/sdk

apps/
├── demo/              # Reference React host that consumes the SDK
├── ai-studio/         # Reference AI workflow product built on the SDK (sibling to demo)
├── docs/              # This documentation site (Astro + Starlight)
├── icons/             # Lazy-loadable icon set, bundled into the SDK at build time
├── backend/           # Optional REST backend used by the demo's `api` strategy
├── execution-core/    # Optional workflow execution runtime
├── execution-worker/  # Optional async worker for execution jobs
├── types/             # Shared types for the execution layer
└── tools/             # Internal scripts and developer utilities
```

`@workflowbuilder/sdk` is the only artifact an external app needs. The execution-side apps (`backend`, `execution-core`, `execution-worker`) are independent — the SDK serialises workflows to JSON and emits save events; what runs them is up to you.

## SDK structure

The SDK package's source tree:

```
packages/sdk/src/
├── workflow-builder-root/      # <WorkflowBuilder.Root> entry (folder — component, types, helper, shell)
│   ├── workflow-builder-root.tsx       #   the component
│   ├── workflow-builder-root.types.ts  #   public API types (props, plugin, integration, jsonForm)
│   ├── resolve-integration.ts          #   integration-discriminated-union → flat shape helper
│   ├── root-shell.tsx                  #   internal subtree under StoreContext.Provider
│   └── index.ts                        #   barrel re-export
├── bootstrap-immer.ts          # First-loaded side-effect: disables immer auto-freeze
├── bootstrap.ts                # Module-level init (i18next, modals + i18n plugins)
├── index.ts                    # Curated public barrel + compound `WorkflowBuilder` namespace
├── components/                 # Reusable UI primitives (forms, sidebar, loader)
├── data/                       # Default palette + templates registries
├── features/                   # Feature modules (key modules shown)
│   ├── default-layout/         #   Default floating-overlay layout (exported as WorkflowBuilder.DefaultLayout)
│   ├── app-bar/                #   <WorkflowBuilder.TopBar>
│   ├── palette/                #   <WorkflowBuilder.Palette>
│   ├── diagram/                #   <WorkflowBuilder.Canvas> + React Flow integration
│   ├── properties-bar/         #   <WorkflowBuilder.PropertiesPanel>
│   ├── json-form/              #   Dynamic form rendering (JsonForms)
│   ├── integration/            #   Persistence strategies (localStorage / api / props)
│   ├── plugins-core/           #   Plugin adapter layer (decorator registries)
│   ├── changes-tracker/        #   Undo/redo + change events
│   ├── modals/, snackbar/      #   Lightweight UI infra
│   └── i18n/                   #   Translations (en, pl)
├── hooks/                      # Public React hooks (`useStore`, `useFitView`, …)
├── store/                      # Zustand store factory + slices + action helpers
├── node/                       # Node domain types (`NodeSchema`, `NodeData`, …)
├── types/                      # UISchema control / layout / integration types
└── utils/                      # `noop`, `sharedProperties`, schema helpers
```

`apps/demo/src/app/` is much thinner — it's only what a host needs to drive the SDK: an `app.tsx` that mounts `<WorkflowBuilder.Root>`, `data/` with the demo's `palette.ts` + per-node schemas, and `plugins/` with the example plugins.

## Plugin system

Workflow Builder is plugin-based. The SDK exposes a small set of extension points; a plugin is just a synchronous initializer that calls one or more of them at startup.

| Extension point                                                          | What it does                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [`registerComponentDecorator`](/api/plugins/registercomponentdecorator/) | Wrap a named slot (app bar control, node section, …).         |
| [`registerFunctionDecorator`](/api/plugins/registerfunctiondecorator/)   | Hook before/after a named SDK action.                         |
| [`registerPluginTranslation`](/api/plugins/registerplugintranslation/)   | Merge translations into the SDK's `plugins.*` i18n namespace. |
| `<WorkflowBuilder.Root jsonForm={{ renderers, cells, translations }} />` | Add custom JsonForms renderers / cells.                       |

A plugin is `() => void` — see the [`WorkflowBuilderPlugin`](/api/plugins/workflowbuilderplugin/) type. Pass an array of them via `<WorkflowBuilder.Root plugins={[…]} />` (each runs once, in order, on first mount) or call the `register*` APIs directly at module level — the SDK's decorator registries are module-global and dedupe by `name`.

The SDK's base behaviour is not modified — every customisation is additive through the registries above, so plugins can be added or removed without touching the editor's source.

The `apps/demo/src/app/plugins/` directory ships a set of example plugins (avoid-nodes-edges, copy-paste, undo-redo, flow-runner, …). They double as recipe references — see [Plugins](/plugins/) for documentation per plugin and [Build a plugin](/guides/build-a-plugin/) for the full authoring guide.

## Data model

A workflow is a flat JSON object:

```typescript
type IntegrationDataFormat = {
  name: string;
  layoutDirection: 'DOWN' | 'RIGHT';
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
};
```

Each node carries its type, position, icon, and a `properties` object whose shape is defined by that node type's [JSON Schema](/node-schemas/data-schema/). This is the payload the SDK reads at load time and emits on save through whichever [persistence strategy](/get-started/persistence/localstorage/) is configured.

## Execution

Workflow Builder focuses on the editor layer. The serialised JSON is designed to be consumed by a backend execution engine — yours or one of the in-repo apps (`apps/execution-core/` + `apps/execution-worker/` cover the demo's runtime; `apps/backend/` is the REST surface they sit behind). For in-editor execution, the optional [Flow Runner plugin](/plugins/flow-runner/) (Enterprise) traverses the workflow graph and runs node functions directly.

## See also

- [Plugins](/plugins/) — optional plugins that extend Workflow Builder
- [Built-in Nodes](/nodes/) — all built-in node types
- [Diagram state management](/overview/features/diagram-state-management/) — canvas state, undo/redo, and auto-save
- [API Reference](/api/) — every public symbol exported by the SDK
- [FAQ](/faq/) — licensing, data residency, and tech-stack questions
