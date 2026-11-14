import {
  type ExecutionEvent,
  type ExecutionEventType,
  type ExecutionSnapshot,
  type ExecutionStatus,
  TERMINAL_EXECUTION_EVENT_TYPES,
  TERMINAL_EXECUTION_STATUSES,
} from '@workflow-builder/types/workflow-execution/execution-events';

import { backendUrl } from '../config';
import { applyConnectionLost, applyEvent, applySnapshot } from '../stores/use-execution-store';

const TERMINAL_TYPES: ReadonlySet<ExecutionEventType> = new Set(TERMINAL_EXECUTION_EVENT_TYPES);
const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set(TERMINAL_EXECUTION_STATUSES);
const MAX_ERRORS = 5;

type EventSourceLike = Pick<EventSource, 'addEventListener' | 'close'>;
type EventSourceFactory = (url: string) => EventSourceLike;

export type ExecutionStreamHandlers = {
  applySnapshot: (snapshot: ExecutionSnapshot) => void;
  applyEvent: (event: ExecutionEvent) => void;
  applyConnectionLost: () => void;
};

const defaultHandlers: ExecutionStreamHandlers = { applySnapshot, applyEvent, applyConnectionLost };

export function resolveStreamUrl(streamUrl: string): string {
  if (/^https?:\/\//i.test(streamUrl)) return streamUrl;
  return backendUrl(streamUrl);
}

export function connectExecutionStream(
  streamUrl: string,
  handlers: ExecutionStreamHandlers = defaultHandlers,
  createEventSource: EventSourceFactory = (url) => new EventSource(url),
): () => void {
  const eventSource = createEventSource(resolveStreamUrl(streamUrl));
  let errors = 0;
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    eventSource.close();
  };

  eventSource.addEventListener('message', (message) => {
    if (closed || !(message instanceof MessageEvent) || !message.data) return;
    errors = 0;

    try {
      const parsed = JSON.parse(String(message.data)) as unknown;
      if (isSnapshot(parsed)) {
        handlers.applySnapshot(parsed);
        if (TERMINAL_STATUSES.has(parsed.status)) close();
        return;
      }
      if (isEvent(parsed)) {
        handlers.applyEvent(parsed);
        if (TERMINAL_TYPES.has(parsed.type)) close();
      }
    } catch {
      // A malformed frame does not poison an otherwise reconnectable stream.
    }
  });

  eventSource.addEventListener('error', () => {
    if (closed) return;
    errors += 1;
    if (errors > MAX_ERRORS) {
      close();
      handlers.applyConnectionLost();
    }
  });

  return close;
}

function isSnapshot(value: unknown): value is ExecutionSnapshot {
  if (!isRecord(value)) return false;
  return (
    value['type'] === 'execution_snapshot' &&
    typeof value['executionId'] === 'string' &&
    typeof value['lastSequence'] === 'number' &&
    typeof value['status'] === 'string' &&
    Array.isArray(value['events'])
  );
}

function isEvent(value: unknown): value is ExecutionEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value['executionId'] === 'string' &&
    typeof value['sequence'] === 'number' &&
    typeof value['timestamp'] === 'string' &&
    typeof value['type'] === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
