import type { ExecutionContext } from '../../execution-core/src/execution-context';
import type { NodeExecutionResult } from '../../execution-core/src/ports/activity-runner.port';
import type { BaseNode } from '../../types/src/workflow-execution/execution-model';

// The single seam between this published package and the private, source-only
// workspace packages it is built on.
//
// The imports are relative paths into another package's src on purpose, and this file
// (plus its sandbox-safe twin, ./workflow/core-contract.ts) is the only place allowed
// to do it — an ESLint rule blocks `@workflow-builder/*` everywhere else in src/.
// Reached for by package name, TypeScript treats them as an external module and leaves
// `import … from '@workflow-builder/execution-core'` in the emitted .d.ts: a package
// that is not on npm, so every type would break for consumers while the JS bundled
// fine. Reached for by relative path they are ordinary project files, so their
// declarations get inlined into dist with no build-tool configuration at all.
//
// Everything the package needs from the core passes through here, which also keeps the
// published surface deliberate rather than accidental.
export {
  NodeExecutionError,
  PermanentNodeExecutionError,
  TransientNodeExecutionError,
  classifyNodeError,
  resolveExecutor,
} from '../../execution-core/src/index';

export type { NodeErrorEnvelope } from '../../execution-core/src/index';

export type { ExecutionContext } from '../../execution-core/src/execution-context';
export type {
  CompletedNodeExecution,
  NodeExecutionResult,
  WaitingNodeExecution,
} from '../../execution-core/src/ports/activity-runner.port';
export type { LogBindings, LoggerPort } from '../../execution-core/src/ports/logger.port';

export type {
  BaseNode,
  NodeErrorPolicy,
  WorkflowDefinition,
  WorkflowEdgeDefinition,
} from '../../types/src/workflow-execution/execution-model';

// Defined on the sandbox-safe side so both halves of the package share one definition.
export type {
  ExecutionEventType,
  ExecutionStatus,
  WorkflowEnginePort,
  WorkflowExecutionInput,
} from './workflow/core-contract';

// Restated for the same reason as WorkflowExecutionInput: the core's registry module
// reaches for @workflow-builder/types by package name, and that name would survive
// into dist. `test/core-contract.test.ts` fails to compile if either drifts.
export type NodeExecutor<TNode extends BaseNode> = (
  node: TNode,
  context: ExecutionContext,
) => Promise<NodeExecutionResult> | NodeExecutionResult;

// Mapped over the consumer's node union. Each key gets the executor narrowed to its
// matching variant — TS refuses to compile if a key/executor pair drifts.
export type NodeExecutorRegistry<TNode extends BaseNode> = {
  [K in TNode['type']]: NodeExecutor<Extract<TNode, { type: K }>>;
};
