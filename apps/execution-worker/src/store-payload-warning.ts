import type { ExecutionStore } from '@workflowbuilder/temporal';

import type { logger as Logger } from './logger';

// Mirrors Temporal's own per-blob warn threshold (`limit.blobSize.warn`, default 512 KB;
// the hard error is at 2 MB): https://docs.temporal.io/references/dynamic-configuration
// Payloads this large also count toward the 50 MB per-run history cap (emitEvent args
// are recorded in history), so a warning here surfaces runs drifting toward the limit
// before they hit it.
const PAYLOAD_WARN_BYTES = 512 * 1024;

// Wraps the store rather than living in the plugin: the size limit is a Temporal
// concern, but reacting to it is the application's, and the package has no logger.
// `node_started` now carries the node config, so payloads are no longer trivially small.
export function withPayloadSizeWarning(store: ExecutionStore, log: typeof Logger): ExecutionStore {
  return {
    async emitExecutionEvent(executionId, sequence, type, payload, nodeId) {
      if (payload !== undefined) {
        const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
        if (bytes > PAYLOAD_WARN_BYTES) {
          log.warn('execution event payload exceeds warn threshold', { executionId, sequence, type, nodeId, bytes });
        }
      }
      await store.emitExecutionEvent(executionId, sequence, type, payload, nodeId);
    },

    updateExecutionStatus(executionId, status, errorMessage) {
      return store.updateExecutionStatus(executionId, status, errorMessage);
    },
  };
}
