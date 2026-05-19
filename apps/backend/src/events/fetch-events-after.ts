import { and, eq, gt } from 'drizzle-orm';

import { database } from '../db/client';
import { executionEvents } from '../db/schema';

export type ExecutionEventRow = typeof executionEvents.$inferSelect;

export function fetchEventsAfter(executionId: string, afterSequence: number): Promise<ExecutionEventRow[]> {
  return database
    .select()
    .from(executionEvents)
    .where(and(eq(executionEvents.executionId, executionId), gt(executionEvents.sequence, afterSequence)))
    .orderBy(executionEvents.sequence);
}
