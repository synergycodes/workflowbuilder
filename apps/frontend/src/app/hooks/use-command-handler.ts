import { useCallback, useState } from 'react';
import { useOnSelectionChange, useStoreApi } from '@xyflow/react';
import { WorkflowBuilderOnSelectionChangeParams } from '@workflow-builder/types/common';

export type CommandHandler = {
  selectAll: () => void;
};

export function useCommandHandler(): CommandHandler {
  const [_, setSelection] = useState<WorkflowBuilderOnSelectionChangeParams>();
  const reactFlowStore = useStoreApi();

  useOnSelectionChange({
    onChange: (change) => setSelection(change as WorkflowBuilderOnSelectionChangeParams),
  });

  const selectAll = useCallback(() => {
    const state = reactFlowStore.getState();
    state.addSelectedNodes(state.nodes.map((node) => node.id));
    state.addSelectedEdges(state.edges.map((edge) => edge.id));
  }, [reactFlowStore]);

  return {
    selectAll,
  };
}
