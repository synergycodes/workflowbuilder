import { NodeType, type PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type VisualizeSchema, schema } from './schema';
import { uischema } from './uischema';

export const visualizePaletteItem: PaletteItem<VisualizeSchema> = {
  label: 'Visualize',
  description: 'Render an upstream output (markdown, JSON, table, chart, diagram...)',
  type: 'ai-studio/visualize',
  icon: 'Eye',
  templateType: NodeType.Node,
  defaultPropertiesData,
  schema,
  uischema,
};
