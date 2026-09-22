import type { ResolveNodeResult } from '../../../execution-core/src/workflow';
import type {
  ExecutionEventType,
  ExecutionOutcome,
  ExecutionStatus,
} from '../../../types/src/workflow-execution/execution-events';
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
  ExecutionContext,
  ResolveNodeRejection,
  ResolveNodeResult,
  RunGraphOutcome,
  VerdictRejection,
} from '../../../execution-core/src/workflow';

export type { BaseNode } from '../../../types/src/workflow-execution/execution-model';

export type {
  ExecutionEventType,
  ExecutionOutcome,
  ExecutionOutcomeRecord,
  ExecutionStatus,
} from '../../../types/src/workflow-execution/execution-events';

// Restated, not re-exported: the core names `@workflow-builder/types`, a package never published,
// and that name would survive into the emitted .d.ts. Every type reachable from an entry point is
// restated; `test/core-contract.test.ts` pins drift, nothing checks dist yet (follow-up: temporal-dist-dts-guard).
export type WorkflowExecutionInput<TNode extends BaseNode> = {
  workflowId: string;
  executionId: string;
  definition: WorkflowDefinition<TNode>;
  triggerPayload: Record<string, unknown>;
  variables: Record<string, unknown>;
  global: Record<string, unknown>;
};

// Restated for the same reason: `outcome` names a @workflow-builder/types type.
export type CompletedNodeExecution = {
  output: unknown;
  nextPort?: string;
  outcome?: ExecutionOutcome;
  waiting?: never;
};

export type WaitingNodeExecution = {
  waiting: true;
};

export type NodeExecutionResult = CompletedNodeExecution | WaitingNodeExecution;

// Backend calls this; concrete adapters (Temporal, in-memory, …) implement it.
export interface WorkflowEnginePort<TNode extends BaseNode> {
  submit(input: WorkflowExecutionInput<TNode>): Promise<void>;
  cancel(executionId: string): Promise<void>;
  resolveNode(executionId: string, nodeId: string, resolution: CompletedNodeExecution): Promise<ResolveNodeResult>;
}

// Restated for the same reason as WorkflowExecutionInput: the core's port module
// reaches for @workflow-builder/types by package name.
export interface EventEmitterPort {
  emitEvent(executionId: string, type: ExecutionEventType, payload?: unknown, nodeId?: string): Promise<void>;
  updateStatus(
    executionId: string,
    status: ExecutionStatus,
    errorMessage?: string,
    outcome?: ExecutionOutcome,
  ): Promise<void>;
}
