import { NodeType, type PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type DecisionSchema, schema } from './schema';
import { uischema } from './uischema';

export const decisionPaletteItem: PaletteItem<DecisionSchema> = {
  label: 'Decision',
  description: 'Route by condition',
  type: 'ai-studio/decision',
  icon: 'ArrowsSplit',
  templateType: NodeType.DecisionNode,
  defaultPropertiesData,
  schema,
  uischema,
};
