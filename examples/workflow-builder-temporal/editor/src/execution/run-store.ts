import { closeSnackbar, showSnackbar } from '@workflowbuilder/sdk';
import { create } from 'zustand';

import { type RunEvent, type TerminalStatus, isTerminalStatus } from '../../../shared/protocol';

export type NodeRunStatus = 'running' | 'completed' | 'failed' | 'skipped';
export type RunPhase = 'idle' | 'starting' | 'running' | TerminalStatus | 'error';

export type RunState = {
  phase: RunPhase;
  temporalUiUrl?: string;
  message?: string;
  nodeStatuses: Record<string, NodeRunStatus>;
};

const IDLE: RunState = { phase: 'idle', nodeStatuses: {} };

export const useRunStore = create<RunState>(() => IDLE);

let failureSnackbarKey: string | undefined;

function showFailure(): void {
  const { phase, message, temporalUiUrl } = useRunStore.getState();
  failureSnackbarKey = showSnackbar({
    variant: 'error',
    title: phase === 'error' ? 'Could not run the diagram' : `Run ${phase}`,
    subtitle: message,
    ...(temporalUiUrl && {
      buttonLabel: 'Open in Temporal UI',
      onButtonClick: () => globalThis.open(temporalUiUrl, '_blank', 'noreferrer'),
    }),
    autoHideDuration: null,
  });
}

function hideFailure(): void {
  if (failureSnackbarKey) closeSnackbar(failureSnackbarKey);
  failureSnackbarKey = undefined;
}

export function runStarting(): void {
  hideFailure();
  useRunStore.setState({ ...IDLE, phase: 'starting' }, true);
}

export function runStarted(temporalUiUrl: string): void {
  useRunStore.setState({ phase: 'running', temporalUiUrl });
}

export function runErrored(message: string): void {
  useRunStore.setState({ phase: 'error', message });
  showFailure();
}

export function runCleared(): void {
  hideFailure();
  useRunStore.setState(IDLE, true);
}

const NODE_STATUS_BY_EVENT: Record<string, NodeRunStatus> = {
  node_started: 'running',
  node_completed: 'completed',
  node_failed: 'failed',
  node_skipped: 'skipped',
};

// A retried activity emits no event, so a node keeps spinning through its attempts. The
// terminal status is written after the terminal event, so ending on it loses nothing.
export function applyRunEvent(event: RunEvent): void {
  if (event.kind === 'status') {
    if (!isTerminalStatus(event.status)) return;
    useRunStore.setState({ phase: event.status, message: event.errorMessage });
    if (event.status !== 'completed') showFailure();
    return;
  }
  const status = NODE_STATUS_BY_EVENT[event.type];
  const { nodeId } = event;
  if (!status || !nodeId) return;
  useRunStore.setState((state) => ({ nodeStatuses: { ...state.nodeStatuses, [nodeId]: status } }));
}

export function isRunBusy(phase: RunPhase): boolean {
  return phase === 'starting' || phase === 'running';
}

export function isRunOver(phase: RunPhase): boolean {
  return isTerminalStatus(phase) || phase === 'error';
}

export function isRunFailure(phase: RunPhase): boolean {
  return isRunOver(phase) && phase !== 'completed';
}
