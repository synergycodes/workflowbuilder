import {
  type BaseNode,
  NODE_ERROR_POLICIES,
  type NodeErrorPolicy,
  type NodeRole,
  type WorkflowDefinition,
  type WorkflowEdgeDefinition,
} from '@workflow-builder/types/workflow-execution/execution-model';

import type { WorkflowSnapshot } from './snapshot-schema';

type FrontendNode = WorkflowSnapshot['nodes'][number];
type FrontendEdge = WorkflowSnapshot['edges'][number];

// Reuses `NODE_ERROR_POLICIES` from `@workflow-builder/types` so adding a new
// policy is a one-line change there — no risk of this validation Set drifting
// out of sync with the runner's union.
const ERROR_POLICIES: ReadonlySet<NodeErrorPolicy> = new Set(NODE_ERROR_POLICIES);

// Structural pass-through. The backend treats nodes as opaque `{ id, type, config }`;
// the worker narrows `config` against its own concrete node union when it dispatches
// the executor. Unknown types reach the worker and fail there as `node_failed`.
export function mapToExecutionModel(workflowId: string, data: WorkflowSnapshot): WorkflowDefinition<BaseNode> {
  const nodes = data.nodes.map(mapNode);
  const edges = data.edges.map(mapEdge);
  return { workflowId, nodes, edges };
}

// Three runner-level fields are lifted out of the frontend shape here so `config`
// stays free of them. `errorPolicy` and `label` are authored in the UI as regular
// JSONForms properties (via `sharedProperties` in the SDK) and arrive nested in
// `data.properties`. `role` comes from the editor's `data.isStartNode` flag,
// which sits alongside the properties rather than inside them. `description` stays in
// `config`: no engine reads it.
function mapNode(node: FrontendNode): BaseNode {
  const { errorPolicy: rawErrorPolicy, label: rawLabel, ...config } = node.data.properties ?? {};
  const errorPolicy = isErrorPolicy(rawErrorPolicy) ? rawErrorPolicy : undefined;
  const label = isNonEmptyString(rawLabel) ? rawLabel.trim() : undefined;
  const role: NodeRole | undefined = node.data.isStartNode === true ? 'start' : undefined;
  return {
    id: node.id,
    type: node.data.type,
    config,
    ...(label === undefined ? {} : { label }),
    ...(errorPolicy === undefined ? {} : { errorPolicy }),
    ...(role === undefined ? {} : { role }),
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isErrorPolicy(value: unknown): value is NodeErrorPolicy {
  return typeof value === 'string' && ERROR_POLICIES.has(value as NodeErrorPolicy);
}

function mapEdge(edge: FrontendEdge): WorkflowEdgeDefinition {
  return {
    id: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
  };
}
