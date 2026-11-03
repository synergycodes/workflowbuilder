export type ExecutionContext = {
  readonly workflowId: string;
  readonly executionId: string;
  readonly triggerPayload: Record<string, unknown>;
  readonly nodeOutputs: Record<string, unknown>;
  /**
   * Non-secret server-side run config. Everything here reaches Temporal Event History
   * unredacted. See the `@workflowbuilder/temporal` README, "What Event History records".
   */
  readonly variables: Record<string, unknown>;
  /**
   * Global variables defined manually in the builder. Same route as `variables`: everything
   * here reaches Temporal Event History unredacted, so it is no place for a secret either.
   */
  readonly global: Record<string, unknown>;
};
