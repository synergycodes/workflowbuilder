import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { TriggerSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<TriggerSchema> = {
  label: 'AI Studio Trigger',
  description: '',
  inputPrompt: '',
};
