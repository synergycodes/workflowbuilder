import { beforeEach, describe, expect, it } from 'vitest';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import {
  applyEvent,
  applySnapshot,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from './use-execution-store';

let sequence = 0;

function event(partial: Omit<ExecutionEvent, 'executionId' | 'sequence' | 'timestamp'>): ExecutionEvent {
  sequence += 1;
  return { executionId: 'exec-1', sequence, timestamp: '2026-09-15T12:00:00.000Z', ...partial } as ExecutionEvent;
}

const nodeState = (nodeId: string) => useExecutionStore.getState().nodeStates[nodeId];

describe('use-execution-store: a node waiting for a person', () => {
  beforeEach(() => {
    sequence = 0;
    resetExecution();
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
  });

  it('node_waiting marks the node waiting, and the completion that follows marks it completed', () => {
    applyEvent(event({ type: 'node_started', nodeId: 'human-1' }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));

    expect(nodeState('human-1')).toEqual({ status: 'waiting' });

    applyEvent(event({ type: 'node_completed', nodeId: 'human-1', payload: { output: { action: 'approve' } } }));

    expect(nodeState('human-1')).toEqual({ status: 'completed', output: { action: 'approve' } });
  });

  it('a failure after the wait marks the node failed, not waiting', () => {
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
    applyEvent(event({ type: 'node_failed', nodeId: 'human-1', payload: { error: { message: 'boom' } } }));

    expect(nodeState('human-1')).toEqual({ status: 'failed', error: { message: 'boom' } });
  });

  it('the run is waiting while a node waits, and running again once the node resolves', () => {
    applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }));
    expect(useExecutionStore.getState().status).toBe('running');

    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
    expect(useExecutionStore.getState().status).toBe('waiting');

    applyEvent(event({ type: 'node_completed', nodeId: 'human-1', payload: { output: {} } }));
    expect(useExecutionStore.getState().status).toBe('running');
  });

  it('with two nodes waiting, the first verdict keeps the run waiting', () => {
    applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-2' }));

    applyEvent(event({ type: 'node_completed', nodeId: 'human-1', payload: { output: {} } }));
    expect(useExecutionStore.getState().status).toBe('waiting');

    applyEvent(event({ type: 'node_failed', nodeId: 'human-2', payload: { error: { message: 'boom' } } }));
    expect(useExecutionStore.getState().status).toBe('running');
  });

  it('a terminal event closes a waiting run, whatever the nodes say', () => {
    applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));

    applyEvent(event({ type: 'execution_cancelled', payload: {} }));

    expect(useExecutionStore.getState().status).toBe('cancelled');
    expect(nodeState('human-1')).toEqual({ status: 'waiting' });
  });

  it('a snapshot whose status write was skipped still shows the run waiting, because the events say so', () => {
    const events = [
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'node_started', nodeId: 'human-1' }),
      event({ type: 'node_waiting', nodeId: 'human-1' }),
    ];

    applySnapshot({ executionId: 'exec-1', status: 'running', lastSequence: sequence, events });

    expect(useExecutionStore.getState().status).toBe('waiting');
  });

  it('a snapshot replayed after a reload rebuilds the waiting node and the run status', () => {
    const events = [
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'node_started', nodeId: 'trigger-1' }),
      event({ type: 'node_completed', nodeId: 'trigger-1', payload: { output: {} } }),
      event({ type: 'node_started', nodeId: 'human-1' }),
      event({ type: 'node_waiting', nodeId: 'human-1' }),
    ];

    applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: sequence, events });

    const state = useExecutionStore.getState();
    expect(state.status).toBe('waiting');
    expect(state.nodeStates['trigger-1']?.status).toBe('completed');
    expect(state.nodeStates['human-1']?.status).toBe('waiting');
    expect(state.events).toHaveLength(events.length);
  });
});
