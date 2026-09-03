// Worker-side implementations of the three activities the workflow proxies. Runs
// outside the sandbox, so Node I/O is fine here.
import { ApplicationFailure, activityInfo } from '@temporalio/activity';

import {
  type BaseNode,
  type NodeErrorEnvelope,
  type NodeExecutorRegistry,
  classifyNodeError,
  resolveExecutor,
} from './core-contract';
import type { ExecutionStore } from './store';
import type { Activities } from './workflow/activities-interface';

export type CreateActivitiesOptions<TNode extends BaseNode> = {
  // One executor per node type. The registry is a mapped type over the consumer's
  // node union, so a missing or mistyped key fails to compile.
  executors: NodeExecutorRegistry<TNode>;
  store: ExecutionStore;
};

// Exported on its own, not just via the plugin, so a consumer with a bespoke worker
// setup (or a test) can register the same three activities by hand.
// Which attempt the activity is on, or 1 when there is no activity context —
// `createActivities` is also called directly from tests and bespoke setups, and
// a missing context is not a reason to fail the node.
function currentAttempt(): number {
  try {
    return activityInfo().attempt;
  } catch {
    return 1;
  }
}

/**
 * Turns an executor's throw into what Temporal should do about it.
 *
 * An unclassified error is rethrown as the very same object: the SDK then
 * wraps it exactly as it always has, so a node that did not opt into
 * classification retries on the profile's terms and reports what it used to,
 * down to the bytes.
 *
 * A classified error becomes an `ApplicationFailure` instead — `nonRetryable`
 * is the flag the server honours, so a permanent failure stops on this
 * attempt no matter what `maximumAttempts` says. The SDK's own conversion
 * would keep only the message and the type, so the code and the attempt ride
 * along in `details`, which the failure converter does carry across, and the
 * original error stays on `cause` to keep its stack in Event History.
 */
export function mapExecutorError(error: unknown, attempt: number): unknown {
  const classification = classifyNodeError(error);
  if (classification === undefined) {
    return error;
  }

  // classifyNodeError only answers for an Error carrying a string `code`.
  const classified = error as Error & { code: string };
  const envelope: NodeErrorEnvelope = { wbNodeError: 1, classification, code: classified.code, attempt };

  return ApplicationFailure.create({
    message: classified.message,
    type: classified.name,
    nonRetryable: classification === 'permanent',
    details: [envelope],
    cause: classified,
  });
}

export function createActivities<TNode extends BaseNode>(options: CreateActivitiesOptions<TNode>): Activities<TNode> {
  const { executors, store } = options;

  return {
    async executeNode(node, context) {
      const executor = resolveExecutor(executors, node);
      // Awaited rather than returned: a returned promise settles outside this
      // frame, and a rejected one would never reach the catch below.
      try {
        return await executor(node, context);
      } catch (error) {
        throw mapExecutorError(error, currentAttempt());
      }
    },

    async emitEvent(executionId, sequence, type, payload, nodeId) {
      await store.emitExecutionEvent(executionId, sequence, type, payload, nodeId);
    },

    async updateStatus(executionId, status, errorMessage) {
      await store.updateExecutionStatus(executionId, status, errorMessage);
    },
  };
}
