import { NodeType } from '@workflowbuilder/sdk';
import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { schema } from './schema';
import { schemaOutput } from './schema-output';
import { uischema } from './uischema';

export const aiAgent: PaletteItem = {
  label: 'node.aiAgent.label',
  description: 'node.aiAgent.description',
  type: 'ai-agent',
  icon: 'AiAgent',
  templateType: NodeType.AiNode,
  defaultPropertiesData,
  schema,
  schemaOutput,
  uischema,
};
