import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';

import { isPlainObject } from '../is-plain-object';

export type Diagram = { nodes: WorkflowBuilderNode[]; edges: WorkflowBuilderEdge[] };

export type DiagramCheck = { ok: true; diagram: Diagram; unknownTypes: string[] } | { ok: false; reason: string };

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const isPoint = (value: unknown) => isPlainObject(value) && Number.isFinite(value['x']) && Number.isFinite(value['y']);

function nodeProblem(node: unknown, index: number): string | undefined {
  if (!isPlainObject(node) || !isText(node['id'])) return `node ${index + 1} has no id`;
  const name = `node "${node['id']}"`;
  if (!isText(node['type'])) return `${name} has no type`;
  if (!isPoint(node['position'])) return `${name} has no position`;
  const data = node['data'];
  if (!isPlainObject(data)) return `${name} has no data`;
  if (!isText(data['type'])) return `${name} has no palette type`;
  if (!isPlainObject(data['properties'])) return `${name} has no properties`;
  return undefined;
}

function isEdge(edge: unknown): boolean {
  return isPlainObject(edge) && isText(edge['id']) && isText(edge['source']) && isText(edge['target']);
}

// A stored graph keeps the selection of whoever saved it.
function withoutInteractionState(node: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...node };
  delete copy['selected'];
  delete copy['dragging'];
  return copy;
}

export function validateDiagram(value: unknown, knownTypes: ReadonlySet<string>): DiagramCheck {
  if (!isPlainObject(value) || !Array.isArray(value['nodes']) || !Array.isArray(value['edges'])) {
    return { ok: false, reason: 'it has no list of nodes and edges' };
  }
  const nodes: unknown[] = value['nodes'];
  const edges: unknown[] = value['edges'];

  for (const [index, node] of nodes.entries()) {
    const problem = nodeProblem(node, index);
    if (problem) return { ok: false, reason: problem };
  }
  const badEdge = edges.findIndex((edge) => !isEdge(edge));
  if (badEdge !== -1) return { ok: false, reason: `edge ${badEdge + 1} does not name its id, source and target` };

  const checked = nodes as Array<Record<string, unknown> & { data: { type: string } }>;
  const unknownTypes = [...new Set(checked.map((node) => node.data.type).filter((type) => !knownTypes.has(type)))];

  return {
    ok: true,
    diagram: {
      nodes: checked.map(withoutInteractionState) as unknown as WorkflowBuilderNode[],
      edges: edges as WorkflowBuilderEdge[],
    },
    unknownTypes,
  };
}
