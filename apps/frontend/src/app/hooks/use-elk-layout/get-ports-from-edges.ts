import { getHandlePosition } from '@/features/diagram/handles/get-handle-position';
import { LayoutDirection } from '@workflow-builder/types/common';
import { Edge, Position } from '@xyflow/react';
import { pipe, flatMap, uniqueBy, sortBy } from 'remeda';

type ElkPort = {
  id: string;
  position: Position;
  nodeId: string;
  handle: string;
};

export function getPortsFromEdges(edges: Edge[], direction: LayoutDirection): ElkPort[] {
  return pipe(
    edges,
    flatMap(({ source, target, sourceHandle, targetHandle }) =>
      !sourceHandle || !targetHandle
        ? []
        : [
            {
              id: `${source}-${sourceHandle}-source`,
              position: getHandlePosition({ direction, handleType: 'source' }),
              nodeId: source,
              handle: sourceHandle,
            },
            {
              id: `${target}-${targetHandle}-target`,
              position: getHandlePosition({ direction, handleType: 'target' }),
              nodeId: target,
              handle: targetHandle,
            },
          ],
    ),
    uniqueBy(({ id }) => id),
    sortBy(({ id }) => {
      const element = document.querySelector(`[data-id="${id}"]`);
      return element ? element.getBoundingClientRect().y : 0;
    }),
  );
}
