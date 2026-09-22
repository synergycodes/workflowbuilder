import { beforeEach, describe, expect, it } from 'vitest';

import {
  type ExecutionEvent,
  type ExecutionStatus,
  TERMINAL_EVENT_TO_STATUS,
  TERMINAL_EXECUTION_STATUSES,
  type TerminalExecutionEventType,
} from '@workflow-builder/types/workflow-execution/execution-events';

import {
  type RunStatus,
  applyConnectionLost,
  applyEvent,
  applySnapshot,
  applyStopUnreachable,
  isRunAlive,
  resetExecution,
  setExecutionStarted,
  setLogCollapsed,
  useExecutionStore,
} from './use-execution-store';

const STORAGE_KEY = 'ai-studio:execution';

const stored = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: Record<string, unknown>; version: number }) : null;
};

let sequence = 0;

// `Omit` over the union keeps only the shared keys, so `nodeId` has to be admitted by hand.
function event(
  partial: Omit<ExecutionEvent, 'executionId' | 'sequence' | 'timestamp'> & { nodeId?: string },
): ExecutionEvent {
  sequence += 1;
  return { executionId: 'exec-1', sequence, timestamp: '2026-09-15T12:00:00.000Z', ...partial } as ExecutionEvent;
}

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

    applySnapshot({ executionId: 'exec-1', status: 'pending', lastSequence: sequence, events });

    expect(useExecutionStore.getState().status).toBe('waiting');
  });

  it('a snapshot of a run that already resolved its wait shows running, whatever the row says', () => {
    const events = [
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'node_waiting', nodeId: 'human-1' }),
      event({ type: 'node_completed', nodeId: 'human-1', payload: { output: {} } }),
      event({ type: 'node_started', nodeId: 'send-1' }),
    ];

    applySnapshot({ executionId: 'exec-1', status: 'pending', lastSequence: sequence, events });

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

    applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: sequence, events });

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

      applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: sequence, events });

      expect(useExecutionStore.getState().status).toBe(status);
    },
  );
});

describe('use-execution-store: the run survives closing the tab', () => {
  beforeEach(() => {
    sequence = 0;
    resetExecution();
    localStorage.clear();
  });

  it('remembers exactly the run and the log preference, in storage that outlives the tab', () => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));

    expect(stored()?.version).toBe(1);
    expect(stored()?.state).toEqual({
      executionId: 'exec-1',
      streamUrl: '/api/executions/exec-1/stream',
      status: 'waiting',
      isLogCollapsed: false,
    });
    expect(sessionStorage.length).toBe(0);
  });

  it('remembers a lost connection too, so the next load knows to retry', () => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    applyConnectionLost();

    expect(stored()?.state).toMatchObject({ executionId: 'exec-1', status: 'disconnected' });
  });

  it('reset forgets the run but keeps the log preference', () => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    setLogCollapsed(true);
    resetExecution();

    expect(stored()?.state).toMatchObject({ status: 'idle', isLogCollapsed: true });
    expect(stored()?.state).not.toHaveProperty('executionId');
    expect(stored()?.state).not.toHaveProperty('streamUrl');
  });

  it('an entry written before the run was persisted still loads, with its log preference', async () => {
    setExecutionStarted('exec-stale', '/api/executions/exec-stale/stream');
    setLogCollapsed(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { isLogCollapsed: true }, version: 0 }));

    await useExecutionStore.persist.rehydrate();

    const state = useExecutionStore.getState();
    expect(state.isLogCollapsed).toBe(true);
    expect(state.status).toBe('idle');
    expect(state.executionId).toBeUndefined();
    expect(state.streamUrl).toBeUndefined();
  });

  it('a reload comes back with the run, leaving markers and log for the snapshot to fill', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          executionId: 'exec-1',
          streamUrl: '/api/executions/exec-1/stream',
          status: 'waiting',
          isLogCollapsed: false,
        },
        version: 1,
      }),
    );

    await useExecutionStore.persist.rehydrate();

    expect(useExecutionStore.getState()).toMatchObject({
      executionId: 'exec-1',
      streamUrl: '/api/executions/exec-1/stream',
      status: 'waiting',
      nodeStates: {},
      events: [],
    });
  });
});

describe('use-execution-store: a terminal run does not come back after a reload', () => {
  beforeEach(() => {
    sequence = 0;
    resetExecution();
    localStorage.clear();
  });

  it('a run that ended writes an idle entry to storage but stays visible in memory', () => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    setLogCollapsed(true);
    applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }));
    applyEvent(terminalEvent('execution_completed'));

    expect(stored()?.state).toMatchObject({ status: 'idle', isLogCollapsed: true });
    expect(stored()?.state).not.toHaveProperty('executionId');
    expect(stored()?.state).not.toHaveProperty('streamUrl');
    expect(useExecutionStore.getState()).toMatchObject({ executionId: 'exec-1', status: 'completed' });
  });
});

describe('use-execution-store: a stop that could not reach the server', () => {
  beforeEach(() => {
    sequence = 0;
    resetExecution();
    localStorage.clear();
  });

  it.each([
    ['a new run', () => setExecutionStarted('exec-2', '/api/executions/exec-2/stream')],
    ['a snapshot', () => applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: 0, events: [] })],
    ['a live event', () => applyEvent(event({ type: 'node_started', nodeId: 'human-1' }))],
    ['a reset', () => resetExecution()],
  ])('%s clears the flag, so Reset stops being offered', (_, moveOn) => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    applyStopUnreachable();

    moveOn();

    expect(useExecutionStore.getState().isStopUnreachable).toBe(false);
  });
});

describe('use-execution-store: partialize refuses a half-run', () => {
  beforeEach(() => {
    sequence = 0;
    resetExecution();
    localStorage.clear();
  });

  it('an executionId without a stream URL never reaches storage, only the idle defaults with the log preference', () => {
    useExecutionStore.setState({
      executionId: 'exec-1',
      streamUrl: undefined,
      status: 'waiting',
      isLogCollapsed: true,
    });

    expect(stored()?.state).toEqual({
      executionId: undefined,
      streamUrl: undefined,
      status: 'idle',
      isLogCollapsed: true,
    });
  });
});

describe('use-execution-store: which runs may still be alive on the server', () => {
  it.each(['pending', 'running', 'waiting', 'cancelling', 'disconnected'] as RunStatus[])(
    '%s: the server may still hold the run',
    (status) => {
      expect(isRunAlive(status)).toBe(true);
    },
  );

  it.each(['idle', ...TERMINAL_EXECUTION_STATUSES] as RunStatus[])('%s: nothing to reconnect or cancel', (status) => {
    expect(isRunAlive(status)).toBe(false);
  });
});
