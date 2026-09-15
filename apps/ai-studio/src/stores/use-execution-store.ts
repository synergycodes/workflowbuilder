import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import type {
  ExecutionEvent,
  ExecutionSnapshot,
  ExecutionStatus,
} from '@workflow-builder/types/workflow-execution/execution-events';

type NodeExecutionStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped';

export type NodeExecutionState = {
  status: NodeExecutionStatus;
  output?: unknown;
  error?: { message: string; code?: string };
};

type ExecutionStore = {
  executionId: string | undefined;
  status: ExecutionStatus | 'idle' | 'disconnected';
  streamUrl: string | undefined;
  nodeStates: Record<string, NodeExecutionState>;
  events: ExecutionEvent[];
  isLogCollapsed: boolean;
};

const emptyStore: ExecutionStore = {
  executionId: undefined,
  status: 'idle',
  streamUrl: undefined,
  nodeStates: {},
  events: [],
  isLogCollapsed: false,
};

export const useExecutionStore = create<ExecutionStore>()(
  devtools(
    persist(() => ({ ...emptyStore }), {
      name: 'ai-studio:execution-log',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ isLogCollapsed: state.isLogCollapsed }),
    }),
    { name: 'aiStudioExecutionStore' },
  ),
);

export function resetExecution() {
  useExecutionStore.setState((state) => ({ ...emptyStore, isLogCollapsed: state.isLogCollapsed }));
}

export function setExecutionStarted(executionId: string, streamUrl: string) {
  useExecutionStore.setState({
    executionId,
    status: 'pending',
    streamUrl,
    nodeStates: {},
    events: [],
    isLogCollapsed: false,
  });
}

export function applyConnectionLost() {
  useExecutionStore.setState({ status: 'disconnected' });
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
