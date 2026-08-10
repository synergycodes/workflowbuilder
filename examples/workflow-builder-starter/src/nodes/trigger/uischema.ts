import { generalInformation, globalControls } from '@workflowbuilder/sdk';
import type { UISchema } from '@workflowbuilder/sdk';

export const uischema: UISchema = {
  type: 'VerticalLayout',
  elements: [...globalControls, generalInformation],
};
