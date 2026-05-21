import { useStore } from '@workflowbuilder/sdk';

export function useHasNodeTypeInDiagram(nodeType: string) {
  return useStore((store) => store.nodes.some((node) => node.data.type === nodeType));
}
