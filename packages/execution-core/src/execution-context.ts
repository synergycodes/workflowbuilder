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

// The namespaces a `{{namespace.path}}` reference or a `namespace/path` edit key may name,
// and the context bag each one reads.
export const CONTEXT_NAMESPACES = {
  nodes: 'nodeOutputs',
  trigger: 'triggerPayload',
  variables: 'variables',
  global: 'global',
} as const satisfies Record<string, keyof ExecutionContext>;

export type ContextNamespace = keyof typeof CONTEXT_NAMESPACES;

export function isContextNamespace(namespace: string): namespace is ContextNamespace {
  return Object.hasOwn(CONTEXT_NAMESPACES, namespace);
}
