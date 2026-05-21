import { NodeType } from '@workflowbuilder/sdk';
import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type DecisionNodeSchema, schema } from './schema';
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
  outputSchema: {
    type: 'default',
    properties: {
      selectedBranch: { type: 'string', label: 'Selected Branch', description: 'Label of the branch that was taken' },
      branchIndex: { type: 'number', label: 'Branch Index', description: 'Zero-based index of the selected branch' },
    },
  },
};
