---
title: Configuring the editor
description: Pass node types, integration strategy, plugins, and JsonForms extensions to WorkflowBuilder.Root.
sidebar:
  order: 2
---

`<WorkflowBuilder.Root>` is the main entry point of the SDK. Mount it at the top of your editor subtree with the props you need. The full type-level reference lives at [`WorkflowBuilderRoot`](/api/core/workflowbuilderroot/) under SDK API Reference; this page focuses on what each prop does and when you reach for it.

```tsx
import { WorkflowBuilder } from '@workflowbuilder/sdk';

<WorkflowBuilder.Root nodeTypes={[/* ... */]} integration={/* ... */} />;
```

## Props reference

Every prop is optional. The **Type** column links to the auto-generated [SDK API Reference](/api/core/workflowbuilderrootprops/) for the exact shape. The **Description** points to the section or guide that shows how to use each prop, and notes the default where there is one.

| Prop                | Type                                                                                     | Description                                                                                                                                                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integration`       | [`WorkflowBuilderIntegration`](/api/integration/workflowbuilderintegration/)             | How the builder loads and persists diagram data. Defaults to `{ strategy: 'localStorage' }`. See [Integration strategies](#integration-strategies).                                                                                                                                                             |
| `onLoad`            | [`(context: WorkflowBuilderLoadContext) => void`](/api/core/workflowbuilderloadcontext/) | Runs once after the initial load, with `isEmpty`, `loadFailed` and the editor actions. Defaults to opening the template selector for an empty diagram; a custom handler replaces the default. See [Load behavior](#load-behavior).                                                                              |
| `nodeTypes`         | [`PaletteItemOrGroup[]`](/api/types/paletteitemorgroup/)                                 | Node type definitions rendered in the palette and used for validation. Defaults to `[]` (empty palette). See [Node types](#node-types).                                                                                                                                                                         |
| `nodeTemplates`     | [`WorkflowBuilderNodeTemplates`](/api/components/workflowbuildernodetemplates/)          | Per-node-type custom renderers, keyed by `data.type`. See [Custom node and edge renderers](#custom-node-and-edge-renderers).                                                                                                                                                                                    |
| `edgeTemplates`     | [`WorkflowBuilderEdgeTemplates`](/api/components/workflowbuilderedgetemplates/)          | Per-edge-type custom renderers, keyed by `edge.type`, overriding the built-in `'labelEdge'`. See [Custom node and edge renderers](#custom-node-and-edge-renderers).                                                                                                                                             |
| `diagramTemplates`  | [`TemplateModel[]`](/api/types/templatemodel/)                                           | Starter diagrams offered in the template selector. Defaults to `[]`.                                                                                                                                                                                                                                            |
| `jsonForm`          | [`WorkflowBuilderJsonFormConfig`](/api/plugins/workflowbuilderjsonformconfig/)           | Custom JSONForms renderers, cells, and translations for the properties panel. See [Custom JsonForms control](/guides/custom-jsonforms-control/).                                                                                                                                                                |
| `plugins`           | [`WorkflowBuilderPlugin[]`](/api/plugins/workflowbuilderplugin/)                         | Plugin initializer functions, each called once on first mount. See [Build a plugin](/guides/build-a-plugin/).                                                                                                                                                                                                   |
| `name`              | `string`                                                                                 | Workflow name shown in the header and included in saved data.                                                                                                                                                                                                                                                   |
| `logo`              | `WorkflowBuilderLogo`                                                                    | Replaces the built-in editor header logo: an image URL, `{ light, dark }` per-theme URLs, or a custom element.                                                                                                                                                                                                  |
| `logoHref`          | `string`                                                                                 | Wraps the editor header logo (built-in or custom) in a link opened in a new tab.                                                                                                                                                                                                                                |
| `layoutDirection`   | [`LayoutDirection`](/api/types/layoutdirection/)                                         | Initial flow direction, `'DOWN'` or `'RIGHT'`. Defaults to `'DOWN'`.                                                                                                                                                                                                                                            |
| `initialNodes`      | [`WorkflowBuilderNode[]`](/api/types/workflowbuildernode/)                               | Initial nodes for the `props` integration strategy. Defaults to `[]`. See [`props`](#props).                                                                                                                                                                                                                    |
| `initialEdges`      | [`WorkflowBuilderEdge[]`](/api/types/workflowbuilderedge/)                               | Initial edges for the `props` integration strategy. Defaults to `[]`. See [`props`](#props).                                                                                                                                                                                                                    |
| `isValidConnection` | [`WorkflowBuilderIsValidConnection`](/api/core/workflowbuilderisvalidconnection/)        | Validate connections as the user draws them. See [Connection validation](#connection-validation).                                                                                                                                                                                                               |
| `reactFlowProps`    | [`WorkflowBuilderReactFlowProps`](/api/core/workflowbuilderreactflowprops/)              | Escape hatch forwarding extra props to the underlying ReactFlow canvas. See [Advanced: ReactFlow props](#advanced-reactflow-props).                                                                                                                                                                             |
| `builtInControls`   | [`BuiltInControls`](/api/core/builtincontrols/)                                          | Hides built-in controls by key (`save`, `readOnlyToggle`, `themeToggle`, `languageSelector`, `settings`, `workflowRename`, `export`, `import`, `templates`, `paletteToggle`, `delete`, `propertiesPanelToggle`); every key defaults to `true`. Hiding a control does not block its action or keyboard shortcut. |
| `children`          | `ReactNode`                                                                              | Custom layout. Omit for the default floating-overlay layout. See [Compound subcomponents](#compound-subcomponents).                                                                                                                                                                                             |

## Compound subcomponents

Build your own layout by composing the namespaced subcomponents:

| Component                         | Renders                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `WorkflowBuilder.EditorHeader`    | Editor header with the workflow name, controls, toolbar.    |
| `WorkflowBuilder.Palette`         | Palette of node types (draggable).                          |
| `WorkflowBuilder.Canvas`          | xyflow canvas with nodes, edges, drag-drop.                 |
| `WorkflowBuilder.PropertiesPanel` | Properties sidebar driven by JsonForms.                     |
| `WorkflowBuilder.DefaultLayout`   | The default floating-overlay arrangement of the four above. |

Pass children to skip the default layout and compose your own:

```tsx
<WorkflowBuilder.Root nodeTypes={myNodeTypes}>
  <header>
    <WorkflowBuilder.EditorHeader />
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

