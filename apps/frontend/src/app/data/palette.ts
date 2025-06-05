import { PaletteItem } from '@workflow-builder/types/common';
import { triggerNode } from './nodes/trigger/trigger';
import { action } from './nodes/action/action';
import { conditional } from './nodes/conditional/conditional';
import { notification } from './nodes/notification/notification';
import { delay } from './nodes/delay/delay';
import { decision } from './nodes/decision/decision';
import { aiAgent } from './nodes/ai-agent/ai-agent';

export const paletteData: PaletteItem[] = [triggerNode, action, delay, conditional, decision, notification, aiAgent];
