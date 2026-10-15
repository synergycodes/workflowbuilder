import type { BaseNode, WorkflowDefinition } from '@workflow-builder/types/workflow-execution/execution-model';

import type { CompletedNodeExecution } from './activity-runner.port';

export type WorkflowExecutionInput<TNode extends BaseNode> = {
  workflowId: string;
  executionId: string;
  definition: WorkflowDefinition<TNode>;
  triggerPayload: Record<string, unknown>;
  variables: Record<string, unknown>;
  global: Record<string, unknown>;
};

// The refusals a verdict can meet, declared once. The engine's own validator answers
// with the first group; the delivery itself answers with the second.
const VERDICT_REJECTIONS = [
  'verdict_malformed',
  'verdict_for_unknown_node',
  'verdict_already_delivered',
  'node_not_waiting',
] as const;
const DELIVERY_REJECTIONS = ['run_not_found', 'delivery_timeout'] as const;
export const RESOLVE_NODE_REJECTIONS = [...VERDICT_REJECTIONS, ...DELIVERY_REJECTIONS] as const;

export type VerdictRejection = (typeof VERDICT_REJECTIONS)[number];
export type ResolveNodeRejection = (typeof RESOLVE_NODE_REJECTIONS)[number];

export type ResolveNodeResult = { error?: undefined } | { error: { code: ResolveNodeRejection; message: string } };

export type ResolveNodeInput = {
  executionId: string;
  nodeId: string;
  resolution: CompletedNodeExecution;
};

// A start that did not go through. 'run_not_started': the engine has no run under this id, so
// the caller may close it. 'start_unconfirmed': the engine could not say, so the run may be
// alive and the caller must not close it.
export type SubmitRejection = 'run_not_started' | 'start_unconfirmed';

export type SubmitResult = { error?: undefined } | { error: { code: SubmitRejection; message: string } };

// 'run_not_found': the engine has no open run under this id, either never started or already
// closed. Which one, the caller's own record of the run tells.
export type CancelResult = { error?: undefined } | { error: { code: 'run_not_found'; message: string } };

// Backend calls this; concrete adapters (Temporal, in-memory, …) implement it.
// TNode is opaque to the backend — only the worker narrows it to concrete types.
// Refusals are results, not throws; anything else that goes wrong is thrown.
export interface WorkflowEnginePort<TNode extends BaseNode> {
  submit(input: WorkflowExecutionInput<TNode>): Promise<SubmitResult>;
  cancel(executionId: string): Promise<CancelResult>;
  // Delivers the completion a parked node waits for.
  resolveNode(input: ResolveNodeInput): Promise<ResolveNodeResult>;
}
