import { NodeType } from '@workflowbuilder/sdk';
import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type DecisionNodeSchema, schema } from './schema';
import { schemaOutput } from './schema-output';
import { uischema } from './uischema';

export const decision: PaletteItem<DecisionNodeSchema> = {
  label: 'node.decision.label',
  description: 'node.decision.description',
  type: 'decision',
  icon: 'ArrowsSplit',
  templateType: NodeType.DecisionNode,
  defaultPropertiesData,
  schema,
  schemaOutput,
  uischema,
};
