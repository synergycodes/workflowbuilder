// Where execution events and status transitions are persisted.
//
// The plugin owns *what* is emitted and in *which order*; where it lands is the
// consumer's. `sequence` arrives already assigned by the workflow and is dense and
// ascending per execution — a store that can enforce uniqueness on
// (executionId, sequence) will reject a duplicate from an activity retry, which is
// how at-least-once delivery stays idempotent.
export interface ExecutionStore {
  emitExecutionEvent(
    executionId: string,
    sequence: number,
    type: string,
    payload?: unknown,
    nodeId?: string,
  ): Promise<void>;
  updateExecutionStatus(executionId: string, status: string, errorMessage?: string): Promise<void>;
}
