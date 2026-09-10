import { z } from 'zod';

const OWN_PROTO_KEY_MESSAGE = "the key '__proto__' is not allowed";

// `JSON.parse` turns "__proto__" into an ordinary own key. zod's loose objects copy unknown
// keys with a plain assignment, which for that key swaps the output's prototype instead,
// so anything under it is read back as if validated. Refuse it before parsing.
export function findOwnProtoKey(
  value: unknown,
  path: PropertyKey[] = [],
  seen = new Set<object>(),
): PropertyKey[] | undefined {
  if (typeof value !== 'object' || value === null || seen.has(value)) return undefined;
  seen.add(value);
  if (Object.hasOwn(value, '__proto__')) return [...path, '__proto__'];
  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  for (const [key, child] of entries) {
    const found = findOwnProtoKey(child, [...path, key], seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function rejectingOwnProtoKey<T extends z.ZodType>(schema: T) {
  return z.preprocess((value, context) => {
    const path = findOwnProtoKey(value);
    if (path === undefined) return value;
    context.addIssue({ code: 'custom', message: OWN_PROTO_KEY_MESSAGE, path });
    return z.NEVER;
  }, schema);
}
