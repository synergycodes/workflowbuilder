import { CaretDown } from '@phosphor-icons/react';
import { Icon, useSingleSelectedElement, useStore } from '@workflowbuilder/sdk';
import { Chip } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import type { ExecutionEvent, NodeSkipReason } from '@workflow-builder/types/workflow-execution/execution-events';

import styles from './log-panel.module.css';

import { useLeftPanelAnchor } from '../../hooks/use-left-panel-anchor';
import { useRightPanelAnchor } from '../../hooks/use-right-panel-anchor';
import { type RunStatus, toggleLog, useExecutionStore } from '../../stores/use-execution-store';
import { extractOutputText } from '../../utils/extract-output-text';
import { ExecutionStatusIcon, type ExecutionStatusTone } from './execution-status-icon';

const SKIP_REASON_LABEL: Record<NodeSkipReason, string> = {
  branch_not_taken: 'branch not taken',
  upstream_skipped: 'upstream skipped',
  error_route_not_taken: 'error branch not taken',
};

const EVENT_LOOK: Record<ExecutionEvent['type'], { tone: ExecutionStatusTone; message: string }> = {
  execution_started: { tone: 'info', message: 'Execution started' },
  node_started: { tone: 'info', message: 'Started' },
  node_waiting: { tone: 'waiting', message: 'Waiting for decision' },
  node_completed: { tone: 'completed', message: 'Completed' },
  node_failed: { tone: 'failed', message: 'Failed' },
  node_skipped: { tone: 'skipped', message: 'Skipped' },
  branch_spawned: { tone: 'branch', message: 'Started parallel branches' },
  branches_joined: { tone: 'join', message: 'Branches joined' },
  execution_completed: { tone: 'completed', message: 'Execution completed' },
  execution_incomplete: { tone: 'incomplete', message: 'Incomplete' },
  execution_failed: { tone: 'failed', message: 'Execution failed' },
  execution_cancelled: { tone: 'neutral', message: 'Execution cancelled' },
};

type DiagramState = {
  nodes: { id: string; data: { properties: { label?: unknown } } }[];
  edges: { source: string; target: string }[];
};

function nodeLabel(state: DiagramState, nodeId: string) {
  const label = state.nodes.find((node) => node.id === nodeId)?.data.properties.label;
  return typeof label === 'string' && label ? label : nodeId;
}

// Branch names and join counts come from the diagram until the events carry them (follow-up: execution-log-branch-payloads).
function eventMessage(event: ExecutionEvent, state: DiagramState): string {
  const { message } = EVENT_LOOK[event.type];
  switch (event.type) {
    case 'node_skipped': {
      return `${message} — ${SKIP_REASON_LABEL[event.payload.reason]}`;
    }
    case 'branch_spawned': {
      const count = event.payload.childPathIds.length;
      const targets = state.edges.filter((edge) => edge.source === event.nodeId).map((edge) => edge.target);
      const names = targets.length === count ? ` → ${targets.map((id) => nodeLabel(state, id)).join(' · ')}` : '';
      return `Started ${count} parallel branches${names}`;
    }
    case 'branches_joined': {
      return `${message} — ${event.payload.mergedPathIds.length} inputs arrived · continuing`;
    }
    case 'execution_incomplete': {
      return event.payload.deadEnds
        .map(
          ({ nodeId, port }) =>
            `${nodeLabel(state, nodeId)} took “${port}”, an output with no connection. Draw the missing connection to finish this path.`,
        )
        .join('\n');
    }
    default: {
      return message;
    }
  }
}

