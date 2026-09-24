import { describe, expect, it } from 'vitest';

import { outputSchemaFor, refundReviewOutputSchema, responseOptionOf, responseOptions } from './response-options';

describe('responseOptions', () => {
  it('offers plain text first, as the default, then the refund review preset', () => {
    expect(responseOptions.map((option) => option.label)).toEqual(['Plain text', 'Structured: refund review']);
  });
});

describe('responseOptionOf', () => {
  it('is plain text when the node carries no output schema', () => {
    const properties: { outputSchema?: unknown } = {};

    expect(responseOptionOf(properties.outputSchema)).toBe('text');
    expect(responseOptionOf(null)).toBe('text');
  });

  it('is the refund review preset for that schema, also for a copy of it', () => {
    expect(responseOptionOf(refundReviewOutputSchema)).toBe('refund-review');
    expect(responseOptionOf(structuredClone(refundReviewOutputSchema))).toBe('refund-review');
  });

  it('is a custom schema for a schema no preset matches', () => {
    expect(responseOptionOf({})).toBe('custom');
    expect(responseOptionOf({ type: 'object', properties: { score: { type: 'number' } } })).toBe('custom');
  });
});

describe('outputSchemaFor', () => {
  it('clears the schema for plain text', () => {
    expect(outputSchemaFor('text')).toBeUndefined();
  });

  it('seeds the shared refund review schema, the same object the template uses', () => {
    expect(outputSchemaFor('refund-review')).toBe(refundReviewOutputSchema);
  });

  it('treats an option it does not know as plain text', () => {
    expect(outputSchemaFor(null)).toBeUndefined();
    expect(outputSchemaFor('something-else')).toBeUndefined();
  });
});
