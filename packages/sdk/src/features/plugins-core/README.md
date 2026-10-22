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

## Adding button before

```tsx
const YourComponentWithACustomControl = () => {
  return <button>Click me</button>;
};

registerComponentDecorator('OptionalAppBarTools', {
  content: YourComponentWithACustomControl,
  place: 'before',
  priority: 10,
});
```

The same way: wrap it in a `plugin(): void` function and add that function to `app.tsx`'s `plugins` array.

`OptionalAppBarTools` is deprecated in favor of `AppBarToolsContent` and `builtInControls`; it keeps working. See `packages/sdk/README.md` for the current built-in interface model.
