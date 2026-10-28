import { z } from 'zod';

const OWN_PROTO_KEY_MESSAGE = "the key '__proto__' is not allowed";

function isWalkable(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

// Arrays yield numeric indices, objects string keys, which is the shape a JSON path takes.
function ownEntries(value: object): Iterator<[PropertyKey, unknown]> {
  return Array.isArray(value) ? value.entries() : Object.entries(value).values();
}

// `JSON.parse` turns "__proto__" into an ordinary own key. zod's loose objects copy unknown
// keys with a plain assignment, which for that key swaps the output's prototype instead,
// so anything under it is read back as if validated. Refuse it before parsing.
//
// Walked with an explicit stack, never recursion: a snapshot's nesting depth is whatever the
// client sent, and a blown call stack would answer 500 where this promises a 400.
export function findOwnProtoKey(value: unknown): PropertyKey[] | undefined {
  if (!isWalkable(value)) return undefined;
  if (Object.hasOwn(value, '__proto__')) return ['__proto__'];

  const seen = new Set<object>([value]);
  // One segment per stacked iterator below the root, so the path is copied once, on a hit.
  const path: PropertyKey[] = [];
  const stack: Iterator<[PropertyKey, unknown]>[] = [ownEntries(value)];

  while (stack.length > 0) {
    const step = stack.at(-1)!.next();
    if (step.done === true) {
      stack.pop();
      // A no-op for the root, which owns no segment.
      path.pop();
      continue;
    }

    const [key, child] = step.value;
    if (!isWalkable(child) || seen.has(child)) continue;
    if (Object.hasOwn(child, '__proto__')) return [...path, key, '__proto__'];

    seen.add(child);
    path.push(key);
    stack.push(ownEntries(child));
  }

  return undefined;
}

// Refuses the key outright, at its path. Wrap a payload where it enters: every loose
// object below is then safe without each one having to defend itself.
export function rejectingOwnProtoKey<T extends z.ZodType>(schema: T) {
  return z.preprocess((value, context) => {
    const path = findOwnProtoKey(value);
    if (path === undefined) return value;
    context.addIssue({ code: 'custom', message: OWN_PROTO_KEY_MESSAGE, path });
    return z.NEVER;
  }, schema);
}
