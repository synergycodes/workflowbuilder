import { useStoreApi } from '@xyflow/react';
import { useCallback } from 'react';

/** Selects one node the way a click on it does, so the SDK shows its properties. */
export function useSelectNode(): (nodeId: string) => void {
  const reactFlowStore = useStoreApi();
  return useCallback((nodeId: string) => reactFlowStore.getState().addSelectedNodes([nodeId]), [reactFlowStore]);
}
