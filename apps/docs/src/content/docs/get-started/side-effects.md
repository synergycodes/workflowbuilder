---
title: Side effects & limitations
description: What the SDK does to global state on import, and the runtime limits to design around.
sidebar:
  order: 6
---

Importing `@workflowbuilder/sdk` runs one module-level side effect on your runtime instances, listed below alongside the runtime limitations it ties into — knowing both up front saves debugging time later.

## Side effects on import

- **`i18next`** — initialises the i18next instance with `react-i18next`, the language detector, and the SDK's bundled `en` / `pl` translations. If your app already configured i18next before importing the SDK, the SDK's `i18n.init(...)` is a no-op for the second `init` per i18next's contract — the registry is shared.

## Known limitations

### Single instance per page

Mount only one `<WorkflowBuilder.Root>` per page. Multi-instance is not supported: the plugin / decorator / JsonForms / i18n registries are module-level singletons shared across mounts, so two Roots on the same page would silently fight over those resources. The imperative `useStore.{getState,setState,subscribe}` facade also resolves through a module-level "current" pointer, so writes from one subtree would leak into another. If you need to swap workflows on the same page, render them sequentially (mount → save → unmount → mount next).

### Raw-TS subpath exports

`@workflowbuilder/sdk/<subpath>` ships raw `.ts` files and reaches into SDK internals that may change without notice. External consumers should import only from the root (`@workflowbuilder/sdk`), which goes through the curated barrel. Subpath imports are for monorepo use only.

### React deduplication (local-path installs only)

When installed via `npm install <local-path>`, the consumer's bundler may resolve `react` from the library's `node_modules` instead of the consumer's. Fix with `resolve.dedupe: ['react', 'react-dom', '@xyflow/react']`. Not needed when installing the SDK from npm.
