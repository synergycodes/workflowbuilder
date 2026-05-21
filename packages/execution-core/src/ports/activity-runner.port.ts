import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import type { ExecutionContext } from '../execution-context';

export type NodeExecutionResult = {
  output: unknown;
  nextPort?: string;
};

// Graph runner calls this to execute a single node's activity.
// Temporal adapter wraps proxyActivities; in-memory adapter calls the executor directly.
export interface ActivityRunnerPort<TNode extends BaseNode> {
  executeNode(node: TNode, context: ExecutionContext): Promise<NodeExecutionResult>;
}
