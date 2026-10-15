import { describe, expect, it } from 'vitest';

import type { DecisionField } from '../types';
import { getFieldsSchema } from './get-fields-schema';

function field(type: string, reference = `{{nodes.a.output.${type}}}`, label = type): DecisionField {
  return { type, reference, label, value: undefined };
}

describe('getFieldsSchema', () => {
  it('returns an empty object schema for no fields', () => {
    expect(getFieldsSchema([])).toEqual({ type: 'object', properties: {}, required: [] });
  });

  it('maps primitive fields to required properties keyed by reference', () => {
    const fields = [
      field('string', '{{nodes.a.output.name}}', 'Name'),
      field('number', '{{nodes.a.output.amount}}', 'Amount'),
      field('boolean', '{{nodes.a.output.approved}}', 'Approved'),
    ];

    expect(getFieldsSchema(fields)).toEqual({
      type: 'object',
      properties: {
        '{{nodes.a.output.name}}': { type: 'string', title: 'Name' },
        '{{nodes.a.output.amount}}': { type: 'number', title: 'Amount' },
        '{{nodes.a.output.approved}}': { type: 'boolean', title: 'Approved' },
      },
      required: ['{{nodes.a.output.name}}', '{{nodes.a.output.amount}}', '{{nodes.a.output.approved}}'],
    });
  });

  it.each(['object', 'array', 'date', 'datetime', 'unknown'])('drops a %s field', (type) => {
    const schema = getFieldsSchema([field('string'), field(type)]);

    expect(Object.keys(schema.properties ?? {})).toEqual(['{{nodes.a.output.string}}']);
    expect(schema.required).toEqual(['{{nodes.a.output.string}}']);
  });

  it('keeps field order', () => {
    const fields = [field('boolean'), field('object'), field('string'), field('number')];

    expect(getFieldsSchema(fields).required).toEqual([
      '{{nodes.a.output.boolean}}',
      '{{nodes.a.output.string}}',
      '{{nodes.a.output.number}}',
    ]);
  });
});
