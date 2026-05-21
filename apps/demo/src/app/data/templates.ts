import type { TemplateModel } from '@workflowbuilder/sdk';

import { blackFriday } from './templates/black-friday';
import { callFlow } from './templates/call-flow';
import { simpleFlow } from './templates/simple-flow';
import { userRegistration } from './templates/user-registration';

export const demoTemplates: TemplateModel[] = [simpleFlow, userRegistration, blackFriday, callFlow];
