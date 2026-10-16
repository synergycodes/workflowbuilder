import { describe, expect, it } from 'vitest';

// The real builder, not a copy, as in ../../../utils/human-decision/decision-values.test.ts.
import { editableFieldsSchema } from '../../../../../backend/src/domain/decision/editable-fields-schema';
import type { DecisionField } from '../types';
import { getFieldPicks } from './get-field-picks';
import { getFieldsSchema } from './get-fields-schema';

function field(type: string, reference = `{{nodes.a.${type}}}`, label = type): DecisionField {
  return { type, reference, label, value: undefined };
}

describe('getFieldsSchema', () => {
  it('returns an empty object schema for no fields', () => {
    expect(getFieldsSchema([])).toEqual({ type: 'object', properties: {}, required: [] });
  });

  it('maps primitive fields to required properties keyed by the field key', () => {
    const fields = [
      field('string', '{{nodes.a.name}}', 'Name'),
      field('number', '{{nodes.a.amount}}', 'Amount'),
      field('boolean', '{{nodes.a.approved}}', 'Approved'),
    ];

    expect(getFieldsSchema(fields)).toEqual({
      type: 'object',
      properties: {
        'nodes/a/name': { type: 'string', title: 'Name' },
        'nodes/a/amount': { type: 'number', title: 'Amount' },
        'nodes/a/approved': { type: 'boolean', title: 'Approved' },
      },
      required: ['nodes/a/name', 'nodes/a/amount', 'nodes/a/approved'],
    });
  });

  it.each(['date', 'datetime'])('maps a %s field to text', (type) => {
    expect(getFieldsSchema([field(type)]).properties).toEqual({ [`nodes/a/${type}`]: { type: 'string', title: type } });
  });

  it.each(['object', 'array', 'unknown'])('drops a %s field', (type) => {
    const schema = getFieldsSchema([field('string'), field(type)]);

    expect(Object.keys(schema.properties ?? {})).toEqual(['nodes/a/string']);
    expect(schema.required).toEqual(['nodes/a/string']);
  });

  it('drops a field whose reference is not one variable', () => {
    const schema = getFieldsSchema([field('string', '{{nodes.a.x}} {{nodes.a.y}}'), field('number')]);

    expect(Object.keys(schema.properties ?? {})).toEqual(['nodes/a/number']);
  });

  it('keeps field order', () => {
    const fields = [field('boolean'), field('object'), field('string'), field('number')];

    expect(getFieldsSchema(fields).required).toEqual(['nodes/a/boolean', 'nodes/a/string', 'nodes/a/number']);
  });
});

describe('getFieldsSchema against the backend builder', () => {
  // Every reference shape the SDK's parser decides on, every pick type, and entries that are not picks.
  const editableFields: unknown[] = [
    { label: 'Refund amount', reference: '{{nodes.draft-1.refundAmount}}', type: 'number' },
    { label: 'Reply', reference: 'nodes.draft-1.replyDraft', type: 'string' },
    { label: 'Expedite', reference: '  {{nodes.draft-1.expedite}}  ', type: 'boolean' },
    { label: 'Order date', reference: '{{nodes.draft-1.orderDate}}', type: 'date' },
    { label: 'Due', reference: '{{nodes.draft-1.due}}', type: 'datetime' },
    { label: 'Tags', reference: '{{nodes.draft-1.tags}}', type: 'array' },
    { label: 'Customer', reference: '{{nodes.draft-1.customer}}', type: 'object' },
    { label: 'Unknown type', reference: '{{nodes.draft-1.other}}', type: 'unknown' },
    ...[
      '{{a}} {{b}}',
      '{{a}}{{b}}',
      '{{a}} text',
      'text {{a}}',
      '{{a}}x',
      '{{a b}}',
      'a b',
      '{{a',
      'a}}',
      '{',
      '   ',
    ].map((reference) => ({ label: reference, reference, type: 'string' })),
    null,
    'text',
    { label: 'No reference', type: 'string' },
    { label: 'Second amount', reference: '{{nodes.draft-1.refundAmount}}', type: 'number' },
  ];

  it('declares the same fields, keys, types and order for the same editableFields', () => {
    const fields = getFieldPicks(editableFields).map((pick) => ({ ...pick, value: undefined }));

    expect(editableFieldsSchema(editableFields)).toEqual(getFieldsSchema(fields));
  });
});
