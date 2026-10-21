import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Unwrap withJsonFormsControlProps so props flow directly instead of from JSONForms context.
vi.mock('../../utils/rendering', () => ({
  createControlRenderer: (_type: string, renderer: unknown) => ({ tester: undefined, renderer }),
}));

const { textControlRenderer } = await import('./text-control');

function typeAndBlur(value: string, type: 'string' | 'number' = 'string') {
  const Control = textControlRenderer.renderer as unknown as React.ComponentType<Record<string, unknown>>;
  const handleChange = vi.fn();
  const { container } = render(
    <Control
      data={undefined}
      handleChange={handleChange}
      path="prefix"
      enabled={true}
      visible={true}
      errors=""
      schema={{ type }}
      uischema={{ type: 'Text', scope: '#/properties/prefix' }}
    />,
  );

  const input = container.querySelector('input')!;
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  return handleChange;
}

describe('TextControl', () => {
  it('keeps leading and trailing whitespace of a text value', () => {
    expect(typeAndBlur('query: ')).toHaveBeenCalledWith('prefix', 'query: ');
    expect(typeAndBlur('  indented')).toHaveBeenCalledWith('prefix', '  indented');
  });

  it('stores an empty or whitespace-only field as undefined', () => {
    expect(typeAndBlur('')).toHaveBeenCalledWith('prefix', undefined);
    expect(typeAndBlur('   ')).toHaveBeenCalledWith('prefix', undefined);
  });

  it('stores a number input as a number', () => {
    expect(typeAndBlur('42', 'number')).toHaveBeenCalledWith('prefix', 42);
  });
});
