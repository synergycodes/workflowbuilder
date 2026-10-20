import { describe, expect, it } from 'vitest';

import { editableFieldsSchema, fieldKeyOf } from './editable-fields-schema';

function pick(type: string, reference = `{{nodes.a.${type}}}`, label = type) {
  return { label, reference, type };
}

describe('fieldKeyOf', () => {
  it.each([
    ['{{nodes.draft-1.output.refundAmount}}', 'nodes/draft-1/output/refundAmount'],
    ['global.total', 'global/total'],
    ['  {{global.total}}  ', 'global/total'],
    ['  global.total  ', 'global/total'],
    ['{{a}}', 'a'],
  ])('turns %j into %j', (reference, key) => {
    expect(fieldKeyOf(reference)).toBe(key);
  });

  it.each([
    '',
    '   ',
    '{{a}} {{b}}',
    '{{a}}{{b}}',
    '{{a}} text',
    'text {{a}}',
    '{{a}}x',
    '{{a b}}',
    'a b',
    '{{ Label · output }}',
    '{{a',
    'a}}',
    '{',
  ])('is undefined for %j, which is not one reference', (reference) => {
    expect(fieldKeyOf(reference)).toBeUndefined();
  });
});

describe('editableFieldsSchema', () => {
  const empty = { type: 'object', properties: {}, required: [] };

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an object', { label: 'x' }],
    ['a string', 'amount'],
    ['no picks', []],
  ])('is an empty object schema for %s', (_name, value) => {
    expect(editableFieldsSchema(value)).toEqual(empty);
  });

  it('maps primitive picks to required properties keyed by the field key', () => {
    const picks = [
      pick('string', '{{nodes.a.name}}', 'Name'),
      pick('number', '{{nodes.a.amount}}', 'Amount'),
      pick('boolean', '{{nodes.a.approved}}', 'Approved'),
    ];

    expect(editableFieldsSchema(picks)).toEqual({
      type: 'object',
      properties: {
        'nodes/a/name': { type: 'string', title: 'Name' },
        'nodes/a/amount': { type: 'number', title: 'Amount' },
        'nodes/a/approved': { type: 'boolean', title: 'Approved' },
      },
      required: ['nodes/a/name', 'nodes/a/amount', 'nodes/a/approved'],
    });
  });

  it.each(['date', 'datetime'])('maps a %s pick to text', (type) => {
    expect(editableFieldsSchema([pick(type)]).properties).toEqual({
      [`nodes/a/${type}`]: { type: 'string', title: type },
    });
  });

  it.each(['object', 'array', 'unknown'])('drops a %s pick', (type) => {
    expect(editableFieldsSchema([pick('string'), pick(type)]).required).toEqual(['nodes/a/string']);
  });

  it('drops a pick whose reference is not one variable, and an entry that is not a pick', () => {
    const entries = [
      pick('string', '{{nodes.a.x}} {{nodes.a.y}}'),
      null,
      'text',
      { label: 'No reference' },
      pick('number'),
    ];

    expect(editableFieldsSchema(entries).required).toEqual(['nodes/a/number']);
  });

  it('keeps pick order', () => {
    const picks = [pick('boolean'), pick('object'), pick('string'), pick('number')];

    expect(editableFieldsSchema(picks).required).toEqual(['nodes/a/boolean', 'nodes/a/string', 'nodes/a/number']);
  });
});
