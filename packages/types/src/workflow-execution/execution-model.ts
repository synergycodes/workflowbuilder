// Runner-level decision applied when a node throws.
// `fail` aborts the whole execution (default); `continue` absorbs the error into
// `nodeOutputs[id] = { error }` and propagates downstream; `errorRoute` does the
// same but only follows outgoing edges whose `sourceHandle === 'errorRoute'`.
//
// Single source of truth — the SDK derives its Select options from this tuple,
// the backend builds its validation Set from it, and the runner narrows on
// `NodeErrorPolicy` for control flow. Adding a new policy is a one-line change
// here; the literal type updates automatically via `(typeof …)[number]`.
export const NODE_ERROR_POLICIES = ['fail', 'continue', 'errorRoute'] as const;

export type NodeErrorPolicy = (typeof NODE_ERROR_POLICIES)[number];

// Minimal contract every node carries through the runner. Concrete node types
// in worker packages narrow `config` via discriminated unions on `type`.
export type BaseNode = {
  id: string;
  type: string;
  config: unknown;
  errorPolicy?: NodeErrorPolicy;
};

export type WorkflowEdgeDefinition = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
};

export type WorkflowDefinition<TNode extends BaseNode> = {
  workflowId: string;
  nodes: TNode[];
  edges: WorkflowEdgeDefinition[];
};
