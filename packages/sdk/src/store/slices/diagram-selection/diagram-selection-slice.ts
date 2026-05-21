import type { MouseEvent } from 'react';

import type { WorkflowBuilderOnSelectionChangeParams } from '../../../node/common';
import type { WorkflowBuilderEdge } from '../../../node/node-data';
import type { GetDiagramState, SetDiagramState } from '../../store';

export type DiagramSelectionState = {
  hoveredElement: string | null;
  selectedNodesIds: string[];
  selectedEdgesIds: string[];
  onEdgeMouseEnter: (_event: MouseEvent, edge: WorkflowBuilderEdge) => void;
  onEdgeMouseLeave: (_event: MouseEvent, edge: WorkflowBuilderEdge) => void;
  onSelectionChange: (event: WorkflowBuilderOnSelectionChangeParams) => void;
};

export function useDiagramSelectionSlice(set: SetDiagramState, get: GetDiagramState) {
  return {
    hoveredElement: null,
    selectedNodesIds: [],
    selectedEdgesIds: [],
    onSelectionChange: (event: WorkflowBuilderOnSelectionChangeParams) => {
      set({
        selectedNodesIds: event.nodes.map((x) => x.id),
        selectedEdgesIds: event.edges.map((x) => x.id),
      });
    },
    onEdgeMouseEnter: (_event: React.MouseEvent, edge: WorkflowBuilderEdge) => {
      set({
        hoveredElement: edge.id,
      });
    },
    onEdgeMouseLeave: (_event: React.MouseEvent, edge: WorkflowBuilderEdge) => {
      const current = get().hoveredElement;
      if (current === edge.id) {
        set({
          hoveredElement: null,
        });
      }
    },
  };
}
