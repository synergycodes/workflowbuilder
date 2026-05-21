---
title: API Reference
description: Auto-generated reference for every public export from @workflowbuilder/sdk.
sidebar:
  hidden: true
---

This section is the **auto-generated reference** for every public export from `@workflowbuilder/sdk`. Each page is built from the TSDoc comment on the source declaration — when the SDK changes, these pages change with it.

For walkthroughs, integration patterns, and design rationale, see the hand-written [Get Started](/docs/get-started/quick-start/wb-as-react-component/) and [Guides](/docs/guides/) sections instead. They explain how to use the editor; this reference catalogs every symbol the SDK exposes.

## Categories

| Section                               | What's in it                                                                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Core](/docs/api/core/)               | `WorkflowBuilder` compound component, `WorkflowBuilderRoot`, and the props / plugin / integration types it accepts.                                                         |
| [Plugins](/docs/api/plugins/)         | The three `register*` extension points + their option types.                                                                                                                |
| [Components](/docs/api/components/)   | UI building blocks — edge / node primitives, plus `*Props` types you reach for when typing decorators on built-in slots (`DiagramContainerProps`, `PropertiesBarProps`, …). |
| [Hooks](/docs/api/hooks/)             | React hooks (`useStore` selectors, `useFitView`, change-tracker, …).                                                                                                        |
| [Store](/docs/api/store/)             | One-shot store accessors (`getStoreNodes` / `setStoreNodes`, selection helpers, `openModal`).                                                                               |
| [Listeners](/docs/api/listeners/)     | Diagram event hooks — `addNodeChangedListener`, `addNodeDragStartListener` and their pairs.                                                                                 |
| [Forms](/docs/api/forms/)             | Form-authoring helpers — `getScope`, `DynamicCondition`, `ComparisonOperator`.                                                                                              |
| [Integration](/docs/api/integration/) | Persistence-strategy types and save-callback shapes.                                                                                                                        |
| [Types](/docs/api/types/)             | Domain types — `NodeData`, `NodeSchema`, `UISchema`, `PaletteItem`, …                                                                                                       |
| [Utilities](/docs/api/utilities/)     | Reusable schema fragments + small helpers (`getHandleId`, `sharedProperties`, `DeepPartial`).                                                                               |
| [Constants](/docs/api/constants/)     | Edge-routing constants and reserved keys.                                                                                                                                   |
| [i18n](/docs/api/i18n/)               | `TranslationKey` for type-safe `t(...)` calls.                                                                                                                              |
| [Icons](/docs/api/icons/)             | `Icon` component + `WBIcon` name union.                                                                                                                                     |

## How this is generated

The pages in this section are produced by [`starlight-typedoc`](https://starlight-typedoc.vercel.app) at `astro build` time. Source: [packages/sdk/src/index.ts](https://github.com/synergycodes/workflowbuilder/blob/master/packages/sdk/src/index.ts) (the SDK's curated barrel) and the TSDoc comments on every declaration it re-exports.

Strict mode is on — adding a new public export to the barrel without a TSDoc comment **fails the docs build**. So if you're reading this page and a symbol you expect isn't here, that's a bug, not an oversight: please file an issue.
