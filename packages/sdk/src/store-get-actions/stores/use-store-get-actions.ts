import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { WorkflowBuilderNode } from '../../node/node-data';
import { useStore } from '../../store/store';

type GetActionsStore = {
  nodeIndexByNodeId: {
    [nodeId: string]: number | undefined;
  };
};

const emptyStore: GetActionsStore = {
  nodeIndexByNodeId: {},
};

const useGetActionsStore = create<GetActionsStore>()(
  devtools(
    () =>
      ({
        ...emptyStore,
      }) satisfies GetActionsStore,
    { name: 'getActionsStore' },
  ),
);

/*
    You should not use get functions at the base level of the hook,
    but if you are copying something or calculating something that is triggered by a user action
    (once, not continuously on every hook tick), this may be useful.
*/
export function getNodeByIdAction(
  nodeId: string | undefined,
  /*
    This is optional. If you need to call getNodeByIdAction multiple times,
    you should get the nodes from the store and pass them here. Ot will be more performant.
  */
  storeNodes?: WorkflowBuilderNode[],
): WorkflowBuilderNode | undefined {
  if (!nodeId) {
    return;
  }

  const nodesToCheck = storeNodes || useStore.getState().nodes;

  const nodeIndexByNodeId = useGetActionsStore.getState().nodeIndexByNodeId;

  const cachedIndex = typeof nodeIndexByNodeId[nodeId];
  if (typeof cachedIndex === 'number') {
    const nodeBaseOnCachedIndex = nodesToCheck[cachedIndex];
    if (nodeBaseOnCachedIndex?.id === nodeId) {
      return nodeBaseOnCachedIndex;
    }
  }

  const nodeIndex = nodesToCheck.findIndex((node) => node.id === nodeId);

  if (nodeIndex !== -1) {
    const node = nodesToCheck[nodeIndex];
    useGetActionsStore.setState((state) => ({
      ...state,
      nodeIndexByNodeId: {
        ...state.nodeIndexByNodeId,
        [nodeId]: nodeIndex,
      },
    }));

    return node;
  }

  return;
}
