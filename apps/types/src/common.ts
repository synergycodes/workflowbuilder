import { ReactFlowInstance, ReactFlowJsonObject } from '@xyflow/react';
import { NodeType } from './node-types';
import { NodeDefinition, WorkflowBuilderEdge, WorkflowBuilderNode } from './node-data';
import { ReactNode } from 'react';
import { NodeSchema } from './node-schema';
import { WBIcon } from '@workflow-builder/icons';

export type LayoutDirection = 'DOWN' | 'RIGHT';

export type IconType = WBIcon;

export type ItemType = NodeType;

export type PaletteItem<T extends NodeSchema = NodeSchema> = NodeDefinition<T>;

export enum StatusType {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export type WorkflowBuilderReactFlowInstance = ReactFlowInstance<WorkflowBuilderNode, WorkflowBuilderEdge>;

export type WorkflowBuilderOnSelectionChangeParams = {
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
};

export type DiagramModel = {
  name: string;
  layoutDirection: LayoutDirection;
  diagram: ReactFlowJsonObject<WorkflowBuilderNode, WorkflowBuilderEdge>;
};

export type ChildrenProps = {
  children?: ReactNode | ReactNode[];
};

export type ZoomLevelFormatterFn = (zoomLevel: number) => number | string;

export type DraggingItem = {
  type: string;
};

export function isNodeType(type: ItemType): type is NodeType {
  return Object.values(NodeType).includes(type as NodeType);
}

export type Point = {
  x: number;
  y: number;
};

export type ConnectionBeingDragged = {
  handleId: string;
  nodeId: string;
};

export type TemplateModel = {
  id: number;
  name: string;
  value: DiagramModel;
  icon: IconType;
};
