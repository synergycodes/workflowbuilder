import { PaletteItem } from '@workflow-builder/types/common';
import { NodeType } from '@workflow-builder/types/node-types';

import { defaultPropertiesData } from './default-properties-data';
import { schema } from './schema';
import { uischema } from './uischema';

export const aiAgent: PaletteItem = {
  label: 'AI Agent',
  description: 'AI Agent Node',
  type: 'ai-agent',
  icon: 'AiAgent',
  templateType: NodeType.AiNode,
  defaultPropertiesData,
  schema,
  uischema,
};
