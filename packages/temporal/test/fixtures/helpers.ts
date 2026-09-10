import type { History } from '@temporalio/common/lib/proto-utils';

export async function waitUntil(check: () => boolean, what: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// A rejected update writes nothing to history, so this lists exactly the updates that
// got past the validator.
export function acceptedUpdateIds(history: History): string[] {
  return (history.events ?? []).flatMap((event) => {
    const id = event.workflowExecutionUpdateAcceptedEventAttributes?.protocolInstanceId;
    return typeof id === 'string' ? [id] : [];
  });
}

export function countScheduledActivities(history: History): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const event of history.events ?? []) {
    const name = event.activityTaskScheduledEventAttributes?.activityType?.name;
    if (name) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }

  return counts;
}
