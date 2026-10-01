---
title: Build a plugin
description: Compose registerComponentDecorator, registerFunctionDecorator, and registerPluginTranslation into a plugin function passed to WorkflowBuilder.Root.
sidebar:
  order: 4
---

A plugin is a synchronous function that registers component decorators, function decorators, JsonForms extensions, and / or translations by calling the SDK's `register*` APIs. `<WorkflowBuilder.Root>` invokes every plugin in the `plugins` prop in order, once on first mount, via a lazy `useState` initializer.

Combined with [Custom JsonForms control](/guides/custom-jsonforms-control/), the three registration functions below cover most customisation needs.

All three are side-effecting and safe to call more than once — pass a `name` to deduplicate.

## Plugins as initializer callbacks

```ts
type WorkflowBuilderPlugin = () => void;
```

Most plugins combine multiple registrations. Wrap them in a function and pass via the `plugins` prop on `<WorkflowBuilder.Root>`:

```tsx
const myPlugin: WorkflowBuilderPlugin = () => {
  registerComponentDecorator('OptionalAppChildren', {
    content: MyWidget,
    name: 'my-plugin',
  });
  registerFunctionDecorator('trackFutureChange', {
    place: 'after',
    callback: ({ params }) => auditLog(params),
    name: 'my-plugin',
  });
};

<WorkflowBuilder.Root plugins={[myPlugin]} />;
```

