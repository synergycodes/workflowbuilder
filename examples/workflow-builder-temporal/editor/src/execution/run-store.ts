import { create } from 'zustand';

import type { RunEvent } from '../../../src/protocol';

export type NodeRunStatus = 'running' | 'completed' | 'failed' | 'skipped';
export type RunPhase = 'idle' | 'starting' | 'running' | 'completed' | 'incomplete' | 'failed' | 'cancelled' | 'error';

export type RunState = {
  phase: RunPhase;
  amount?: number;
  executionId?: string;
  temporalUiUrl?: string;
  message?: string;
  nodeStatuses: Record<string, NodeRunStatus>;
};

const IDLE: RunState = { phase: 'idle', nodeStatuses: {} };

export const useRunStore = create<RunState>(() => IDLE);

export function runStarting(): void {
  useRunStore.setState({ ...IDLE, phase: 'starting' }, true);
}

export function runStarted(executionId: string, temporalUiUrl: string, amount: number): void {
  useRunStore.setState({ phase: 'running', executionId, temporalUiUrl, amount });
}

export function runErrored(message: string): void {
  useRunStore.setState({ phase: 'error', message });
}

const TERMINAL_PHASES: ReadonlySet<string> = new Set(['completed', 'incomplete', 'failed', 'cancelled']);

const NODE_STATUS_BY_EVENT: Record<string, NodeRunStatus> = {
  node_started: 'running',
  node_completed: 'completed',
  node_failed: 'failed',
  node_skipped: 'skipped',
};

// A retried activity emits no event, so a node keeps spinning through its attempts. The
// terminal status is written after the terminal event, so ending on it loses nothing.
export function applyRunEvent(event: RunEvent): void {
  useRunStore.setState((state) => {
    if (event.kind === 'status') {
      return TERMINAL_PHASES.has(event.status) ? { phase: event.status as RunPhase, message: event.errorMessage } : {};
    }
    const status = NODE_STATUS_BY_EVENT[event.type];
    if (!status || !event.nodeId) return {};
    return { nodeStatuses: { ...state.nodeStatuses, [event.nodeId]: status } };
  });
}

export function isRunOver(phase: RunPhase): boolean {
  return TERMINAL_PHASES.has(phase) || phase === 'error';
}
