// Worker-side implementations of the three activities the workflow proxies. Runs
// outside the sandbox, so Node I/O is fine here.
import { type BaseNode, type NodeExecutorRegistry, resolveExecutor } from './core-contract';
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
export function createActivities<TNode extends BaseNode>(options: CreateActivitiesOptions<TNode>): Activities<TNode> {
  const { executors, store } = options;

  return {
    async executeNode(node, context) {
      const executor = resolveExecutor(executors, node);
      return executor(node, context);
    },

    async emitEvent(executionId, sequence, type, payload, nodeId) {
      await store.emitExecutionEvent(executionId, sequence, type, payload, nodeId);
    },

    async updateStatus(executionId, status, errorMessage) {
      await store.updateExecutionStatus(executionId, status, errorMessage);
    },
  };
}
