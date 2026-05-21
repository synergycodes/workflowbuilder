import type { PaletteItemOrGroup } from '@workflowbuilder/sdk';

import { aiAgentPaletteItem } from '../nodes/ai-agent';
import { decisionPaletteItem } from '../nodes/decision';
import { triggerPaletteItem } from '../nodes/trigger';

export const aiStudioNodeTypes: PaletteItemOrGroup[] = [
  {
    label: 'AI Studio',
    isOpen: true,
    groupItems: [triggerPaletteItem, aiAgentPaletteItem, decisionPaletteItem],
  },
];
