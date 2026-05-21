export type ExecutionEventType =
  | 'execution_started'
  | 'node_started'
  | 'node_waiting'
  | 'node_completed'
  | 'node_failed'
  | 'branch_spawned'
  | 'branches_joined'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_cancelled';

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

export type NodeCompletedPayload = {
  output: unknown;
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
  | BranchSpawnedEvent
  | BranchesJoinedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
  | ExecutionCancelledEvent;

export type ExecutionSnapshot = {
  executionId: string;
  status: ExecutionStatus;
  lastSequence: number;
  events: ExecutionEvent[];
};

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelling' | 'cancelled';
