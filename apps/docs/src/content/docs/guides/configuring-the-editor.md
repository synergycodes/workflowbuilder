---
title: Configuring the editor
description: Pass node types, integration strategy, plugins, and JsonForms extensions to WorkflowBuilder.Root.
sidebar:
  order: 2
---

`<WorkflowBuilder.Root>` is the main entry point of the SDK. Mount it at the top of your editor subtree with the props you need. The full type-level reference lives at [`WorkflowBuilderRoot`](/api/core/workflowbuilderroot/) under API Reference; this page focuses on what each prop does and when you reach for it.

```tsx
import { WorkflowBuilder } from '@workflowbuilder/sdk';

<WorkflowBuilder.Root nodeTypes={[/* ... */]} integration={/* ... */} />;
```

## Props reference

Every prop is optional. The **Type** column links to the auto-generated [API Reference](/api/core/workflowbuilderrootprops/) for the exact shape. The **Description** points to the section or guide that shows how to use each prop, and notes the default where there is one.

| Prop                | Type                                                                              | Description                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integration`       | [`WorkflowBuilderIntegration`](/api/integration/workflowbuilderintegration/)      | How the builder loads and persists diagram data. Defaults to `{ strategy: 'localStorage' }`. See [Integration strategies](#integration-strategies).                 |
| `nodeTypes`         | [`PaletteItemOrGroup[]`](/api/types/paletteitemorgroup/)                          | Node type definitions rendered in the palette and used for validation. Defaults to `[]` (empty palette). See [Node types](#node-types).                             |
| `nodeTemplates`     | [`WorkflowBuilderNodeTemplates`](/api/components/workflowbuildernodetemplates/)   | Per-node-type custom renderers, keyed by `data.type`. See [Custom node and edge renderers](#custom-node-and-edge-renderers).                                        |
| `edgeTemplates`     | [`WorkflowBuilderEdgeTemplates`](/api/components/workflowbuilderedgetemplates/)   | Per-edge-type custom renderers, keyed by `edge.type`, overriding the built-in `'labelEdge'`. See [Custom node and edge renderers](#custom-node-and-edge-renderers). |
| `diagramTemplates`  | [`TemplateModel[]`](/api/types/templatemodel/)                                    | Starter diagrams offered in the template selector. Defaults to `[]`.                                                                                                |
| `jsonForm`          | [`WorkflowBuilderJsonFormConfig`](/api/plugins/workflowbuilderjsonformconfig/)    | Custom JSONForms renderers, cells, and translations for the properties panel. See [Custom JsonForms control](/guides/custom-jsonforms-control/).                    |
| `plugins`           | [`WorkflowBuilderPlugin[]`](/api/plugins/workflowbuilderplugin/)                  | Plugin initializer functions, each called once on first mount. See [Build a plugin](/guides/build-a-plugin/).                                                       |
| `name`              | `string`                                                                          | Workflow name shown in the header and included in saved data.                                                                                                       |
| `layoutDirection`   | [`LayoutDirection`](/api/types/layoutdirection/)                                  | Initial flow direction, `'DOWN'` or `'RIGHT'`. Defaults to `'DOWN'`.                                                                                                |
| `initialNodes`      | [`WorkflowBuilderNode[]`](/api/types/workflowbuildernode/)                        | Initial nodes for the `props` integration strategy. Defaults to `[]`. See [`props`](#props).                                                                        |
| `initialEdges`      | [`WorkflowBuilderEdge[]`](/api/types/workflowbuilderedge/)                        | Initial edges for the `props` integration strategy. Defaults to `[]`. See [`props`](#props).                                                                        |
| `isValidConnection` | [`WorkflowBuilderIsValidConnection`](/api/core/workflowbuilderisvalidconnection/) | Validate connections as the user draws them. See [Connection validation](#connection-validation).                                                                   |
| `reactFlowProps`    | [`WorkflowBuilderReactFlowProps`](/api/core/workflowbuilderreactflowprops/)       | Escape hatch forwarding extra props to the underlying ReactFlow canvas. See [Advanced: ReactFlow props](#advanced-reactflow-props).                                 |
| `children`          | `ReactNode`                                                                       | Custom layout. Omit for the default floating-overlay layout. See [Compound subcomponents](#compound-subcomponents).                                                 |

## Compound subcomponents

Build your own layout by composing the namespaced subcomponents:

| Component                         | Renders                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `WorkflowBuilder.TopBar`          | App-bar with name, controls, toolbar.                       |
| `WorkflowBuilder.Palette`         | Palette of node types (draggable).                          |
| `WorkflowBuilder.Canvas`          | xyflow canvas with nodes, edges, drag-drop.                 |
| `WorkflowBuilder.PropertiesPanel` | Properties sidebar driven by JsonForms.                     |
| `WorkflowBuilder.DefaultLayout`   | The default floating-overlay arrangement of the four above. |

Pass children to skip the default layout and compose your own:

```tsx
<WorkflowBuilder.Root nodeTypes={myNodeTypes}>
  <header>
    <WorkflowBuilder.TopBar />
  </header>
  <aside>
    <WorkflowBuilder.Palette />
  </aside>
  <main>
    <WorkflowBuilder.Canvas />
  </main>
  <aside>
    <WorkflowBuilder.PropertiesPanel />
  </aside>
