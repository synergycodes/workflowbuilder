// Where execution events and status transitions are persisted.
//
// The plugin owns *what* is emitted and in *which order*; where it lands is the
// consumer's. `sequence` arrives already assigned by the workflow and is dense and
// ascending per execution — a store that can enforce uniqueness on
// (executionId, sequence) will reject a duplicate from an activity retry, which is
// how at-least-once delivery stays idempotent.
import type { ExecutionEventType, ExecutionOutcome, ExecutionStatus } from './core-contract';

export interface ExecutionStore {
  emitExecutionEvent(
    executionId: string,
    sequence: number,
    type: ExecutionEventType,
    payload?: unknown,
    nodeId?: string,
  ): Promise<void>;
  /**
   * `outcome` arrives with the terminal 'completed' write only; a store that drops it loses the run's result.
   * 'running' arrives when the run starts and again when its last parked node resumes. 'waiting' and 'running'
   * are advisory and can land after a cancel or the terminal status, so neither may replace a recorded cancel or
   * a terminal status. 'cancelled' can also follow another terminal one: keep the first.
   */
  updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    errorMessage?: string,
    outcome?: ExecutionOutcome,
  ): Promise<void>;
}
