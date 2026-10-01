import { NodeType, type PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type LookupSchema, schema } from './schema';
import { uischema } from './uischema';

export const lookupPaletteItem: PaletteItem<LookupSchema> = {
  label: 'Lookup',
  description: 'Find a record by key',
  type: 'ai-studio/lookup',
  icon: 'MagnifyingGlass',
  templateType: NodeType.Node,
  defaultPropertiesData,
  schema,
  uischema,
};
