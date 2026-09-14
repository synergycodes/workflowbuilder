import type { ExecutionStore } from '@workflowbuilder/temporal';

import type { RunEvent } from './protocol';

type Listener = (event: RunEvent) => void;

export type RunStore = ExecutionStore & {
  subscribe(executionId: string, listener: Listener): () => void;
  history(executionId: string): RunEvent[];
};

// The plugin decides what is emitted and in which order; this is where it lands. Here: the
// terminal, plus anyone subscribed (the bridge's event streams). A real application writes
// rows here instead. The port is the same.
export function createRunStore(): RunStore {
  const histories = new Map<string, RunEvent[]>();
  const listeners = new Map<string, Set<Listener>>();

  function publish(executionId: string, event: RunEvent): void {
    const history = histories.get(executionId) ?? [];
    // Activities are at-least-once: a retried emit carries the same sequence, and keying on
    // (executionId, sequence) is how delivery stays idempotent.
    if (event.kind === 'event' && history.some((held) => held.kind === 'event' && held.sequence === event.sequence)) {
      return;
    }
    history.push(event);
    histories.set(executionId, history);
    for (const listener of listeners.get(executionId) ?? []) listener(event);
  }

  return {
    async emitExecutionEvent(executionId, sequence, type, payload, nodeId) {
      const where = nodeId ? ` (${nodeId})` : '';
      const what = payload === undefined ? '' : ` ${JSON.stringify(payload)}`;
      console.log(`[${executionId.slice(0, 8)}] #${String(sequence).padStart(2, ' ')} ${type}${where}${what}`);
      publish(executionId, { kind: 'event', sequence, type, nodeId, payload });
    },

    async updateExecutionStatus(executionId, status, errorMessage) {
      console.log(`[${executionId.slice(0, 8)}] status ${status}${errorMessage ? `: ${errorMessage}` : ''}`);
      publish(executionId, { kind: 'status', status, errorMessage });
    },

    subscribe(executionId, listener) {
      const set = listeners.get(executionId) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(executionId, set);
      return () => {
        set.delete(listener);
      };
    },

    history(executionId) {
      return [...(histories.get(executionId) ?? [])];
    },
  };
}
