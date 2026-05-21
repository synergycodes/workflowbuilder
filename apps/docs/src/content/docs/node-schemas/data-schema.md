---
title: Data schema
description: The JSON-Schema half of a node — what its `schema.ts` declares, what types each property can take, and how validation runs at edit time.
sidebar:
  order: 2
---

`schema.ts` is a [JSON Schema](https://json-schema.org/) describing the shape of a node's `properties` — the data half. For the visual half (how those properties render in the property panel), see [Form overview](/node-schemas/form-overview/).

The SDK's [`NodeSchema`](/api/types/nodeschema/) type narrows the standard JSON Schema vocabulary to the subset the editor understands, plus a handful of SDK-specific additions (notably `options` for select-style fields).

It drives three things at runtime:

1. **Validation** — values entered in the property panel are checked against this schema; failures surface as inline errors on the node and the affected field.
2. **Rendering** — JsonForms uses the schema (combined with the matching [`UISchema`](/node-schemas/form-overview/)) to know what each control should accept.
3. **Type inference** — `NodeDataProperties<typeof schema>` extracts a precise TypeScript type for the node's `properties`, so consumers of `NodeData` get autocomplete on their custom fields.

## Anatomy

A minimal schema for a `Webhook` node:

```ts
import { type NodeSchema, sharedProperties } from '@workflowbuilder/sdk';

export const schema = {
  properties: {
    ...sharedProperties,
    url: { type: 'string', format: 'uri' },
    method: {
      type: 'string',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
      ],
    },
    retryOnFailure: { type: 'boolean' },
  },
  required: ['url', 'method'],
} satisfies NodeSchema;

export type WebhookNodeSchema = typeof schema;
```

The top level is always an object schema with a `properties` map. Each entry under `properties` describes one editable field. `required` enumerates which of those fields must have a non-empty value before the node validates clean.

`label` and `description` are reserved property names — every node must declare both, and the SDK treats them as the node's display title and subtitle in the diagram. [`sharedProperties`](/api/utilities/sharedproperties/) is the canonical way to spread them into your schema; alternatively, declare each one explicitly: `label: { type: 'string' }, description: { type: 'string' }`.

## Field types

Five primitive shapes plus two composites cover everything the editor renders:

| `type`      | TypeScript | Typical control                   | Notes                                                         |
| ----------- | ---------- | --------------------------------- | ------------------------------------------------------------- |
| `'string'`  | `string`   | `Text`, `Select`, `DatePicker`    | Default for free-text input. Adds `format` for validation.    |
| `'number'`  | `number`   | (custom)                          | Use `minimum` / `maximum` for bounds.                         |
| `'boolean'` | `boolean`  | `Switch`                          | Two-state on/off.                                             |
| `'array'`   | `T[]`      | `DynamicConditions`, `AiTools`, … | `items` describes one element shape (always an object).       |
| `'object'`  | `{ ... }`  | (nested layout)                   | Group of nested fields; renders flat in the panel by default. |

Date/time fields are `type: 'string'` paired with a `DatePicker` control — the editor stores the value as an ISO string and the control parses it.

## Adding options to string fields

The SDK extends standard JSON Schema with an `options` array on string fields, used by `Select` and other choice controls:

```ts
status: {
  type: 'string',
  options: [
    { label: 'Active',   value: 'active'   },
    { label: 'Paused',   value: 'paused'   },
    { type: 'separator' },
    { label: 'Archived', value: 'archived' },
  ],
}
```

Each entry is either an `ItemOption` (`label` + `value`, optionally an `icon`) or a `{ type: 'separator' }` divider. The matching uischema element is `{ type: 'Select', scope: '#/properties/status' }`.

See the [`Option`](/api/types/option/) API reference for the exact shape.

## Validation

Standard JSON-Schema validators apply, with the most-used ones being:

| Keyword                                 | What it checks                                      |
| --------------------------------------- | --------------------------------------------------- |
| `required`                              | Listed property names must have non-empty values.   |
| `minLength` / `maxLength`               | String length bounds.                               |
| `pattern`                               | String matches a regex.                             |
| `format`                                | String shape — `'uri'`, `'email'`, `'date-time'`, … |
| `minimum` / `maximum`                   | Numeric bounds.                                     |
| `exclusiveMinimum` / `exclusiveMaximum` | Numeric bounds (strict).                            |
| `multipleOf`                            | Numeric value must be divisible by this number.     |

For "value must be one of a fixed list", reach for the SDK's `options` array on the field (see the section above) — it's what `Select` reads, surfaces in TypeScript inference, and is what most node schemas use. Plain JSON-Schema `enum` is not part of the statically-typed [`NodeSchema`](/api/types/nodeschema/) surface today.

Validation runs on every edit; failures populate `NodeData.properties.errors` and surface in the property panel via the per-field error indicator. Override or suppress that indicator with `errorIndicatorEnabled: false` on the matching uischema control.

For conditional shape changes (e.g. _if `method === 'POST'`, then `body` is required_), use the standard JSON Schema `if` / `then` / `else` keywords inside `allOf` — see [`NodeSchema`](/api/types/nodeschema/) for the supported subset.

## Pairing with `uischema.ts`

`schema.ts` says **what** a property is; `uischema.ts` says **how** it renders. They reference each other through `scope` strings — JsonPointer-style paths from the schema root:

```ts
// schema.ts — declares `url` exists and is a URI string
{ properties: { url: { type: 'string', format: 'uri' } } }

// uischema.ts — declares `url` renders as a Text control
{ type: 'Text', scope: '#/properties/url', placeholder: 'https://...' }
```

Build the scope string from a typed dot-path with [`getScope`](/api/forms/getscope/) to get autocomplete and rename safety.

## Reusable preset fragments

The SDK ships a handful of pre-built fragments you can drop into your schemas instead of redeclaring the same shape per node. They cover the fields the editor reads itself (`label`, `description`, `status`) plus the UISchema slots every node needs.

### Schema-side

[`sharedProperties`](/api/utilities/sharedproperties/) — the canonical `label` + `description` pair. Spread it into every `NodeSchema['properties']` so your nodes pick up display title and subtitle without redeclaring them.

```ts
import { type NodeSchema, sharedProperties } from '@workflowbuilder/sdk';

export const schema = {
  properties: {
    ...sharedProperties,
    url: { type: 'string', format: 'uri' },
  },
} satisfies NodeSchema;
```

[`statusOptions`](/api/utilities/statusoptions/) — the three canonical statuses (`active` / `draft` / `disabled`) with matching status icons. Use it as the `options` array on a `status: { type: 'string' }` field.

```ts
import { sharedProperties, statusOptions } from '@workflowbuilder/sdk';

const schema = {
  properties: {
    ...sharedProperties,
    status: {
      type: 'string',
      options: Object.values(statusOptions),
    },
  },
} satisfies NodeSchema;
```

### UISchema-side

[`generalInformation`](/api/utilities/generalinformation/) — pre-built `Accordion` rendering Title / Status / Description for the three fields above. Drop it as a top-level element inside your node's `uischema.elements`.

[`globalControls`](/api/utilities/globalcontrols/) — UISchema fragments rendered on every node regardless of type (today: the missing-previous-variable error slot used by the validation plugin). Spread the array into your node's top-level `elements` so the diagnostic surface stays consistent across node types.

```ts
import { generalInformation, globalControls } from '@workflowbuilder/sdk';

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    generalInformation,
    ...globalControls,
    // … your node-specific controls
  ],
};
```

## TypeScript inference

`NodeDataProperties<typeof schema>` (or `<MySchemaType>`) extracts a TypeScript type for the data shape — every primitive `type` is mapped to its corresponding TS primitive, and **every property is optional** (the editor accepts partial form-state during editing, so the inferred type matches that reality):

```ts
import type { NodeDataProperties } from '@workflowbuilder/sdk';

type WebhookProps = NodeDataProperties<WebhookNodeSchema>;
// {
//   label?: string;
//   description?: string;
//   url?: string;
//   method?: string;
//   retryOnFailure?: boolean;
// }
```

`required: ['url', 'method']` does _not_ narrow the inferred type — `required` is a runtime validator only, not a static-type signal. Likewise the `options` array does not narrow `method` to `'GET' | 'POST'`; the inferred type stays plain `string`. If you need a narrower type at the consumer side, declare it explicitly.

Use `NodeDataProperties` when consuming `NodeData` in plugin handlers, custom listeners, or derived selectors — TypeScript catches typos against the schema instead of at runtime.

## See also

- [Add a custom node](/guides/add-a-custom-node/) — full walk-through using a `Webhook` example
- [Form overview](/node-schemas/form-overview/) — overview of the visual half
- [Form controls](/node-schemas/form-controls/) — every control type and its props
- [`NodeSchema`](/api/types/nodeschema/), [`NodeDataProperties`](/api/types/nodedataproperties/), [`Option`](/api/types/option/) — auto-generated type reference
- [JSON Schema specification](https://json-schema.org/) — the underlying standard
