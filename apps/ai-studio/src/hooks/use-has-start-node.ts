import { useStore } from '@workflowbuilder/sdk';

export function useHasStartNode() {
  return useStore((store) => store.nodes.some((node) => node.data.isStartNode === true));
}
