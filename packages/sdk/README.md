# @workflowbuilder/sdk

React SDK for [Workflow Builder](https://www.workflowbuilder.io/) — embed a visual, flow-based workflow editor in your app.

- **Docs:** <https://www.workflowbuilder.io/docs/overview/>
- **Live demo:** <https://app.workflowbuilder.io/>
- **Source:** <https://github.com/synergycodes/workflowbuilder>

## Install

```bash
npm install @workflowbuilder/sdk \
  react react-dom \
  @xyflow/react \
  @jsonforms/core @jsonforms/react \
  i18next react-i18next i18next-browser-languagedetector \
  immer zustand
```

The SDK ships its dependencies bundled in `dist/`, but the React + xyflow + JsonForms + i18n + state libraries above are `peerDependencies` — your app and the SDK must share a single copy of each. See [Peer dependencies](#peer-dependencies) below.

## Usage

Mount `<WorkflowBuilder.Root>` at the top of the editor subtree. With no children it renders the default layout (top bar, palette, canvas, properties panel). Pass children to compose a custom layout.

```tsx
import { WorkflowBuilder } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

export function App() {
  return <WorkflowBuilder.Root nodeTypes={myNodeTypes} />;
}
```

Custom layout — mount subcomponents directly:

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

Each subcomponent is also available as a named export (`WorkflowBuilderTopBar`, `WorkflowBuilderPalette`, `WorkflowBuilderCanvas`, `WorkflowBuilderPropertiesPanel`, `WorkflowBuilderDefaultLayout`) for consumers who prefer the classic style.

Full walkthrough: [`apps/docs/.../wb-as-react-component`](../../apps/docs/src/content/docs/get-started/quick-start/wb-as-react-component.mdx).

## Single-instance constraint

Mount one `<WorkflowBuilder.Root>` per page. Plugin / JsonForms / i18n registries and the `useStore.{getState,setState,subscribe}` facade all share a module-level singleton, so two Roots on the same page would silently clash. If you need multiple "workflows" on one page, render them sequentially (mount → save → unmount → mount next).

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

## License

Apache 2.0 — see [LICENSE](./LICENSE).
