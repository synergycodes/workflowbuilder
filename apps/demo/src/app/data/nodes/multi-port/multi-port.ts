import type { PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type MultiPortNodeSchema, schema } from './schema';
import { uischema } from './uischema';

export const multiPort: PaletteItem<MultiPortNodeSchema> = {
  type: 'multi-port',
  icon: 'ArrowsOutCardinal',
  label: 'Multi-port Node',
  description: 'Routes connections through 4 ports',
  defaultPropertiesData,
  schema,
  uischema,
};
