// The activity contract, shared by both sides of the sandbox boundary: the workflow
// proxies it, and `createActivities` on the worker side implements it.
import type { BaseNode, ExecutionContext, NodeExecutionResult } from './core-contract';

export type Activities<TNode extends BaseNode = BaseNode> = {
  executeNode(node: TNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  emitEvent(executionId: string, sequence: number, type: string, payload?: unknown, nodeId?: string): Promise<void>;
  updateStatus(executionId: string, status: string, errorMessage?: string): Promise<void>;
};
