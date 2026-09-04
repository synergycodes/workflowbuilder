import { WorkflowUpdateFailedError } from '@temporalio/client';
import type { History } from '@temporalio/common/lib/proto-utils';

export async function waitUntil(check: () => boolean, what: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// node_not_waiting is retryable by contract: a verdict can race the parking
// activation (see the decision log). Tests deliver verdicts the way callers should.
export async function executeVerdictWithRetry(send: () => Promise<unknown>): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await send();
      return;
    } catch (error) {
      const racingPark =
        error instanceof WorkflowUpdateFailedError &&
        (error.cause as { type?: string } | undefined)?.type === 'node_not_waiting';
      if (!racingPark || attempt >= 40) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
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
