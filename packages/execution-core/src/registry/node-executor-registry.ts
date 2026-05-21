import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import type { ExecutionContext } from '../execution-context';
import type { NodeExecutionResult } from '../ports/activity-runner.port';

export type NodeExecutor<TNode extends BaseNode> = (
  node: TNode,
  context: ExecutionContext,
) => Promise<NodeExecutionResult> | NodeExecutionResult;

// Mapped over the consumer's node union. Each key gets the executor narrowed
// to its matching variant — TS refuses to compile if a key/executor pair drifts.
export type NodeExecutorRegistry<TNode extends BaseNode> = {
  [K in TNode['type']]: NodeExecutor<Extract<TNode, { type: K }>>;
};

export function resolveExecutor<TNode extends BaseNode>(
  registry: NodeExecutorRegistry<TNode>,
  node: TNode,
): NodeExecutor<TNode> {
  // Mapped-type indexing on `node.type` (a union) doesn't narrow without help;
  // the cast escapes that, the runtime is keyed by the same string. The
  // `unknown` step is required by TS to bridge the mapped type to a plain
  // string-indexed map shape.
  const executor = (registry as unknown as Record<string, NodeExecutor<TNode>>)[node.type];
  if (!executor) {
    throw new Error(`No executor registered for node type: ${node.type}`);
  }
  return executor;
}
