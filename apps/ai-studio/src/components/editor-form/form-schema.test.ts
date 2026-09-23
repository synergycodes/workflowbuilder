import { describe, expect, it } from 'vitest';

import { isFormSchema, schemaFields } from './form-schema';

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
