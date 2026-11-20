import type { ExecutionContext, NodeExecutionResult } from '@workflow-builder/execution-core/workflow';
import type { DemoExecutionNode } from '@workflow-builder/types/workflow-execution/demo-execution';

export type DemoActivities = {
  executeNode(node: DemoExecutionNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  emitEvent(executionId: string, sequence: number, type: string, payload?: unknown, nodeId?: string): Promise<void>;
  updateStatus(executionId: string, status: string, errorMessage?: string): Promise<void>;
};
