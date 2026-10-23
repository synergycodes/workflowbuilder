import type { JsonSchema7 } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import { getFlattenedPropertiesFromJsonSchema7 } from './get-flattened-properties-from-json-schema-7';

describe('getFlattenedPropertiesFromJsonSchema7', () => {
  it.each<JsonSchema7>([{}, { type: 'string' }, { type: 'array', items: { type: 'string' } }])(
    'returns an empty index for a non-object root schema: %j',
    (schema) => {
      expect(getFlattenedPropertiesFromJsonSchema7(schema)).toEqual({});
    },
  );

  it('returns an empty index for an object schema without properties', () => {
    expect(getFlattenedPropertiesFromJsonSchema7({ type: 'object' })).toEqual({});
  });

  it('maps flat primitive properties with title and description', () => {
    const result = getFlattenedPropertiesFromJsonSchema7({
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name', description: 'Full name' },
        age: { type: 'number', title: 'Age' },
        active: { type: 'boolean' },
      },
    });

    expect(result).toEqual({
      name: { type: 'string', label: 'Name', description: 'Full name' },
      age: { type: 'number', label: 'Age', description: '' },
      active: { type: 'boolean', label: '', description: '' },
    });
  });

  it('maps a string with date-time format to datetime and keeps other formats as string', () => {
    const result = getFlattenedPropertiesFromJsonSchema7({
      type: 'object',
      properties: {
        createdAt: { type: 'string', format: 'date-time' },
        birthday: { type: 'string', format: 'date' },
        email: { type: 'string', format: 'email' },
      },
    });

    expect(result.createdAt.type).toBe('datetime');
    expect(result.birthday.type).toBe('string');
    expect(result.email.type).toBe('string');
  });

  it('keeps the object entry and flattens its children with dotted names', () => {
    const result = getFlattenedPropertiesFromJsonSchema7({
      type: 'object',
      properties: {
        address: {
          type: 'object',
          title: 'Address',
          properties: {
            city: { type: 'string', title: 'City' },
            geo: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
            },
          },
        },
      },
    });

    expect(Object.keys(result)).toEqual([
      'address',
      'address.city',
      'address.geo',
      'address.geo.lat',
      'address.geo.lng',
    ]);
    expect(result.address).toEqual({ type: 'object', label: 'Address', description: '' });
    expect(result['address.city']).toEqual({ type: 'string', label: 'City', description: '' });
    expect(result['address.geo.lat'].type).toBe('number');
  });

  it('keeps an array entry without descending into its items', () => {
    const result = getFlattenedPropertiesFromJsonSchema7({
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          title: 'Tags',
          items: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    });

    expect(result).toEqual({ tags: { type: 'array', label: 'Tags', description: '' } });
  });

  it('skips properties whose type is not a supported variable type', () => {
    const result = getFlattenedPropertiesFromJsonSchema7({
      type: 'object',
      properties: {
        count: { type: 'integer' },
        nothing: { type: 'null' },
        nullable: { type: ['string', 'null'] },
        untyped: { title: 'No type' },
        ok: { type: 'string' },
      },
    });

    expect(Object.keys(result)).toEqual(['ok']);
  });

  it('keeps an object entry even when it declares no properties', () => {
    const result = getFlattenedPropertiesFromJsonSchema7({
      type: 'object',
      properties: { meta: { type: 'object' } },
    });

    expect(result).toEqual({ meta: { type: 'object', label: '', description: '' } });
  });
});
