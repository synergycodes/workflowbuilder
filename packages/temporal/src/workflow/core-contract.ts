import type { BaseNode, WorkflowDefinition } from '../../../types/src/workflow-execution/execution-model';

// The sandbox-safe half of the seam described in ../core-contract.ts.
//
// Kept separate because everything reachable from src/workflow/ is bundled into
// Temporal's V8 sandbox: this file may only pull from the core's sandbox-safe entry
// (execution-core/src/workflow.ts), never from its root, which also exports code that
// needs Node.
export { runGraph } from '../../../execution-core/src/workflow';

export type {
  ActivityRunnerPort,
  EventEmitterPort,
  ExecutionContext,
  NodeExecutionResult,
  RunGraphOutcome,
} from '../../../execution-core/src/workflow';

export type { BaseNode } from '../../../types/src/workflow-execution/execution-model';

// Restated here rather than re-exported from execution-core's port module, which
// reaches for @workflow-builder/types by package name — that name survives into the
// emitted .d.ts and breaks types for consumers, since the package is not published.
// Restating it in terms of the relatively-imported types keeps dist self-contained.
// `test/core-contract.test.ts` fails to compile if this ever drifts from the core.
export type WorkflowExecutionInput<TNode extends BaseNode> = {
  workflowId: string;
  executionId: string;
  definition: WorkflowDefinition<TNode>;
  triggerPayload: Record<string, unknown>;
  variables: Record<string, unknown>;
  global: Record<string, unknown>;
};

// Backend calls this; concrete adapters (Temporal, in-memory, …) implement it.
export interface WorkflowEnginePort<TNode extends BaseNode> {
  submit(input: WorkflowExecutionInput<TNode>): Promise<void>;
  cancel(executionId: string): Promise<void>;
}
