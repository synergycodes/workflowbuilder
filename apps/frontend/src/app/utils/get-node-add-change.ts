import { NodeData, WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { NodeAddChange, XYPosition } from '@xyflow/react';
import { NodeType } from '@workflow-builder/types/node-types';

export function getNodeAddChange(
  templateType: NodeType,
  position: XYPosition | undefined,
  data: NodeData,
  id: string,
): NodeAddChange<WorkflowBuilderNode>[] {
  return [
    {
      type: 'add',
      item: {
        id,
        type: templateType,
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
