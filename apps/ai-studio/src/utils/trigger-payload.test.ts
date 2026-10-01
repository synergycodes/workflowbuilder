import { describe, expect, it } from 'vitest';

import { triggerPayloadOf } from './trigger-payload';

describe('triggerPayloadOf', () => {
  it('sends nothing for an empty input', () => {
    expect(triggerPayloadOf('')).toEqual({});
  });

  it('sends plain text as input', () => {
    expect(triggerPayloadOf('Where is my order?')).toEqual({ input: 'Where is my order?' });
  });

  it("sends a JSON object's fields without the raw text", () => {
    expect(triggerPayloadOf('{ "orderId": "ORD-1", "total": 120 }')).toEqual({ orderId: 'ORD-1', total: 120 });
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
