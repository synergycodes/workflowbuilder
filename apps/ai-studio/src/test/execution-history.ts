import type { ExecutionEvent, ExecutionStatus } from '@workflow-builder/types/workflow-execution/execution-events';

const base = { executionId: 'exec-1', timestamp: '2026-09-15T12:00:00.000Z' };

// The engine records execution_started first, so a started run never has an empty history.
export const parkedRunHistory: ExecutionEvent[] = [
  { ...base, sequence: 1, type: 'execution_started', payload: { workflowId: 'wf-1' } },
  { ...base, sequence: 2, type: 'node_started', nodeId: 'human-1' },
  { ...base, sequence: 3, type: 'node_waiting', nodeId: 'human-1' },
];

export const cancelledEvent: ExecutionEvent = {
  ...base,
  sequence: 4,
  type: 'execution_cancelled',
  payload: { reason: 'user_request' },
};

export function snapshotFrame(status: ExecutionStatus, events: ExecutionEvent[] = parkedRunHistory) {
  return {
    type: 'execution_snapshot' as const,
    executionId: 'exec-1',
    status,
    lastSequence: events.at(-1)?.sequence ?? 0,
    events,
  };
}
