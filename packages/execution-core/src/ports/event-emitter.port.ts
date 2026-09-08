import type { ExecutionEventType, ExecutionStatus } from '@workflow-builder/types/workflow-execution/execution-events';

// Graph runner calls this to emit execution events and update status.
// Implementations persist to DB (direct write in-memory; via activity in Temporal).
export interface EventEmitterPort {
  emitEvent(executionId: string, type: ExecutionEventType, payload?: unknown, nodeId?: string): Promise<void>;
  updateStatus(executionId: string, status: ExecutionStatus, errorMessage?: string): Promise<void>;
}
