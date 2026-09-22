import type { ExecutionOutcome, ExecutionStore } from '../../src/index';

export type RecordingStore = ExecutionStore & {
  events: { sequence: number; type: string; nodeId?: string; payload?: unknown }[];
  statuses: { status: string; errorMessage?: string; outcome?: ExecutionOutcome }[];
};

export function createRecordingStore(): RecordingStore {
  const events: RecordingStore['events'] = [];
  const statuses: RecordingStore['statuses'] = [];

  return {
    events,
    statuses,
    async emitExecutionEvent(_executionId, sequence, type, payload, nodeId) {
      events.push({ sequence, type, nodeId, payload });
    },
    async updateExecutionStatus(_executionId, status, errorMessage, outcome) {
      statuses.push({ status, errorMessage, outcome });
    },
  };
}
