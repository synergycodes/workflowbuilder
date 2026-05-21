import type { NodeAddChange, XYPosition } from '@xyflow/react';

import type { NodeData, WorkflowBuilderNode } from '../node/node-data';

export function getNodeAddChange(
  reactFlowNodeType: string,
  position: XYPosition | undefined,
  data: NodeData,
  id: string,
): NodeAddChange<WorkflowBuilderNode>[] {
  return [
    {
      type: 'add',
      item: {
        id,
        type: reactFlowNodeType,
        position: position ?? { x: 0, y: 0 },
        data: {
          segments: [],
          ...data,
        },
        selected: true,
      },
    },
  ];
}
