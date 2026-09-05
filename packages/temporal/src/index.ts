// Worker-side entry point. Pair it with:
//   - `@workflowbuilder/temporal/workflow` — re-export `runWorkflow` from your own
//     workflows module (see the README).
//   - `@workflowbuilder/temporal/client` — starting and cancelling runs.

export { WorkflowBuilderPlugin } from './plugin';
export type { WorkflowBuilderPluginOptions } from './plugin';

export { createActivities } from './activities';
export type { CreateActivitiesOptions } from './activities';

export type { ExecutionStore } from './store';

export { DEFAULT_TASK_QUEUE, RUN_WORKFLOW_NAME, executionWorkflowId } from './constants';

export { DEFAULT_DATABASE_ACTIVITY_PROFILE, DEFAULT_NODE_ACTIVITY_PROFILE } from './workflow/activity-profiles';
export type { ActivityProfile, NodeActivityProfiles } from './workflow/activity-profiles';

// Re-exported from the bundled execution core, so a consumer writes executors
// against this package alone and never installs a second one.
export { NodeExecutionError, PermanentNodeExecutionError, TransientNodeExecutionError } from './core-contract';
export type {
  BaseNode,
  ExecutionContext,
  LogBindings,
  LoggerPort,
  NodeErrorPolicy,
  NodeExecutionResult,
  NodeExecutor,
  NodeExecutorRegistry,
  WorkflowDefinition,
  WorkflowEdgeDefinition,
  WorkflowEnginePort,
  WorkflowExecutionInput,
} from './core-contract';