</WorkflowBuilder.Root>
```

To extend the default layout instead of replacing it (e.g. add a banner alongside), mount `DefaultLayout` explicitly:

```tsx
<WorkflowBuilder.Root nodeTypes={[]}>
  <WorkflowBuilder.DefaultLayout />
  <MyTopBanner />
</WorkflowBuilder.Root>
```

## Custom toolbar without the app bar

`<WorkflowBuilder.TopBar />` ships the save, import / export, settings, read-only, and theme controls. When you omit it from a custom layout, reach the same commands through the `useWorkflowBuilderActions()` hook. Call it from any descendant of `<WorkflowBuilder.Root>` and wire the returned callbacks to your own buttons:

```tsx
import { useWorkflowBuilderActions } from '@workflowbuilder/sdk';

function MyToolbar() {
  const actions = useWorkflowBuilderActions();

  return (
    <header>
      <button onClick={actions.save}>Save</button>
      <button onClick={actions.openImport}>Import</button>
      <button onClick={actions.openExport}>Export</button>
      <button onClick={actions.openSettings}>Settings</button>
      <button onClick={actions.toggleReadOnly}>Read-only</button>
      <button onClick={actions.toggleDarkMode}>Theme</button>
    </header>
  );
}
```

The hook returns a stable object, so you can pass any callback straight to an event handler. See [`WorkflowBuilderActions`](/api/hooks/workflowbuilderactions/) for the full action list. A few notes:

- It must be called from a descendant of `<WorkflowBuilder.Root>`. `save` reads the active [integration strategy](#integration-strategies) via context, so calling the hook outside Root resolves `save()` to `'error'` and logs a warning.
- The hook also exposes layout-direction control the bar does not surface: `setLayoutDirection('RIGHT' | 'DOWN')` (idempotent) and `toggleLayoutDirection({ flipPositions?, fitView? })`. `flipPositions` mirrors each node's `x`/`y` as a naive axis swap. It is not auto-layout and ignores node sizes, so pair it with `fitView`. That is why it lives only on the toggle, not on `setLayoutDirection`.
- The top bar also shows and edits the document name. Render your own with `useStore`: read `s.documentName` and write through `s.setDocumentName`.

## Node types

```ts
type PaletteItemOrGroup = PaletteItem | PaletteGroup;
```

The SDK ships no default palette — `nodeTypes` must be supplied for the palette to have content. Each `PaletteItem` carries its own `schema` (JSON Schema) and `uischema` (JSONForms UI Schema) — those schemas drive the property panel rendered by JSONForms.

```tsx
<WorkflowBuilder.Root
  nodeTypes={[
    {
      type: 'myCustomNode',
      label: 'My Custom Node',
      schema: {
        /* JSON Schema */
      },
      uischema: {
        /* UI Schema */
      },
      // … (see PaletteItem type for the full shape)
    },
  ]}
  integration={{ strategy: 'props', onDataSave }}
/>
```

## Custom node and edge renderers

By default every node uses the SDK's built-in renderer (a header with one input and one output handle) and every edge uses the built-in `'labelEdge'`. Override either per type, without writing a plugin:

- `nodeTemplates` maps a palette `type` string to a React component. Matching nodes render your component instead of the default. The component receives [`WorkflowNodeTemplateProps`](/api/components/workflownodetemplateprops/).
- `edgeTemplates` maps an `edge.type` string to a React component receiving ReactFlow's `EdgeProps`. Unlike node templates, edge components need no adapter. They drop straight into ReactFlow's edge-type map.

```tsx
<WorkflowBuilder.Root
  nodeTypes={myNodeTypes}
  nodeTemplates={{ webhook: WebhookNode }}
  edgeTemplates={{ conditional: ConditionalEdge }}
