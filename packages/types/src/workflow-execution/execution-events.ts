// Single source of truth for "the run is over" — the worker derives its terminal
// SQL guard, the backend its stream-close gates, and ai-studio its EventSource
// close conditions from these tuples. Adding a terminal state is a one-line change
// here; the literal types update automatically via `(typeof …)[number]`, and the
// unions below are composed from them so the lists cannot drift apart.
export const TERMINAL_EXECUTION_STATUSES = ['completed', 'incomplete', 'failed', 'cancelled'] as const;

export type TerminalExecutionStatus = (typeof TERMINAL_EXECUTION_STATUSES)[number];

export const TERMINAL_EXECUTION_EVENT_TYPES = [
  'execution_completed',
  'execution_incomplete',
  'execution_failed',
  'execution_cancelled',
] as const;

export type TerminalExecutionEventType = (typeof TERMINAL_EXECUTION_EVENT_TYPES)[number];

// A terminal event is the durable fact; the status row is derived state that can lag
// it (the worker writes them in two separate activities). This map is the one place
// that correspondence is written down; `satisfies` keeps it total over the tuple.
export const TERMINAL_EVENT_TO_STATUS = {
  execution_completed: 'completed',
  execution_incomplete: 'incomplete',
  execution_failed: 'failed',
  execution_cancelled: 'cancelled',
} as const satisfies Record<TerminalExecutionEventType, TerminalExecutionStatus>;

export type ExecutionEventType =
  | 'execution_started'
  | 'node_started'
  | 'node_waiting'
  | 'node_completed'
  | 'node_failed'
  | 'node_skipped'
  | 'branch_spawned'
  | 'branches_joined'
  | TerminalExecutionEventType;

export type ExecutionStartedPayload = {
  workflowId: string;
};

export type NodeWaitingPayload = {
  waitingForNodeIds?: string[];
};

export type BranchSpawnedPayload = {
  childPathIds: string[];
};

export type BranchesJoinedPayload = {
  mergedPathIds: string[];
};

export type NodeStartedPayload = {
  config: unknown;
  nodeOutputs: Record<string, unknown>;
};

export type NodeCompletedPayload = {
  output: unknown;
};

export type NodeSkipReason = 'branch_not_taken' | 'upstream_skipped' | 'error_route_not_taken';

export type NodeSkippedPayload = {
  reason: NodeSkipReason;
};

export type ExecutionErrorPayload = {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

export type ExecutionCompletedPayload = {
  result?: unknown;
};

export type ExecutionCancelledPayload = {
  reason?: string;
};

export type DeadEnd = {
  nodeId: string;
  port: string;
};

export type ExecutionIncompletePayload = {
  deadEnds: DeadEnd[];
};

type BaseEvent = {
  executionId: string;
  sequence: number;
  timestamp: string; // ISO 8601
};

type NodeEvent = BaseEvent & {
  nodeId: string;
  pathId?: string;
};

export type ExecutionStartedEvent = BaseEvent & {
  type: 'execution_started';
  payload: ExecutionStartedPayload;
};

export type NodeStartedEvent = NodeEvent & {
  type: 'node_started';
  // Optional: events recorded before inputs were captured have no payload.
  payload?: NodeStartedPayload;
};

export type NodeWaitingEvent = NodeEvent & {
  type: 'node_waiting';
  payload?: NodeWaitingPayload;
};

export type NodeCompletedEvent = NodeEvent & {
  type: 'node_completed';
  payload: NodeCompletedPayload;
};

export type NodeFailedEvent = NodeEvent & {
  type: 'node_failed';
  payload: ExecutionErrorPayload;
};

export type NodeSkippedEvent = NodeEvent & {
  type: 'node_skipped';
  payload: NodeSkippedPayload;
};

export type BranchSpawnedEvent = NodeEvent & {
  type: 'branch_spawned';
  payload: BranchSpawnedPayload;
};

export type BranchesJoinedEvent = NodeEvent & {
  type: 'branches_joined';
  payload: BranchesJoinedPayload;
};

export type ExecutionCompletedEvent = BaseEvent & {
  type: 'execution_completed';
  payload?: ExecutionCompletedPayload;
};

export type ExecutionIncompleteEvent = BaseEvent & {
  type: 'execution_incomplete';
  payload: ExecutionIncompletePayload;
};

export type ExecutionFailedEvent = BaseEvent & {
  type: 'execution_failed';
  payload: ExecutionErrorPayload;
};

export type ExecutionCancelledEvent = BaseEvent & {
  type: 'execution_cancelled';
  payload?: ExecutionCancelledPayload;
};

export type ExecutionEvent =
  | ExecutionStartedEvent
  | NodeStartedEvent
  | NodeWaitingEvent
  | NodeCompletedEvent
  | NodeFailedEvent
  | NodeSkippedEvent
  | BranchSpawnedEvent
  | BranchesJoinedEvent
  | ExecutionCompletedEvent
  | ExecutionIncompleteEvent
  | ExecutionFailedEvent
  | ExecutionCancelledEvent;

export type ExecutionSnapshot = {
  executionId: string;
  status: ExecutionStatus;
  lastSequence: number;
  events: ExecutionEvent[];
};

export type ExecutionStatus = 'pending' | 'running' | 'cancelling' | TerminalExecutionStatus;
