---
title: Custom JsonForms control
description: Register a custom renderer, cell, or plugin translation for node property panels.
sidebar:
  order: 3
---

Node properties render through [JsonForms](https://jsonforms.io). Plug in a custom React component for any property type — colour picker, code editor, file uploader — by registering a renderer through the `jsonForm` prop on `<WorkflowBuilder.Root>`.

## `WorkflowBuilderJsonFormConfig`

```ts
interface WorkflowBuilderJsonFormConfig {
  renderers?: JsonFormsRendererExtension[];
  cells?: JsonFormsCellExtension[];
  translations?: PluginTranslationResource;
}

type JsonFormsRendererExtension = JsonFormsRendererRegistryEntry; // from @jsonforms/core
type JsonFormsCellExtension = JsonFormsCellRendererRegistryEntry; // from @jsonforms/core
```

Consumer-supplied renderers are tried **before** the built-ins. When two testers return the same rank, yours wins — that's how you override a built-in control.

## Custom renderer — full example

Everything you need is re-exported from `@workflowbuilder/sdk` — you never install or import `@jsonforms/*` yourself. That matters for more than convenience: a renderer wrapped with a HOC from your own copy of JsonForms would read from a different React context than the SDK renders with and silently receive empty props. Importing from the SDK guarantees a single shared copy.

```tsx
import {
  type ControlProps,
  type JsonFormsRendererExtension,
  WorkflowBuilder,
  rankWith,
  uiTypeIs,
  withJsonFormsControlProps,
} from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

function ColorPicker({ data, handleChange, path }: ControlProps) {
  return <input type="color" value={data ?? '#000000'} onChange={(e) => handleChange(path, e.target.value)} />;
}

const colorPickerRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('ColorPicker')),
  renderer: withJsonFormsControlProps(ColorPicker),
};

function App() {
  return (
    <WorkflowBuilder.Root
      jsonForm={{ renderers: [colorPickerRenderer] }}
      integration={{ strategy: 'props', onDataSave }}
    />
  );
}
```

Any node whose `uischema` contains `{ type: 'ColorPicker', scope: '...' }` will now render with your `ColorPicker` component.

## Cells

`cells` work the same way — type the entry with `JsonFormsCellExtension` and wrap your component with `withJsonFormsCellProps` (also from `@workflowbuilder/sdk`) for list/array cell rendering. Built-in cells are passed through when consumer cells are absent; if you provide any, yours are used as-is (no merging with built-ins for cells).

## Translations

```ts
type PluginTranslationResource = {
  [lang: string]: {
    translation: {
      [key: string]: {
        [key: string]: string | { [key: string]: string };
      };
    };
  };
};
```

Translations are merged into the `plugins.*` namespace of the built-in i18n resources.

```tsx
<WorkflowBuilder.Root
  jsonForm={{
    translations: {
      en: {
        translation: {
          plugins: {
            colorPicker: {
              label: 'Pick a color',
              description: 'Choose any color for the node',
            },
          },
        },
      },
    },
  }}
  integration={{ strategy: 'props', onDataSave }}
/>
```

The same translations can also be registered imperatively via [`registerPluginTranslation`](/guides/build-a-plugin/#registerplugintranslation).

## Authoring primitives

All the JsonForms building blocks — the `withJsonForms*Props` HOCs, the `useJsonForms` hook, `JsonFormsDispatch`, the testers (`rankWith`, `uiTypeIs`, `schemaTypeIs`, …), `RuleEffect`, and the prop types (`ControlProps`, `CellProps`, …) — are re-exported from `@workflowbuilder/sdk`. The full list lives in the Forms section of the [API reference](/api/).

## Related types

Available via `import type { ... } from '@workflowbuilder/sdk'`:

- [`WorkflowBuilderJsonFormConfig`](/api/plugins/workflowbuilderjsonformconfig/)
- [`JsonFormsRendererExtension`](/api/plugins/jsonformsrendererextension/)
- [`JsonFormsCellExtension`](/api/plugins/jsonformscellextension/)
- [`PluginTranslationResource`](/api/plugins/plugintranslationresource/)
- [`UISchema`](/api/types/uischema/) — for typing your `uischema.ts`. Built-in element types are listed in [Form overview](/node-schemas/form-overview/).
