import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import type { ExecutionEvent, NodeSkipReason } from '@workflow-builder/types/workflow-execution/execution-events';

import styles from './execution-log-panel.module.css';

import { toggleLog, useExecutionStore } from '../../stores/use-execution-store';

const SKIP_LABEL: Record<NodeSkipReason, string> = {
  branch_not_taken: 'branch not taken',
  upstream_skipped: 'upstream skipped',
  error_route_not_taken: 'error branch not taken',
};

function eventDetail(event: ExecutionEvent): string | undefined {
  switch (event.type) {
    case 'node_completed': {
      return formatUnknown(event.payload.output);
    }
    case 'node_failed':
    case 'execution_failed': {
      return event.payload.error.message;
    }
    case 'node_skipped': {
      return SKIP_LABEL[event.payload.reason];
    }
    case 'execution_incomplete': {
      return event.payload.deadEnds.map(({ nodeId, port }) => `${nodeId}: unconnected "${port}" route`).join('\n');
    }
    case 'execution_cancelled': {
      return event.payload?.reason;
    }
    default: {
      return undefined;
    }
  }
}

function formatUnknown(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function EventRow({ event }: { event: ExecutionEvent }) {
  const [expanded, setExpanded] = useState(false);
  const nodeId = 'nodeId' in event ? event.nodeId : undefined;
  const detail = eventDetail(event);
  return (
    <li className={styles['event']}>
      <button
        type="button"
        className={styles['event-button']}
        disabled={!detail}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className={clsx(styles['badge'], styles[`badge--${event.type}`])}>{event.type.replaceAll('_', ' ')}</span>
        {nodeId && <code className={styles['node-id']}>{nodeId}</code>}
        <time className={styles['time']}>{new Date(event.timestamp).toLocaleTimeString()}</time>
      </button>
      {detail && <pre className={styles['detail']}>{expanded ? detail : detail.slice(0, 180)}</pre>}
    </li>
  );
}

export function ExecutionLogPanel() {
  const events = useExecutionStore((state) => state.events);
  const status = useExecutionStore((state) => state.status);
  const executionId = useExecutionStore((state) => state.executionId);
  const collapsed = useExecutionStore((state) => state.isLogCollapsed);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!collapsed) listRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [events.length, collapsed]);

  if (events.length === 0 && status === 'idle') return null;

  return (
    <aside className={clsx(styles['panel'], { [styles['panel--collapsed']]: collapsed })} aria-label="Execution log">
      <button type="button" className={styles['header']} onClick={toggleLog}>
        <strong>Execution log</strong>
        {executionId && <code title={executionId}>{executionId.slice(0, 8)}</code>}
        <span className={clsx(styles['status'], styles[`status--${status}`])}>{status}</span>
        <span aria-hidden="true">{collapsed ? '▲' : '▼'}</span>
      </button>
      {!collapsed && (
        <ol ref={listRef} className={styles['events']} aria-live="polite">
          {events.map((event) => (
            <EventRow key={`${event.executionId}-${event.sequence}`} event={event} />
          ))}
        </ol>
      )}
    </aside>
  );
}
