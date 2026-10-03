import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { AgentHarnessSchema } from './schema';

export const defaultPropertiesData: NodeDataProperties<AgentHarnessSchema> = {
  label: 'Agent Harness',
  description: '',
  prompt: '',
  provider: 'copilot',
  model: 'auto',
  context: 'fresh',
  toolsMode: 'none',
  mutatesCheckout: false,
  persistSession: false,
};
