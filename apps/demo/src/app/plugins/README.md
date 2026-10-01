# Plugins

This directory contains optional features that extend the app’s functionality when they are included and enabled.

If you are looking for an adapter that connects them to the app, check out `@/features/plugins-core`.

## Workflow Builder with plugins

https://app.workflowbuilder.io/

Here is the full version of the Workflow Builder with plugins (e.g., edges, layout, widgets).

You can compare it with your local version.

## Main features of plugins

- Allows users to create plugins in the plugin directory and remove them without breaking the app
- Vite serves stubs for removed plugins (there is a log in the console when it is served)
- ESLint warns users that they cannot import files directly from @/plugins and must use adapters
- Plugins can modify the base code, alter function inputs and outputs, add hooks, and customize prompts
- Plugins have an additional parameter priority, allowing the user to define which plugin should be applied first

## How plugins work?

If you want to see how the plugin logic works in a smaller example, we have prepared a showcase repository: https://github.com/synergycodes/optional-plugins-demo

> **Note:** `OptionalAppBarTools`, `OptionalAppBarControls` and `OptionalFooterContent` (used as example slots in some of the sections below) are deprecated in favor of the SDK's `…Content` components (`AppBarToolsContent`, `AppBarControlsContent`, `PaletteFooterContent`, …) and `builtInControls`. They keep working. See [Built-in interface: hide, move, add](https://www.workflowbuilder.io/docs/guides/build-a-plugin/#built-in-interface-hide-move-add) for the current way to add UI to the app bar, the palette or the properties panel.

## How to add plugin?

1. Create your plugin directory, for example: `plugins/example`.
2. Add your `<ExampleComponent />` to `plugins/example/components/example-component.tsx`:

```tsx
export function ExampleComponent() {
  return <button>Example</button>;
}
```

3. Add `<ExampleControls />` to `plugins/example/components/example-controls/example-controls.tsx`, placing `ExampleComponent` where you want it to show up:

```tsx
import { PaletteFooterContent } from '@workflowbuilder/sdk';

import { ExampleComponent } from '../example-component';

export function ExampleControls() {
  return (
    <PaletteFooterContent>
      <ExampleComponent />
    </PaletteFooterContent>
  );
}
```

4. In `plugins/example/plugin-exports.ts`, mount it through `OptionalAppChildren` (a plugin file is `.ts`, so the JSX itself lives in the `.tsx` components above):

```ts
import { registerComponentDecorator } from '@workflowbuilder/sdk';

import { ExampleControls } from './components/example-controls/example-controls';

export function plugin(): void {
  registerComponentDecorator('OptionalAppChildren', {
    content: ExampleControls,
  });
}
```

5. Import your plugin into `apps/demo/src/app/app.tsx` and add it to the `plugins` array passed to `<WorkflowBuilder.Root>`, the same way the existing plugins there are wired in: `import { plugin as examplePlugin } from './plugins/example/plugin-exports';`, then add `examplePlugin` to the `plugins={[...]}` list.
6. Refresh the page.

Your component should now be displayed in the left sidebar (palette) footer, before the built-in Templates button.

### How to remove plugin?

Simply remove the folder of your plugin and restart the application. It will still work with empty stubs instead of registration.

#### How to remove "Fallback used for missing plugin..."?

Go to `apps/demo/src/app/app.tsx` and remove the plugin's import and its entry from the `plugins` array.

### How do I change the position of a plugin?

You have place and priority. Set place: 'before' to add your component before the content. The priority determines which plugin is shown first.

```ts
registerComponentDecorator('OptionalFooterContent', {
  content: ExampleComponent,
  place: 'after',
  priority: 1,
});
```

### How to modify properties with an optional plugin?

With the modifyProps property, you can change the properties passed to the plugin. For example, below we added a new label type dottedEdge to the diagram.

```tsx
import { registerComponentDecorator } from '@workflowbuilder/sdk';
import type { DiagramContainerProps } from '@workflowbuilder/sdk';

registerComponentDecorator<DiagramContainerProps>('DiagramContainer', {
  modifyProps: (props) => ({
    ...props,
    edgeTypes: {
      ...props.edgeTypes,
      dottedEdge: DottedEdge,
    },
  }),
});
```

### How to check if a plugin was added?

Set the `name` property for the injected content:

```tsx
registerComponentDecorator('OptionalAppBarControls', {
  content: TreeButton,
  place: 'before',
  name: 'TreeButton',
});
```

Use the `name` property:

```ts
const wasTreePluginAdded = hasRegisteredComponentDecorator('OptionalAppBarControls', 'TreeButton');
```

### How to add a plugin conditionally?

In your `plugin-exports.ts` file, you can add an if statement.

```tsx
if (SHOULD_ADD_TREE_BUTTON === true) {
  registerComponentDecorator('OptionalAppBarControls', {
    content: TreeButton,
    place: 'before',
  });
}
```

### How to add a plugin conditionally if another plugin was added earlier?

Set `name` property.

```tsx
registerComponentDecorator('OptionalAppBarControls', {
  content: TreeButton,
  place: 'before',
  name: 'TreeButton',
});
```

Use `name` property.

```tsx
if (hasRegisteredComponentDecorator('OptionalAppBarControls', 'TreeButton')) {
  registerComponentDecorator('OptionalAppBarControls', {
    content: SecondTreeButton,
    place: 'before',
  });
}
```

The order in which plugins are listed in `app.tsx`'s `plugins` array is important.
