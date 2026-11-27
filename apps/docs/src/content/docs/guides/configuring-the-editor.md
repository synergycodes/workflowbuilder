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

| Prop                | Type                                                                                     | Description                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integration`       | [`WorkflowBuilderIntegration`](/api/integration/workflowbuilderintegration/)             | How the builder loads and persists diagram data. Defaults to `{ strategy: 'localStorage' }`. See [Integration strategies](#integration-strategies).                                                                                                                                                                                                                                                 |
| `onLoad`            | [`(context: WorkflowBuilderLoadContext) => void`](/api/core/workflowbuilderloadcontext/) | Runs once after the initial load, with `isEmpty`, `loadFailed` and the editor actions. Defaults to opening the template selector for an empty diagram; a custom handler replaces the default. See [Load behavior](#load-behavior).                                                                                                                                                                  |
| `nodeTypes`         | [`PaletteItemOrGroup[]`](/api/types/paletteitemorgroup/)                                 | Node type definitions rendered in the palette and used for validation. Defaults to `[]` (empty palette). See [Node types](#node-types).                                                                                                                                                                                                                                                             |
| `nodeTemplates`     | [`WorkflowBuilderNodeTemplates`](/api/components/workflowbuildernodetemplates/)          | Per-node-type custom renderers, keyed by `data.type`. See [Custom node and edge renderers](#custom-node-and-edge-renderers).                                                                                                                                                                                                                                                                        |
| `edgeTemplates`     | [`WorkflowBuilderEdgeTemplates`](/api/components/workflowbuilderedgetemplates/)          | Per-edge-type custom renderers, keyed by `edge.type`, overriding the built-in `'labelEdge'`. See [Custom node and edge renderers](#custom-node-and-edge-renderers).                                                                                                                                                                                                                                 |
| `diagramTemplates`  | [`TemplateModel[]`](/api/types/templatemodel/)                                           | Starter diagrams offered in the template selector. Defaults to `[]`.                                                                                                                                                                                                                                                                                                                                |
| `jsonForm`          | [`WorkflowBuilderJsonFormConfig`](/api/plugins/workflowbuilderjsonformconfig/)           | Custom JSONForms renderers, cells, and translations for the properties panel. See [Custom JsonForms control](/guides/custom-jsonforms-control/).                                                                                                                                                                                                                                                    |
| `plugins`           | [`WorkflowBuilderPlugin[]`](/api/plugins/workflowbuilderplugin/)                         | Plugin initializer functions, each called once on first mount. See [Build a plugin](/guides/build-a-plugin/).                                                                                                                                                                                                                                                                                       |
| `name`              | `string`                                                                                 | Workflow name shown in the header and included in saved data.                                                                                                                                                                                                                                                                                                                                       |
| `logo`              | `WorkflowBuilderLogo`                                                                    | Replaces the built-in editor header logo: an image URL, `{ light, dark }` per-theme URLs, or a custom element.                                                                                                                                                                                                                                                                                      |
| `logoHref`          | `string`                                                                                 | Wraps the editor header logo (built-in or custom) in a link opened in a new tab.                                                                                                                                                                                                                                                                                                                    |
| `layoutDirection`   | [`LayoutDirection`](/api/types/layoutdirection/)                                         | Initial flow direction, `'DOWN'` or `'RIGHT'`. Defaults to `'DOWN'`.                                                                                                                                                                                                                                                                                                                                |
| `icons`             | [`IconSet`](/api/icons/iconset/)                                                         | Icons that node types, templates and select options refer to by name, built with `defineIcons`. Only these are bundled. Read when an icon renders: set it once, a later change does not refresh icons already on the canvas. See [Icons](#icons).                                                                                                                                                   |
| `initialNodes`      | [`WorkflowBuilderNode[]`](/api/types/workflowbuildernode/)                               | Initial nodes for the `props` integration strategy. Defaults to `[]`. See [`props`](#props).                                                                                                                                                                                                                                                                                                        |
| `initialEdges`      | [`WorkflowBuilderEdge[]`](/api/types/workflowbuilderedge/)                               | Initial edges for the `props` integration strategy. Defaults to `[]`. See [`props`](#props).                                                                                                                                                                                                                                                                                                        |
| `isValidConnection` | [`WorkflowBuilderIsValidConnection`](/api/core/workflowbuilderisvalidconnection/)        | Validate connections as the user draws them. See [Connection validation](#connection-validation).                                                                                                                                                                                                                                                                                                   |
| `reactFlowProps`    | [`WorkflowBuilderReactFlowProps`](/api/core/workflowbuilderreactflowprops/)              | Escape hatch forwarding extra props to the underlying ReactFlow canvas. See [Advanced: ReactFlow props](#advanced-reactflow-props).                                                                                                                                                                                                                                                                 |
| `builtInControls`   | [`BuiltInControls`](/api/core/builtincontrols/)                                          | Hides built-in controls by key (`logo`, `folderName`, `workflowName`, `version`, `save`, `cleanUp`, `saveAsPdf`, `publish`, `readOnlyToggle`, `themeToggle`, `languageSelector`, `settings`, `workflowRename`, `export`, `import`, `templates`, `paletteToggle`, `delete`, `propertiesPanelToggle`); every key defaults to `true`. Hiding a control does not block its action or keyboard shortcut. |
| `edgeEndpoint`      | [`EdgeEndpoint`](/ui-api/edge/edgeendpoint/)                                             | Terminator at the target, in the line colour: `'arrow'`, `'circle'` or `'none'` (default). Covers built-in and connecting edges and custom edges on `OptionalEdgePath` / `EdgePath`; `EnhancedBaseEdge` takes `endpoint` with the `useEdgeStyle` style. Per edge: [Build a plugin](/guides/build-a-plugin/).                                                                                        |
| `children`          | `ReactNode`                                                                              | Custom layout. Omit for the default floating-overlay layout. See [Compound subcomponents](#compound-subcomponents).                                                                                                                                                                                                                                                                                 |

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

`<WorkflowBuilder.EditorHeader />` ships the save, import / export, settings, read-only, theme, and language controls, plus the workflow name and its rename control, and Clean up, Save as PDF, the version chip and Publish while your app [supplies them](/guides/build-a-plugin/#what-only-your-app-can-provide-clean-up-save-as-pdf-version-publish). When you omit it from a custom layout, read the same state with `useWorkflowBuilderState()` and reach the same commands through `useWorkflowBuilderActions()`. Call both from any descendant of `<WorkflowBuilder.Root>` and wire them to your own buttons:

```tsx
import { useWorkflowBuilderActions, useWorkflowBuilderState } from '@workflowbuilder/sdk';

