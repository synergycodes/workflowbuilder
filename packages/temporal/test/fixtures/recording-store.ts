import type { ExecutionStore } from '../../src/index';

export type RecordingStore = ExecutionStore & {
  events: { sequence: number; type: string; nodeId?: string }[];
  statuses: { status: string; errorMessage?: string }[];
};

export function createRecordingStore(): RecordingStore {
  const events: RecordingStore['events'] = [];
  const statuses: RecordingStore['statuses'] = [];

  return {
    events,
    statuses,
    async emitExecutionEvent(_executionId, sequence, type, _payload, nodeId) {
      events.push({ sequence, type, nodeId });
    },
    async updateExecutionStatus(_executionId, status, errorMessage) {
      statuses.push({ status, errorMessage });
    },
  };
}
