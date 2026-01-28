import { PaletteItemOrGroup } from '@workflow-builder/types/common';

import { withOptionalFunctionPlugins } from '@/features/plugins-core/adapters/adapter-functions';

import { action } from './nodes/action/action';
import { aiAgent } from './nodes/ai-agent/ai-agent';
import { conditional } from './nodes/conditional/conditional';
import { decision } from './nodes/decision/decision';
import { delay } from './nodes/delay/delay';
import { notification } from './nodes/notification/notification';
import { triggerNode } from './nodes/trigger/trigger';

const getPaletteDataFunction = (): PaletteItemOrGroup[] => {
  return [triggerNode, action, delay, conditional, decision, notification, aiAgent];
};

export const getPaletteData = withOptionalFunctionPlugins(getPaletteDataFunction, 'getPaletteData');