## Custom toolbar without the editor header

The editor header is the editor's own bar, not the host app's. When you embed the editor in an app, keep the app's global navigation (account menu, app switcher, breadcrumbs) in the app, and never repeat it in the editor header. If the editor header does not fit your layout, hide single controls with [`builtInControls`](/guides/build-a-plugin/#built-in-interface-hide-move-add), or leave `<WorkflowBuilder.EditorHeader />` out of a custom layout and build your own from the state and actions below.

`<WorkflowBuilder.EditorHeader />` ships the save, import / export, settings, read-only, theme, and language controls, plus the workflow name and its rename control. When you omit it from a custom layout, read the same state with `useWorkflowBuilderState()` and reach the same commands through `useWorkflowBuilderActions()`. Call both from any descendant of `<WorkflowBuilder.Root>` and wire them to your own buttons:

```tsx
import { useWorkflowBuilderActions, useWorkflowBuilderState } from '@workflowbuilder/sdk';

function MyToolbar() {
  const { isReadOnly, workflowName } = useWorkflowBuilderState();
  const actions = useWorkflowBuilderActions();

  return (
    <header>
      <input value={workflowName} onChange={(event) => actions.setWorkflowName(event.target.value)} />
      <button onClick={actions.save}>Save</button>
      <button onClick={actions.openImport}>Import</button>
      <button onClick={actions.openExport}>Export</button>
      <button disabled={isReadOnly} onClick={actions.openTemplates}>
        Templates
      </button>
      <button onClick={actions.deleteSelection}>Delete</button>
      <button onClick={actions.openSettings}>Settings</button>
      <button onClick={actions.toggleReadOnly}>Read-only</button>
      <button onClick={actions.toggleTheme}>Theme</button>
      <button onClick={actions.togglePropertiesPanel}>Properties</button>
    </header>
  );
}
```

`useWorkflowBuilderState()` returns `isReadOnly`, `theme`, `language`, `isPaletteOpen`, `isPropertiesPanelOpen`, `paletteFilter`, `layoutDirection` and `workflowName`; see [`WorkflowBuilderState`](/api/hooks/workflowbuilderstate/) for the full shape. `useWorkflowBuilderActions()` returns a stable object, so you can pass any callback straight to an event handler. See [`WorkflowBuilderActions`](/api/hooks/workflowbuilderactions/) for the full action list. A few notes:

