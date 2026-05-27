import type { ExecutionEventRow } from './fetch-events-after';

export type EventFetcher = (executionId: string, afterSequence: number) => Promise<ExecutionEventRow[]>;
type EventWriter = (event: ExecutionEventRow) => Promise<void>;

const TERMINAL_EVENT_TYPES = new Set(['execution_completed', 'execution_failed', 'execution_cancelled']);

export type DrainResult = {
  lastSequence: number;
  reachedTerminal: boolean;
  // The write callback threw. For the SSE route this is the client
  // disconnecting mid-stream, not data corruption; callers decide how to
  // interpret it. Either way the drain stops with the cursor pinned at the
  // last successful write.
  writeFailed: boolean;
};

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
