import { create } from 'zustand';

import type {
  ExecutionEvent,
  ExecutionSnapshot,
  ExecutionStatus,
} from '@workflow-builder/types/workflow-execution/execution-events';

export type NodeExecutionStatus = 'idle' | 'waiting' | 'running' | 'completed' | 'failed' | 'skipped';

export type NodeExecutionState = {
  status: NodeExecutionStatus;
  output?: unknown;
  error?: { message: string; code?: string };
};

export type DemoExecutionStatus = ExecutionStatus | 'idle' | 'disconnected';

type ExecutionStore = {
  executionId: string | undefined;
  status: DemoExecutionStatus;
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

export const useExecutionStore = create<ExecutionStore>()(() => ({ ...emptyStore }));

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

export function setExecutionStatus(status: DemoExecutionStatus) {
  useExecutionStore.setState({ status });
}

export function applyConnectionLost() {
  const status = useExecutionStore.getState().status;
  if (!isTerminalStatus(status)) useExecutionStore.setState({ status: 'disconnected' });
}

export function applySnapshot(snapshot: ExecutionSnapshot) {
  const nodeStates: Record<string, NodeExecutionState> = {};
  for (const event of snapshot.events) applyEventToNodeStates(event, nodeStates);

  useExecutionStore.setState({
    executionId: snapshot.executionId,
    status: snapshot.status,
    nodeStates,
    events: deduplicateEvents(snapshot.events),
  });
}

export function applyEvent(event: ExecutionEvent) {
  useExecutionStore.setState((state) => {
    if (state.events.some((existing) => existing.sequence === event.sequence)) return state;

    const nodeStates = { ...state.nodeStates };
    applyEventToNodeStates(event, nodeStates);
    return {
      nodeStates,
      events: [...state.events, event].sort((left, right) => left.sequence - right.sequence),
      status: eventToExecutionStatus(event) ?? state.status,
    };
  });
}

function deduplicateEvents(events: ExecutionEvent[]) {
  const bySequence = new Map(events.map((event) => [event.sequence, event]));
  return [...bySequence.values()].sort((left, right) => left.sequence - right.sequence);
}

function applyEventToNodeStates(event: ExecutionEvent, states: Record<string, NodeExecutionState>) {
  switch (event.type) {
    case 'node_waiting': {
      states[event.nodeId] = { status: 'waiting' };
      break;
    }
    case 'node_started': {
      states[event.nodeId] = { status: 'running' };
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

export function isTerminalStatus(status: DemoExecutionStatus): boolean {
  return status === 'completed' || status === 'incomplete' || status === 'failed' || status === 'cancelled';
}
