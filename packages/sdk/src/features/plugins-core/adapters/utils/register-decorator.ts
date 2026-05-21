function djb2Hash(string_: string): string {
  let hash = 5381;
  for (let index = 0; index < string_.length; index++) {
    // eslint-disable-next-line unicorn/number-literal-case
    hash = ((hash << 5) + hash + (string_.codePointAt(index) as number)) & 0xff_ff_ff_ff;
  }
  return (hash >>> 0).toString(36);
}

// Window size for function bodies in fingerprints. Larger window = lower
// collision risk between anonymous functions with similar prefixes. Set
// well above typical xyflow-callback / formatter bodies; bump up if
// real-world collisions show up. The fingerprint runs once per registration
// (not on every render), so the cost is negligible.
const FINGERPRINT_FN_SLICE = 1000;

function getEntryFingerprint(entry: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(entry)) {
    if (key === 'name') continue;

    if (typeof value === 'function') {
      parts.push(`${key}:fn(${value.name || ''},${value.toString().slice(0, FINGERPRINT_FN_SLICE)})`);
    } else if (value !== undefined) {
      parts.push(`${key}:${JSON.stringify(value)}`);
    }
  }

  return `__auto_${djb2Hash(parts.sort().join('|'))}`;
}

function dedupKeyOf<T extends { name?: string }>(entry: T): string {
  if (entry.name) return entry.name;

  if (import.meta.env.DEV) {
    // Anonymous entries fall back to a content fingerprint, which can
    // collide if two entries share an identical (or near-identical, up to
    // the slice window) shape. Two real cases this has masked in the
    // past: (a) `() => undefined` placeholder callbacks across plugins,
    // (b) inline arrow components that minify to the same prefix in dev.
    // The fix is name-the-entry, not bump the window — surface a hint.
    console.warn(
      '[@workflowbuilder/sdk] register-decorator: registering an unnamed entry; the SDK will hash its content for deduplication. ' +
        'For deterministic behavior, set `{ name: "your-plugin-name", ... }` on the entry.',
      entry,
    );
  }

  return getEntryFingerprint(entry as unknown as Record<string, unknown>);
}

export function registerDecorator<T extends { name?: string }>(registry: Map<string, T[]>, key: string, entry: T) {
  if (!registry.has(key)) {
    registry.set(key, []);
  }

  const entries = registry.get(key)!;
  const dedupKey = dedupKeyOf(entry);
  const existingIndex = entries.findIndex((p) => dedupKeyOf(p) === dedupKey);

  if (existingIndex === -1) {
    entries.push(entry);
  } else {
    entries[existingIndex] = entry;
  }
}
