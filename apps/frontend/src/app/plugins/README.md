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
2. Add your `<ExampleComponent />` to `plugins/example/components/example-component.tsx`.
3. In `plugins/example/plugin-component` import dependencies and add:
```ts
registerComponentDecorator('OptionalFooterContent', {
  content: ExampleComponent,
  place: 'after',
});
```
4. Import your plugin to `apps/frontend/src/app/features/plugins-core/components.ts` with line `import '@/features/example/plugin-components';`
5. Refresh the page.

Your component should now be displayed in the left sidebar (palette) footer.

### How to remove plugin?

Simply remove the folder of your plugin and restart the application. It will still work with empty stubs instead of registration.

### How do I change the position of a plugin?

You have place and priority. Set place: 'before' to add your component before the content. The priority determines which plugin is shown first.

```ts
registerComponentDecorator('OptionalFooterContent', {
  content: ExampleComponent,
  place: 'after',
  priority: 1
});
```

### How to modify properties with an optional plugin? 

With the modifyProps property, you can change the properties passed to the plugin. For example, below we added a new label type dottedEdge to the diagram.

```tsx
type DiagramContainerProps = React.ComponentProps<typeof DiagramContainer>;

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