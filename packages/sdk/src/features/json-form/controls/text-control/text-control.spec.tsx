import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

import { workflowBuilderValidator } from '../../../../utils/validation/workflow-builder-validator';
import { textControlRenderer } from './text-control';

type Middleware = NonNullable<ComponentProps<typeof JsonForms>['middleware']>;

// JsonForms debounces `onChange`; the middleware sees each change as it happens.
function renderField(type: string) {
  const form: { data?: unknown } = {};
  const track: Middleware = (state, action, reduce) => {
    const next = reduce(state, action);
    form.data = next.data;
    return next;
  };
  render(
    <JsonForms
      schema={{ type: 'object', properties: { field: { type } } }}
      uischema={{ type: 'Text', scope: '#/properties/field' } as never}
      data={{}}
      renderers={[textControlRenderer]}
      ajv={workflowBuilderValidator}
      middleware={track}
    />,
  );
  return { input: screen.getByRole(type === 'string' ? 'textbox' : 'spinbutton'), form };
}

describe('TextControl', () => {
  it.each(['number', 'integer'])('hands a %s field over as a number', (type) => {
    const { input, form } = renderField(type);

    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.blur(input);

    expect(form.data).toEqual({ field: 42 });
  });

  it('hands a string field over as trimmed text', () => {
    const { input, form } = renderField('string');

    fireEvent.change(input, { target: { value: ' 42 ' } });
    fireEvent.blur(input);

    expect(form.data).toEqual({ field: '42' });
  });
});
