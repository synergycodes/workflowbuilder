import { type Schema, type ValidationResult, Validator } from '@cfworker/json-schema';
import { describe, expect, it } from 'vitest';

import { removeReferenceIsStringErrors } from './remove-reference-is-string-error';

const validate = (schema: Schema, data: unknown): ValidationResult => new Validator(schema, '7', false).validate(data);

const run = (schema: Schema, data: unknown) => removeReferenceIsStringErrors({ result: validate(schema, data), data });

const emailSchema: Schema = {
  type: 'object',
  properties: { to: { type: 'string', format: 'email' }, body: { type: 'string' } },
  required: ['to', 'body'],
};

const emailListSchema: Schema = {
  type: 'object',
  properties: { to: { type: 'array', items: { type: 'string', format: 'email' } } },
};

const numberSchema: Schema = {
  type: 'object',
  properties: { count: { type: 'number', minimum: 1 } },
};

const nestedObjectSchema: Schema = {
  type: 'object',
  properties: {
    config: {
      type: 'object',
      properties: {
        count: { type: 'number' },
        email: { type: 'string', format: 'email' },
        limits: { type: 'object', properties: { max: { type: 'number' } } },
      },
    },
    body: { type: 'string' },
  },
  required: ['body'],
};

const conditionalSchema: Schema = {
  type: 'object',
  allOf: [
    {
      if: { properties: { kind: { const: 'email' } } },
      // eslint-disable-next-line unicorn/no-thenable -- JSON Schema keyword, not a promise
      then: { properties: { to: { type: 'string', format: 'email' } }, required: ['to'] },
    },
  ],
};

describe('removeReferenceIsStringErrors', () => {
  it('should return a valid result untouched', () => {
    const data = { to: 'a@b.com', body: 'hi' };
    const result = validate(emailSchema, data);

    expect(removeReferenceIsStringErrors({ result, data })).toBe(result);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('should keep errors untouched for non-object data', () => {
    const result = validate(emailSchema, {});
    const errors = [...result.errors];

    expect(removeReferenceIsStringErrors({ result, data: undefined }).errors).toEqual(errors);
    expect(result.valid).toBe(false);
  });

  describe('string property', () => {
    it('should remove format error for a single variable reference and keep unrelated errors', () => {
      const result = run(emailSchema, { to: '{{global.email}}' });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.keyword)).toEqual(['required']);
      expect(result.errors[0].error).toContain('"body"');
    });

    it('should remove type error when a number field holds a variable reference', () => {
      const result = run(numberSchema, { count: '{{global.count}}' });

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should keep errors for a plain invalid string', () => {
      const result = run(emailSchema, { to: 'not-an-email', body: 'hi' });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.keyword)).toEqual(['properties', 'format']);
    });

    it.each(['hello {{global.email}}', '{{a}} {{b}}', '{{a}}{{b}}'])(
      'should keep errors when reference is not the whole value: %j',
      (to) => {
        const result = run(emailSchema, { to, body: 'hi' });

        expect(result.valid).toBe(false);
        expect(result.errors.map((error) => error.keyword)).toEqual(['properties', 'format']);
      },
    );
  });

  describe('array property', () => {
    it('should remove all errors when every failing item is a variable reference', () => {
      const result = run(emailListSchema, { to: ['a@b.com', '{{global.email}}', '{{nodes.x.output}}'] });

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should keep all errors when at least one failing item is a plain invalid string', () => {
      const result = run(emailListSchema, { to: ['a@b.com', '{{global.email}}', 'bad'] });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.instanceLocation)).toEqual(['#', '#/to', '#/to/1', '#/to', '#/to/2']);
    });

    it('should leave arrays of objects untouched', () => {
      const schema: Schema = {
        type: 'object',
        properties: {
          to: { type: 'array', items: { type: 'object', properties: { email: { type: 'string', format: 'email' } } } },
        },
      };
      const data = { to: [{ email: '{{global.email}}' }] };
      const before = validate(schema, data);
      const result = run(schema, data);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(before.errors);
    });
  });

  describe('object property', () => {
    it('should remove type errors for variable references and keep unrelated errors', () => {
      const result = run(nestedObjectSchema, { config: { count: '{{global.count}}' } });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.keyword)).toEqual(['required']);
      expect(result.errors[0].error).toContain('"body"');
    });

    it('should remove type errors for variable references in deeply nested objects', () => {
      const result = run(nestedObjectSchema, {
        config: { count: '{{global.count}}', limits: { max: '{{global.max}}' } },
        body: 'hi',
      });

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should keep errors for a plain invalid nested value', () => {
      const result = run(nestedObjectSchema, { config: { count: 'abc' }, body: 'hi' });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.instanceLocation)).toEqual(['#', '#/config', '#/config/count']);
    });

    it('should keep all errors when at least one nested value is a plain invalid value', () => {
      const result = run(nestedObjectSchema, {
        config: { count: '{{global.count}}', limits: { max: 'abc' } },
        body: 'hi',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.instanceLocation)).toEqual([
        '#',
        '#/config',
        '#/config/count',
        '#/config',
        '#/config/limits',
        '#/config/limits/max',
      ]);
    });

    it('should keep format errors in a nested object (only type errors are handled)', () => {
      const result = run(nestedObjectSchema, { config: { email: '{{global.email}}' }, body: 'hi' });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.keyword)).toEqual(['properties', 'properties', 'format']);
    });

    it('should keep type error when the object property is null', () => {
      const result = run(nestedObjectSchema, { config: null, body: 'hi' });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.instanceLocation)).toEqual(['#', '#/config']);
    });
  });

  describe('conditional schema', () => {
    it('should drop allOf/if meta errors once detailed errors are removed', () => {
      const result = run(conditionalSchema, { kind: 'email', to: '{{global.email}}' });

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should keep allOf/if meta errors when detailed errors remain', () => {
      const result = run(conditionalSchema, { kind: 'email', to: 'bad' });

      expect(result.valid).toBe(false);
      expect(result.errors.map((error) => error.keyword)).toEqual(['allOf', 'if', 'properties', 'format']);
    });
  });
});
