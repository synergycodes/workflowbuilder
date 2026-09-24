import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  applyStopRequested,
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

beforeEach(() => {
  sequence = 0;
  resetExecution();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('use-execution-store: a node waiting for a person', () => {
  beforeEach(() => {
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

const startedHistory = () => [
  event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
  event({ type: 'node_started', nodeId: 'agent-1' }),
];

const inFlightHistory = () => [
  event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
  event({ type: 'node_started', nodeId: 'agent-1' }),
  event({ type: 'node_waiting', nodeId: 'human-1' }),
];

describe('use-execution-store: facts only the row carries', () => {
  beforeEach(() => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
  });

  it.each(TERMINAL_EXECUTION_STATUSES)(
    'a row that says %s wins over a history whose terminal event never landed',
    (status) => {
      applySnapshot({ executionId: 'exec-1', status, lastSequence: 2, events: startedHistory() });

      expect(useExecutionStore.getState().status).toBe(status);
    },
  );

  it('a cancelling row stays cancelling over a history that replays to running', () => {
    applySnapshot({ executionId: 'exec-1', status: 'cancelling', lastSequence: 2, events: startedHistory() });

    expect(useExecutionStore.getState().status).toBe('cancelling');
  });

  it('a cancelling row whose history already ends in execution_cancelled ends cancelled', () => {
    const events = [...startedHistory(), terminalEvent('execution_cancelled')];

    applySnapshot({ executionId: 'exec-1', status: 'cancelling', lastSequence: sequence, events });

    expect(useExecutionStore.getState().status).toBe('cancelled');
  });

  it('a waiting row with no parked node still derives running from the events', () => {
    applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: 2, events: startedHistory() });

    expect(useExecutionStore.getState().status).toBe('running');
  });

  it.each(TERMINAL_EXECUTION_STATUSES)('a row that says %s settles the nodes the history left in flight', (status) => {
    applySnapshot({ executionId: 'exec-1', status, lastSequence: 3, events: inFlightHistory() });

    expect(useExecutionStore.getState().status).toBe(status);
    expect(useExecutionStore.getState().nodeStates).toEqual({
      'agent-1': { status: 'idle' },
      'human-1': { status: 'idle' },
    });
  });

  it('a cancelling row keeps the markers of the nodes still in flight', () => {
    applySnapshot({ executionId: 'exec-1', status: 'cancelling', lastSequence: 3, events: inFlightHistory() });

    expect(useExecutionStore.getState().status).toBe('cancelling');
    expect(useExecutionStore.getState().nodeStates).toEqual({
      'agent-1': { status: 'running' },
      'human-1': { status: 'waiting' },
    });
  });

  it('a completed row whose history ends in execution_completed shows the nodes as the events left them', () => {
    const events = [
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'node_started', nodeId: 'agent-1' }),
      event({ type: 'node_completed', nodeId: 'agent-1', payload: { output: { answer: 'refund' } } }),
      event({ type: 'node_skipped', nodeId: 'human-1' }),
      terminalEvent('execution_completed'),
    ];

    applySnapshot({ executionId: 'exec-1', status: 'completed', lastSequence: sequence, events });

    expect(useExecutionStore.getState().status).toBe('completed');
    expect(useExecutionStore.getState().nodeStates).toEqual({
      'agent-1': { status: 'completed', output: { answer: 'refund' } },
      'human-1': { status: 'skipped' },
    });
  });
});

describe('use-execution-store: the run survives closing the tab', () => {
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

  it('an entry from an older version loads through migrate, with its missing fields filled', async () => {
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

  it.each(['idle', ...TERMINAL_EXECUTION_STATUSES] as RunStatus[])(
    'a lost stream leaves the status %s: there is no run left to lose',
    (status) => {
      setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
      useExecutionStore.setState({ status });

      applyConnectionLost();

      expect(useExecutionStore.getState().status).toBe(status);
    },
  );
});

describe('use-execution-store: a stop the user asked for', () => {
  it.each([
    ['a new run', () => setExecutionStarted('exec-2', '/api/executions/exec-2/stream')],
    ['a reset', () => resetExecution()],
  ])('%s clears the request, so Reset stops being offered', (_, moveOn) => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    applyStopRequested();

    moveOn();

    expect(useExecutionStore.getState().isStopRequested).toBe(false);
  });

  it.each([
    ['a snapshot', () => applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: 0, events: [] })],
    ['a live event', () => applyEvent(event({ type: 'node_started', nodeId: 'human-1' }))],
    ['a lost stream', () => applyConnectionLost()],
  ])('%s leaves the request standing: none of them says the cancel landed', (_, moveOn) => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    applyStopRequested();

    moveOn();

    expect(useExecutionStore.getState().isStopRequested).toBe(true);
  });

  it('is never written to storage', () => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    applyStopRequested();

    expect(stored()?.state).not.toHaveProperty('isStopRequested');
  });
});

describe('use-execution-store: partialize refuses a half-run', () => {
  it('an executionId without a stream URL never reaches storage, only the idle defaults with the log preference', () => {
    useExecutionStore.setState({
      executionId: 'exec-1',
      streamUrl: undefined,
      status: 'waiting',
      isLogCollapsed: true,
    });

    expect(stored()?.state).toEqual({ status: 'idle', isLogCollapsed: true });
    expect(stored()?.state).not.toHaveProperty('executionId');
    expect(stored()?.state).not.toHaveProperty('streamUrl');
  });
});

describe('use-execution-store: storage is best effort', () => {
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  beforeEach(() => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
  });

  afterEach(() => {
    if (localStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
    }
  });

  it.each([
    [
      'a new run',
      () => setExecutionStarted('exec-2', '/api/executions/exec-2/stream'),
      { executionId: 'exec-2', status: 'pending' },
    ],
    [
      'a snapshot',
      () =>
        applySnapshot({
          executionId: 'exec-1',
          status: 'waiting',
          lastSequence: 2,
          events: [
            event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
            event({ type: 'node_waiting', nodeId: 'human-1' }),
          ],
        }),
      { status: 'waiting', nodeStates: { 'human-1': { status: 'waiting' } } },
    ],
    [
      'a live event',
      () => applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } })),
      { status: 'running' },
    ],
  ])('%s still lands in memory when the storage write throws', (_, action, expected) => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    expect(action).not.toThrow();

    expect(setItem).toHaveBeenCalled();
    expect(useExecutionStore.getState()).toMatchObject(expected);
  });

  it.each([
    ['is null', { value: null }],
    [
      'throws on access',
      {
        get: () => {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      },
    ],
  ])('a run still starts when localStorage %s from the first load', async (_, descriptor) => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor });
    vi.resetModules();
    const store = await import('./use-execution-store');

    expect(() => store.setExecutionStarted('exec-2', '/api/executions/exec-2/stream')).not.toThrow();

    expect(store.useExecutionStore.getState()).toMatchObject({ executionId: 'exec-2', status: 'pending' });
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
