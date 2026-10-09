import { create } from 'zustand';
import { type StateStorage, createJSONStorage, devtools, persist } from 'zustand/middleware';

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

/** One wait of a decision node: the run, the node, and which time the node parked in it. */
export type DecisionWait = { executionId: string; nodeId: string; attempt: number };

/** What a person has entered for a wait and not yet sent. */
export type DecisionDraft = {
  values?: Record<string, unknown>;
  /** The fields the form showed, so a field the draft was not taken under starts from the proposal. */
  fields?: string[];
  reason?: string;
  /** By the resume action's name: each further action keeps its own note. */
  comments?: Record<string, string>;
};

/** Where the decision sent for a wait stands until the run records it. */
type DecisionSend = { status: 'sending' } | { status: 'accepted' } | { status: 'refused'; message: string };

type ExecutionStore = {
  executionId: string | undefined;
  status: RunStatus;
  streamUrl: string | undefined;
  nodeStates: Record<string, NodeExecutionState>;
  events: ExecutionEvent[];
  isLogCollapsed: boolean;
  isStopRequested: boolean;
  /** By {@link waitKey}. */
  decisionDrafts: Record<string, DecisionDraft>;
  /** By {@link waitKey}. */
  decisionSends: Record<string, DecisionSend>;
  /** The waiting node whose decision form takes the focus when it next renders; Decide asks for it. */
  decisionFocusRequest: string | undefined;
};

const emptyStore: ExecutionStore = {
  executionId: undefined,
  status: 'idle',
  streamUrl: undefined,
  nodeStates: {},
  events: [],
  isLogCollapsed: false,
  isStopRequested: false,
  decisionDrafts: {},
  decisionSends: {},
  decisionFocusRequest: undefined,
};

const TERMINAL_STATUSES: ReadonlySet<string> = new Set(TERMINAL_EXECUTION_STATUSES);

// Every store write persists, so a storage that throws would break the run; it costs only the log preference.
const bestEffortSessionStorage: StateStorage = {
  getItem: (name) => bestEffort(() => sessionStorage.getItem(name)) ?? null,
  setItem: (name, value) => bestEffort(() => sessionStorage.setItem(name, value)),
  removeItem: (name) => bestEffort(() => sessionStorage.removeItem(name)),
};

function bestEffort<T>(action: () => T): T | undefined {
  try {
    return action();
  } catch {
    return;
  }
}

export const useExecutionStore = create<ExecutionStore>()(
  devtools(
    persist(() => ({ ...emptyStore }), {
      name: 'ai-studio:execution-log',
      storage: createJSONStorage(() => bestEffortSessionStorage),
      partialize: (state) => ({ isLogCollapsed: state.isLogCollapsed }),
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

/** A run started here opens the log; a run the address reopens keeps the tab's choice. */
export function setExecutionStarted(executionId: string, streamUrl: string, { keepLogChoice = false } = {}) {
  useExecutionStore.setState((state) => ({
    executionId,
    status: 'pending',
    streamUrl,
    nodeStates: {},
    events: [],
    isLogCollapsed: keepLogChoice && state.isLogCollapsed,
    isStopRequested: false,
    decisionDrafts: {},
    decisionSends: {},
    decisionFocusRequest: undefined,
  }));
}

// The backend refuses a decision while the run is cancelling, though the replay still shows the node waiting.
export function isDecidable(status: RunStatus): boolean {
  return status !== 'cancelling';
}

export function requestDecisionFocus(nodeId: string) {
  useExecutionStore.setState({ decisionFocusRequest: nodeId });
}

export function clearDecisionFocusRequest() {
  useExecutionStore.setState({ decisionFocusRequest: undefined });
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

// Keeps the run id for Stop; any other caller must probe it first (follow-up: stale-execution-id-probe).
export function applyConnectionLost() {
  useExecutionStore.setState((state) => (isRunAlive(state.status) ? { status: 'disconnected' } : {}));
}

export function applyStopRequested() {
  useExecutionStore.setState({ isStopRequested: true });
}

// Replayed through the same rule as live events, so a reload shows what live showed. The row seeds
// the replay: the engine never writes `running` at start and its `waiting` write is advisory.
export function applySnapshot(snapshot: ExecutionSnapshot) {
  const nodeStates: Record<string, NodeExecutionState> = {};
  let status: RunStatus = snapshot.status;

  for (const event of snapshot.events) {
    applyEventToNodeStates(event, nodeStates);
    status = nextRunStatus(status, event, nodeStates);
  }

  // Two facts only the row carries: a cancel the backend accepted, and a terminal status whose
  // event never landed. No event expresses either, so the row wins over an alive replay.
  if ((snapshot.status === 'cancelling' || TERMINAL_STATUSES.has(snapshot.status)) && isRunAlive(status)) {
    status = snapshot.status;
    if (TERMINAL_STATUSES.has(status)) {
      settleNodesInFlight(nodeStates);
    }
  }

  useExecutionStore.setState({
    executionId: snapshot.executionId,
    status,
    nodeStates,
    events: snapshot.events,
    decisionFocusRequest: whileWaiting(useExecutionStore.getState().decisionFocusRequest, nodeStates),
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
      decisionFocusRequest: whileWaiting(state.decisionFocusRequest, nodeStates),
    };
  });
}

// A focus request lasts only while its node waits, so a later wait of the same node does not inherit it.
function whileWaiting(nodeId: string | undefined, nodeStates: Record<string, NodeExecutionState>): string | undefined {
  return nodeId !== undefined && nodeStates[nodeId]?.status === 'waiting' ? nodeId : undefined;
}

function nextRunStatus(
  current: RunStatus,
  event: ExecutionEvent,
  nodeStates: Record<string, NodeExecutionState>,
): RunStatus {
  return eventToExecutionStatus(event) ?? deriveRunStatus(current, nodeStates);
}

// No event carries the run's waiting status, so it is derived the way the engine derives it:
// waiting while any node is parked, running again once the last one resolves.
function deriveRunStatus(current: RunStatus, nodeStates: Record<string, NodeExecutionState>) {
  if (current !== 'running' && current !== 'waiting') {
    return current;
  }
  return Object.values(nodeStates).some((node) => node.status === 'waiting') ? 'waiting' : 'running';
}

function applyEventToNodeStates(event: ExecutionEvent, states: Record<string, NodeExecutionState>) {
  switch (event.type) {
    case 'execution_completed':
    case 'execution_incomplete':
    case 'execution_failed':
    case 'execution_cancelled': {
      settleNodesInFlight(states);
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

// A cancel records no node_failed for a parked node, so its wait would outlive the run.
function settleNodesInFlight(states: Record<string, NodeExecutionState>) {
  for (const [nodeId, state] of Object.entries(states)) {
    if (state.status === 'running' || state.status === 'waiting') {
      states[nodeId] = { status: 'idle' };
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
