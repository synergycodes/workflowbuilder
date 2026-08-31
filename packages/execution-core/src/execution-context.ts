export type ExecutionContext = {
  readonly workflowId: string;
  readonly executionId: string;
  readonly triggerPayload: Record<string, unknown>;
  readonly nodeOutputs: Record<string, unknown>;
  // Server-side globals/secrets the backend injects at execution start.
  // Values cross into Temporal event history unredacted via `executeNode`
  // activity args — encrypting that history is planned
  // (follow-up: temporal-payload-codec).
  readonly variables: Record<string, unknown>;
  // Global variables defined manually in the builder
  readonly global: Record<string, unknown>;
};
