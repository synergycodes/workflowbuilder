import type { ReactFlowInstance, ReactFlowJsonObject, Viewport } from '@xyflow/react';
import type { ReactNode } from 'react';

import type { WBIcon } from '@workflow-builder/icons';

import type { NodeDefinition, WorkflowBuilderEdge, WorkflowBuilderNode } from './node-data';
import type { NodeSchema } from './node-schema';
import { NodeType } from './node-types';

export const layoutDirections = ['DOWN', 'RIGHT'] as const;

/**
 * Diagram flow direction. `'RIGHT'` arranges nodes left→right (default
 * for horizontal workflows); `'DOWN'` arranges them top→bottom.
 *
 * @category Types
 */
export type LayoutDirection = (typeof layoutDirections)[number];

/**
 * Icon name accepted by node definitions and palette items. Alias for
 * {@link WBIcon} from `@workflow-builder/icons`.
 *
 * @category Types
 */
export type IconType = WBIcon;

export type ItemType = NodeType;

/**
 * One entry in the editor's left-hand palette — equivalent to a full
 * node definition (schema, default values, icon, type id). Drag onto
 * the canvas to instantiate the corresponding node.
 *
 * @category Types
 */
export type PaletteItem<T extends NodeSchema = NodeSchema> = NodeDefinition<T>;

export type PaletteGroup = {
  label: string;
  groupItems: PaletteItem[];
  isOpen?: boolean;
};

/**
 * Either a single {@link PaletteItem} or a labelled group of them
 * (`PaletteGroup`). `<WorkflowBuilder.Root nodeTypes={...} />` accepts a
 * mixed array of both forms.
 *
 * @category Types
 */
export type PaletteItemOrGroup = PaletteItem | PaletteGroup;

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

/**
 * Persistable shape of a complete diagram: name, layout direction, and
 * xyflow's serialised viewport + nodes + edges JSON. The format used by
 * built-in templates and the integration layer.
 *
 * @category Types
 */
export type DiagramModel = {
  name: string;
  layoutDirection: LayoutDirection;
  diagram: ReactFlowJsonObject<WorkflowBuilderNode, WorkflowBuilderEdge>;
};

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DiagramModelInput = {
  name?: string;
  layoutDirection?: LayoutDirection;
  diagram: {
    nodes: PartialBy<WorkflowBuilderNode, 'position'>[];
    edges: WorkflowBuilderEdge[];
    viewport?: Viewport;
  };
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

/**
 * One entry in the editor's template selector — pairs a {@link DiagramModel}
 * with display metadata (id, name, icon). Pass an array of these to
 * `<WorkflowBuilder.Root templates={...} />` to populate the selector.
 *
 * @category Types
 */
export type TemplateModel = {
  id: number;
  name: string;
  value: DiagramModel;
  icon: IconType;
};
