import { Draft, produce } from 'immer';
import { EdgeData, NodeData, WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { GetDiagramState, SetDiagramState } from '@/store/store';
import { OnEdgesChange, OnNodesChange, applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { removeElements } from './remove-elements';

export type DiagramDataModificationState = {
  onNodesChange: OnNodesChange<WorkflowBuilderNode>;
  onEdgesChange: OnEdgesChange<WorkflowBuilderEdge>;
  setNodeProperties: (nodeId: string, properties: NodeData['properties']) => void;
  setNodeData: <T extends WorkflowBuilderNode['data']>(nodeId: string, data: T) => void;
  setEdgeData: (edgeId: string, data: EdgeData) => void;
  removeElements: (elements: { nodes?: WorkflowBuilderNode[]; edges?: WorkflowBuilderEdge[] }) => void;
};

export function useDiagramDataModificationSlice(
  set: SetDiagramState,
  get: GetDiagramState,
): DiagramDataModificationState {
  return {
    onNodesChange: (changes) => {
      set({
        nodes: applyNodeChanges(changes, get().nodes),
      });
    },
    onEdgesChange: (changes) => {
      set({
        edges: applyEdgeChanges(changes, get().edges),
      });
    },
    setNodeProperties: (nodeId, properties) => {
      set({
        nodes: updateNodesProperties(get().nodes, nodeId, properties),
      });
    },
    setNodeData: (nodeId, data) => {
      set({
        nodes: updateData(get().nodes, nodeId, data),
      });
    },
    setEdgeData: (edgeId, data) => {
      set({
        edges: updateData(get().edges, edgeId, data),
      });
    },
    removeElements: (elements: { nodes?: WorkflowBuilderNode[]; edges?: WorkflowBuilderEdge[] }) =>
      removeElements(elements, set, get),
  };
}

function updateNodesProperties(
  nodes: WorkflowBuilderNode[],
  updatedNodeId: string,
  properties: Partial<NodeData['properties']>,
) {
  return produce(nodes, (draft: Draft<WorkflowBuilderNode[]>) => {
    const node = draft.find((x) => x.id === updatedNodeId);

    if (!node) {
      return;
    }

    node.data.properties = { ...properties };
  });
}

function updateData<T extends WorkflowBuilderNode | WorkflowBuilderEdge>(
  elements: T[],
  updatedElementId: string,
  data: Partial<T['data']>,
) {
  return produce(elements, (draft: Draft<WorkflowBuilderNode[]>) => {
    const element = draft.find((x) => x.id === updatedElementId);

    if (!element) {
      return;
    }

    element.data = { ...element.data, ...data };
  });
}
