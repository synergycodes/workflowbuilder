import { NodeType, type PaletteItem } from '@workflowbuilder/sdk';

import { defaultPropertiesData } from './default-properties-data';
import { type AgentHarnessSchema, schema } from './schema';
import { uischema } from './uischema';

export const agentHarnessPaletteItem: PaletteItem<AgentHarnessSchema> = {
  label: 'Agent Harness',
  description: 'Delegate a step to an autonomous coding-agent CLI (GitHub Copilot)',
  type: 'ai-studio/agent-harness',
  icon: 'Terminal',
  templateType: NodeType.Node,
  defaultPropertiesData,
  schema,
  uischema,
  // Lets `{{ nodes.<id>.response }}` references resolve to a real mention instead of a "missing mention" pill.
  outputSchema: {
    type: 'default',
    properties: {
      response: { type: 'string', label: 'Response', description: 'The text produced by the agent run' },
      tokens: { type: 'object', label: 'Tokens', description: 'Token usage reported by the provider' },
    },
  },
};
