import type { JsonSchema7 } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import { getJsonSchemaIfValid } from './get-json-schema-if-valid';

const objectSchema: JsonSchema7 = {
  type: 'object',
  title: 'Refund review',
  description: 'Structured decision',
  required: ['decision'],
  properties: {
    decision: { type: 'string', title: 'Decision', description: 'Approve or reject' },
    amount: { type: 'number' },
    reviewedAt: { type: 'string', format: 'date-time' },
    customer: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
    },
  },
};

describe('getJsonSchemaIfValid', () => {
  it('should return the schema when every read keyword is well formed', () => {
    expect(getJsonSchemaIfValid(objectSchema)).toBe(objectSchema);
  });

  it('should accept an empty schema', () => {
    const schema = {};

    expect(getJsonSchemaIfValid(schema)).toBe(schema);
  });

  it('should accept a primitive schema', () => {
    const schema = { type: 'string' };

    expect(getJsonSchemaIfValid(schema)).toBe(schema);
  });

  it('should accept type given as a list of types', () => {
    const schema = { type: ['string', 'null'] };

    expect(getJsonSchemaIfValid(schema)).toBe(schema);
  });

  it('should accept items given as a schema or a tuple of schemas', () => {
    const single = { type: 'array', items: { type: 'string' } };
    const tuple = { type: 'array', items: [{ type: 'string' }, { type: 'number' }] };

    expect(getJsonSchemaIfValid(single)).toBe(single);
    expect(getJsonSchemaIfValid(tuple)).toBe(tuple);
  });

  it('should accept keywords it does not read', () => {
    const schema = { $schema: 'http://json-schema.org/draft-07/schema#', type: 'number', minimum: 0, enum: [1, 2] };

    expect(getJsonSchemaIfValid(schema)).toBe(schema);
  });

  it('should reject non-object values', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(getJsonSchemaIfValid(undefined)).toBeUndefined();
    expect(getJsonSchemaIfValid(null)).toBeUndefined();
    expect(getJsonSchemaIfValid('object')).toBeUndefined();
    expect(getJsonSchemaIfValid(1)).toBeUndefined();
    expect(getJsonSchemaIfValid([objectSchema])).toBeUndefined();
  });

  it('should reject a malformed type', () => {
    expect(getJsonSchemaIfValid({ type: 1 })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: null })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: { name: 'string' } })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: ['string', 1] })).toBeUndefined();
  });

  it('should reject non-string title, description or format', () => {
    expect(getJsonSchemaIfValid({ title: 1 })).toBeUndefined();
    expect(getJsonSchemaIfValid({ description: null })).toBeUndefined();
    expect(getJsonSchemaIfValid({ format: ['date-time'] })).toBeUndefined();
  });

  it('should reject a malformed required list', () => {
    expect(getJsonSchemaIfValid({ required: 'decision' })).toBeUndefined();
    expect(getJsonSchemaIfValid({ required: ['decision', 1] })).toBeUndefined();
  });

  it('should reject properties that are not an index of schemas', () => {
    expect(getJsonSchemaIfValid({ type: 'object', properties: null })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: 'object', properties: 'decision' })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: 'object', properties: [{ type: 'string' }] })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: 'object', properties: { decision: 'string' } })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: 'object', properties: { decision: null } })).toBeUndefined();
  });

  it('should reject a malformed schema nested in properties', () => {
    const schema = {
      type: 'object',
      properties: {
        customer: {
          type: 'object',
          properties: {
            id: { type: 1 },
          },
        },
      },
    };

    expect(getJsonSchemaIfValid(schema)).toBeUndefined();
  });

  it('should reject malformed items', () => {
    expect(getJsonSchemaIfValid({ type: 'array', items: 'string' })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: 'array', items: null })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: 'array', items: [{ type: 'string' }, 'number'] })).toBeUndefined();
    expect(getJsonSchemaIfValid({ type: 'array', items: { type: 'string', title: 1 } })).toBeUndefined();
  });
});
