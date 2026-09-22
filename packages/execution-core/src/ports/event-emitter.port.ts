import type {
  ExecutionEventType,
  ExecutionOutcome,
  ExecutionStatus,
} from '@workflow-builder/types/workflow-execution/execution-events';

// Graph runner calls this to emit execution events and update status.
// Implementations persist to DB (direct write in-memory; via activity in Temporal).
export interface EventEmitterPort {
  emitEvent(executionId: string, type: ExecutionEventType, payload?: unknown, nodeId?: string): Promise<void>;
  // `outcome` rides on the terminal 'completed' write only (follow-up: status-detail-object).
  updateStatus(
    executionId: string,
    status: ExecutionStatus,
    errorMessage?: string,
    outcome?: ExecutionOutcome,
  ): Promise<void>;
}
