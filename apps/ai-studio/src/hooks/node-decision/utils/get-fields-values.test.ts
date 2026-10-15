import { describe, expect, it } from 'vitest';

import type { DecisionField } from '../types';
import { getFieldsValues } from './get-fields-values';

function field(value: unknown, reference = '{{nodes.a.output.x}}'): DecisionField {
  return { type: typeof value, reference, label: reference, value };
}

describe('getFieldsValues', () => {
  it('returns an empty object for no fields', () => {
    expect(getFieldsValues([])).toEqual({});
  });

  it('maps primitive values keyed by reference', () => {
    const fields = [
      field('Alice', '{{nodes.a.output.name}}'),
      field(42, '{{nodes.a.output.amount}}'),
      field(false, '{{nodes.a.output.approved}}'),
      field(0, '{{nodes.a.output.zero}}'),
      field('', '{{nodes.a.output.empty}}'),
    ];

    expect(getFieldsValues(fields)).toEqual({
      '{{nodes.a.output.name}}': 'Alice',
      '{{nodes.a.output.amount}}': 42,
      '{{nodes.a.output.approved}}': false,
      '{{nodes.a.output.zero}}': 0,
      '{{nodes.a.output.empty}}': '',
    });
  });

  it.each([
    ['array', [1, 2]],
    ['object', { a: 1 }],
    ['null', null],
    ['undefined', undefined],
    ['date', new Date(0)],
  ])('drops a field with %s value', (_, value) => {
    const fields = [field('kept', '{{nodes.a.output.kept}}'), field(value, '{{nodes.a.output.dropped}}')];

    expect(getFieldsValues(fields)).toEqual({ '{{nodes.a.output.kept}}': 'kept' });
  });

  it('keeps the last value for a duplicated reference', () => {
    const fields = [field('first'), field('second')];

    expect(getFieldsValues(fields)).toEqual({ '{{nodes.a.output.x}}': 'second' });
  });
});
