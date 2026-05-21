// Activity interface — used by proxyActivities in the workflow sandbox
import type { ExecutionContext, NodeExecutionResult } from '@workflow-builder/execution-core/workflow';

import type { AiStudioNode } from '../../domain/ai-studio-nodes';

export type Activities = {
  executeNode(node: AiStudioNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  emitEvent(executionId: string, type: string, payload?: unknown, nodeId?: string): Promise<void>;
  updateStatus(executionId: string, status: string, errorMessage?: string): Promise<void>;
};
