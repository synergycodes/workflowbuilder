import type { JsonSchema7 } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import { getFlattenedPropertiesFromJsonSchema7 } from './get-flattened-properties-from-json-schema-7';

// `$defs` is draft 2019-09+, so it is outside the JsonSchema7 type; cast once here.
const withDefs = (schema: JsonSchema7, $defs: Record<string, JsonSchema7>): JsonSchema7 =>
  ({ ...schema, $defs }) as JsonSchema7;

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

  describe('$ref', () => {
    it('resolves `#/$defs/...` and `#/definitions/...` and lets one definition serve several properties', () => {
      const result = getFlattenedPropertiesFromJsonSchema7(
        withDefs(
          {
            $id: 'https://example.com/schemas/customer',
            type: 'object',
            properties: {
              first_name: { $ref: '#/$defs/name' },
              last_name: { $ref: '#/$defs/name' },
              age: { $ref: '#/definitions/age' },
            },
            required: ['first_name', 'last_name'],
            definitions: { age: { type: 'number', title: 'Age' } },
          },
          { name: { type: 'string', title: 'Name' } },
        ),
      );

      expect(result).toEqual({
        first_name: { type: 'string', label: 'Name', description: '' },
        last_name: { type: 'string', label: 'Name', description: '' },
        age: { type: 'number', label: 'Age', description: '' },
      });
    });

    it('lets title and description next to the $ref override the definition', () => {
      const result = getFlattenedPropertiesFromJsonSchema7(
        withDefs(
          {
            type: 'object',
            properties: {
              first_name: { $ref: '#/$defs/name', title: 'First name', description: 'Given name' },
              last_name: { $ref: '#/$defs/name' },
            },
          },
          { name: { type: 'string', title: 'Name', description: 'A name' } },
        ),
      );

      expect(result.first_name).toEqual({ type: 'string', label: 'First name', description: 'Given name' });
      expect(result.last_name).toEqual({ type: 'string', label: 'Name', description: 'A name' });
    });

    it('flattens an object definition under the referencing property name', () => {
      const result = getFlattenedPropertiesFromJsonSchema7(
        withDefs(
          {
            type: 'object',
            properties: {
              shipping_address: { $ref: '#/$defs/address' },
              billing_address: { $ref: '#/$defs/address', title: 'Billing' },
            },
          },
          {
            address: {
              type: 'object',
              title: 'Address',
              properties: { city: { type: 'string', title: 'City' }, zip: { $ref: '#/$defs/zip' } },
            },
            zip: { type: 'string', title: 'ZIP' },
          },
        ),
      );

      expect(Object.keys(result)).toEqual([
        'shipping_address',
        'shipping_address.city',
        'shipping_address.zip',
        'billing_address',
        'billing_address.city',
        'billing_address.zip',
      ]);
      expect(result.shipping_address).toEqual({ type: 'object', label: 'Address', description: '' });
      expect(result.billing_address).toEqual({ type: 'object', label: 'Billing', description: '' });
      expect(result['billing_address.zip']).toEqual({ type: 'string', label: 'ZIP', description: '' });
    });

    it('follows a chain of $refs', () => {
      const result = getFlattenedPropertiesFromJsonSchema7(
        withDefs(
          { type: 'object', properties: { code: { $ref: '#/$defs/alias' } } },
          { alias: { $ref: '#/$defs/base', title: 'Alias' }, base: { type: 'string', title: 'Base' } },
        ),
      );

      expect(result).toEqual({ code: { type: 'string', label: 'Alias', description: '' } });
    });

    it('skips properties whose $ref points outside the schema or at nothing', () => {
      const result = getFlattenedPropertiesFromJsonSchema7(
        withDefs(
          {
            type: 'object',
            properties: {
              shipping_address: { $ref: '/schemas/address' },
              remote: { $ref: 'https://example.com/schemas/address' },
              anchor: { $ref: '#address' },
              missing: { $ref: '#/$defs/nope' },
              ok: { $ref: '#/$defs/name' },
            },
          },
          { name: { type: 'string' } },
        ),
      );

      expect(Object.keys(result)).toEqual(['ok']);
    });

    it('stops at a recursive definition instead of looping', () => {
      const result = getFlattenedPropertiesFromJsonSchema7(
        withDefs(
          { type: 'object', properties: { tree: { $ref: '#/$defs/node' }, self: { $ref: '#' } } },
          {
            node: {
              type: 'object',
              properties: { value: { type: 'string' }, child: { $ref: '#/$defs/node' } },
            },
          },
        ),
      );

      expect(Object.keys(result)).toEqual(['tree', 'tree.value', 'self', 'self.tree', 'self.tree.value']);
    });

    it('resolves a $ref on the root schema', () => {
      const result = getFlattenedPropertiesFromJsonSchema7(
        withDefs(
          { $ref: '#/$defs/customer' },
          {
            customer: { type: 'object', properties: { name: { type: 'string' } } },
          },
        ),
      );

      expect(result).toEqual({ name: { type: 'string', label: '', description: '' } });
    });

    it('decodes JSON Pointer escapes in the $ref', () => {
      const result = getFlattenedPropertiesFromJsonSchema7(
        withDefs(
          { type: 'object', properties: { a: { $ref: '#/$defs/a~1b' }, b: { $ref: '#/$defs/c%20d' } } },
          { 'a/b': { type: 'string' }, 'c d': { type: 'number' } },
        ),
      );

      expect(result.a.type).toBe('string');
      expect(result.b.type).toBe('number');
    });
  });
});
