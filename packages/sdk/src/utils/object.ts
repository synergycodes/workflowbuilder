type AnyRecord = Record<string, unknown>;

export function getByPath<T = unknown>(object: AnyRecord | null | undefined, path: string): T | undefined {
  if (!object) return undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = object;

  for (const key of path.split('.')) {
    if (result == null) return undefined;
    result = result[key];
  }

  return result;
}
