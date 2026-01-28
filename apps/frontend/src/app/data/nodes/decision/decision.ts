import { PaletteItem } from '@workflow-builder/types/common';
import { NodeType } from '@workflow-builder/types/node-types';

import { defaultPropertiesData } from './default-properties-data';
import { DecisionNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const decision: PaletteItem<DecisionNodeSchema> = {
  label: 'node.decision.label',
  description: 'node.decision.description',
  type: 'decision',
  icon: 'ArrowsSplit',
  templateType: NodeType.DecisionNode,
  defaultPropertiesData,
  schema,
  uischema,
};
