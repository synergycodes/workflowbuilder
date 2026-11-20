import type { TemplateModel } from '@workflowbuilder/sdk';

import { executableDiagram, executableEdge, executableNode } from './helpers';

const nodes = [
  executableNode({
    id: 'ai-trigger',
    type: 'trigger',
    label: 'Manual prompt',
    description: 'Try {"topic":"release notes"}.',
    icon: 'Lightning',
    x: 0,
    y: 200,
  }),
  executableNode({
    id: 'ai-draft',
    type: 'ai-agent',
    label: 'Draft summary',
    description: 'Uses backend-selected model settings.',
    icon: 'AiAgent',
    x: 380,
    y: 200,
    properties: {
      systemPrompt:
        "Write one concise paragraph about {{trigger.topic | default:'workflow automation'}}. Be factual and avoid claiming details that are not present in the input.",
    },
  }),
  executableNode({
    id: 'ai-notify',
    type: 'notification',
    label: 'Preview delivery',
    description: 'Simulates delivery of the generated response.',
    icon: 'PaperPlaneRight',
    x: 760,
    y: 200,
    properties: {
      type: 'email',
      recipient: 'preview@example.invalid',
      message: '{{nodes.ai-draft.response}}',
    },
  }),
];

const edges = [
  executableEdge('ai-edge-trigger-draft', 'ai-trigger', 'ai-draft'),
  executableEdge('ai-edge-draft-notify', 'ai-draft', 'ai-notify'),
];

export const aiTemplate: TemplateModel = {
  id: 4203,
  name: 'AI prompt pipeline',
  icon: 'AiAgent',
  value: executableDiagram('AI prompt pipeline', nodes, edges),
};
