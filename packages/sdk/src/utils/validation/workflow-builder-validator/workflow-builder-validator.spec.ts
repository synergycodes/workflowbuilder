import { describe, expect, it } from 'vitest';

import { workflowBuilderValidator } from './workflow-builder-validator';

const noteSchema = (note: object, required = true) => ({
  type: 'object',
  properties: { note },
  required: required ? ['note'] : [],
});

const check = (schema: object, data: unknown) => {
  const validate = workflowBuilderValidator.compile(schema);
  const valid = validate(data);
  return { valid, keywords: (validate.errors ?? []).map((error) => error.keyword) };
};

describe('workflowBuilderValidator blank text', () => {
  it.each(['', '   '])('should report a required string emptied to %j as missing', (blank) => {
    expect(check(noteSchema({ type: 'string' }), { note: blank })).toEqual({ valid: false, keywords: ['required'] });
  });

  it('should name the missing property the way jsonforms reads it', () => {
    const validate = workflowBuilderValidator.compile(noteSchema({ type: 'string' }));
    validate({ note: '' });

    expect(validate.errors?.[0]?.params).toEqual({ missingProperty: 'note' });
  });

  it('should accept blank text in an optional string', () => {
    expect(check(noteSchema({ type: 'string' }, false), { note: '' }).valid).toBe(true);
  });

  it.each(['', '   '])('should accept %j in a required string whose type lists null', (blank) => {
    expect(check(noteSchema({ type: ['string', 'null'] }), { note: blank }).valid).toBe(true);
  });

  it('should accept blank text where the type is null alone', () => {
    expect(check(noteSchema({ type: 'null' }), { note: '' }).valid).toBe(true);
  });

  it('should read blank text as null, so a format on the string type does not apply', () => {
    expect(check(noteSchema({ type: ['string', 'null'], format: 'email' }), { note: '' }).valid).toBe(true);
  });

  it('should still report a required nullable string when the key is absent', () => {
    expect(check(noteSchema({ type: ['string', 'null'] }), {})).toEqual({ valid: false, keywords: ['required'] });
  });

  it('should keep checking text with content in a nullable string', () => {
    expect(check(noteSchema({ type: ['string', 'null'], format: 'email' }), { note: 'bad' }).valid).toBe(false);
  });

  it('should read blank text inside a nested object as missing, so its format does not apply', () => {
    const schema = {
      type: 'object',
      properties: {
        schedule: { type: 'object', properties: { time: { type: 'string', format: 'time' } } },
      },
    };

    expect(check(schema, { schedule: { time: '' } }).valid).toBe(true);
    expect(check(schema, { schedule: { time: 'bad' } }).valid).toBe(false);
  });

  it('should accept a variable reference in a nested property with a format', () => {
    const schema = {
      type: 'object',
      properties: {
        schedule: { type: 'object', properties: { date: { type: 'string', format: 'date' } } },
      },
    };

    expect(check(schema, { schedule: { date: '{{global.deadline}}' } }).valid).toBe(true);
  });
});

const whenSchema = (type: string, required = true) => noteSchema({ type }, required);

describe('workflowBuilderValidator date, datetime and time types', () => {
  it('should accept a date string, a clock for time, and a variable reference', () => {
    expect(check(whenSchema('date'), { note: '2024-01-15' }).valid).toBe(true);
    expect(check(whenSchema('datetime'), { note: '2024-01-15T09:07' }).valid).toBe(true);
    expect(check(whenSchema('time'), { note: '09:07:00+00:00' }).valid).toBe(true);
    expect(check(whenSchema('time'), { note: '{{global.deadline}}' }).valid).toBe(true);
  });

  it('should report a value that is not a date and name the property', () => {
    const validate = workflowBuilderValidator.compile(whenSchema('date'));

    expect(validate({ note: 'not a date' })).toBe(false);
    expect(validate.errors?.[0]).toMatchObject({ instancePath: '/note', keyword: 'type' });
    expect(check(whenSchema('date'), { note: 5 }).valid).toBe(false);
    expect(check(whenSchema('date'), { note: '5' }).valid).toBe(false);
    expect(check(whenSchema('date'), { note: '2024-02-30' }).valid).toBe(false);
    expect(check(whenSchema('time'), { note: '25:99' }).valid).toBe(false);
  });

  it('should report a missing required date through the standard required keyword', () => {
    expect(check(whenSchema('date'), {})).toEqual({ valid: false, keywords: ['required'] });
    expect(check(whenSchema('date', false), {}).valid).toBe(true);
  });
});
