import { Connection, OnConnect, addEdge, Node } from '@xyflow/react';
import { GetDiagramState, SetDiagramState } from '@/store/store';
import {
  ConnectionBeingDragged,
  DiagramModel,
  LayoutDirection,
  WorkflowBuilderReactFlowInstance,
} from '@workflow-builder/types/common';
import { WorkflowBuilderNode, WorkflowBuilderEdge } from '@workflow-builder/types/node-data';
import { getEdgeZIndex } from '@/features/diagram/edges/get-edge-z-index';

export type DiagramState = {
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
  reactFlowInstance: WorkflowBuilderReactFlowInstance | null;
  documentName: string | null;
  isReadOnlyMode: boolean;
  layoutDirection: LayoutDirection;
  onConnect: OnConnect;
  onInit: (instance: WorkflowBuilderReactFlowInstance) => void;
  setDocumentName: (name: string) => void;
  setDiagramModel: (model?: DiagramModel, fitView?: boolean) => void;
  setToggleReadOnlyMode: (value?: boolean) => void;
  setLayoutDirection: (value: LayoutDirection) => void;
  setConnectionBeingDragged: (nodeId: string | null, handleId: string | null) => void;
  connectionBeingDragged: ConnectionBeingDragged | null;
  draggedSegmentDestinationId: string | null;
  setDraggedSegmentDestinationId: (id: string | null) => void;
  getNodes: () => Node[];
};

export function useDiagramSlice(set: SetDiagramState, get: GetDiagramState) {
  return {
    nodes: [],
    edges: [],
    reactFlowInstance: null,
    documentName: null,
    isReadOnlyMode: false,
    layoutDirection: 'RIGHT' as LayoutDirection,
    connectionBeingDragged: null,
    draggedSegmentDestinationId: null,
    onConnect: (connection: Connection) => {
      set({
        edges: addEdge(
          {
            ...connection,
            zIndex: getEdgeZIndex(connection),
            type: 'labelEdge',
          },
          get().edges,
        ),
      });
    },
    onInit: (instance: WorkflowBuilderReactFlowInstance) => {
      set({
        reactFlowInstance: instance,
      });
    },
    setDiagramModel: async (model?: DiagramModel) => {
      const nodes = model?.diagram.nodes || [];
      const edges = model?.diagram.edges || [];
      const documentName = model?.name || 'Untitled';
      const layoutDirection = model?.layoutDirection || 'RIGHT';

      set({
        nodes,
        layoutDirection,
        documentName,
      });

      set({
        edges: edges,
      });
    },
    setDocumentName: (name: string) => {
      set({
        documentName: name,
      });
    },
    setToggleReadOnlyMode: (value?: boolean) => {
      set({
        isReadOnlyMode: value ?? !get().isReadOnlyMode,
      });
    },
    setLayoutDirection: (value: LayoutDirection) => {
      set({
        layoutDirection: value,
      });
    },
    setConnectionBeingDragged: (nodeId: string | null, handleId: string | null) => {
      if (handleId && nodeId) {
        set({
          connectionBeingDragged: {
            handleId,
            nodeId,
          },
        });
      } else {
        set({
          connectionBeingDragged: null,
        });
      }
    },
    setDraggedSegmentDestinationId: (id: string | null) => {
      set({ draggedSegmentDestinationId: id });
    },
    getNodes: () => get().nodes,
  };
}
