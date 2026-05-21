---
title: Form overview
description: How a node's uischema describes the form rendered in the property panel — controls, layouts, labels.
sidebar:
  order: 3
---

A node's `uischema.ts` declares the **form** rendered in the property panel when that node is selected. It's a tree of elements; each element's `type` decides how its branch renders — a text input, a select, a switch, a horizontal row, an accordion, and so on. This page introduces the shape; the two reference pages below catalogue every built-in element type with its props and a copy-pasteable example.

Three element families:

| Family                                       | What it does                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Controls](/node-schemas/form-controls/)     | Input fields bound to a property — `Text`, `Select`, `Switch`, `DynamicConditions`, …                |
| [Layouts](/node-schemas/form-layouts/)       | Containers that arrange child elements — `VerticalLayout`, `HorizontalLayout`, `Group`, `Accordion`. |
| [Labels](/node-schemas/form-layouts/#labels) | Text-only elements that don't bind to a property — `Label`, `RichText`.                              |

## Quick example

```ts
import type { UISchema } from '@workflowbuilder/sdk';

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Text', scope: '#/properties/label' },
    { type: 'Select', scope: '#/properties/method' },
    {
      type: 'Accordion',
      label: 'Advanced',
      elements: [
        { type: 'Switch', scope: '#/properties/retryOnFailure' },
        { type: 'TextArea', scope: '#/properties/headers', minRows: 3 },
      ],
    },
  ],
};
```

The element's `scope` is a JsonPointer-style path into the matching `schema.ts` — use [`getScope`](/api/forms/getscope/) to build it from a typed dot-path instead of writing the string by hand.

## Custom element types

Element types not on these pages (e.g. `'ColorPicker'`, your own) require a custom JsonForms renderer — see [Custom JsonForms control](/guides/custom-jsonforms-control/).

## Conditional rendering

Every element accepts an optional `rule` field that shows / hides / enables / disables it based on other property values. The shape is the same as JsonForms's [rule object](https://jsonforms.io/docs/uischema/rules/) — see the conditional-fields walk-through in [Add a custom node](/guides/add-a-custom-node/#conditional-fields).

## See also

- [Data schema](/node-schemas/data-schema/) — the JSON-Schema half: types, validation, options
- [Form controls](/node-schemas/form-controls/) — every built-in control type with its props and an example
- [Form layouts](/node-schemas/form-layouts/) — `VerticalLayout`, `HorizontalLayout`, `Group`, `Accordion`
- [Add a custom node](/guides/add-a-custom-node/) — full walk-through of authoring `schema.ts` + `uischema.ts`
- [`UISchema`](/api/types/uischema/), [`getScope`](/api/forms/getscope/) — auto-generated type reference
