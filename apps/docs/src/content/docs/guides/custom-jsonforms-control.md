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

```tsx
import { type JsonFormsRendererRegistryEntry, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { WorkflowBuilder } from '@workflowbuilder/sdk';

import '@workflowbuilder/sdk/style.css';

function ColorPicker({
  data,
  handleChange,
  path,
}: {
  data: string;
  handleChange: (path: string, value: string) => void;
  path: string;
}) {
  return <input type="color" value={data ?? '#000000'} onChange={(e) => handleChange(path, e.target.value)} />;
}

const colorPickerRenderer: JsonFormsRendererRegistryEntry = {
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

`cells` work the same way — use `JsonFormsCellRendererRegistryEntry` for list/array cell rendering. Built-in cells are passed through when consumer cells are absent; if you provide any, yours are used as-is (no merging with built-ins for cells).

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

## Related types

Available via `import type { ... } from '@workflowbuilder/sdk'`:

- [`WorkflowBuilderJsonFormConfig`](/api/plugins/workflowbuilderjsonformconfig/)
- [`JsonFormsRendererExtension`](/api/plugins/jsonformsrendererextension/)
- [`JsonFormsCellExtension`](/api/plugins/jsonformscellextension/)
- [`PluginTranslationResource`](/api/plugins/plugintranslationresource/)
- [`UISchema`](/api/types/uischema/) — for typing your `uischema.ts`. Built-in element types are listed in [Form overview](/node-schemas/form-overview/).
