import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

let sequence = 0;

// `Omit` over the union keeps only the shared keys, so `nodeId` has to be admitted by hand.
export function executionEvent(
  partial: Omit<ExecutionEvent, 'executionId' | 'sequence' | 'timestamp'> & { nodeId?: string },
): ExecutionEvent {
  sequence += 1;
  return { executionId: 'exec-1', sequence, timestamp: '2026-09-15T12:00:00.000Z', ...partial } as ExecutionEvent;
}

/** The highest sequence handed out so far: what a snapshot taken now would report. */
export function lastSequence(): number {
  return sequence;
}
