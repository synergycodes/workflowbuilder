import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../../node/node-data';

export const skipDynamicValuesInNodes = (nodes: WorkflowBuilderNode[]): WorkflowBuilderNode[] => {
  return nodes.map(({ measured: _measured, dragging: _dragging, ...node }) => ({
    ...node,
    selected: false,
  }));
};

export const skipDynamicValuesInEdges = (edges: WorkflowBuilderEdge[]): WorkflowBuilderEdge[] => {
  return edges.map((edge) => ({
    ...edge,
    data: { ...edge.data, routerPointsFromAvoidNodes: [], layoutPoints: [] },
    selected: false,
  }));
};
