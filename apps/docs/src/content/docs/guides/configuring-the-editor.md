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

All props optional unless marked.

| Prop               | Type                                                                 | Default                        | Description                                                            |
| ------------------ | -------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `integration`      | [`WorkflowBuilderIntegration`](#integration-strategies)              | `{ strategy: 'localStorage' }` | How the builder loads and persists diagram data.                       |
| `nodeTypes`        | [`PaletteItemOrGroup[]`](#node-types)                                | `[]`                           | Node type definitions rendered in the palette and used for validation. |
| `diagramTemplates` | `TemplateModel[]`                                                    | `[]`                           | Diagram templates available in the template selector.                  |
| `jsonForm`         | [`WorkflowBuilderJsonFormConfig`](/guides/custom-jsonforms-control/) | —                              | Custom JSONForms renderers, cells, and translations.                   |
| `plugins`          | [`WorkflowBuilderPlugin[]`](/guides/build-a-plugin/)                 | —                              | Plugin initializer functions. Each called once on first mount.         |
| `name`             | `string`                                                             | —                              | Workflow name displayed in the header.                                 |
| `layoutDirection`  | `'DOWN' \| 'RIGHT'`                                                  | `'DOWN'`                       | Flow direction of the diagram.                                         |
| `initialNodes`     | `WorkflowBuilderNode[]`                                              | `[]`                           | Initial diagram nodes (used by the `props` integration strategy).      |
| `initialEdges`     | `WorkflowBuilderEdge[]`                                              | `[]`                           | Initial diagram edges (used by the `props` integration strategy).      |
| `children`         | `ReactNode`                                                          | `<DefaultLayout />`            | Custom layout. Omit children for the default floating-overlay layout.  |

## Compound subcomponents

Build your own layout by composing the namespaced subcomponents:

| Component                         | Renders                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `WorkflowBuilder.TopBar`          | App-bar with name, controls, toolbar.                       |
| `WorkflowBuilder.Palette`         | Palette of node types (draggable).                          |
| `WorkflowBuilder.Canvas`          | xyflow canvas with nodes, edges, drag-drop.                 |
| `WorkflowBuilder.PropertiesPanel` | Properties sidebar driven by JsonForms.                     |
| `WorkflowBuilder.DefaultLayout`   | The default floating-overlay arrangement of the four above. |

To extend the default layout (e.g. add a banner alongside):

```tsx
<WorkflowBuilder.Root nodeTypes={[]}>
  <WorkflowBuilder.DefaultLayout />
  <MyTopBanner />
</WorkflowBuilder.Root>
```

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

## Minimal example

```tsx
import { WorkflowBuilder } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

export function App() {
  return (
    <WorkflowBuilder.Root
      name="my-workflow"
      initialNodes={[]}
      initialEdges={[]}
      integration={{
        strategy: 'props',
        onDataSave: async (data) => {
          console.log('save:', data);
          return 'success';
        },
      }}
    />
  );
}
```
