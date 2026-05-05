import {
  type BaseNode,
  NODE_ERROR_POLICIES,
  type NodeErrorPolicy,
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

// `errorPolicy` is authored in the UI as a regular JSONForms property
// (via `sharedProperties` in the SDK), so it arrives nested in
// `data.properties`. The runner expects it at the top level of `BaseNode`,
// so we lift it here and keep `config` free of runner-only fields.
function mapNode(node: FrontendNode): BaseNode {
  const { errorPolicy: rawErrorPolicy, ...config } = node.data.properties ?? {};
  const errorPolicy = isErrorPolicy(rawErrorPolicy) ? rawErrorPolicy : undefined;
  return {
    id: node.id,
    type: node.data.type,
    config,
    ...(errorPolicy === undefined ? {} : { errorPolicy }),
  };
}

function isErrorPolicy(value: unknown): value is NodeErrorPolicy {
  return typeof value === 'string' && ERROR_POLICIES.has(value as NodeErrorPolicy);
}

function mapEdge(edge: FrontendEdge): WorkflowEdgeDefinition {
  return {
    id: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceHandle: stripLegacyHandlePrefix(edge.sourceHandle) ?? undefined,
  };
}

// Legacy handle IDs were `${nodeId}:source` (optionally `:inner:${innerId}`).
// New format drops the nodeId prefix. Migrate at the boundary so older
// snapshots and any in-flight legacy clients stay compatible.
const LEGACY_HANDLE_RE = /^.+?:(source|target)(:inner:.+)?$/;

function stripLegacyHandlePrefix(handle: string | null | undefined): string | null | undefined {
  if (!handle) return handle;
  const match = LEGACY_HANDLE_RE.exec(handle);
  if (!match) return handle;
  return match[2] ? `${match[1]}${match[2]}` : match[1];
}
