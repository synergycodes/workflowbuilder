import type { DecisionRequest } from './decision-request';

// Runner-level decision applied when a node throws.
// `fail` aborts the whole execution (default); `continue` absorbs the error into
// `nodeOutputs[id] = { error }` and propagates downstream; `errorRoute` does the
// same but only follows outgoing edges whose `sourceHandle === 'errorRoute'`.
// Type-only so the package exports no runtime values. Runtime lists (SDK Select,
// backend validation) are `Record<NodeErrorPolicy, …>` maps, so a new policy fails to compile until added there.
export type NodeErrorPolicy = 'fail' | 'continue' | 'errorRoute';

// Structural role a node plays in the graph, independent of its product type.
// `start` marks the execution entrypoint. Every runnable workflow declares exactly
// one: the runner begins there instead of inferring roots from in-degree, so a node
// left with no incoming edge is an authoring mistake rather than a second trigger.
// Derived by the backend mapper from the editor's node kind, never validated
// against client input, so no runtime membership check exists.
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
  /**
   * What this node asks a human to decide before the run continues. The backend and the
   * decision endpoint find it by this field, never by `type`. The runner does not read it:
   * a run stops where a node's executor returns a waiting result.
   */
  decisionRequest?: DecisionRequest;
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