const RUN_STATUS_LOOK: Record<RunStatus, { tone: ExecutionStatusTone; label: string }> = {
  idle: { tone: 'neutral', label: 'Idle' },
  pending: { tone: 'running', label: 'Starting' },
  running: { tone: 'running', label: 'Running' },
  waiting: { tone: 'waiting', label: 'Waiting for decision' },
  cancelling: { tone: 'neutral', label: 'Stopping' },
  completed: { tone: 'completed', label: 'Completed' },
  incomplete: { tone: 'incomplete', label: 'Incomplete' },
  failed: { tone: 'failed', label: 'Failed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  disconnected: { tone: 'warning', label: 'Disconnected' },
};

const AT_BOTTOM_TOLERANCE_PX = 4;
const MIN_BODY_HEIGHT_PX = 120;
const MAX_BODY_HEIGHT_RATIO = 0.6;
const RESIZE_KEY_STEP_PX = 16;

function clampBodyHeight(height: number) {
  const max = Math.max(MIN_BODY_HEIGHT_PX, window.innerHeight * MAX_BODY_HEIGHT_RATIO);
  return Math.round(Math.min(Math.max(height, MIN_BODY_HEIGHT_PX), max));
}

function formatTime(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function eventDetail(event: ExecutionEvent): string | undefined {
  switch (event.type) {
    case 'node_completed': {
      return extractOutputText(event.payload.output);
    }
    case 'node_failed':
    case 'execution_failed': {
      return event.payload.error.message;
    }
    case 'execution_completed': {
      const outcome = event.payload?.outcome;
      return outcome ? `${outcome.value} · resolved by ${outcome.resolvedBy} · ${outcome.nodeId}` : undefined;
    }
    case 'execution_incomplete': {
      return event.payload.deadEnds
        .map(({ nodeId, port }) => `${nodeId} routed to "${port}" — nothing connected to that handle`)
        .join('\n');
    }
    default: {
      return undefined;
    }
  }
}

function EventRow({ event, selectedNodeId }: { event: ExecutionEvent; selectedNodeId: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const nodeId = (event as { nodeId?: string | null }).nodeId;
  const isNode = typeof nodeId === 'string' && nodeId.length > 0;
  const isHighlighted = isNode && nodeId === selectedNodeId;
  const { tone, message } = EVENT_LOOK[event.type];
  // Each selector returns a string, so the row re-renders only when its text changes.
  const title = useStore((state) => (isNode ? nodeLabel(state, nodeId) : message));
  const subtitle = useStore((state) =>
    isNode || event.type === 'execution_incomplete' ? eventMessage(event, state) : undefined,
  );

  const detail = eventDetail(event);
  const hasDetail = !!detail;
  // Collapsed, the detail rides on the message line, clipped; expanded, it opens in full below.
  const preview = hasDetail && !isExpanded ? detail : undefined;
  const line = [subtitle, preview].filter(Boolean).join(' — ');

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
      className={clsx(styles['row'], {
        [styles['row--toggleable']]: hasDetail,
        [styles['row--highlighted']]: isHighlighted,
        [styles['row--failed']]: tone === 'failed',
      })}
      onClick={handleToggle}
    >
      <span className={styles['time']}>{formatTime(event.timestamp)}</span>
      <ExecutionStatusIcon tone={tone} className={styles['status']} />
      <span className={clsx(styles['title'], 'wb-text-body-s-emphasized')}>{title}</span>
      {line && (
        <span className={clsx(styles['message'], { [styles['message--clipped']]: preview }, 'wb-text-body-s')}>
          {line}
        </span>
      )}
      {isExpanded && <div className={styles['detail']}>{detail}</div>}
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
  const { leftOffset } = useLeftPanelAnchor();
  const { rightOffset } = useRightPanelAnchor();

  const bodyRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  // `undefined` keeps the default height from the stylesheet; double-click or Home goes back to it.
  const [bodyHeight, setBodyHeight] = useState<number | undefined>();
  const resizeStartRef = useRef<{ pointerY: number; height: number } | undefined>(undefined);

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
    const body = bodyRef.current;
    const row = body?.querySelector(`[data-node-id="${selectedNodeId}"]`);
    if (!body || !row) return;

    // The first row goes to the top so the node's later rows fit below it; scrollIntoView would also scroll the page.
    const paddingTop = Number.parseFloat(getComputedStyle(body).paddingTop) || 0;
    body.scrollTop += row.getBoundingClientRect().top - body.getBoundingClientRect().top - paddingTop;
  }, [selectedNodeId, isCollapsed]);

  function handleBodyScroll() {
    const body = bodyRef.current;
    if (!body) return;

    const distanceFromBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
    stickToBottomRef.current = distanceFromBottom < AT_BOTTOM_TOLERANCE_PX;
  }

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    const height = bodyRef.current?.getBoundingClientRect().height;
    if (height === undefined) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStartRef.current = { pointerY: event.clientY, height };
  }

  function handleResizeMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = resizeStartRef.current;
    if (!start) return;

    setBodyHeight(clampBodyHeight(start.height + start.pointerY - event.clientY));
  }

  function handleResizeEnd(event: React.PointerEvent<HTMLDivElement>) {
    resizeStartRef.current = undefined;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleResizeKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = bodyRef.current?.getBoundingClientRect().height ?? 0;
    if (event.key === 'ArrowUp') setBodyHeight(clampBodyHeight(current + RESIZE_KEY_STEP_PX));
    else if (event.key === 'ArrowDown') setBodyHeight(clampBodyHeight(current - RESIZE_KEY_STEP_PX));
    else if (event.key === 'Home') setBodyHeight(undefined);
    else return;

    event.preventDefault();
  }

  function handleHeaderClick({ target }: React.MouseEvent) {
    if (target instanceof Element && target.closest('button')) return;
    toggleLog();
  }

  if (events.length === 0 && status === 'idle') return null;

  const runStatus = RUN_STATUS_LOOK[status];
  const collapseLabel = isCollapsed ? 'Expand execution log' : 'Collapse execution log';

  return (
    <section
      aria-label="Execution log"
      className={clsx(styles['dock'], { [styles['dock--collapsed']]: isCollapsed })}
      style={
        {
          '--log-dock-left': `${leftOffset}px`,
          '--log-dock-right': `${rightOffset}px`,
          '--log-body-height': bodyHeight === undefined ? undefined : `${bodyHeight}px`,
        } as React.CSSProperties
      }
    >
      {!isCollapsed && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize execution log"
          aria-valuemin={MIN_BODY_HEIGHT_PX}
          aria-valuenow={bodyHeight}
          tabIndex={0}
          className={styles['resize']}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={() => setBodyHeight(undefined)}
          onKeyDown={handleResizeKey}
        />
      )}
      <div className={styles['header']} onClick={handleHeaderClick}>
        <button
          type="button"
          className={clsx(styles['toggle'], 'wb-text-body-s-emphasized')}
          aria-expanded={!isCollapsed}
          title={collapseLabel}
          onClick={toggleLog}
        >
          <span className={styles['caret']}>
            <CaretDown weight="bold" />
          </span>
          Execution log
        </button>
        <Chip
          label={runStatus.label}
          size="l"
          prefixIcon={status === 'incomplete' ? <Icon name="LinkBreak" /> : undefined}
          className={clsx(styles['chip'], styles[`chip--${runStatus.tone}`])}
        />
      </div>
      {!isCollapsed && (
        <div ref={bodyRef} className={styles['body']} onScroll={handleBodyScroll}>
          {events.map((event) => (
            <EventRow key={`${event.executionId}-${event.sequence}`} event={event} selectedNodeId={selectedNodeId} />
          ))}
        </div>
      )}
    </section>
  );
}
