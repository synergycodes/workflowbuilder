import { TERMINAL_EXECUTION_EVENT_TYPES } from '@workflow-builder/types/workflow-execution/execution-events';

import type { ExecutionEventRow } from './fetch-events-after';

export type EventFetcher = (executionId: string, afterSequence: number) => Promise<ExecutionEventRow[]>;
type EventWriter = (event: ExecutionEventRow) => Promise<void>;

// Set<string> because ExecutionEventRow.type is a plain string from $inferSelect.
const TERMINAL_EVENT_TYPES = new Set<string>(TERMINAL_EXECUTION_EVENT_TYPES);

export type DrainResult = {
  lastSequence: number;
  reachedTerminal: boolean;
  // The write callback threw. For the SSE route this is the client
  // disconnecting mid-stream, not data corruption; callers decide how to
  // interpret it. Either way the drain stops with the cursor pinned at the
  // last successful write.
  writeFailed: boolean;
};

// Requires rows to become visible in ascending `sequence` order: the cursor only moves
// forward, so a row committing below it is never selected again and its event is lost.
// The worker upholds that by serializing its event writes — see
// `apps/execution-worker/src/engines/temporal/workflows/sequenced-event-emitter.ts`.
// Gaps in the numbering are fine; only reordering is not. See drain-order.test.ts.
export async function drainEventsSince(
  executionId: string,
  afterSequence: number,
  fetch: EventFetcher,
  write: EventWriter,
): Promise<DrainResult> {
  const events = await fetch(executionId, afterSequence);

  let lastSequence = afterSequence;
  for (const event of events) {
    try {
      await write(event);
    } catch {
      return { lastSequence, reachedTerminal: false, writeFailed: true };
    }
    lastSequence = Number(event.sequence);
  }

  const lastType = events.at(-1)?.type;
  return {
    lastSequence,
    reachedTerminal: lastType !== undefined && TERMINAL_EVENT_TYPES.has(lastType),
    writeFailed: false,
  };
}
