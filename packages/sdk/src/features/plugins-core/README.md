# How to use Optional content?

## Adding optional hook

```tsx
const YourComponentWithACustomHook = () => {
  useYourCustomHook();

  return null;
};

registerComponentDecorator('OptionalHooks', {
  content: YourComponentWithAHook,
});
```

Wrap the call in an exported `plugin(): void` function (your `plugin-exports.ts`), then add that function to the `plugins` array passed to `<WorkflowBuilder.Root>` in `apps/demo/src/app/app.tsx`.

## Adding a button to the editor header

A plugin has no JSX of its own, so it mounts one component through `OptionalAppChildren`, and that component places the button with a `…Content` component:

```tsx
const YourAppBarButton = () => {
  return (
    <EditorHeaderToolsContent>
      <button>Click me</button>
    </EditorHeaderToolsContent>
  );
};

registerComponentDecorator('OptionalAppChildren', {
  content: YourAppBarButton,
  name: 'your-plugin',
});
```

The same way: wrap it in a `plugin(): void` function and add that function to `app.tsx`'s `plugins` array. `place="after"` on the `…Content` component puts the button after the built-in Save button, and `builtInControls` on `<WorkflowBuilder.Root>` hides a built-in control. See `packages/sdk/README.md` for the built-in interface model.
