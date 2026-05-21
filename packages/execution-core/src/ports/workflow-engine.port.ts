import type { BaseNode, WorkflowDefinition } from '@workflow-builder/types/workflow-execution/execution-model';

export type WorkflowExecutionInput<TNode extends BaseNode> = {
  workflowId: string;
  executionId: string;
  definition: WorkflowDefinition<TNode>;
  triggerPayload: Record<string, unknown>;
  variables: Record<string, unknown>;
  global: Record<string, unknown>;
};

// Backend calls this; concrete adapters (Temporal, in-memory, …) implement it.
// TNode is opaque to the backend — only the worker narrows it to concrete types.
export interface WorkflowEnginePort<TNode extends BaseNode> {
  submit(input: WorkflowExecutionInput<TNode>): Promise<void>;
  cancel(executionId: string): Promise<void>;
}
