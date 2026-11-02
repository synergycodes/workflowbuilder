---
title: Architecture
description: How Workflow Builder is structured — the editor SDK, the Temporal plugin, the execution backend, the plugin system, and the data model.
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

The project is a pnpm workspace. Three packages publish to npm: the editor (`packages/sdk`), its component library (`packages/ui`) and the Temporal plugin (`packages/temporal`). Everything in `apps/` is a consumer of the SDK, the execution backend with its Worker, or developer tooling.

```
packages/
├── sdk/               # The editor — published as @workflowbuilder/sdk
├── ui/                # Component library — published as @workflowbuilder/ui
├── temporal/          # Temporal plugin — published as @workflowbuilder/temporal
├── execution-core/    # Graph runner, bundled into the Temporal plugin
└── types/             # Shared types for the execution layer

apps/
├── demo/              # Reference React host that consumes the SDK
├── ai-studio/         # Reference AI workflow product: editor, live run view, decision panel
├── backend/           # Execution backend: versions, runs, live run events, human decisions
├── execution-worker/  # Temporal Worker built on the plugin, with the reference node executors
├── docs/              # This documentation site (Astro + Starlight)
├── icons/             # Lazy-loadable icon set, bundled into the SDK at build time
└── tools/             # Internal scripts and developer utilities
```

An app that only embeds the editor needs `@workflowbuilder/sdk` alone: the SDK serialises workflows to JSON and emits save events. To run them, add `@workflowbuilder/temporal` to your Temporal Worker and start runs from your backend, or start from the execution backend in this repository. The two sides meet only at the workflow JSON — the execution side never reaches into the editor.

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
├── bootstrap.ts                # Module-level init (i18next, modals + i18n plugins)
├── index.ts                    # Curated public barrel + compound `WorkflowBuilder` namespace
├── components/                 # Reusable UI primitives (forms, sidebar, loader)
├── data/                       # Default palette + templates registries
├── features/                   # Feature modules (key modules shown)
│   ├── default-layout/         #   Default floating-overlay layout (exported as WorkflowBuilder.DefaultLayout)
│   ├── app-bar/                #   <WorkflowBuilder.EditorHeader>
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
| [`registerComponentDecorator`](/api/plugins/registercomponentdecorator/) | Wrap a named slot (editor header control, node section, …).   |
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

The serialised JSON is what runs. The [`@workflowbuilder/temporal`](https://www.npmjs.com/package/@workflowbuilder/temporal) plugin runs a diagram as one durable Temporal Workflow Execution, one Activity per node: independent branches run in parallel and join, a decision routes the run down one branch, each node type gets its own timeout and retry cap, and a node can pause the run until a person decides. It bundles `packages/execution-core`, the pure graph runner, and calls one executor function per node type — the part you write. The execution backend (`apps/backend`) is the HTTP API in front of it: drafts and published versions, starting and cancelling runs, live run events over SSE and human decisions, with ports for your auth and tenancy. `apps/execution-worker` is the Temporal Worker that AI Studio runs on. See [Run on Temporal](/guides/use-with-temporal/).

For in-editor execution, the optional [Flow Runner plugin](/plugins/flow-runner/) (Enterprise) traverses the workflow graph and runs node functions directly.

## See also

- [Run on Temporal](/guides/use-with-temporal/) — run what people draw as durable Temporal Workflow Executions
- [Plugins](/plugins/) — optional plugins that extend Workflow Builder
- [Built-in Nodes](/nodes/) — all built-in node types
- [Diagram state management](/overview/features/diagram-state-management/) — canvas state, undo/redo, and auto-save
- [SDK API Reference](/api/) — every public symbol exported by the SDK
- [FAQ](/faq/) — licensing, data residency, and tech-stack questions
