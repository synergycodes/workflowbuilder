function djb2Hash(string_: string): string {
  let hash = 5381;
  for (let index = 0; index < string_.length; index++) {
    // eslint-disable-next-line unicorn/number-literal-case
    hash = ((hash << 5) + hash + (string_.codePointAt(index) as number)) & 0xff_ff_ff_ff;
  }
  return (hash >>> 0).toString(36);
}

function getEntryFingerprint(entry: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(entry)) {
    if (key === 'name') continue;

    if (typeof value === 'function') {
      // Use function name + first 200 chars of toString for stability across hot reloads
      parts.push(`${key}:fn(${value.name || ''},${value.toString().slice(0, 200)})`);
    } else if (value !== undefined) {
      parts.push(`${key}:${JSON.stringify(value)}`);
    }
  }

  return `__auto_${djb2Hash(parts.sort().join('|'))}`;
}

export function registerDecorator<T extends { name?: string }>(registry: Map<string, T[]>, key: string, entry: T) {
  if (!registry.has(key)) {
    registry.set(key, []);
  }

  const entries = registry.get(key)!;
  const dedupKey = entry.name || getEntryFingerprint(entry as unknown as Record<string, unknown>);
  const existingIndex = entries.findIndex(
    (p) => getEntryFingerprint(p as unknown as Record<string, unknown>) === dedupKey,
  );

  if (existingIndex === -1) {
    entries.push(entry);
  } else {
    entries[existingIndex] = entry;
  }
}
