// Graph runner calls this to emit execution events and update status.
// Implementations persist to DB (direct write in-memory; via activity in Temporal).
export interface EventEmitterPort {
  emitEvent(executionId: string, type: string, payload?: unknown, nodeId?: string): Promise<void>;
  updateStatus(executionId: string, status: string, errorMessage?: string): Promise<void>;
}
