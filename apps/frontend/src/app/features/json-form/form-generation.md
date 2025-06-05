# Dynamic properties sidebar

## Introduction

To easily create new node types with their specific properties, we've implemented a JSONForms based component rendered on the properties sidebar. It allows us to do node customizations simply by changing their JSON configurations. Settings of individual nodes use `PaletteItem` type and are by default defined on the backend. Sample definitions can be found in `apps/backend/src/diagram/data/mocks/mocked.data.ts`.

## Schema

To define the shape of node data we use JSONSchema-based API. Thanks to it we can declare what type the properties have, whether they're required and how should be validated.
`PaletteItem['schema']` has to contain `title` and `subtitle` as they're default properties for all nodes.

_Example:_

```typescriptreact
export const exampleNode: PaletteItem = {
  // ...
  schema: {
    properties: {
      title: {
        type: 'string',
      },
      subtitle: {
        type: 'string',
      },
      age: {
        type: 'number',
        minimum: 1,
        multipleOf: 1,
        maximum: 100,
      },
    },
    required: ['firstName', 'secondName'],
  },
};
```

See [JSONSchema spec](https://json-schema.org/) for more information.

## UISchema

UISchema describes visual aspects of a form and informs how data should be mapped to UI components.
The core parts of UISchema are `controls`, `layouts` and `rules`.

### Controls (`./controls`)

Controls are the building blocks of the form. It's a collection of all relevant UI components available in the JSONForm - most of them will be various types of inputs.
To add a new control follow these steps:

- In `./types/controls` Define types for the new control - the UISchema element and control props:

```typescriptreact
export type TextControlElement = Override<
  ControlElement,
  {
    type: 'Text';
    inputType?: string;
  } & Pick<InputProps, 'placeholder'>
>;
export type TextControlProps = ControlProps<string, TextControlElement>;
```

- In `./controls` create a file with a control component. Use `<ControlWrapper />` to handle shared control logic.

```typescriptreact
const TextControl = (props: TextControlProps) => {
  //...

  return (
    <ControlWrapper {...props}>
      <Input // ... />
    </ControlWrapper>
  );
};
```

- Use `createControlRenderer()` to create a renderer to be consumed by JSONForms library. Remember to include it renderers array in `./json-form`.

```typescriptreact
// ./controls/text-control.tsx
export const textControlRenderer = createControlRenderer('Text', TextControl);

// ./json-form.tsx
const renderers: JsonFormsRendererRegistryEntry[] = [
  // ...,
  textControlRenderer,
];
```

- Now you should be able to use the new control in UISchema. To map a data property to a control use the `scope` property.

```typescript
export const exampleNode: PaletteItem =
  {
    // ...
    uischema: {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Accordion',
          label: 'General information',
          elements: [
            // Usage of the new control
            {
              label: 'Description',
              type: 'Text',
              scope: '#/properties/description',
              placeholder: 'Type your description here...',
            },
          ],
        },
    },
};
```

### Layouts (`./layouts`)

Layouts are basically containers meant to group and display inner elements.
To add a new layout follow these steps:

- In `./types/layouts` create a new UISchema type for a layout

```typescriptreact
export type AccordionLayoutElement = Override<
  BaseLayoutElement,
  {
    label: string;
    type: 'Accordion';
  }
>;
```

- In `./layouts` create a file with a layout component. Use `<LayoutWrapper />` to handle shared control logic and `renderElements()` helper to display children.

```typescriptreact
const AccordionLayout = (props: LayoutProps<AccordionLayoutElement>) => {
  const { uischema } = props;

  return (
    <LayoutWrapper {...props}>
      <Accordion label={uischema.label}>
        <div className={styles['accordion-content']}>
          {renderElements(props)}
        </div>
      </Accordion>
    </LayoutWrapper>
  );
};
```

- Use `createLayoutRenderer()` to create a renderer and include it in renderers array along with controls.

### Rules

Rules are used to dynamically toggle visibility of form elements and make them disabled or enabled.
This part of JSONForms library is used as it is. Get to know more in [official documentation](https://jsonforms.io/docs/uischema/rules).
