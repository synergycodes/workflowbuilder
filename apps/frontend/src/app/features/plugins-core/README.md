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

And import it in `apps/frontend/src/app/features/plugins-core/index.ts`.

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

And import it in `apps/frontend/src/app/features/plugins-core/index.ts`.
