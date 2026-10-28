import { and, count, eq } from 'drizzle-orm';

import type { ExecutionEventType } from '@workflow-builder/types/workflow-execution/execution-events';

import { database } from '../db/client';
import { executionEvents } from '../db/schema';

// How many times the node has parked in this run: the wait instance a decision addresses.
export async function countNodeWaits(executionId: string, nodeId: string): Promise<number> {
  const [row] = await database
    .select({ waits: count() })
    .from(executionEvents)
    .where(
      and(
        eq(executionEvents.executionId, executionId),
        eq(executionEvents.nodeId, nodeId),
        eq(executionEvents.type, 'node_waiting' satisfies ExecutionEventType),
      ),
    );
  return row?.waits ?? 0;
}
