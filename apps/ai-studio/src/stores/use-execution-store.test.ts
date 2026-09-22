import { beforeEach, describe, expect, it } from 'vitest';

import {
  type ExecutionEvent,
  type ExecutionStatus,
  TERMINAL_EVENT_TO_STATUS,
  type TerminalExecutionEventType,
} from '@workflow-builder/types/workflow-execution/execution-events';

import { executionEvent as event, lastSequence } from './execution-event.fixture';
import {
  applyEvent,
  applySnapshot,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from './use-execution-store';

const nodeState = (nodeId: string) => useExecutionStore.getState().nodeStates[nodeId];

const terminalPayload: { [T in TerminalExecutionEventType]: Extract<ExecutionEvent, { type: T }>['payload'] } = {
  execution_completed: undefined,
  execution_incomplete: { deadEnds: [{ nodeId: 'human-1', port: 'source:inner:rejected' }] },
  execution_failed: { error: { message: 'boom' } },
  execution_cancelled: {},
};

const terminalEvent = (type: TerminalExecutionEventType) => event({ type, payload: terminalPayload[type] });

const terminalCases = Object.entries(TERMINAL_EVENT_TO_STATUS) as [TerminalExecutionEventType, ExecutionStatus][];

describe('use-execution-store: a node waiting for a person', () => {
  beforeEach(() => {
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

  it.each(terminalCases)('%s closes a waiting run and settles the nodes still in flight', (type, status) => {
    applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }));
    applyEvent(event({ type: 'node_completed', nodeId: 'trigger-1', payload: { output: { input: 'refund' } } }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
    applyEvent(event({ type: 'node_started', nodeId: 'agent-1' }));

    applyEvent(terminalEvent(type));

    expect(useExecutionStore.getState().status).toBe(status);
    expect(nodeState('human-1')).toEqual({ status: 'idle' });
    expect(nodeState('agent-1')).toEqual({ status: 'idle' });
    expect(nodeState('trigger-1')).toEqual({ status: 'completed', output: { input: 'refund' } });
  });

  it('a snapshot whose row still says pending shows the run waiting, because the events say so', () => {
    const events = [
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'node_started', nodeId: 'human-1' }),
      event({ type: 'node_waiting', nodeId: 'human-1' }),
    ];

    applySnapshot({ executionId: 'exec-1', status: 'pending', lastSequence: lastSequence(), events });

    expect(useExecutionStore.getState().status).toBe('waiting');
  });

  it('a snapshot of a run that already resolved its wait shows running, whatever the row says', () => {
    const events = [
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'node_waiting', nodeId: 'human-1' }),
      event({ type: 'node_completed', nodeId: 'human-1', payload: { output: {} } }),
      event({ type: 'node_started', nodeId: 'send-1' }),
    ];

    applySnapshot({ executionId: 'exec-1', status: 'pending', lastSequence: lastSequence(), events });

    expect(useExecutionStore.getState().status).toBe('running');
  });

  it('node_waiting delivered twice for one node does not drift the run status', () => {
    applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
    expect(useExecutionStore.getState().status).toBe('waiting');

    applyEvent(event({ type: 'node_completed', nodeId: 'human-1', payload: { output: {} } }));
    expect(useExecutionStore.getState().status).toBe('running');
  });

  it('a snapshot replayed after a reload rebuilds the waiting node and the run status', () => {
    const events = [
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'node_started', nodeId: 'trigger-1' }),
      event({ type: 'node_completed', nodeId: 'trigger-1', payload: { output: {} } }),
      event({ type: 'node_started', nodeId: 'human-1' }),
      event({ type: 'node_waiting', nodeId: 'human-1' }),
    ];

    applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: lastSequence(), events });

    const state = useExecutionStore.getState();
    expect(state.status).toBe('waiting');
    expect(state.nodeStates['trigger-1']?.status).toBe('completed');
    expect(state.nodeStates['human-1']?.status).toBe('waiting');
    expect(state.events).toHaveLength(events.length);
  });

  it.each(terminalCases)(
    '%s closes the run for good: a node event that arrives after it does not reopen it',
    (type, status) => {
      applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }));
      applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
      applyEvent(terminalEvent(type));
      expect(useExecutionStore.getState().status).toBe(status);

      applyEvent(event({ type: 'node_waiting', nodeId: 'human-2' }));
      expect(useExecutionStore.getState().status).toBe(status);

      applyEvent(event({ type: 'node_completed', nodeId: 'human-2', payload: { output: {} } }));
      expect(useExecutionStore.getState().status).toBe(status);
    },
  );

  it.each(terminalCases)(
    'a snapshot whose row still says waiting but whose events end in %s shows %s',
    (type, status) => {
      const events = [
        event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
        event({ type: 'node_waiting', nodeId: 'human-1' }),
        terminalEvent(type),
      ];

      applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: lastSequence(), events });

      expect(useExecutionStore.getState().status).toBe(status);
    },
  );
});
