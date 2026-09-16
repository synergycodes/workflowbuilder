// The task queue the reference worker listens on and the reference backend submits
// to. Exported so both sides name it once instead of repeating a literal.
export const DEFAULT_TASK_QUEUE = 'workflow-execution';

// The name Temporal resolves the workflow by. It is the name of the function
// exported from the ./workflow entry point, so the two must agree — pinned by a test,
// because a rename here silently strands every already-started run.
export const RUN_WORKFLOW_NAME = 'runWorkflow';

// One Temporal Workflow Execution per Workflow Builder execution row. Deterministic,
// so cancel can address a run knowing only the execution id.
export function executionWorkflowId(executionId: string): string {
  return `execution-${executionId}`;
}
