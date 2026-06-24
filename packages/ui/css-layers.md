# CSS layers

Overflow UI emits all of its styles into two ordered cascade layers:

```css
@layer ui.base, ui.component;
```

`ui.base` holds resets and primitives; `ui.component` holds component styles.
Declaring the order once, before any rule from either layer, guarantees that
`ui.component` always wins over `ui.base`, and that unlayered consumer styles
win over both.

## Establishing the order

The order is fixed by the **first** `@layer` declaration the browser sees, so
the declaration must load before any component rule. The declaration lives in
`styles.css` (and in the package barrel, which imports it first), so consumers
establish it by either:

- importing from the package root - the barrel imports the declaration first; or
- importing `@workflowbuilder/ui/styles.css` **before** any component when
  using per-component subpath imports.

Per-component stylesheets deliberately do **not** repeat the declaration. If one
loads before `styles.css`, the first use of a layer fixes the order: a
`ui.component` rule seen before any `ui.base` rule locks it as
`[ui.component, ui.base]`, inverting the cascade. Importing `styles.css` first
avoids this.

The combined `index.css` (consumed standalone, e.g. by Workflow Builder) carries
the declaration at its top for the same reason.
