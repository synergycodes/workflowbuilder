import { useCallback } from 'react';
import { useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { getLayoutedNodes } from './get-layouted-nodes';
import { LayoutDirection } from '@workflow-builder/types/common';
import { WorkflowBuilderNode, WorkflowBuilderEdge } from '@workflow-builder/types/node-data';
import { useFitView } from '../use-fit-view';

export function useElkLayout() {
  const { getNodes, getEdges, setNodes } = useReactFlow<WorkflowBuilderNode, WorkflowBuilderEdge>();
  const updateNodeInternals = useUpdateNodeInternals();
  const fitView = useFitView();

  return useCallback(
    async (direction: LayoutDirection = 'RIGHT') => {
      const layoutedNodes = await getLayoutedNodes(getNodes(), getEdges(), direction);

      setNodes(layoutedNodes);

      // Calling updateNodeInternals ensures that ports are properly updated after changing the layout direction.
      // Without this, the ports' visual positions update, but their handle points remain unchanged.
      // https://reactflow.dev/api-reference/components/handle#dynamic-handles
      for (const x of layoutedNodes) updateNodeInternals(x.id);

      fitView();
    },
    [getNodes, getEdges, setNodes, updateNodeInternals, fitView],
  );
}
