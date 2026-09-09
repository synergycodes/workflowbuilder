---
title: Form controls
description: Every built-in control element accepted by a node's uischema, with props and an example for each.
sidebar:
  order: 4
---

Controls are leaf elements that bind to a property in a node's `schema.ts` via `scope`. The control type decides how the editor renders that property in the property panel — text input, select, switch, date picker, and so on.

Every control accepts:

| Prop                    | Type           | Required | Notes                                                                                                                                                                             |
| ----------------------- | -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                  | string literal | yes      | One of the values listed below.                                                                                                                                                   |
| `scope`                 | string         | yes      | JsonPointer-style path into `schema.ts`. Use [`getScope`](/api/forms/getscope/) to build it from a typed dot-path.                                                                |
| `rule`                  | object         | no       | Conditional show/hide/enable/disable. JsonForms [rule shape](https://jsonforms.io/docs/uischema/rules/). See [Conditional fields](/guides/add-a-custom-node/#conditional-fields). |
| `errorIndicatorEnabled` | boolean        | no       | Default `true`. Set to `false` to suppress the per-field error icon.                                                                                                              |

Type-specific props are listed under each control below.

## `Text`

Single-line text input, bound to a `string` property.

| Prop          | Type   | Required | Notes                                                                          |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `inputType`   | string | no       | HTML input type (e.g. `'email'`, `'url'`, `'password'`). Defaults to `'text'`. |
| `placeholder` | string | no       | Empty-state hint.                                                              |

```ts
{ type: 'Text', scope: '#/properties/label', placeholder: 'Node title' }
```

## `TextArea`

Multi-line text input, bound to a `string` property.

| Prop          | Type   | Required | Notes                                       |
| ------------- | ------ | -------- | ------------------------------------------- |
| `placeholder` | string | no       | Empty-state hint.                           |
| `minRows`     | number | no       | Minimum visible rows before scroll appears. |

```ts
{ type: 'TextArea', scope: '#/properties/description', minRows: 3 }
```

## `Switch`

On/off toggle, bound to a `boolean` property.

```ts
{ type: 'Switch', scope: '#/properties/retryOnFailure' }
```

## `Select`

Dropdown picker, bound to a `string` property. Options come from the property's `options` array in `schema.ts`:

```ts
// schema.ts
{
  method: {
    type: 'string',
    options: [
      { label: 'GET', value: 'GET' },
      { label: 'POST', value: 'POST' },
    ],
  },
}
```

```ts
// uischema.ts
{ type: 'Select', scope: '#/properties/method' }
```

## `DatePicker`

Calendar picker, bound to a date property. The schema field is declared as `type: 'string'` and serialised as an ISO 8601 string at the JSON layer, but the renderer receives — and the `handleChange` callback emits — a JavaScript `Date` object.

```ts
{ type: 'DatePicker', scope: '#/properties/scheduledFor' }
```

## `DynamicConditions`

Composer for an array of comparison rows — used in nodes that branch on upstream values. Each row is a [`DynamicCondition`](/api/forms/dynamiccondition/) with two operands, a [`ComparisonOperator`](/api/forms/comparisonoperator/), and a logical join (`'AND'` / `'OR'`).

The `x` and `y` operands accept literal strings or `{{nodes.<id>.<output>}}` placeholders that resolve against upstream node outputs at runtime.

```ts
// schema.ts
{
  conditions: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        x: { type: 'string' },
        y: { type: 'string' },
        comparisonOperator: { type: 'string' },
        logicalOperator: { type: 'string' },
      },
    },
  },
}
```

```ts
// uischema.ts
{ type: 'DynamicConditions', scope: '#/properties/conditions' }
```

## `DecisionBranches`

Composer for an array of named branches — used by decision-style nodes. Each branch has its own label, source handle, and a list of [`DynamicCondition`](/api/forms/dynamiccondition/) rows. Renders one collapsible panel per branch with full add / remove / reorder UI.

```ts
{ type: 'DecisionBranches', scope: '#/properties/branches' }
```

## `AiTools`

Repeater control for the `tools` array on AI-agent nodes — each row is `{ id, sourceHandle, tool, description, apiKey }`. Surface specific to the demo's AI-agent node; only relevant if you ship a similarly-shaped node type.

```ts
{ type: 'AiTools', scope: '#/properties/tools' }
```

## `VariableText`

Single-line text input that **also accepts `{{nodes.<id>.<output>}}` placeholders**. Renders an inline picker that suggests upstream node outputs as the user types `{{`. Bound to a `string` property.

| Prop          | Type   | Required | Notes             |
| ------------- | ------ | -------- | ----------------- |
| `placeholder` | string | no       | Empty-state hint. |

```ts
{ type: 'VariableText', scope: '#/properties/url', placeholder: 'https://...' }
```

## `VariableTextArea`

Multi-line variant of `VariableText`. Same `{{...}}` placeholder behaviour.

| Prop          | Type   | Required | Notes                                       |
| ------------- | ------ | -------- | ------------------------------------------- |
| `placeholder` | string | no       | Empty-state hint.                           |
| `minRows`     | number | no       | Minimum visible rows before scroll appears. |

```ts
{ type: 'VariableTextArea', scope: '#/properties/messageBody', minRows: 4 }
```

## `VariableDynamic`

Typed input that lets the user **either type a literal value or pick a single upstream variable**. A toggle button in the field switches between the two modes: the variable mode shows a select listing only upstream outputs whose type matches `variableType`, the manual mode shows a widget picked from `variableType`:

| `variableType`         | Manual widget                       | Saved value                                      |
| ---------------------- | ----------------------------------- | ------------------------------------------------ |
| `'string'`             | Text input with inline `{{` picker  | trimmed `string`, or `undefined` when empty      |
| `'number'`             | Text input with numeric validation  | `number`, or `undefined` when not a valid number |
| `'boolean'`            | True / False select                 | `boolean`, or `undefined` when unset             |
| `'date'`, `'datetime'` | Date picker (+ time for `datetime`) | ISO 8601 `string`                                |

Unlike `VariableText`, the stored value is either a typed literal or exactly one variable reference — `{{nodes.<id>.<output>}}` for an upstream node output or `{{global.<id>}}` for a global variable. Mixed text is not possible. The reference is always stored as a `string`, even when `variableType` is `'number'` or `'boolean'`. The variable toggle is hidden when no upstream output of a compatible type exists.

| Prop           | Type                                                        | Required | Notes                                                                                                                                                  |
| -------------- | ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `variableType` | `'string' \| 'number' \| 'boolean' \| 'date' \| 'datetime'` | yes      | Drives the manual widget, the value coercion on blur, and which upstream outputs are suggested (`string` also accepts `number` / `date` / `datetime`). |
| `placeholder`  | string                                                      | no       | Empty-state hint. Applies to the `string` / `number` widgets only.                                                                                     |

```ts
// schema.ts
{
  retries: { type: 'number' },
  untilDate: { type: 'string' },
}
```

```ts
// uischema.ts
{ type: 'VariableDynamic', scope: '#/properties/retries', variableType: 'number' }
{ type: 'VariableDynamic', scope: '#/properties/untilDate', variableType: 'date' }
```

## `MessageOnError`

Inline message that surfaces when a node-level validation error matches the `scope`. Renders nothing if there's no error on that property — useful for context-specific guidance ("A custom error message") next to the affected field.

| Prop   | Type   | Required | Notes                                                                                                 |
| ------ | ------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `text` | string | no       | Override the auto-derived error text. If omitted, the message comes from the validation error itself. |

```ts
{
  type: 'MessageOnError',
  scope: '#/properties/customError',
  text: 'A custom error message.',
}
```

## See also

- [Form overview](/node-schemas/form-overview/) — overview that pairs the UI layer with the data-schema layer
- [Form layouts](/node-schemas/form-layouts/) — containers that group these controls into a layout
- [Add a custom node](/guides/add-a-custom-node/) — full walk-through of authoring `schema.ts` + `uischema.ts`
- [Custom JsonForms control](/guides/custom-jsonforms-control/) — how to add element types not on this page
- [`UISchema`](/api/types/uischema/), [`getScope`](/api/forms/getscope/) — auto-generated type reference
