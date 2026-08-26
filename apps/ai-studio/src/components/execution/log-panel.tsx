import { useSingleSelectedElement } from '@workflowbuilder/sdk';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import type { ExecutionEvent, NodeSkipReason } from '@workflow-builder/types/workflow-execution/execution-events';

import styles from './log-panel.module.css';

import { useRightPanelAnchor } from '../../hooks/use-right-panel-anchor';
import { toggleLog, useExecutionStore } from '../../stores/use-execution-store';
import { extractOutputText } from '../../utils/extract-output-text';

const SKIP_REASON_LABEL: Record<NodeSkipReason, string> = {
  branch_not_taken: 'branch not taken',
  upstream_skipped: 'upstream skipped',
  error_route_not_taken: 'error branch not taken',
};

const DETAIL_PREVIEW_CHARS = 120;
const NODE_ID_PREVIEW_CHARS = 8;
const AT_BOTTOM_TOLERANCE_PX = 4;

function formatTime(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function EventRow({ event, selectedNodeId }: { event: ExecutionEvent; selectedNodeId: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const nodeId = (event as { nodeId?: string | null }).nodeId;
  const isNode = typeof nodeId === 'string' && nodeId.length > 0;
  const isHighlighted = isNode && nodeId === selectedNodeId;
  const label = event.type.replaceAll('_', ' ');
  const skipReason = event.type === 'node_skipped' ? SKIP_REASON_LABEL[event.payload.reason] : undefined;

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
  const truncated =
    detail && detail.length > DETAIL_PREVIEW_CHARS ? detail.slice(0, DETAIL_PREVIEW_CHARS) + '…' : detail;

  function handleToggle({ target }: React.MouseEvent) {
    const clickedInteractiveElement = target instanceof Element && !!target.closest('a, button');
    const isSelectingText = !!globalThis.getSelection()?.toString();

    if (hasDetail && !clickedInteractiveElement && !isSelectingText) {
      setIsExpanded((current) => !current);
    }
  }

  return (
    <div
      data-node-id={isNode ? nodeId : undefined}
      className={clsx(styles['event'], {
        [styles['event--toggleable']]: hasDetail,
        [styles['event--highlighted']]: isHighlighted,
      })}
      onClick={handleToggle}
    >
      <div className={styles['event-header']}>
        <span className={clsx(styles['badge'], styles[`badge--${event.type}`])}>{label}</span>
        {isNode && <span className={styles['node-id']}>{nodeId.slice(0, NODE_ID_PREVIEW_CHARS)}</span>}
        {skipReason && <span className={styles['reason']}>{skipReason}</span>}
        <span className={styles['time']}>{formatTime(event.timestamp)}</span>
        {hasDetail && <span className={styles['toggle']}>{isExpanded ? '▲' : '▼'}</span>}
      </div>
      {hasDetail && (
        <div className={clsx(styles['detail'], { [styles['detail--expanded']]: isExpanded })}>
          {isExpanded ? detail : truncated}
        </div>
      )}
    </div>
  );
}

export function ExecutionLogPanel() {
  const events = useExecutionStore((state) => state.events);
  const status = useExecutionStore((state) => state.status);
  const executionId = useExecutionStore((state) => state.executionId);
  const isCollapsed = useExecutionStore((state) => state.isLogCollapsed);
  // Clicking a node (incl. its flag marker) selects it on the canvas; the
  // highlight derives from that selection, so it clears on deselect.
  const selectedNodeId = useSingleSelectedElement()?.node?.id ?? null;
  const { rightOffset } = useRightPanelAnchor();

  const bodyRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [executionId]);

  useEffect(() => {
    if (!isCollapsed && stickToBottomRef.current && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [events.length, isCollapsed]);

  useEffect(() => {
    if (!selectedNodeId || isCollapsed) return;
    bodyRef.current?.querySelector(`[data-node-id="${selectedNodeId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedNodeId, isCollapsed]);

  function handleBodyScroll() {
    const body = bodyRef.current;
    if (!body) return;

    const distanceFromBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
    stickToBottomRef.current = distanceFromBottom < AT_BOTTOM_TOLERANCE_PX;
  }

  if (events.length === 0 && status === 'idle') return null;

  return (
    <div
      className={clsx(styles['panel'], { [styles['panel--collapsed']]: isCollapsed })}
      style={{ '--log-panel-right': `${rightOffset}px` } as React.CSSProperties}
    >
      <div className={styles['header']} onClick={toggleLog}>
        <span className={styles['title']}>Execution Log</span>
        <span className={clsx(styles['status'], styles[`status--${status}`])}>{status}</span>
        <span className={styles['toggle']}>{isCollapsed ? '▲' : '▼'}</span>
      </div>
      {!isCollapsed && (
        <div ref={bodyRef} className={styles['body']} onScroll={handleBodyScroll}>
          {events.map((event) => (
            <EventRow key={`${event.executionId}-${event.sequence}`} event={event} selectedNodeId={selectedNodeId} />
          ))}
        </div>
      )}
    </div>
  );
}
