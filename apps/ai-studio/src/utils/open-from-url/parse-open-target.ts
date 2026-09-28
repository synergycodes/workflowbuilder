const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OpenTarget = { executionId?: string; workflowId?: string; notices: string[] };

export function parseOpenTarget(search: string): OpenTarget {
  const query = new URLSearchParams(search);
  const target: OpenTarget = { notices: [] };

  for (const name of ['executionId', 'workflowId'] as const) {
    const value = query.get(name)?.trim();
    if (!value) continue;
    if (UUID_PATTERN.test(value)) {
      // The stream subscribes under the id as written, and the worker notifies lowercase ones.
      target[name] = value.toLowerCase();
    } else {
      target.notices.push(`The link's ${name} is not a valid id, so it was ignored.`);
    }
  }

  return target;
}
