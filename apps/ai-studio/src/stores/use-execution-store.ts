import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import {
  type ExecutionEvent,
  type ExecutionSnapshot,
  type ExecutionStatus,
  TERMINAL_EXECUTION_STATUSES,
} from '@workflow-builder/types/workflow-execution/execution-events';

type NodeExecutionStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped';

export type NodeExecutionState = {
  status: NodeExecutionStatus;
  output?: unknown;
  error?: { message: string; code?: string };
};

export type RunStatus = ExecutionStatus | 'idle' | 'disconnected';

type ExecutionStore = {
  executionId: string | undefined;
  status: RunStatus;
  streamUrl: string | undefined;
  nodeStates: Record<string, NodeExecutionState>;
  events: ExecutionEvent[];
  isLogCollapsed: boolean;
  isStopUnreachable: boolean;
};

const emptyStore: ExecutionStore = {
  executionId: undefined,
  status: 'idle',
  streamUrl: undefined,
  nodeStates: {},
  events: [],
  isLogCollapsed: false,
  isStopUnreachable: false,
};

type PersistedRun = Pick<ExecutionStore, 'executionId' | 'streamUrl' | 'status' | 'isLogCollapsed'>;

const persistedDefaults: PersistedRun = {
  executionId: undefined,
  streamUrl: undefined,
  status: 'idle',
  isLogCollapsed: false,
};

const TERMINAL_STATUSES: ReadonlySet<string> = new Set(TERMINAL_EXECUTION_STATUSES);

export const useExecutionStore = create<ExecutionStore>()(
  devtools(
    persist(() => ({ ...emptyStore }), {
      name: 'ai-studio:execution',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // A finished run is dropped on purpose: a reload after one starts on an idle canvas.
      partialize: ({ executionId, streamUrl, status, isLogCollapsed }): PersistedRun =>
        !isRunAlive(status) || !executionId || !streamUrl
          ? { ...persistedDefaults, isLogCollapsed }
          : { executionId, streamUrl, status, isLogCollapsed },
      // Without migrate, zustand drops the whole entry on a version mismatch.
      migrate: (persisted) => ({ ...persistedDefaults, ...(persisted as Partial<PersistedRun>) }),
    }),
    { name: 'aiStudioExecutionStore' },
  ),
);

export function resetExecution() {
  useExecutionStore.setState((state) => ({ ...emptyStore, isLogCollapsed: state.isLogCollapsed }));
}

// `disconnected` counts: a lost stream says nothing about the run on the server.
export function isRunAlive(status: RunStatus): boolean {
  return status !== 'idle' && !TERMINAL_STATUSES.has(status);
}

export function setExecutionStarted(executionId: string, streamUrl: string) {
  useExecutionStore.setState({
    executionId,
    status: 'pending',
    streamUrl,
    nodeStates: {},
    events: [],
    isLogCollapsed: false,
    isStopUnreachable: false,
  });
}

export function applyConnectionLost() {
  useExecutionStore.setState({ status: 'disconnected' });
}

// Not persisted on purpose: a reload re-derives it from the next Stop.
export function applyStopUnreachable() {
  useExecutionStore.setState({ isStopUnreachable: true });
}

export function clearStopUnreachable() {
  useExecutionStore.setState({ isStopUnreachable: false });
}

// Replayed through the same rule as live events, so a reload shows what live showed. The row's
// status is only the seed: the engine never writes `running` at start and its `waiting` write is advisory.
export function applySnapshot(snapshot: ExecutionSnapshot) {
  const nodeStates: Record<string, NodeExecutionState> = {};
  let status: ExecutionStore['status'] = snapshot.status;

  for (const event of snapshot.events) {
    applyEventToNodeStates(event, nodeStates);
    status = nextRunStatus(status, event, nodeStates);
  }

  useExecutionStore.setState({
    executionId: snapshot.executionId,
    status,
    nodeStates,
    events: snapshot.events,
    isStopUnreachable: false,
  });
}

export function applyEvent(event: ExecutionEvent) {
  useExecutionStore.setState((state) => {
    const nodeStates = { ...state.nodeStates };
    applyEventToNodeStates(event, nodeStates);

    return {
      nodeStates,
      events: [...state.events, event],
      status: nextRunStatus(state.status, event, nodeStates),
      isStopUnreachable: false,
    };
  });
}

function nextRunStatus(
  current: ExecutionStore['status'],
  event: ExecutionEvent,
  nodeStates: Record<string, NodeExecutionState>,
): ExecutionStore['status'] {
  return eventToExecutionStatus(event) ?? deriveRunStatus(current, nodeStates);
}

// No event carries the run's waiting status, so it is derived the way the engine derives it:
// waiting while any node is parked, running again once the last one resolves.
function deriveRunStatus(current: ExecutionStore['status'], nodeStates: Record<string, NodeExecutionState>) {
  if (current !== 'running' && current !== 'waiting') {
    return current;
  }
  return Object.values(nodeStates).some((node) => node.status === 'waiting') ? 'waiting' : 'running';
}

function applyEventToNodeStates(event: ExecutionEvent, states: Record<string, NodeExecutionState>) {
  switch (event.type) {
    // A cancel records no node_failed for a parked node, so its hourglass would outlive the run.
    case 'execution_completed':
    case 'execution_incomplete':
    case 'execution_failed':
    case 'execution_cancelled': {
      for (const [nodeId, state] of Object.entries(states)) {
        if (state.status === 'running' || state.status === 'waiting') {
          states[nodeId] = { status: 'idle' };
        }
      }
      break;
    }
    case 'node_started': {
      states[event.nodeId] = { status: 'running' };
      break;
    }
    case 'node_waiting': {
      states[event.nodeId] = { status: 'waiting' };
      break;
    }
    case 'node_completed': {
      states[event.nodeId] = { status: 'completed', output: event.payload.output };
      break;
    }
    case 'node_failed': {
      states[event.nodeId] = { status: 'failed', error: event.payload.error };
      break;
    }
    case 'node_skipped': {
      states[event.nodeId] = { status: 'skipped' };
      break;
    }
  }
}

export function setLogCollapsed(isLogCollapsed: boolean) {
  useExecutionStore.setState({ isLogCollapsed });
}

export function toggleLog() {
  setLogCollapsed(!useExecutionStore.getState().isLogCollapsed);
}

function eventToExecutionStatus(event: ExecutionEvent): ExecutionStatus | undefined {
  switch (event.type) {
    case 'execution_started': {
      return 'running';
    }
    case 'execution_completed': {
      return 'completed';
    }
    case 'execution_incomplete': {
      return 'incomplete';
    }
    case 'execution_failed': {
      return 'failed';
    }
    case 'execution_cancelled': {
      return 'cancelled';
    }
    default: {
      return undefined;
    }
  }
}
