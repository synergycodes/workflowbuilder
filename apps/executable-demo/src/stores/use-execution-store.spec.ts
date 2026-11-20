import { beforeEach, describe, expect, it } from 'vitest';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import {
  applyEvent,
  applySnapshot,
  resetExecution,
  setExecutionStarted,
  setExecutionStatus,
  useExecutionStore,
} from './use-execution-store';

const timestamp = new Date().toISOString();

function event(value: ExecutionEvent) {
  return value;
}

describe('execution store', () => {
  beforeEach(() => resetExecution());

  it('derives node and terminal status from ordered events and ignores duplicates', () => {
    setExecutionStarted('exec', '/stream');
    applyEvent(
      event({ executionId: 'exec', sequence: 1, timestamp, type: 'execution_started', payload: { workflowId: 'w' } }),
    );
    applyEvent(event({ executionId: 'exec', sequence: 2, timestamp, type: 'node_started', nodeId: 'a' }));
    applyEvent(
      event({
        executionId: 'exec',
        sequence: 3,
        timestamp,
        type: 'node_completed',
        nodeId: 'a',
        payload: { output: 42 },
      }),
    );
    applyEvent(
      event({
        executionId: 'exec',
        sequence: 3,
        timestamp,
        type: 'node_completed',
        nodeId: 'a',
        payload: { output: 42 },
      }),
    );
    applyEvent(event({ executionId: 'exec', sequence: 4, timestamp, type: 'execution_completed' }));

    expect(useExecutionStore.getState()).toEqual(
      expect.objectContaining({
        status: 'completed',
        events: expect.arrayContaining([expect.objectContaining({ sequence: 4 })]),
        nodeStates: { a: { status: 'completed', output: 42 } },
      }),
    );
    expect(useExecutionStore.getState().events).toHaveLength(4);
  });

  it('rebuilds node state from a catch-up snapshot', () => {
    applySnapshot({
      executionId: 'exec',
      status: 'running',
      lastSequence: 2,
      events: [
        event({ executionId: 'exec', sequence: 1, timestamp, type: 'node_waiting', nodeId: 'a' }),
        event({
          executionId: 'exec',
          sequence: 2,
          timestamp,
          type: 'node_skipped',
          nodeId: 'b',
          payload: { reason: 'branch_not_taken' },
        }),
      ],
    });
    expect(useExecutionStore.getState().nodeStates).toEqual({ a: { status: 'waiting' }, b: { status: 'skipped' } });
  });

  it('supports cancelling state while retaining the stream', () => {
    setExecutionStarted('exec', '/stream');
    setExecutionStatus('cancelling');
    expect(useExecutionStore.getState()).toEqual(
      expect.objectContaining({ executionId: 'exec', streamUrl: '/stream', status: 'cancelling' }),
    );
  });
});
