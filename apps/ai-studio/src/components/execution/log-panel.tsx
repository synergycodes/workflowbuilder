import { useSingleSelectedElement } from '@workflowbuilder/sdk';
import { useEffect, useRef, useState } from 'react';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import styles from './log-panel.module.css';

import { selectNode, toggleLog, useExecutionStore } from '../../stores/use-execution-store';
import { extractOutputText } from '../../utils/extract-output-text';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function EventRow({ event, selectedNodeId }: { event: ExecutionEvent; selectedNodeId: string | null }) {
  const [expanded, setExpanded] = useState(false);

  const nodeId = (event as { nodeId?: string | null }).nodeId;
  const isNode = typeof nodeId === 'string' && nodeId.length > 0;
  const highlighted = isNode && nodeId === selectedNodeId;
  const label = event.type.replaceAll('_', ' ');

  let detail: string | undefined;
  switch (event.type) {
    case 'node_completed': {
      detail = extractOutputText(event.payload.output);

      break;
    }
    case 'node_failed': {
      detail = event.payload.error.message;

      break;
    }
    case 'execution_failed': {
      detail = event.payload.error.message;

      break;
    }
    // No default
  }

  const hasDetail = !!detail;
  const truncated = detail && detail.length > 120 ? detail.slice(0, 120) + '…' : detail;

  return (
    <div
      data-node-id={isNode ? nodeId : undefined}
      className={`${styles['event']} ${styles[`event--${event.type.split('_')[0]}`] ?? ''} ${highlighted ? styles['event--highlighted'] : ''}`}
    >
      <div className={styles['event-header']} onClick={() => hasDetail && setExpanded((v) => !v)}>
        <span className={`${styles['badge']} ${styles[`badge--${event.type}`]}`}>{label}</span>
        {isNode && <span className={styles['node-id']}>{(event as { nodeId: string }).nodeId.slice(0, 8)}</span>}
        <span className={styles['time']}>{formatTime(event.timestamp)}</span>
        {hasDetail && <span className={styles['toggle']}>{expanded ? '▲' : '▼'}</span>}
      </div>
      {hasDetail && (
        <div className={`${styles['detail']} ${expanded ? styles['detail--expanded'] : ''}`}>
          {expanded ? detail : truncated}
        </div>
      )}
    </div>
  );
}

export function ExecutionLogPanel() {
  const events = useExecutionStore((s) => s.events);
  const status = useExecutionStore((s) => s.status);
  const selectedNodeId = useExecutionStore((s) => s.selectedNodeId);
  const collapsed = useExecutionStore((s) => s.logCollapsed);
  const canvasSelectedId = useSingleSelectedElement()?.node?.id;

  const bodyRef = useRef<HTMLDivElement>(null);

  // Selecting a node on the canvas highlights its log entry, without opening the log.
  useEffect(() => {
    if (canvasSelectedId) selectNode(canvasSelectedId);
  }, [canvasSelectedId]);

  useEffect(() => {
    if (!collapsed && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [events.length, collapsed]);

  useEffect(() => {
    if (!selectedNodeId || collapsed) return;
    bodyRef.current?.querySelector(`[data-node-id="${selectedNodeId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedNodeId, collapsed]);

  if (events.length === 0 && status === 'idle') return null;

  return (
    <div className={`${styles['panel']} ${collapsed ? styles['panel--collapsed'] : ''}`}>
      <div className={styles['header']} onClick={toggleLog}>
        <span className={styles['title']}>Execution Log</span>
        <span className={`${styles['status']} ${styles[`status--${status}`]}`}>{status}</span>
        <span className={styles['toggle']}>{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <div ref={bodyRef} className={styles['body']}>
          {events.map((event) => (
            <EventRow key={`${event.executionId}-${event.sequence}`} event={event} selectedNodeId={selectedNodeId} />
          ))}
        </div>
      )}
    </div>
  );
}
