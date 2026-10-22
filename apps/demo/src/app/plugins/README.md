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

A `…Content` component takes `place`: `'before'` (the default) puts your content before the area's built-in controls, `'after'` puts it after them. Two components in the same area render in mount order.

```tsx
<PaletteFooterContent place="after">
  <ExampleComponent />
</PaletteFooterContent>
```

A decorator on a slot (`OptionalNodeContent`, `OptionalEdgeProperties`, …) takes `place` and `priority` instead: `place` sets where it renders relative to the slot's host, and a higher `priority` is shown first.

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
registerComponentDecorator('OptionalAppChildren', {
  content: TreeControls,
  name: 'TreeButton',
});
```

Use the `name` property:

```ts
const wasTreePluginAdded = hasRegisteredComponentDecorator('OptionalAppChildren', 'TreeButton');
```

### How to add a plugin conditionally?

In your `plugin-exports.ts` file, you can add an if statement.

```tsx
if (SHOULD_ADD_TREE_BUTTON === true) {
  registerComponentDecorator('OptionalAppChildren', {
    content: TreeControls,
  });
}
```

### How to add a plugin conditionally if another plugin was added earlier?

Set `name` property.

```tsx
registerComponentDecorator('OptionalAppChildren', {
  content: TreeControls,
  name: 'TreeButton',
});
```

Use `name` property.

```tsx
if (hasRegisteredComponentDecorator('OptionalAppChildren', 'TreeButton')) {
  registerComponentDecorator('OptionalAppChildren', {
    content: SecondTreeControls,
  });
}
```

The order in which plugins are listed in `app.tsx`'s `plugins` array is important.
