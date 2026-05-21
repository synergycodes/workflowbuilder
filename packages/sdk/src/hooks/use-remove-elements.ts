import { useReactFlow } from '@xyflow/react';

import type { Selection } from '../node/selection';

export function useRemoveElements() {
  const { deleteElements } = useReactFlow();

  function removeElements(selectedElement?: Selection) {
    if (!selectedElement) {
      return;
    }

    deleteElements({
      nodes: selectedElement.node ? [selectedElement.node] : undefined,
      edges: selectedElement.edge ? [selectedElement.edge] : undefined,
    });
  }

  return { removeElements };
}
