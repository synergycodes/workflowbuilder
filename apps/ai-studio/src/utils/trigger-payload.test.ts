import { describe, expect, it } from 'vitest';

import { triggerPayloadOf } from './trigger-payload';

describe('triggerPayloadOf', () => {
  it('sends nothing for an empty input', () => {
    expect(triggerPayloadOf('')).toEqual({});
  });

  it('sends plain text as input', () => {
    expect(triggerPayloadOf('Where is my order?')).toEqual({ input: 'Where is my order?' });
  });

  it("lends a JSON object's fields to the payload beside the raw text", () => {
    const text = '{ "orderId": "ORD-1", "total": 120 }';

    expect(triggerPayloadOf(text)).toEqual({ orderId: 'ORD-1', total: 120, input: text });
  });

  it('keeps the raw text under input when the object has its own input field', () => {
    const text = '{ "input": "overridden?" }';

    expect(triggerPayloadOf(text)).toEqual({ input: text });
  });

  it.each([
    ['an array', '[1, 2]'],
    ['a number', '42'],
    ['a JSON string', '"ORD-1"'],
    ['null', 'null'],
    ['broken JSON', '{ "orderId": '],
  ])('sends %s as plain text', (_name, text) => {
    expect(triggerPayloadOf(text)).toEqual({ input: text });
  });
});
