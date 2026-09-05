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

// 1 outside an activity context — createActivities is also called directly from tests.
function currentAttempt(): number {
  try {
    return activityInfo().attempt;
  } catch {
    return 1;
  }
}

// Unclassified: rethrown as-is, so the SDK wraps it exactly as before. Classified:
// an ApplicationFailure — `nonRetryable` is what the server honours, and the code
// and attempt ride in `details` because the SDK's own conversion keeps only the
// message and type. The original stays on `cause` for its stack in Event History.
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

// Exported on its own, not just via the plugin, so a consumer with a bespoke worker
// setup (or a test) can register the same three activities by hand.
export function createActivities<TNode extends BaseNode>(options: CreateActivitiesOptions<TNode>): Activities<TNode> {
  const { executors, store } = options;

  return {
    async executeNode(node, context) {
      const executor = resolveExecutor(executors, node);
      // Awaited, not returned: a returned promise would reject outside this try.
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
