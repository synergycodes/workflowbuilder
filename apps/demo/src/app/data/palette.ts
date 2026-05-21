import type { PaletteItemOrGroup } from '@workflowbuilder/sdk';

import { action } from './nodes/action/action';
import { aiAgent } from './nodes/ai-agent/ai-agent';
import { conditional } from './nodes/conditional/conditional';
import { decision } from './nodes/decision/decision';
import { delay } from './nodes/delay/delay';
import { multiPort } from './nodes/multi-port/multi-port';
import { notification } from './nodes/notification/notification';
import { triggerNode } from './nodes/trigger/trigger';

export const demoPaletteItems: PaletteItemOrGroup[] = [
  triggerNode,
  action,
  delay,
  conditional,
  decision,
  notification,
  aiAgent,
  multiPort,
];