function MyToolbar() {
  const { isReadOnly, workflowName } = useWorkflowBuilderState();
  const actions = useWorkflowBuilderActions();

  return (
    <header>
      <input value={workflowName} onChange={(event) => actions.setWorkflowName(event.target.value)} />
      <button onClick={actions.save}>Save</button>
      <button disabled={isReadOnly} onClick={actions.openImport}>
        Import
      </button>
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

`useWorkflowBuilderState()` returns `isReadOnly`, `theme`, `language`, `isPaletteOpen`, `isPropertiesPanelOpen`, `paletteFilter`, `layoutDirection`, `workflowName`, and for the supplied header controls `version`, `isCleanUpPending`, `isCanvasEmpty` and `availableActions`; see [`WorkflowBuilderState`](/api/hooks/workflowbuilderstate/) for the full shape. `useWorkflowBuilderActions()` returns a stable object, so an action that takes no arguments, such as `save` or `openTemplates`, can go straight to an event handler. See [`WorkflowBuilderActions`](/api/hooks/workflowbuilderactions/) for the full action list. A few notes:

- Call both from a descendant of `<WorkflowBuilder.Root>`. `save` reads the active [integration strategy](#integration-strategies) through context, so outside Root `save()` logs an error and resolves to `'error'`. `deleteSelection` does nothing until `<WorkflowBuilder.Canvas />` has mounted.
- Besides the editor header's commands, the actions hook also covers the palette and the properties panel: `togglePalette`/`setPaletteOpen`, `togglePropertiesPanel`/`setPropertiesPanelOpen`, `setPaletteFilter` (filters the palette's node list by a case-insensitive match on each item's translated label, without touching node definitions, validation or forms), `setLanguage`, and layout-direction control, which the editor header surfaces as the Clean up menu while `<EditorHeaderCleanUp>` is mounted: `setLayoutDirection('RIGHT' | 'DOWN')` (idempotent) and `toggleLayoutDirection({ flipPositions?, fitView? })`. `flipPositions` mirrors each node's `x`/`y` as a naive axis swap. It is not auto-layout and ignores node sizes, so pair it with `fitView`. That is why it lives only on the toggle, not on `setLayoutDirection`.
- `openTemplates`, `openImport`, `loadWorkflow`, `setWorkflowName`, `deleteSelection`, `setLayoutDirection`, `toggleLayoutDirection` and `cleanUp` change the persisted diagram, so they do nothing while `isReadOnly` is `true`, the same guard the built-in buttons apply. Every other action, including `save`, `openExport`, the theme toggle and both sidebar toggles, always runs. `openSettings` opens in read-only mode too, but the modal then only lets you inspect the global variables: adding, editing and deleting are disabled.
- To select from your own controls, use `useSetSelection()`: `setSelection({ nodeIds, edgeIds })` replaces the selection as a click does, and returns `false` when the canvas lacks any of the ids.
- The editor header also shows and edits the workflow name. Read it with `useWorkflowBuilderState()`'s `workflowName` and change it with `useWorkflowBuilderActions()`'s `setWorkflowName(name)`, up to 128 characters; a longer name is ignored (with a console warning) rather than truncated, and the call does nothing in read-only mode.
- To put a diagram of your own into the editor, for example from your own template picker, call `loadWorkflow(model)` with a [`DiagramModel`](/api/types/diagrammodel/). It replaces the nodes, edges, name and layout direction the way the built-in template selector does: nodes snap to the canvas grid (`reactFlowProps.snapGrid`, 18 px by default; none with `snapToGrid: false`), the change is recorded for undo, and the view fits the new diagram if the canvas has mounted. Called before that, for example straight from `onLoad`, it leaves the fit to the canvas's own first fit (`reactFlowProps.fitView`, on by default). Global variables are kept. Pass the action itself only where the caller hands it a `DiagramModel`, as `onPick` does [below](#load-behavior). `onClick` would hand it the click event, so wrap it there: `onClick={() => actions.loadWorkflow(template)}`.

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

## Icons

Node types, palette groups, templates and select options name their icon with a string, `icon: 'Lightning'`, because the name is saved with the diagram. The editor renders only icons it knows by name: the ones you register through the `icons` prop and a few built-in ones its own options use (`Gear`, `AiAgent`, `ClaudeLogo`, `StatusActive`, …). Only the icons you import end up in your bundle, and they render on the first frame.

Install an icon set in the Iconify format, for example Phosphor, and register one file per icon:

```bash
pnpm add @iconify-icons/ph
```

```ts
// src/icons.ts
import lightningIcon from '@iconify-icons/ph/lightning';
import timerIcon from '@iconify-icons/ph/timer';
import { defineIcons } from '@workflowbuilder/sdk';

export const appIcons = defineIcons({
  Lightning: lightningIcon,
  Timer: timerIcon,
});

declare module '@workflowbuilder/sdk' {
  interface Register {
    icons: typeof appIcons;
  }
}
```

```tsx
<WorkflowBuilder.Root icons={appIcons} nodeTypes={nodeTypes} />
```

The `Register` augmentation types icon names against the set: `icon: 'Acorn'` in a node type is then a type error until you register `Acorn`. Without it any string type-checks. A name that is neither registered nor built in renders a question mark of the same size and logs one `console.warn` that says how to register it.

Any `@iconify-icons/*` package works the same way, so you can mix sets; `Icon` does not rotate or flip glyphs, so pick icons that are not defined that way. For your own SVG files, build an Iconify JSON set once, for example with `importDirectory` from `@iconify/tools`, and take each icon out of it with `getIconData` from `@iconify/utils`:

```ts
import { getIconData } from '@iconify/utils';

import brandIcons from './icons/brand.json';

export const appIcons = defineIcons({
  Lightning: lightningIcon,
  HubspotLogo: getIconData(brandIcons, 'hubspot-logo')!,
});
```

In your own components, an icon that is fixed in the code does not need a name: pass the imported data instead, `<Icon icon={timerIcon} />`. `name` is for names that come from data.

A plugin registers the icons its own node types and templates name itself, with `registerIcons`, so the app's set does not list them: see [Icons in a plugin](/guides/build-a-plugin/#icons-in-a-plugin). An app icon of the same name wins over a plugin icon.

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
  | { strategy?: 'localStorage'; autoSave?: boolean }
  | { strategy: 'api'; endpoints: { load: string; save: string }; autoSave?: boolean }
  | { strategy: 'props'; onDataSave: OnSaveExternal; autoSave?: boolean };
```

| Strategy       | Initial data                                     | Save target                     | Use when                             |
| -------------- | ------------------------------------------------ | ------------------------------- | ------------------------------------ |
| `localStorage` | Browser `localStorage['workflowBuilderDiagram']` | Same key in `localStorage`      | Prototyping, demos, default behavior |
| `api`          | `GET` to `endpoints.load`                        | `POST` JSON to `endpoints.save` | Backend-managed persistence          |
| `props`        | `initialNodes` / `initialEdges` instance props   | `onDataSave` callback           | Host app manages persistence itself  |

### Automatic saves

With every strategy the editor saves on its own: after a change that comes more than 10 seconds after the last successful save, when the user closes or leaves the page, and when `<WorkflowBuilder.Root>` unmounts. The last one covers a route change in a single-page app, which removes the editor without the browser's `beforeunload` event. An automatic save writes only unsaved changes, meaning anything that changed the data the integration receives (nodes, edges, the workflow name, global variables, the layout direction) since the load or the last successful save. Loading, selecting and moving the viewport are not changes, so a tab the user only looked at never writes and cannot overwrite work saved in another tab. A failed save leaves the changes unsaved, and the next automatic save sends them.

`autoSave: false` turns the automatic saves off, for example in a preview or a read-only run view. The Save button and `actions.save()` still write. A change of `autoSave` after mount applies from the next automatic save. A change in the same render that unmounts `<WorkflowBuilder.Root>` does not apply: the save on unmount follows the previous value.

```tsx
<WorkflowBuilder.Root integration={{ strategy: 'props', onDataSave, autoSave: false }} />
```

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

Without `onLoad`, the builder opens the template selector for an empty diagram, unless the load failed. A custom handler replaces that default entirely, so the template selector opens only when the handler calls `actions.openTemplates()`. For example, to open the palette and show your own welcome screen, which loads the diagram the user picks with `actions.loadWorkflow` (pass `actions.openTemplates` instead to offer the built-in selector):

```tsx
<WorkflowBuilder.Root
  onLoad={({ isEmpty, loadFailed, actions }) => {
    if (loadFailed) return showLoadError();
    actions.setPaletteOpen(true);
    if (isEmpty) showWelcome({ onPick: actions.loadWorkflow });
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
