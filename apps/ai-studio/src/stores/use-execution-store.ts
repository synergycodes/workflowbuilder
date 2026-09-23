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

/** One wait of a decision node: the run, the node, and which time the node parked in it. */
export type DecisionWait = { executionId: string; nodeId: string; attempt: number };

/** What a person has entered for a wait and not yet sent. */
export type DecisionDraft = { values?: Record<string, unknown>; reason?: string };

/** Where the decision sent for a wait stands until the run records it. */
type DecisionSend = { status: 'sending' } | { status: 'accepted' } | { status: 'refused'; message: string };

type ExecutionStore = {
  executionId: string | undefined;
  status: ExecutionStatus | 'idle' | 'disconnected';
  streamUrl: string | undefined;
  nodeStates: Record<string, NodeExecutionState>;
  events: ExecutionEvent[];
  isLogCollapsed: boolean;
  /** By {@link waitKey}. */
  decisionDrafts: Record<string, DecisionDraft>;
  /** By {@link waitKey}. */
  decisionSends: Record<string, DecisionSend>;
};

const emptyStore: ExecutionStore = {
  executionId: undefined,
  status: 'idle',
  streamUrl: undefined,
  nodeStates: {},
  events: [],
  isLogCollapsed: false,
  decisionDrafts: {},
  decisionSends: {},
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
    decisionDrafts: {},
    decisionSends: {},
  });
}

export function waitKey({ executionId, nodeId, attempt }: DecisionWait): string {
  return `${executionId}:${nodeId}:${attempt}`;
}

// A form that closes, or an answer that arrives, after its run was replaced leaves nothing in the new one.
function updateWait(wait: DecisionWait, update: (state: ExecutionStore, key: string) => Partial<ExecutionStore>) {
  useExecutionStore.setState((state) =>
    state.executionId === wait.executionId ? update(state, waitKey(wait)) : state,
  );
}

export function saveDecisionDraft(wait: DecisionWait, change: DecisionDraft) {
  updateWait(wait, (state, key) => ({
    decisionDrafts: { ...state.decisionDrafts, [key]: { ...state.decisionDrafts[key], ...change } },
  }));
}

export function saveDecisionSend(wait: DecisionWait, send: DecisionSend) {
  updateWait(wait, (state, key) => ({ decisionSends: { ...state.decisionSends, [key]: send } }));
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
