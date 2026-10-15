import type { PaletteItem } from '@workflowbuilder/sdk';

import { humanDecisionPaletteItem } from '../human-decision';
import type { HumanDecisionSchema } from '../human-decision/schema';
import { defaultPropertiesData } from './default-properties-data';

// Also the key of the node's template in `nodeTemplates`; a custom template keyed by the palette type wins.
export const reviewNodeType = 'ai-studio/review';

// Human decision with another preset. The author cannot edit the actions yet (follow-up: decision-request-properties-ui).
export const reviewPaletteItem: PaletteItem<HumanDecisionSchema> = {
  ...humanDecisionPaletteItem,
  label: 'Review',
  description: 'Approve, escalate or reject',
  type: reviewNodeType,
  icon: 'Scales',
  defaultPropertiesData,
};
