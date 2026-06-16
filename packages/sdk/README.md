# @workflowbuilder/sdk

React SDK for [Workflow Builder](https://www.workflowbuilder.io/). Embed a visual, flow-based workflow editor in your app.

[![npm version](https://img.shields.io/npm/v/@workflowbuilder/sdk.svg)](https://www.npmjs.com/package/@workflowbuilder/sdk)
[![license](https://img.shields.io/npm/l/@workflowbuilder/sdk.svg)](./LICENSE)

- **Docs:** <https://www.workflowbuilder.io/docs/overview/>
- **Live demo:** <https://app.workflowbuilder.io/>
- **Source:** <https://github.com/synergycodes/workflowbuilder>
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

## What you get

An embeddable React SDK that ships a complete workflow editor. One compound component (`<WorkflowBuilder.Root>`) is the embed point. Behind it: a plugin architecture, three persistence strategies, a JsonForms-driven schema layer, i18n, theming tokens, and a diagram-template system. You bring node types and a save strategy. The SDK handles canvas, palette, connections, properties, and persistence.

Typical fit:

- Visual editors for AI agent workflows (LLM chains, tool calls, decision branches)
- Drag-and-drop node-based programming UIs
- ETL or data-pipeline designers
- BPMN-style process editors
- Any flow editor where you want JsonForms-driven node properties plus a swappable persistence layer

Battle-tested in production by teams shipping AI workflow products.

## Install

```bash
npm install @workflowbuilder/sdk \
  react react-dom \
  @xyflow/react \
  @jsonforms/core @jsonforms/react \
  i18next react-i18next i18next-browser-languagedetector \
  immer zustand
```

The SDK ships its non-peer dependencies bundled in `dist/`. React, xyflow, JsonForms, i18next, immer, and zustand are declared as `peerDependencies` so your app and the SDK share a single copy of each. See [Peer dependencies](#peer-dependencies) below.

## Quick start

```tsx
import { WorkflowBuilder } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

export function App() {
  return <WorkflowBuilder.Root name="my-workflow" />;
}
```

The editor renders with the default layout (top bar, palette, canvas, properties panel) and persists state to `localStorage` automatically (the default `integration` strategy). The palette is empty until you pass `nodeTypes` — see [`<Root>` props](#workflowbuilderroot-props), the [Add a custom node type guide](https://www.workflowbuilder.io/docs/guides/add-a-custom-node/), and the [node schemas reference](https://www.workflowbuilder.io/docs/node-schemas/) for how to design the data and UI schemas.

Copy-paste-ready node implementations live in the source repo at [`apps/demo/src/app/data/nodes/`](https://github.com/synergycodes/workflowbuilder/tree/main/apps/demo/src/app/data/nodes). Each folder is a self-contained node type with 4 files (`<name>.ts`, `default-properties-data.ts`, `schema.ts`, `uischema.ts`). Available examples: `trigger`, `action`, `decision`, `conditional`, `delay`, `notification`, `multi-port`, `ai-agent` — each documented on the [built-in nodes reference](https://www.workflowbuilder.io/docs/nodes/). Drop the folder into your app, import the node definition, and pass it to `nodeTypes`.

## Compose a custom layout

Pass subcomponents as children to skip the default layout and place each part where you want it:

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

To add custom overlays alongside the default layout, mount it explicitly:

```tsx
<WorkflowBuilder.Root nodeTypes={myNodeTypes}>
  <WorkflowBuilder.DefaultLayout />
  <MyToastBanner />
</WorkflowBuilder.Root>
```

Each subcomponent is also exported under a named alias (`WorkflowBuilderTopBar`, `WorkflowBuilderPalette`, `WorkflowBuilderCanvas`, `WorkflowBuilderPropertiesPanel`, `WorkflowBuilderDefaultLayout`) for consumers who prefer the classic style.

If you omit `<WorkflowBuilder.TopBar />`, use [`useWorkflowBuilderActions()`](https://www.workflowbuilder.io/docs/guides/configuring-the-editor/#custom-toolbar-without-the-app-bar) to trigger save / import / export / settings / read-only / theme / layout-direction from your own controls.

## `<WorkflowBuilder.Root>` props

<!--
  Maintainer note: these props are documented on three surfaces. The type in
  packages/sdk/src/workflow-builder-root/workflow-builder-root.types.ts is the
  source of truth (the API reference is generated from its JSDoc). This table and
  apps/docs/src/content/docs/guides/configuring-the-editor.md mirror it by hand.
  When you add / rename / remove a prop, update all three. Descriptions may differ
  per surface; the set of prop names must match.
-->

| Prop                | Type                               | Description                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodeTypes`         | `PaletteItemOrGroup[]`             | Node type definitions. Appear in the palette and drive validation. **Must be a stable reference** — declare at module scope or memoize.                                                                                                        |
| `nodeTemplates`     | `WorkflowBuilderNodeTemplates`     | Per-node-type custom renderers. Map of `data.type` → React component, overriding the default node renderer for that type. **Stable reference required** (same as `nodeTypes`).                                                                 |
| `edgeTemplates`     | `WorkflowBuilderEdgeTemplates`     | Per-edge-type custom renderers. Map of `edge.type` → React component taking ReactFlow `EdgeProps`, overriding the built-in `labelEdge`. Unregistered types fall back to the default edge. **Stable reference required** (same as `nodeTypes`). |
| `diagramTemplates`  | `TemplateModel[]`                  | Diagram templates available in the template selector. **Stable reference required** (same as `nodeTypes`).                                                                                                                                     |
| `plugins`           | `WorkflowBuilderPlugin[]`          | Functions registering decorators. Synchronous, executed once.                                                                                                                                                                                  |
| `jsonForm`          | `WorkflowBuilderJsonFormConfig`    | Custom JsonForms renderers, cells, translations.                                                                                                                                                                                               |
| `integration`       | `WorkflowBuilderIntegration`       | Data source / sink. Defaults to `localStorage`.                                                                                                                                                                                                |
| `name`              | `string`                           | Workflow name shown in the header.                                                                                                                                                                                                             |
| `layoutDirection`   | `'DOWN' \| 'RIGHT'`                | Initial flow direction.                                                                                                                                                                                                                        |
| `initialNodes`      | `WorkflowBuilderNode[]`            | Starting diagram nodes.                                                                                                                                                                                                                        |
| `initialEdges`      | `WorkflowBuilderEdge[]`            | Starting diagram edges.                                                                                                                                                                                                                        |
| `isValidConnection` | `WorkflowBuilderIsValidConnection` | Validate connections as the user draws them. See [Connection validation](#connection-validation). **Stable reference required.**                                                                                                               |
| `reactFlowProps`    | `WorkflowBuilderReactFlowProps`    | Advanced escape hatch for the underlying ReactFlow canvas. See [Advanced: ReactFlow props](#advanced-reactflow-props). Treat as static config (runtime value changes may not apply immediately).                                               |
| `children`          | `ReactNode`                        | Custom layout. Omit for the default floating-overlay layout (top bar, palette, canvas, properties panel). See [Compose a custom layout](#compose-a-custom-layout).                                                                             |

Exact prop types come from the auto-generated [`WorkflowBuilderRootProps`](https://www.workflowbuilder.io/docs/api/core/workflowbuilderrootprops/) reference. For how and when to reach for each prop, see [Configuring the editor](https://www.workflowbuilder.io/docs/guides/configuring-the-editor/).

## Persistence

Pick one of three strategies via the `integration` prop.

| Strategy       | Source / sink                                               | When to use                  |
| -------------- | ----------------------------------------------------------- | ---------------------------- |
| `localStorage` | Browser `localStorage`                                      | Prototyping, quick starts    |
| `api`          | `GET` / `POST` to user-provided endpoints                   | Backend-managed persistence  |
| `props`        | `onDataSave` callback + `initialNodes`/`initialEdges` props | Host-app-managed persistence |

```tsx
<WorkflowBuilder.Root
  integration={{
    strategy: 'api',
    endpoints: { load: '/api/load', save: '/api/save' },
  }}
/>
```

Full guide: [Persistence strategies on the docs site](https://www.workflowbuilder.io/docs/get-started/persistence/callback/).

## Plugins

The SDK exposes three extension points. Pass plugin functions to the `plugins` prop:

- **Component decorators** (`registerComponentDecorator`). Inject UI into named slots: `OptionalAppBarControls`, `OptionalAppBarTools`, `OptionalAppChildren`, `OptionalEdgeProperties`, `OptionalFooterContent`, `OptionalHooks` (invisible provider slot), `OptionalNodeContent` (receives `nodeId`).
- **Function decorators** (`registerFunctionDecorator`). Observe or wrap SDK internals (e.g. `trackFutureChange`) before / after / wrapping the call.
- **Translations** (`registerPluginTranslation`). Extend i18next keys with plugin-specific strings.

```tsx
import { WorkflowBuilder, type WorkflowBuilderPlugin, registerComponentDecorator } from '@workflowbuilder/sdk';

import { MyToolbarButton } from './my-toolbar-button';

const myPlugin: WorkflowBuilderPlugin = () => {
  registerComponentDecorator('OptionalAppBarControls', {
    content: MyToolbarButton,
    name: 'MyPlugin',
  });
};

export function App() {
  return <WorkflowBuilder.Root plugins={[myPlugin]} />;
}
```

Plugins are synchronous. If you need async work (config fetch, WASM load, feature flag lookup), await it outside the SDK and construct the plugin around the resolved value before passing it to `<Root>`.

Full guide: [Build a plugin](https://www.workflowbuilder.io/docs/guides/build-a-plugin/).

## Connection validation

`isValidConnection` decides whether a dragged connection is allowed. Return `false` to reject it: no edge is created, no flicker. It receives the resolved `sourceNode` / `targetNode` (plus the raw `connection`), so you branch on node `data` without reaching into the store.

```tsx
import { WorkflowBuilder, type WorkflowBuilderIsValidConnection } from '@workflowbuilder/sdk';

// Module scope keeps the reference stable.
const isValidConnection: WorkflowBuilderIsValidConnection = ({ sourceNode, targetNode }) =>
  !(sourceNode.data.type === 'start' && targetNode.data.type === 'start');

export function App() {
  return <WorkflowBuilder.Root isValidConnection={isValidConnection} />;
}
```

Validates interactive drags only, not programmatic edge writes (templates, paste, `setStoreEdges`). Fail-open: if an endpoint can't be resolved to a node, the connection is allowed.

## Advanced: ReactFlow props

`reactFlowProps` forwards extra props to the underlying ReactFlow canvas for things the SDK doesn't expose directly (zoom limits, key codes, `onNodeClick`, performance flags, …).

```tsx
const reactFlowProps = {
  maxZoom: 1.5,
  zoomOnDoubleClick: false,
  onNodeClick: (_, node) => console.log(node.id),
} satisfies WorkflowBuilderReactFlowProps;

<WorkflowBuilder.Root reactFlowProps={reactFlowProps} />;
```

Props the SDK owns (graph data, the connection / selection / change handlers, type maps, `colorMode`, …) can't be set here. To observe SDK events use the listener APIs (`addNodeChangedListener`, …); to theme use [Theming](#theming). Treat `reactFlowProps` as static config: runtime value changes may not apply immediately.

## Theming

The editor exposes a small set of CSS custom properties for top-level styling. Override them on `:root` or scope to your app shell:

```css
:root {
  --wb-background-color: #fafafa;
  --wb-font-family: 'Inter', system-ui, sans-serif;
  --wb-transition: 0.15s ease-in;
}
```

Available `--wb-*` tokens: `--wb-background-color`, `--wb-font-family`, `--wb-transition`, plus scrollbar styling (`--wb-scroll-width`, `--wb-scroll-radius`, `--wb-scroll-thumb-color`, `--wb-scroll-thumb-hover-color`, `--wb-scroll-track-color`).

Deeper color and spacing customization (palette, semantic UI tokens) goes through the `--ax-*` token layer from `@synergycodes/overflow-ui`. Full guide: [Design system and customization](https://www.workflowbuilder.io/docs/overview/features/design-system-and-customization/).

## CSS — global resets

`@workflowbuilder/sdk/style.css` contains a small set of global resets, including:

```css
body {
  margin: 0;
  background-color: var(--wb-background-color);
  overflow: hidden;
}

html,
body,
#root {
  height: 100vh;
}
```

The rules ship inside `@layer reset` (the lowest precedence in the SDK's cascade layer
order), so any consumer-level rule on `body` / `html` / `#root` wins automatically — no
specificity hacks or `!important` needed. Two things to be aware of:

- **`overflow: hidden` on `<body>`** — the editor expects a full-viewport canvas with no
  page-level scrollbar. If you embed the editor inside a scrolling page, override
  `body { overflow: auto; }` (or scope the SDK to a sized container with its own
  `overflow: hidden`) and let the editor's own viewport handle pan/zoom.
- **`background-color: var(--wb-background-color)`** — the body picks up the SDK's
  background token. If you don't ship the SDK style sheet but render
  `<WorkflowBuilder.Root />`, the token is undefined and the body falls back to
  transparent. Either ship the CSS or set `--wb-background-color` yourself.

If you don't want the body resets at all, import the SDK before your own global
stylesheet so your rules land in the unlayered cascade above `@layer reset`.

## Single-instance constraint

Mount one `<WorkflowBuilder.Root>` per page. Plugin / JsonForms / i18n registries and the `useStore.{getState,setState,subscribe}` facade all share a module-level singleton, so two Roots on the same page would silently clash. If you need multiple "workflows" on one page, render them sequentially (mount → save → unmount → mount next).

## TypeScript

`dist/index.d.ts` ships with all required types inlined: icon names (`WBIcon`), domain types (`WorkflowBuilderNode`, `WorkflowBuilderEdge`, `NodeData`, `DiagramModel`, `PaletteItemOrGroup`, `TemplateModel`, …), plugin contracts, and integration types. No extra `@types/*` package needed.

Full API reference: <https://www.workflowbuilder.io/docs/api/core/workflowbuilder/>.

## Browser and runtime

- **Client-side only.** The SDK holds module-level singletons (zustand store identity, i18next instance, immer's frozen-object cache) and uses `i18next-browser-languagedetector`. Mount inside `'use client'` boundaries on Next.js, or behind a client-only wrapper (`dynamic(() => import('./Editor'), { ssr: false })`) on other SSR frameworks.
- **Modern browsers.** Last two versions of Chrome, Firefox, Safari, Edge.
- **React 18 or 19.**

## Peer dependencies

Install alongside the SDK (ranges declared in `peerDependencies`):

- `react`, `react-dom` (`^18.0.0 || ^19.0.0`)
- `@xyflow/react` (`^12.0.0`)
- `@jsonforms/core`, `@jsonforms/react` (`^3.4.0`)
- `i18next` (`^24.0.0`), `react-i18next` (`^15.0.0`), `i18next-browser-languagedetector` (`^8.0.0`)
- `immer` (`^10.0.0`)
- `zustand` (`^5.0.0`)

These are declared as `peerDependencies` so the consumer app and the SDK share a single
copy of each — required for singletons (zustand store identity, i18next instance,
immer's frozen-object cache).

## Support

Built and maintained by [Synergy Codes](https://synergycodes.com/) - the engineers behind the SDK shipping workflow tools for 15 years across 20+ industries. Available for integration, customization, UX, back-end logic, and end-to-end delivery.

[Talk to the team →](https://workflowbuilder.io/consulting/)

## License

Apache 2.0 — see [LICENSE](./LICENSE).
