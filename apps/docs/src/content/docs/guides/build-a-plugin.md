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

| Slot name                | Where it renders                        |
| ------------------------ | --------------------------------------- |
| `OptionalAppChildren`    | App-level children (portals, providers) |
| `OptionalEdgeProperties` | Edge properties panel                   |
| `OptionalHooks`          | Invisible provider/hook slot            |
| `OptionalNodeContent`    | Inside nodes (receives `nodeId` prop)   |

The editor header, the palette and the properties panel have no slots: see [Built-in interface: hide, move, add](#built-in-interface-hide-move-add). A decorator registered on one of the slots that 4.0 removed logs a warning naming its replacement and renders nothing; the 4.0 changelog lists them.

### Example

```tsx
import { EditorHeaderControlsContent, registerComponentDecorator } from '@workflowbuilder/sdk';
import { Button } from '@workflowbuilder/ui';

registerComponentDecorator('OptionalAppChildren', {
  content: MyCustomButton,
  name: 'MyPlugin',
  priority: 10, // shown before decorators with lower priority
});

function MyCustomButton() {
  return (
    <EditorHeaderControlsContent>
      <Button size="s" variant="ghost-secondary" onClick={doSomething}>
        My button
      </Button>
    </EditorHeaderControlsContent>
  );
}
```

This decorator just mounts `MyCustomButton` once, as the model's ["A plugin that adds UI"](#a-plugin-that-adds-ui) section below describes; `EditorHeaderControlsContent` inside it is what actually places the button in the editor header.

### Typing `modifyProps`

Pass the slot's props type as the type parameter so `modifyProps` is checked against the actual host's prop shape. Slots that target a built-in component export a matching `*Props` type from the SDK barrel — for example, `WorkflowBuilderCanvasProps` for the `'Canvas'` slot and [`WorkflowBuilderPropertiesPanelProps`](/api/components/workflowbuilderpropertiespanelprops/) for `'PropertiesPanel'`.

```tsx
import { registerComponentDecorator } from '@workflowbuilder/sdk';
import type { WorkflowBuilderCanvasProps } from '@workflowbuilder/sdk';

import { myEdgeTypes } from './edges';

registerComponentDecorator<WorkflowBuilderCanvasProps>('Canvas', {
  modifyProps: (props) => ({
    ...props,
    edgeTypes: { ...props.edgeTypes, ...myEdgeTypes }, // typed against EdgeTypes
  }),
});
```

For a custom slot you control, type the parameter with your component's own props instead — `registerComponentDecorator<MyButtonProps>('MyCustomSlot', { … })`.

## Built-in interface: hide, move, add

Your own UI in the editor header, the palette and the properties panel does **not** go through `registerComponentDecorator`; it uses a separate, simpler model (the `PropertiesPanel` slot still takes a props decorator, for the panel's `tabs`, labels and `onDeleteClick`): read state with `useWorkflowBuilderState()`, run a command with `useWorkflowBuilderActions()`, hide a built-in control with a key in `builtInControls` on `<WorkflowBuilder.Root>`, and add your own UI with a `…Content` or `…MenuItem` component rendered under `<WorkflowBuilder.Root>`. A plugin function has no JSX of its own, so it still reaches this model indirectly: it mounts one component through the unrelated, still-current `OptionalAppChildren` slot, and that component uses `…Content`/`…MenuItem` inside it (see ["A plugin that adds UI"](#a-plugin-that-adds-ui) below).

| You want to…                        | Use                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| read state                          | `useWorkflowBuilderState()`, e.g. `isReadOnly`, `isPaletteOpen`, `theme`, …  |
| run a command from your own control | an action from `useWorkflowBuilderActions()`, e.g. `openTemplates()`         |
| hide a built-in control             | a key in `builtInControls` on `<WorkflowBuilder.Root>`                       |
| add your own UI                     | a component rendered under `<WorkflowBuilder.Root>`: `…Content`, `…MenuItem` |

Six `…Content` components cover the editor header, palette and properties-panel areas: `EditorHeaderToolsContent`, `EditorHeaderControlsContent`, `PaletteHeaderContent`, `PaletteFooterContent`, `PropertiesPanelHeaderContent`, `PropertiesPanelFooterContent`. Two `…MenuItem` components add an item to a built-in menu behind a separator: `WorkflowMenuItem` (the menu next to the workflow name, after Export, Import and Settings) and `PropertiesPanelMenuItem`. Render any of them anywhere under `<WorkflowBuilder.Root>`: in the app tree, in a plugin component, or inside a node's properties form.

### Hide a control and rebuild it in your own order

Built-in controls cannot be reordered: hide the ones you want to move, then render your own in their place.

```tsx
import { MoonStars, Sun } from '@phosphor-icons/react';
import {
  EditorHeaderControlsContent,
  WorkflowBuilder,
  useWorkflowBuilderActions,
  useWorkflowBuilderState,
} from '@workflowbuilder/sdk';
import { IconSwitch } from '@workflowbuilder/ui';

<WorkflowBuilder.Root builtInControls={{ readOnlyToggle: false, themeToggle: false }}>
  <WorkflowBuilder.DefaultLayout />
  <EditorHeaderControlsContent>
    <ReadOnlySwitch />
    <ShareButton />
    <ThemeSwitch />
  </EditorHeaderControlsContent>
</WorkflowBuilder.Root>;

function ThemeSwitch() {
  const { theme } = useWorkflowBuilderState();
  const { toggleTheme } = useWorkflowBuilderActions();
  return <IconSwitch checked={theme === 'dark'} onChange={toggleTheme} icon={<Sun />} IconChecked={<MoonStars />} />;
}
```

This renders, left to right: `ReadOnlySwitch`, `ShareButton`, the rebuilt `ThemeSwitch` (own content, in JSX order), then the built-in language selector (not hidden here). Own content never reorders the built-ins among themselves; it only stands before or after them as a block.

### Placing content before or after the built-ins

Every `…Content` component accepts an optional `place`, `'before'` by default (as in every example above) or `'after'`. `place="after"` renders past the area's whole built-in group. In `EditorHeaderControlsContent` the after-content still stands ahead of the ⋮ menu that a narrow editor header shows. In the sidebar headers it becomes a second full-width row at the end of the header, under the tabs when the properties panel shows them. Either way, content lands before or after the whole built-in group as one block; it can never land between two built-in controls.

```tsx
import { EditorHeaderToolsContent } from '@workflowbuilder/sdk';

<EditorHeaderToolsContent place="after">
  <UndoButton />
  <RedoButton />
</EditorHeaderToolsContent>;
```

With the built-in Save button visible, this renders the editor header's tools group as `[Save][Undo][Redo]`.

### A plugin that adds UI

A plugin is a `() => void` function with no JSX of its own, so it mounts one component through the (still current) `OptionalAppChildren` slot, and that component uses the same `…Content`/`…MenuItem` components as the app tree:

```tsx
export const sharePlugin: WorkflowBuilderPlugin = () => {
  registerComponentDecorator('OptionalAppChildren', { name: 'share', content: ShareControls });
};

function ShareControls() {
  return (
    <>
      <WorkflowMenuItem label="Share" onClick={share} />
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

- **Order is mount order.** A component rendered conditionally (`{canShare && <WorkflowMenuItem … />}`) moves to the end of its area or menu when it remounts.
- **Own content stands before or after the whole built-in group of its area, never between two built-in controls.** The default `place="before"` puts it immediately ahead of the group in the editor header and the footers, or as a full-width row under the title in the sidebar headers, wide enough for a search field. `place="after"` puts it immediately behind the group instead: still ahead of the ⋮ menu in a narrow editor header's controls area, or as a second full-width row at the end of a sidebar header, under the tabs when the properties panel shows them.
- **The area sets the outer layout.** The editor header lays its content out in a line; the footers lay it out in a column, so two buttons side by side there need a container of their own. Your content adapts to the area it is in; it does not change how the area itself lays out.
- **Hiding is not blocking.** `builtInControls={{ delete: false }}` removes the button; the Delete key and `deleteSelection()` keep working. Only read-only mode blocks deletion as a whole. `reactFlowProps={{ deleteKeyCode: null }}` disables the key alone: `deleteSelection()` and a decorator's `onDeleteClick` still delete through the same confirmation.
- **Hiding is app-wide, not per-node.** `builtInControls` hides a control for the whole app; it cannot protect one specific node from deletion. For that, set `deletable: false` on the node itself (a React Flow property), which also blocks the Delete key for that node.
- **Hiding `paletteToggle` or `propertiesPanelToggle` leaves no way back for the user.** The palette starts collapsed, so hiding `paletteToggle` means it never opens at all unless the app calls `setPaletteOpen(true)` itself. To start with the palette open, call `actions.setPaletteOpen(true)` from [`onLoad`](/guides/configuring-the-editor/#load-behavior). Either sidebar, once collapsed, has only its own expand button (also hidden) to reopen it; an app that hides either toggle must give the user another way in, e.g. a button calling `setPaletteOpen(true)` or `setPropertiesPanelOpen(true)`.
- **Read-only mode blocks the actions that change the persisted model**: `openTemplates`, `setWorkflowName`, `deleteSelection`, `setLayoutDirection`, `toggleLayoutDirection`. Every other action, including `save`, `openExport`, the theme and palette/panel toggles, the palette filter and the language switch, always runs. Two exceptions are not guarded today: `openImport` replaces the whole diagram and `openSettings` lets you edit the persisted global variables, and neither checks `isReadOnly`. Hide them explicitly where that matters: `builtInControls={{ import: canEdit, settings: canEdit }}`. A custom button that changes the diagram checks `isReadOnly` itself; the SDK only guards its own actions.
- **Content from a node's properties form lives with the form.** It mounts only while the panel is expanded and that tab is active, and unmounts with the form; content meant to be always present belongs in the app tree instead.
- **An empty area, or a menu with no items, disappears**, and a collapsed sidebar shows only its title and the expand button; its own header content and menu disappear with the rest.
- **Two `…Content` components in the same area both render; nothing merges them.** Two buttons added from two different places both show up, in mount order.
- **A `…MenuItem` may repeat a built-in label.** Every registered row is keyed by its own identity, so a second "Export" next to the built-in one shows as a separate row rather than colliding with it. Whether two rows with the same text make sense is the app's call.
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

| Function name       | What it does                        |
| ------------------- | ----------------------------------- |
| `getPaletteData`    | Builds the palette data structure.  |
| `getTemplates`      | Builds the template list.           |
| `trackFutureChange` | Records an upcoming diagram change. |

The workflow menu's Export and Import items are not a decorable function: add items next to them with [`WorkflowMenuItem`](#built-in-interface-hide-move-add) and hide `export` / `import` through `builtInControls`.

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
