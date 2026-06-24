import type { PaletteItemOrGroup } from '@workflowbuilder/sdk';

import { aiAgentPaletteItem } from '../nodes/ai-agent';
import { decisionPaletteItem } from '../nodes/decision';
import { triggerPaletteItem } from '../nodes/trigger';
import { visualizePaletteItem } from '../nodes/visualize';

export const aiStudioNodeTypes: PaletteItemOrGroup[] = [
  {
    label: 'AI Studio',
    isOpen: true,
    groupItems: [triggerPaletteItem, aiAgentPaletteItem, decisionPaletteItem, visualizePaletteItem],
  },
];
