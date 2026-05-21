// Workflow-sandbox-safe exports.
// This entry point MUST NOT import any module that uses Node I/O or Web APIs
// missing from Temporal's V8 sandbox (e.g. TransformStream, fetch).
// Use `@workflow-builder/execution-core` (root) for activities and executors,
// which must run outside the sandbox.

export type { BaseNode, NodeErrorPolicy } from '@workflow-builder/types/workflow-execution/execution-model';

export { runGraph } from './graph-runner';

export { NodeExecutionError } from './errors';

export type { ExecutionContext } from './execution-context';

export type { WorkflowEnginePort, WorkflowExecutionInput } from './ports/workflow-engine.port';
export type { ActivityRunnerPort, NodeExecutionResult } from './ports/activity-runner.port';
export type { EventEmitterPort } from './ports/event-emitter.port';
