import type { ExecutionEvent, ExecutionSnapshot } from '@workflow-builder/types/workflow-execution/execution-events';

import { BACKEND_URL } from '../config';
import { applyConnectionLost, applyEvent, applySnapshot } from '../stores/use-execution-store';

const TERMINAL_TYPES = new Set(['execution_completed', 'execution_failed', 'execution_cancelled']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);
const MAX_RETRIES = 5;

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
    if (++retries > MAX_RETRIES) {
      eventSource.close();
      applyConnectionLost();
    }
  });

  return () => {
    eventSource.close();
  };
}
