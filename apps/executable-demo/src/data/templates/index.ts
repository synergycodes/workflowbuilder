import type { TemplateModel } from '@workflowbuilder/sdk';

import { aiTemplate } from './ai';
import { allNodeTemplate } from './all-node';
import { branchTemplate } from './branch';

export const executableTemplates: TemplateModel[] = [allNodeTemplate, branchTemplate, aiTemplate];

export { aiTemplate } from './ai';
export { allNodeTemplate } from './all-node';
export { branchTemplate } from './branch';
