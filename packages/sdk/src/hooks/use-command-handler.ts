import { useOnSelectionChange, useReactFlow, useStoreApi } from '@xyflow/react';
import { useCallback, useState } from 'react';

import type { WorkflowBuilderOnSelectionChangeParams } from '../node/common';
import { useFitView } from './use-fit-view';

export type CommandHandler = {
  selectAll: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
};

export function useCommandHandler(): CommandHandler {
  const [_, setSelection] = useState<WorkflowBuilderOnSelectionChangeParams>();
  const reactFlowStore = useStoreApi();
  const { zoomIn, zoomOut } = useReactFlow();
  const fitView = useFitView();

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
    fitView,
  };
}
