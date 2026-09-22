import {
  type ExecutionEvent,
  type ExecutionEventType,
  type ExecutionSnapshot,
  type ExecutionStatus,
  TERMINAL_EXECUTION_EVENT_TYPES,
  TERMINAL_EXECUTION_STATUSES,
} from '@workflow-builder/types/workflow-execution/execution-events';

import { BACKEND_URL } from '../config';
import { applyConnectionLost, applyEvent, applySnapshot } from '../stores/use-execution-store';

const TERMINAL_TYPES: ReadonlySet<ExecutionEventType> = new Set(TERMINAL_EXECUTION_EVENT_TYPES);
const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set(TERMINAL_EXECUTION_STATUSES);
export const MAX_RETRIES = 5;

export function connectExecutionStream(executionId: string, streamUrl: string): () => void {
  const url = `${BACKEND_URL}${streamUrl}`;
  const eventSource = new EventSource(url);
  let retries = 0;

  eventSource.addEventListener('message', (message: MessageEvent) => {
    if (!message.data) return;

    retries = 0;

    const parsed = JSON.parse(message.data as string) as ExecutionSnapshot | ExecutionEvent;

    if ('events' in parsed && 'lastSequence' in parsed) {
      const snapshot = parsed as ExecutionSnapshot;
      applySnapshot(snapshot);

      if (TERMINAL_STATUSES.has(snapshot.status)) {
        eventSource.close();
        return;
      }
    } else {
      const event = parsed as ExecutionEvent;
      applyEvent(event);

      if (TERMINAL_TYPES.has(event.type)) {
        eventSource.close();
      }
    }
  });

  eventSource.addEventListener('error', () => {
    // CLOSED = refused by the server, no browser retry (a blip stays CONNECTING and retries alone).
    // The run id stays persisted for Stop to resolve; a stale one needs a probe once anything else
    // sends it to the server while disconnected (follow-up: stale-execution-id-probe).
    if (eventSource.readyState === EventSource.CLOSED || ++retries > MAX_RETRIES) {
      eventSource.close();
      applyConnectionLost();
    }
  });

  return () => {
    eventSource.close();
  };
}