/>
```

Declare both maps at module scope. Recreating them on every render busts ReactFlow's memoisation and remounts every node and edge on the canvas. For the full walkthrough (handle IDs, typed `data.properties`, overriding the built-in node categories) see [Add a custom node type](/guides/add-a-custom-node/).

## Integration strategies

`WorkflowBuilderIntegration` is a discriminated union. Each strategy defines where the builder reads initial state and where it writes on save.

```ts
type WorkflowBuilderIntegration =
  | { strategy?: 'localStorage' }
  | { strategy: 'api'; endpoints: { load: string; save: string } }
  | { strategy: 'props'; onDataSave: OnSaveExternal };
```

| Strategy       | Initial data                                     | Save target                     | Use when                             |
| -------------- | ------------------------------------------------ | ------------------------------- | ------------------------------------ |
| `localStorage` | Browser `localStorage['workflowBuilderDiagram']` | Same key in `localStorage`      | Prototyping, demos, default behavior |
| `api`          | `GET` to `endpoints.load`                        | `POST` JSON to `endpoints.save` | Backend-managed persistence          |
| `props`        | `initialNodes` / `initialEdges` instance props   | `onDataSave` callback           | Host app manages persistence itself  |

### `localStorage`

```tsx
<WorkflowBuilder.Root />
// integration omitted — localStorage is the default
```

### `api`

```tsx
<WorkflowBuilder.Root
  integration={{
    strategy: 'api',
    endpoints: {
      load: '/api/workflow/load',
      save: '/api/workflow/save',
    },
  }}
/>
```

### `props`

```tsx
<WorkflowBuilder.Root
  name="wf-1"
  initialNodes={
    [
      /* ... */
    ]
  }
  initialEdges={
    [
      /* ... */
    ]
  }
  integration={{
    strategy: 'props',
    onDataSave: async (data, params) => {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      // The runtime renders a success snackbar on any non-empty resolution
      // (`'success'`, `'error'`, `'alreadyStarted'` all look the same at the
      // UI layer). Throw to surface the error snackbar instead.
      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      return 'success';
    },
  }}
/>
```

### `OnSaveExternal`

```ts
type OnSaveExternal = (data: IntegrationDataFormat, savingParams?: OnSaveParams) => Promise<DidSaveStatus>;

type IntegrationDataFormat = {
  name: string;
  layoutDirection: LayoutDirection;
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
};

type OnSaveParams = { isAutoSave?: boolean };
type DidSaveStatus = 'success' | 'error' | 'alreadyStarted';
```

Today the runtime treats every non-empty resolution of `onDataSave` as "the save finished", surfacing the success-style snackbar — `'success'`, `'error'`, and `'alreadyStarted'` all behave the same way at the UI level. Throw from `onDataSave` instead of resolving to `'error'` if you need an error snackbar.

## Connection validation

`isValidConnection` decides whether a dragged connection is allowed. Return `false` to reject it: no edge is created, no flicker. It receives the resolved `sourceNode` / `targetNode` (plus the raw `connection`), so a rule can branch on node `data` without reaching into the store. Declare it at module scope (or memoize) to keep the reference stable.

```tsx
import { WorkflowBuilder, type WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

const isValidConnection: WorkflowBuilderIsValidConnection = ({ sourceNode, targetNode }) =>
  !(sourceNode.data.type === 'start' && targetNode.data.type === 'start');

<WorkflowBuilder.Root isValidConnection={isValidConnection} />;
```

Validates interactive drags only, not programmatic edge writes (templates, paste, `setStoreEdges`). Fail-open: if an endpoint can't be resolved to a node, the connection is allowed.

## Advanced: ReactFlow props

`reactFlowProps` forwards extra props to the underlying ReactFlow canvas for things the SDK doesn't expose directly (zoom limits, key codes, `onNodeClick`, performance flags, …).

```tsx
import { WorkflowBuilder, type WorkflowBuilderReactFlowProps } from '@workflowbuilder/sdk';

const reactFlowProps = {
  maxZoom: 1.5,
  zoomOnDoubleClick: false,
  onNodeClick: (_, node) => console.log(node.id),
} satisfies WorkflowBuilderReactFlowProps;

<WorkflowBuilder.Root reactFlowProps={reactFlowProps} />;
```

Props the SDK owns (graph data, the connection / selection / change handlers, type maps, `colorMode`, …) can't be set here. To observe SDK events use the listener APIs (`addNodeChangedListener`, …); to theme use the design tokens. Treat `reactFlowProps` as static config: runtime value changes may not apply immediately.