- Call both from a descendant of `<WorkflowBuilder.Root>`. `save` reads the active [integration strategy](#integration-strategies) through context, so outside Root `save()` logs an error and resolves to `'error'`. `deleteSelection` does nothing until `<WorkflowBuilder.Canvas />` has mounted.
- Besides the editor header's commands, the actions hook also covers the palette and the properties panel: `togglePalette`/`setPaletteOpen`, `togglePropertiesPanel`/`setPropertiesPanelOpen`, `setPaletteFilter` (filters the palette's node list by a case-insensitive match on each item's translated label, without touching node definitions, validation or forms), `setLanguage`, and layout-direction control the editor header does not surface: `setLayoutDirection('RIGHT' | 'DOWN')` (idempotent) and `toggleLayoutDirection({ flipPositions?, fitView? })`. `flipPositions` mirrors each node's `x`/`y` as a naive axis swap. It is not auto-layout and ignores node sizes, so pair it with `fitView`. That is why it lives only on the toggle, not on `setLayoutDirection`.
- `openTemplates`, `setWorkflowName`, `deleteSelection`, `setLayoutDirection` and `toggleLayoutDirection` change the persisted diagram, so they do nothing while `isReadOnly` is `true`, the same guard the built-in buttons apply. Every other action, including `save`, `openExport`, the theme toggle and both sidebar toggles, always runs; this includes `openImport` and `openSettings`, which do change the persisted diagram (a full replace, and the global variables respectively) but are not read-only-guarded today. Hide them explicitly where that matters, e.g. `builtInControls={{ import: canEdit, settings: canEdit }}`.
- To select from your own controls, use `useSetSelection()`: `setSelection({ nodeIds, edgeIds })` replaces the selection as a click does, and returns `false` when the canvas lacks any of the ids.
- The editor header also shows and edits the workflow name. Read it with `useWorkflowBuilderState()`'s `workflowName` and change it with `useWorkflowBuilderActions()`'s `setWorkflowName(name)`, up to 128 characters; a longer name is ignored (with a console warning) rather than truncated, and the call does nothing in read-only mode.

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

- `nodeTemplates` maps a palette `type` string to a React component. Matching nodes render your component instead of the default. The component receives [`WorkflowBuilderNodeTemplateProps`](/api/components/workflowbuildernodetemplateprops/).
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

The editor requests `load` once on mount and POSTs the diagram as JSON to `save`. When nothing is stored yet, `load` answers with a 2xx status and an empty body, `null` or `{}`. Any other answer (a non-2xx status, a network error, a body that is not JSON) is a failed load: the editor refuses to save for the rest of that mount, so it never overwrites the diagram it could not load; see [Load behavior](#load-behavior).

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

## Load behavior

`onLoad` runs once per Root mount, after the active integration finished its initial load: right after mount for `localStorage` and `props`, and once the load request settled for `api` (also when it failed). It receives a [`WorkflowBuilderLoadContext`](/api/core/workflowbuilderloadcontext/):

- `isEmpty` is `true` when the load produced no nodes; a `name` alone does not count as diagram data.
- `loadFailed` is `true` when the `api` load request failed, and always `false` for `localStorage` and `props`. After a failed load the editor stays usable but refuses to save for the rest of that Root mount, so nothing can overwrite the copy on the server that could not be loaded. What to show the user is up to you.
- `actions` is the same object as [`useWorkflowBuilderActions()`](/api/hooks/useworkflowbuilderactions/), so `actions.save()` works inside the handler and `actions.openTemplates()` does nothing in read-only mode. You can keep `actions` after the handler returns, for example for a welcome screen or a ref outside Root: every action acts on the current editor, and once that Root unmounts every action does nothing and `save()` resolves `'error'`.

Without `onLoad`, the builder opens the template selector for an empty diagram, unless the load failed. A custom handler replaces that default entirely, so the template selector opens only when the handler calls `actions.openTemplates()`. For example, to open the palette and show your own welcome screen that offers the templates:

```tsx
<WorkflowBuilder.Root
  onLoad={({ isEmpty, loadFailed, actions }) => {
    if (loadFailed) return showLoadError();
    actions.setPaletteOpen(true);
    if (isEmpty) showWelcome({ onPickTemplate: actions.openTemplates });
  }}
/>
```

## Connection validation

`isValidConnection` decides whether a dragged connection is allowed. Return `false` to reject it: no edge is created, no flicker. It receives the resolved `sourceNode` / `targetNode` (plus the raw `connection`), so a rule can branch on node `data` without reaching into the store. Declare it at module scope (or memoize) to keep the reference stable.

```tsx
import { WorkflowBuilder, type WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

// A start node is the workflow entry point, so it can never be a connection target.
const isValidConnection: WorkflowBuilderIsValidConnection = ({ targetNode }) => !targetNode.data.isStartNode;

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
