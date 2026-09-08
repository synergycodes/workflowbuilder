import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { findOwnProtoKey, rejectingOwnProtoKey } from './own-proto-key';

describe('findOwnProtoKey', () => {
  it('reports the path of an own key created by JSON.parse, through objects and arrays', () => {
    expect(findOwnProtoKey({ a: { b: [1, { c: null }] } })).toBeUndefined();
    expect(findOwnProtoKey(JSON.parse('{"a": {"b": {"__proto__": {}}}}'))).toEqual(['a', 'b', '__proto__']);
    expect(findOwnProtoKey(JSON.parse('{"items": [1, {"__proto__": {}}]}'))).toEqual(['items', 1, '__proto__']);
  });

  it('terminates on a cyclic object', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic['self'] = cyclic;

    expect(findOwnProtoKey(cyclic)).toBeUndefined();
  });
});

describe('rejectingOwnProtoKey', () => {
  const schema = rejectingOwnProtoKey(z.looseObject({ a: z.number(), deadline: z.string().optional() }));

  it('passes a clean value through and rejects an own __proto__ key at its path', () => {
    expect(schema.parse({ a: 1, extra: true })).toEqual({ a: 1, extra: true });

    const result = schema.safeParse(JSON.parse('{"a": 1, "__proto__": {"deadline": "smuggled"}}'));

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['__proto__', "the key '__proto__' is not allowed"],
    ]);
  });
});
