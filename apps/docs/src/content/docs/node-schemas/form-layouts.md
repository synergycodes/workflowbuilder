---
title: Form layouts
description: Container element types that arrange child elements — VerticalLayout, HorizontalLayout, Group, Accordion. Plus the two text-only label types.
sidebar:
  order: 5
---

Layouts are container elements that group child elements into a visual structure. Unlike [controls](/node-schemas/form-controls/), they don't bind to a property — they just arrange other elements.

Every layout accepts:

| Prop       | Type           | Required | Notes                                                                                                                                                                                     |
| ---------- | -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`     | string literal | yes      | One of `'VerticalLayout'`, `'HorizontalLayout'`, `'Group'`, `'Accordion'`.                                                                                                                |
| `elements` | `UISchema[]`   | yes      | Child elements rendered inside this container. Can be controls, other layouts, or labels. (`UISchema` is the alias re-exported from the barrel; internally `UISchema = UISchemaElement`.) |
| `rule`     | object         | no       | Conditional show/hide/enable/disable. JsonForms [rule shape](https://jsonforms.io/docs/uischema/rules/). See [Conditional fields](/guides/add-a-custom-node/#conditional-fields).         |

Type-specific props are listed under each layout below.

## `VerticalLayout`

Stacks children top-to-bottom. The default container — most uischemas wrap their root in `VerticalLayout`.

```ts
{
  type: 'VerticalLayout',
  elements: [
    { type: 'Text', scope: '#/properties/label' },
    { type: 'Text', scope: '#/properties/url' },
    { type: 'Switch', scope: '#/properties/retryOnFailure' },
  ],
}
```

## `HorizontalLayout`

Arranges children left-to-right in a CSS grid row.

| Prop            | Type   | Required | Notes                                                                                                                                                                                        |
| --------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layoutColumns` | string | no       | CSS `grid-auto-columns` value — controls each child's width. Examples: `'1fr 2fr'` (first child half the width of the second), `'100px 1fr'`, `'auto'` (default — children size themselves). |

```ts
{
  type: 'HorizontalLayout',
  layoutColumns: '1fr 1fr',
  elements: [
    { type: 'Text', scope: '#/properties/firstName' },
    { type: 'Text', scope: '#/properties/lastName' },
  ],
}
```

## `Group`

Rendered as a labeled section with a header and a border around its children. Use it to visually group related fields.

| Prop    | Type   | Required | Notes                            |
| ------- | ------ | -------- | -------------------------------- |
| `label` | string | yes      | Section header shown at the top. |

```ts
{
  type: 'Group',
  label: 'Authentication',
  elements: [
    { type: 'Text', scope: '#/properties/username' },
    { type: 'Text', scope: '#/properties/password', inputType: 'password' },
  ],
}
```

## `Accordion`

Collapsible labeled section — header + chevron, body hidden by default. Useful for advanced or rarely-used fields that shouldn't crowd the default property panel view.

| Prop    | Type   | Required | Notes                                         |
| ------- | ------ | -------- | --------------------------------------------- |
| `label` | string | yes      | Header text shown next to the expand chevron. |

```ts
{
  type: 'Accordion',
  label: 'Advanced',
  elements: [
    { type: 'Switch', scope: '#/properties/debugMode' },
    { type: 'TextArea', scope: '#/properties/customHeaders', minRows: 3 },
  ],
}
```

## Labels

Text-only elements that don't bind to a property. Use them when the property panel needs a heading, divider, or static guidance.

### `Label`

Plain text label — uses the editor's default body styling.

| Prop       | Type     | Required | Notes                                                                                          |
| ---------- | -------- | -------- | ---------------------------------------------------------------------------------------------- |
| `text`     | string   | yes      | The label text.                                                                                |
| `required` | boolean  | no       | Append a `*` to indicate the following section contains required fields.                       |
| `size`     | ItemSize | no       | Visual size — `'small'`, `'medium'` (default), `'large'`. Type re-exported from `overflow-ui`. |

```ts
{ type: 'Label', text: 'Connection details' }
```

### `RichText`

Same as `Label`, but renders Markdown — bold, italics, inline links. Useful for short instructional copy that needs formatting.

| Prop       | Type     | Required | Notes                      |
| ---------- | -------- | -------- | -------------------------- |
| `text`     | string   | yes      | Markdown source.           |
| `required` | boolean  | no       | Same semantics as `Label`. |
| `size`     | ItemSize | no       | Same semantics as `Label`. |

```ts
{
  type: 'RichText',
  text: 'See the [authentication guide](https://example.com/auth) for setup steps.',
}
```

## Combining layouts

Layouts nest freely — a typical uischema is a `VerticalLayout` at the root with `Accordion`s for advanced sections and `HorizontalLayout`s for paired fields:

```ts
{
  type: 'VerticalLayout',
  elements: [
    { type: 'Text', scope: '#/properties/label' },
    {
      type: 'HorizontalLayout',
      elements: [
        { type: 'Text', scope: '#/properties/firstName' },
        { type: 'Text', scope: '#/properties/lastName' },
      ],
    },
    {
      type: 'Accordion',
      label: 'Advanced',
      elements: [
        { type: 'Switch', scope: '#/properties/debugMode' },
        { type: 'TextArea', scope: '#/properties/customHeaders', minRows: 3 },
      ],
    },
  ],
}
```

## See also

- [Form overview](/node-schemas/form-overview/) — overview that pairs the UI layer with the data-schema layer
- [Form controls](/node-schemas/form-controls/) — input fields placed inside these layouts
- [Add a custom node](/guides/add-a-custom-node/) — full walk-through of authoring `schema.ts` + `uischema.ts`
- [`UISchema`](/api/types/uischema/) — auto-generated type reference
