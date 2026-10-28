import { useOnSelectionChange, useReactFlow, useStoreApi } from '@xyflow/react';
import { useCallback, useState } from 'react';

import type { WorkflowBuilderOnSelectionChangeParams } from '../node/common';

export type CommandHandler = {
  selectAll: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export function useCommandHandler(): CommandHandler {
  const [_, setSelection] = useState<WorkflowBuilderOnSelectionChangeParams>();
  const reactFlowStore = useStoreApi();
  const { zoomIn, zoomOut } = useReactFlow();

  useOnSelectionChange({
    onChange: (change) => setSelection(change as WorkflowBuilderOnSelectionChangeParams),
  });

  const selectAll = useCallback(() => {
    const state = reactFlowStore.getState();
    state.addSelectedNodes(state.nodes.map((node) => node.id));
    state.addSelectedEdges(state.edges.map((edge) => edge.id));
  }, [reactFlowStore]);

  const zoomInCommand = useCallback(() => {
    zoomIn();
  }, [zoomIn]);

  const zoomOutCommand = useCallback(() => {
    zoomOut();
  }, [zoomOut]);

  return {
    selectAll,
    zoomIn: zoomInCommand,
    zoomOut: zoomOutCommand,
  };
}
