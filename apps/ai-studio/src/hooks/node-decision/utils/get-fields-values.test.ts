import { describe, expect, it } from 'vitest';

import type { DecisionField } from '../types';
import { getFieldsValues } from './get-fields-values';

function field(value: unknown, reference = '{{nodes.a.x}}'): DecisionField {
  return { type: typeof value, reference, label: reference, value };
}

describe('getFieldsValues', () => {
  it('returns an empty object for no fields', () => {
    expect(getFieldsValues([])).toEqual({});
  });

  it('maps primitive values keyed by the field key', () => {
    const fields = [
      field('Alice', '{{nodes.a.name}}'),
      field(42, '{{nodes.a.amount}}'),
      field(false, '{{nodes.a.approved}}'),
      field(0, '{{nodes.a.zero}}'),
      field('', '{{nodes.a.empty}}'),
    ];

    expect(getFieldsValues(fields)).toEqual({
      'nodes/a/name': 'Alice',
      'nodes/a/amount': 42,
      'nodes/a/approved': false,
      'nodes/a/zero': 0,
      'nodes/a/empty': '',
    });
  });

  it.each([
    ['array', [1, 2]],
    ['object', { a: 1 }],
    ['null', null],
    ['undefined', undefined],
    ['date', new Date(0)],
  ])('drops a field with %s value', (_, value) => {
    const fields = [field('kept', '{{nodes.a.kept}}'), field(value, '{{nodes.a.dropped}}')];

    expect(getFieldsValues(fields)).toEqual({ 'nodes/a/kept': 'kept' });
  });

  it('drops a field whose reference is not one variable', () => {
    expect(getFieldsValues([field('x', '{{nodes.a.x}} {{nodes.a.y}}')])).toEqual({});
  });

  it('keeps the last value for a duplicated reference', () => {
    const fields = [field('first'), field('second')];

    expect(getFieldsValues(fields)).toEqual({ 'nodes/a/x': 'second' });
  });
});