Plugins can also be called directly — the registries are currently module-global singletons. See [Known limitations](/get-started/side-effects/#known-limitations).

## `registerComponentDecorator`

Add, wrap, or modify a component mounted in a named slot.

```ts
function registerComponentDecorator<P = object>(slotName: string, options: ComponentDecoratorOptions<P>): void;

type ComponentDecoratorOptions<P = object> =
  | {
      place?: 'before' | 'after' | 'wrapper';
      content: React.ElementType;
      modifyProps?: (props: P) => P;
      priority?: number;
      name?: string;
    }
  | {
      modifyProps?: (props: P) => P;
      priority?: number;
      name?: string;
    };
```

### Options

- **`place`** — where to render relative to the slot's host:
  - `'before'` (default) — render your content before the host.
  - `'after'` — render after.
  - `'wrapper'` — wrap the host entirely (your `content` receives the host as children).
- **`content`** — the React component to render.
- **`modifyProps`** — function receiving the host's props, returning modified props.
- **`priority`** — higher = rendered first. Default `0`.
- **`name`** — unique identifier within the slot; prevents duplicate registration across calls.

### Available slots

| Slot name                | Where it renders                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `OptionalAppBarControls` | **Deprecated.** App bar, control buttons area. Use [`AppBarControlsContent`](#built-in-interface-hide-move-add). |
| `OptionalAppBarTools`    | **Deprecated.** App bar, toolbar area. Use [`AppBarToolsContent`](#built-in-interface-hide-move-add).            |
| `OptionalAppChildren`    | App-level children (portals, providers)                                                                          |
| `OptionalEdgeProperties` | Edge properties panel                                                                                            |
| `OptionalFooterContent`  | **Deprecated.** Palette footer. Use [`PaletteFooterContent`](#built-in-interface-hide-move-add).                 |
| `OptionalHooks`          | Invisible provider/hook slot                                                                                     |
| `OptionalNodeContent`    | Inside nodes (receives `nodeId` prop)                                                                            |

Deprecated slots keep working; removal comes in a later major. See [Built-in interface: hide, move, add](#built-in-interface-hide-move-add) for the app bar, the palette and the properties panel.

### Example

```tsx
import { AppBarControlsContent, registerComponentDecorator } from '@workflowbuilder/sdk';
import { Button } from '@workflowbuilder/ui';

registerComponentDecorator('OptionalAppChildren', {
  content: MyCustomButton,
  name: 'MyPlugin',
  priority: 10, // shown before decorators with lower priority
});

function MyCustomButton() {
  return (
    <AppBarControlsContent>
      <Button size="s" variant="ghost-secondary" onClick={doSomething}>
        My button
      </Button>
    </AppBarControlsContent>
  );
}
```

This decorator just mounts `MyCustomButton` once, as the model's ["A plugin that adds UI"](#a-plugin-that-adds-ui) section below describes; `AppBarControlsContent` inside it is what actually places the button in the app bar.

### Typing `modifyProps`

Pass the slot's props type as the type parameter so `modifyProps` is checked against the actual host's prop shape. Slots that target a built-in component export a matching `*Props` type from the SDK barrel — for example, `DiagramContainerProps` for the `'DiagramContainer'` slot, [`ProjectSelectionProps`](/api/components/projectselectionprops/) for `'ProjectSelection'`, and [`PropertiesBarProps`](/api/components/propertiesbarprops/) for `'PropertiesBar'`.

```tsx
import { registerComponentDecorator } from '@workflowbuilder/sdk';
import type { DiagramContainerProps } from '@workflowbuilder/sdk';

import { myEdgeTypes } from './edges';

registerComponentDecorator<DiagramContainerProps>('DiagramContainer', {
  modifyProps: (props) => ({
    ...props,
    edgeTypes: { ...props.edgeTypes, ...myEdgeTypes }, // typed against EdgeTypes
  }),
});
```

For a custom slot you control, type the parameter with your component's own props instead — `registerComponentDecorator<MyButtonProps>('MyCustomSlot', { … })`.

## Built-in interface: hide, move, add

The app bar, the palette and the properties panel are **not** customised by targeting them with `registerComponentDecorator`; they share a separate, simpler model: read state with `useWorkflowBuilderState()`, run a command with `useWorkflowBuilderActions()`, hide a built-in control with a key in `builtInControls` on `<WorkflowBuilder.Root>`, and add your own UI with a `…Content` or `…MenuItem` component rendered under `<WorkflowBuilder.Root>`. A plugin function has no JSX of its own, so it still reaches this model indirectly: it mounts one component through the unrelated, still-current `OptionalAppChildren` slot, and that component uses `…Content`/`…MenuItem` inside it (see ["A plugin that adds UI"](#a-plugin-that-adds-ui) below).

| You want to…                        | Use                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| read state                          | `useWorkflowBuilderState()`, e.g. `isReadOnly`, `isPaletteOpen`, `theme`, …  |
| run a command from your own control | an action from `useWorkflowBuilderActions()`, e.g. `openTemplates()`         |
| hide a built-in control             | a key in `builtInControls` on `<WorkflowBuilder.Root>`                       |
| add your own UI                     | a component rendered under `<WorkflowBuilder.Root>`: `…Content`, `…MenuItem` |

Six `…Content` components cover the app bar, palette and properties-panel areas: `AppBarToolsContent`, `AppBarControlsContent`, `PaletteHeaderContent`, `PaletteFooterContent`, `PropertiesPanelHeaderContent`, `PropertiesPanelFooterContent`. Three `…MenuItem` components add an item to a built-in menu behind a separator: `ProjectMenuItem`, `AppBarMenuItem`, `PropertiesPanelMenuItem`. Render any of them anywhere under `<WorkflowBuilder.Root>`: in the app tree, in a plugin component, or inside a node's properties form.

### Hide a control and rebuild it in your own order

Built-in controls cannot be reordered: hide the ones you want to move, then render your own in their place.

```tsx
import { MoonStars, Sun } from '@phosphor-icons/react';
import {
  AppBarControlsContent,
  WorkflowBuilder,
  useWorkflowBuilderActions,
  useWorkflowBuilderState,
} from '@workflowbuilder/sdk';
import { IconSwitch } from '@workflowbuilder/ui';

<WorkflowBuilder.Root builtInControls={{ readOnlyToggle: false, themeToggle: false }}>
  <WorkflowBuilder.DefaultLayout />
  <AppBarControlsContent>
    <ReadOnlySwitch />
    <ShareButton />
    <ThemeSwitch />
  </AppBarControlsContent>
</WorkflowBuilder.Root>;

function ThemeSwitch() {
  const { theme } = useWorkflowBuilderState();
  const { toggleDarkMode } = useWorkflowBuilderActions();
  return <IconSwitch checked={theme === 'dark'} onChange={toggleDarkMode} icon={<Sun />} IconChecked={<MoonStars />} />;
}
```

This renders, left to right: `ReadOnlySwitch`, `ShareButton`, the rebuilt `ThemeSwitch` (own content, in JSX order), then the built-in language selector (not hidden here), then the app bar's kebab-menu trigger (shown because Export and Import are still visible). Own content always renders before whatever built-ins remain; it does not reorder the built-ins among themselves.

### A plugin that adds UI

A plugin is a `() => void` function with no JSX of its own, so it mounts one component through the (still current) `OptionalAppChildren` slot, and that component uses the same `…Content`/`…MenuItem` components as the app tree:

```tsx
export const publishPlugin: WorkflowBuilderPlugin = () => {
  registerComponentDecorator('OptionalAppChildren', { name: 'publish', content: PublishControls });
};

function PublishControls() {
  return (
    <>
      <AppBarMenuItem label="Publish" onClick={publish} />
      <PaletteHeaderContent>
        <Button size="xs" variant="ghost-primary" onClick={openNodeImport}>
          Import nodes
        </Button>
      </PaletteHeaderContent>
    </>
  );
}
```

### Boundaries

These are deliberate limits of the model, not bugs:

- **Order is mount order.** A component rendered conditionally (`{canPublish && <AppBarMenuItem … />}`) moves to the end of its area or menu when it remounts.
- **Own content stands before the built-in controls** of its area. In the app bar and the footers that means immediately before them; in the sidebar headers it renders as a full-width row under the title, wide enough for a search field.
- **The area sets the outer layout.** The app bar lays its content out in a line; the footers lay it out in a column, so two buttons side by side there need a container of their own. Your content adapts to the area it is in; it does not change how the area itself lays out.
- **Hiding is not blocking.** `builtInControls={{ delete: false }}` removes the button; the Delete key and `deleteSelection()` keep working. Use read-only mode, or `reactFlowProps={{ deleteKeyCode: null }}`, to actually block deletion.
- **Hiding is app-wide, not per-node.** `builtInControls` hides a control for the whole app; it cannot protect one specific node from deletion. For that, set `deletable: false` on the node itself (a React Flow property), which also blocks the Delete key for that node.
- **Hiding `paletteToggle` or `propertiesPanelToggle` leaves no way back for the user.** The palette starts collapsed, so hiding `paletteToggle` means it never opens at all unless the app calls `setPaletteOpen(true)` itself. Either sidebar, once collapsed, has only its own expand button (also hidden) to reopen it; an app that hides either toggle must give the user another way in, e.g. a button calling `setPaletteOpen(true)` or `setPropertiesPanelOpen(true)`.
- **Read-only mode blocks the actions that change the persisted model**: `openTemplates`, `renameDocument`, `deleteSelection`, `setLayoutDirection`, `toggleLayoutDirection`. Every other action, including `save`, `openExport`, the theme and palette/panel toggles, the palette filter and the language switch, always runs. Two exceptions are not guarded today: `openImport` replaces the whole diagram and `openSettings` lets you edit the persisted global variables, and neither checks `isReadOnly`. Hide them explicitly where that matters: `builtInControls={{ import: canEdit, settings: canEdit }}`. A custom button that changes the diagram checks `isReadOnly` itself; the SDK only guards its own actions.
- **Content from a node's properties form lives with the form.** It mounts only while the panel is expanded and that tab is active, and unmounts with the form; content meant to be always present belongs in the app tree instead.
- **An empty area, or a menu with no items, disappears**, and a collapsed sidebar shows only its title and the expand button; its own header content and menu disappear with the rest.
- **Two `…Content` components in the same area both render; nothing merges them.** Two buttons added from two different places both show up, in mount order.
- **A `…MenuItem`'s label must be unique among all rows of that menu, built-in or not.** The underlying `Menu` keys every row by its `label`, so a registered item named the same as a built-in row (e.g. a second "Export" in the app bar menu) collides in React's reconciliation just as two registered items sharing a label would, instead of appearing as separate rows.
- **A canvas node template is the wrong place** for any of these components: it renders once per node on the canvas, not once for the app.

## `registerFunctionDecorator`

Intercept a decorable function before/after its execution.

```ts
function registerFunctionDecorator(functionName: string, options: FunctionDecoratorOptions): void;

type FunctionDecoratorOptions =
  | { place?: 'before'; callback: CallbackBefore; priority?: number; name?: string }
  | { place: 'after'; callback: CallbackAfter; priority?: number; name?: string };

type CallbackBefore = (args: { params: unknown[] }) => void | { replacedParams: unknown[] };
type CallbackAfter = (args: { params: unknown[]; returnValue: unknown }) => void | { replacedReturn: unknown };
```

### Decorable functions

A non-exhaustive list (grep `withOptionalFunctionPlugins` in the source for the complete set):

| Function name          | What it does                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPaletteData`       | Builds the palette data structure.                                                                                                                                                    |
| `getTemplates`         | Builds the template list.                                                                                                                                                             |
| `trackFutureChange`    | Records an upcoming diagram change.                                                                                                                                                   |
| `getControlsDotsItems` | **Deprecated**, still runs. Builds the app bar's kebab-menu items. Use [`AppBarMenuItem`](#built-in-interface-hide-move-add), and hide `export` / `import` through `builtInControls`. |

### Return conventions

- **Before-decorator**: return nothing (observe) or `{ replacedParams: [...] }` (substitute arguments).
- **After-decorator**: return nothing (observe) or `{ replacedReturn: ... }` (substitute the result).

### Example

```ts
import { registerFunctionDecorator } from '@workflowbuilder/sdk';

// Run code BEFORE a function executes
registerFunctionDecorator('trackFutureChange', {
  place: 'before',
  callback: ({ params }) => {
    console.log('Change incoming:', params);
  },
});

// Run code AFTER and optionally replace the return value
registerFunctionDecorator('trackFutureChange', {
  place: 'after',
  callback: ({ params, returnValue }) => {
    return { replacedReturn: modifiedValue };
  },
});
```

## `registerPluginTranslation`

Merge additional i18n resources into the `plugins.*` namespace.

```ts
function registerPluginTranslation(resource: PluginTranslationResource): void;
```

```ts
import { registerPluginTranslation } from '@workflowbuilder/sdk';

registerPluginTranslation({
  en: {
    translation: {
      plugins: {
        myPlugin: {
          label: 'My Plugin',
          description: 'Does something useful',
        },
      },
    },
  },
});
```

Equivalent to passing `translations` via `<WorkflowBuilder.Root jsonForm={{ translations }} />`. Use whichever is more convenient for your plugin's lifecycle.
