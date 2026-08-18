// Sandbox-safe: pure counter + delegation, no Temporal or Node imports. Lives
// under `workflows/` because it is bundled into the workflow sandbox alongside
// run-workflow.ts.
import type { EventEmitterPort } from '@workflow-builder/execution-core/workflow';

import type { Activities } from '../activities-interface';

// The two activities run-workflow.ts proxies. Passed in rather than reached for via
// proxyActivities here, which keeps the numbering drivable from a test.
export type EventPersistence = Pick<Activities, 'emitEvent' | 'updateStatus'>;

// Creates a sequenced `EventEmitterPort`: one that assigns each execution event its
// `sequence` number inside the workflow, then hands the numbered event to the
// persistence activity.
export function createSequencedEventEmitter(persistence: EventPersistence): EventEmitterPort {
  let sequence = 0;

  return {
    emitEvent(executionId, type, payload, nodeId) {
      sequence += 1;
      return persistence.emitEvent(executionId, sequence, type, payload, nodeId);
    },
    updateStatus(executionId, status, errorMessage) {
      return persistence.updateStatus(executionId, status, errorMessage);
    },
  };
}
