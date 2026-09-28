const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres also takes braced and hyphen-less ids; those are refused here. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
