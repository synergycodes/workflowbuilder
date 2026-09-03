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

// Structural role a node plays in the graph, independent of its product type.
// `start` marks the execution entrypoint. Every runnable workflow declares exactly
// one: the runner begins there instead of inferring roots from in-degree, so a node
// left with no incoming edge is an authoring mistake rather than a second trigger.
//
// Unlike `NODE_ERROR_POLICIES` this needs no runtime tuple: a role is derived by
// the backend mapper from the editor's node kind, never validated against a value
// a client sent, so nothing has to check membership at runtime. Adding a role
// stays a one-line change.
export type NodeRole = 'start';

// Minimal contract every node carries through the runner. Concrete node types
// in worker packages narrow `config` via discriminated unions on `type`.
export type BaseNode = {
  id: string;
  type: string;
  config: unknown;
  // Lifted out of `config` by whatever builds the input, so an engine can read it
  // without knowing any product's vocabulary.
  label?: string;
  errorPolicy?: NodeErrorPolicy;
  role?: NodeRole;
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
