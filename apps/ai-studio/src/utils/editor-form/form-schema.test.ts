import { describe, expect, it } from 'vitest';

import { workflowBuilderValidator } from '../../../../../packages/sdk/src/utils/validation/workflow-builder-validator';
import { decodePointerSegment, encodePointerSegment, invalidFieldsOf, isFormSchema, schemaFields } from './form-schema';

describe('isFormSchema', () => {
  it('accepts an object schema with properties', () => {
    expect(isFormSchema({ type: 'object', properties: {} })).toBe(true);
  });

  it.each([
    ['no properties', { type: 'object' }],
    ['properties that are not an object', { properties: [] }],
    ['a string', 'schema'],
  ])('refuses %s', (_name, value) => {
    expect(isFormSchema(value)).toBe(false);
  });
});

describe('schemaFields', () => {
  it('lists each declared field with its declaration and drops a declaration that is not an object', () => {
    expect(schemaFields({ type: 'object', properties: { amount: { type: 'number' }, broken: 'number' } })).toEqual([
      ['amount', { type: 'number' }],
    ]);
  });

  it.each([
    ['no properties', { type: 'object' }],
    ['a value that is not a schema', 'schema'],
  ])('lists nothing for %s', (_name, value) => {
    expect(schemaFields(value)).toEqual([]);
  });
});

describe('encodePointerSegment and decodePointerSegment', () => {
  it('round-trip a key that JSON Pointer reserves characters in', () => {
    expect(encodePointerSegment('a/b~c')).toBe('a~1b~0c');
    expect(decodePointerSegment(encodePointerSegment('a/b~c'))).toBe('a/b~c');
  });
});

describe('invalidFieldsOf', () => {
  it('names the field an error points into, decoded', () => {
    expect(invalidFieldsOf([{ instancePath: '/a~1b/0', params: {} }])).toEqual(new Set(['a/b']));
  });

  it("names the field of each key the editor's validator reports percent-encoded", () => {
    const keys = ['reply draft', 'kwota_zł', '50%', 'a/b', 'a~b'];
    const field = { type: 'string', maxLength: 3 };
    const validate = workflowBuilderValidator.compile({
      type: 'object',
      properties: Object.fromEntries(keys.map((key) => [key, field])),
    });
    validate(Object.fromEntries(keys.map((key) => [key, 'too long'])));

    expect(invalidFieldsOf(validate.errors ?? undefined)).toEqual(new Set(keys));
  });

  it('names a missing required field from the error its parent object carries', () => {
    expect(invalidFieldsOf([{ instancePath: '', params: { missingProperty: 'refundAmount' } }])).toEqual(
      new Set(['refundAmount']),
    );
  });

  it('names the enclosing field when a nested object misses a required key', () => {
    expect(invalidFieldsOf([{ instancePath: '/address', params: { missingProperty: 'street' } }])).toEqual(
      new Set(['address']),
    );
  });

  it('names nothing for an error on the whole object, or for no errors', () => {
    expect(invalidFieldsOf([{ instancePath: '', params: {} }]).size).toBe(0);
    expect(invalidFieldsOf().size).toBe(0);
  });
});
