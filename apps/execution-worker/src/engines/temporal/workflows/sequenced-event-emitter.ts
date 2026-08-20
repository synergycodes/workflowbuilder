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
// persistence activity — one at a time.
//
// Emits are serialized because the backend's SSE drain requires that events become
// visible in Postgres in ascending `sequence` order. It tracks a cursor and queries
// `sequence > cursor` (fetch-events-after.ts), advancing the cursor to the highest row
// it has read (drain-events.ts), monotonically (serialized-drainer.ts). A row that
// commits after a higher-numbered one has already moved the cursor past it is never
// returned again, and that event silently never reaches the client.
//
// The old `MAX(sequence) + 1` insert upheld this by accident: a colliding insert
// blocked, then failed and recomputed its number only once the winner had committed,
// so number N was always committed before N+1 existed. Assigning numbers up here
// removed that coupling, so the ordering has to be maintained deliberately — one
// in-flight emit per execution, which is what the chain below is for.
//
// Gaps, unlike reordering, are harmless to the drain: a number consumed by an emit
// that never commits (a cancelled run, or an emitEvent that exhausts its retries)
// just leaves a hole the cursor steps over.
export function createSequencedEventEmitter(persistence: EventPersistence): EventEmitterPort {
  let sequence = 0;
  // Always fulfilled, never rejected — see below.
  let tail: Promise<void> = Promise.resolve();

  return {
    emitEvent(executionId, type, payload, nodeId) {
      // Still incremented synchronously, so numbers follow call order rather than
      // the order the chain happens to drain in.
      sequence += 1;
      const assigned = sequence;

      const write = tail.then(() => persistence.emitEvent(executionId, assigned, type, payload, nodeId));

      // Two distinct promises on purpose. `tail` is the ordering link and must always
      // fulfil, so one failed emit cannot poison the chain: with a bare `tail = write`,
      // a single rejection would skip the `onFulfilled` of every subsequent link and
      // silently drop the rest of the run's events. That matters because a failed
      // node_started is now survivable (it goes through errorPolicy), so the run
      // carries on emitting. Swallowing here also marks `write` as handled, so the
      // rejection the caller sees never surfaces as an unhandled rejection.
      tail = write.catch(() => {});

      // `write` is what the caller sees, so the failure still surfaces to runNode
      // and reaches the error policy.
      return write;
    },
    updateStatus(executionId, status, errorMessage) {
      return persistence.updateStatus(executionId, status, errorMessage);
    },
  };
}
