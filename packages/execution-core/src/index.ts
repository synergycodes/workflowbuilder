export type { BaseNode, NodeErrorPolicy } from '@workflow-builder/types/workflow-execution/execution-model';

export { runGraph } from './graph-runner';

export { NodeExecutionError } from './errors';

export type { ExecutionContext } from './execution-context';

export type { WorkflowEnginePort, WorkflowExecutionInput } from './ports/workflow-engine.port';
export type { ActivityRunnerPort, NodeExecutionResult } from './ports/activity-runner.port';
export type { EventEmitterPort } from './ports/event-emitter.port';
export type { LoggerPort, LogBindings } from './ports/logger.port';

export { createConsoleLogger } from './console-logger';
export type { ConsoleLoggerOptions } from './console-logger';

export type { NodeExecutor, NodeExecutorRegistry } from './registry/node-executor-registry';
export { resolveExecutor } from './registry/node-executor-registry';

export { resolveTemplate } from './templates/resolve-template';
