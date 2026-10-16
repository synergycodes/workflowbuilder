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
});
