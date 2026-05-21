import type { Edge, Node } from '@xyflow/react';

import type { NodeDataProperties } from '../types/default-properties';
import type { UISchema } from '../types/uischema';
import type { IconType } from './common';
import type { NodeOutputSchema } from './node-output-schema';
import type { BaseNodeProperties, NodeSchema } from './node-schema';
import type { NodeType } from './node-types';

/**
 * xyflow `Node` parameterised with the SDK's {@link NodeData}. The
 * node-instance shape used everywhere the editor references a node
 * (store, handlers, listeners, save payload).
 *
 * @category Types
 */
export type WorkflowBuilderNode = Node<NodeData>;

/**
 * xyflow `Edge` parameterised with the SDK's `EdgeData` (label + icon).
 *
 * @category Types
 */
export type WorkflowBuilderEdge = Edge<EdgeData>;

export type NodeDefinition<T extends NodeSchema> = {
  schema: T;
  /** default values of schema based properties */
  defaultPropertiesData: NodeDataProperties<T>;
  /** describes how the form looks like and to which fields data properties should be mapped */
  uischema?: UISchema;
  /** describes the output properties this node produces, used by the variable picker */
  outputSchema?: NodeOutputSchema;
} & Required<Omit<BaseNodeProperties, 'errors' | 'customErrors'>> &
  Pick<NodeData, 'type' | 'icon' | 'templateType'>;

/**
 * Per-node data attached to every {@link WorkflowBuilderNode}. The `properties`
 * field carries the node's user-editable values (typed by `T`); `type`
 * matches the corresponding `NodeDefinition.type`; `icon` is the icon shown
 * in palette and on the diagram canvas.
 *
 * Generic over `T` so concrete node types can refine `properties` to their
 * own schema-driven shape (typically via `NodeDataProperties<MySchema>`).
 *
 * @category Types
 */
export type NodeData<T = BaseNodeProperties & Record<string, unknown>> = {
  segments?: []; // TODO: Add segments back, it's a placeholder suggestion where to hold segments data
  templateType?: NodeType;
  properties: T;
  icon: IconType;
  type: string;
};

export type EdgeData = {
  label?: string;
  icon?: IconType;
};
