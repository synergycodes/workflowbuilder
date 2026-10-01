import { NodeType, type PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type DecisionNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const decision: PaletteItem<DecisionNodeSchema> = {
  type: 'decision',
  icon: 'ArrowsSplit',
  label: 'Decision',
  description: 'Routes to one branch',
  templateType: NodeType.DecisionNode,
  defaultPropertiesData,
  schema,
  uischema,
  outputSchema: {
    type: 'default',
    properties: {
      branch: { type: 'string', label: 'Branch', description: 'Label of the branch that was taken' },
    },
  },
};
