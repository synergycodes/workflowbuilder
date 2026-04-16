import type { Edge, Node } from '@xyflow/react';

import type { NodeDataProperties } from '../../frontend/src/app/features/json-form/types/default-properties';
import type { UISchema } from '../../frontend/src/app/features/json-form/types/uischema';
import type { IconType } from './common';
import type { NodeOutputSchema } from './node-output-schema';
import type { BaseNodeProperties, NodeSchema } from './node-schema';
import { NodeType } from './node-types';

export type WorkflowBuilderNode = Node<NodeData>;
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
