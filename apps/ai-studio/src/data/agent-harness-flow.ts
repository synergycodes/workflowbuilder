import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

const diagram: DiagramModel = {
  name: 'Agent Harness Demo',
  diagram: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'start-node',
        position: { x: 0, y: 300 },
        data: {
          segments: [],
          isStartNode: true,
          properties: {
            label: 'Start',
            description: 'Kicks off the agent harness demo.',
            inputPrompt: `Create a file plan.md outlining three approaches to rate-limiting an HTTP API, then summarize the tradeoffs.`,
          },
          type: 'ai-studio/trigger',
          icon: 'Lightning',
        },
        selected: false,
        measured: { width: 258, height: 63 },
        dragging: false,
      },
      {
        id: 'agent-harness-1',
        type: 'node',
        position: { x: 380, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Agent Harness',
            description: 'Delegates the task to Copilot via the agent harness CLI.',
            prompt: `Create a file plan.md outlining three approaches to rate-limiting an HTTP API, then summarize the tradeoffs.`,
            provider: 'copilot',
            model: 'auto',
            context: 'fresh',
            toolsMode: 'all',
            mutatesCheckout: false,
            persistSession: false,
            idle_timeout: 300_000,
          },
          type: 'ai-studio/agent-harness',
          icon: 'Terminal',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'visualize-1',
        type: 'node',
        position: { x: 760, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Visualize',
            description: 'Renders the agent output (auto-detects the format).',
            mode: 'auto',
          },
          type: 'ai-studio/visualize',
          icon: 'Eye',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
    ],
    edges: [
      {
        source: 'trigger-1',
        sourceHandle: 'source',
        target: 'agent-harness-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-agent-harness',
        data: {},
      },
      {
        source: 'agent-harness-1',
        sourceHandle: 'source',
        target: 'visualize-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-agent-harness-visualize',
        data: {},
      },
    ],
    viewport: { x: 180, y: 150, zoom: 0.7 },
  },
  layoutDirection: 'RIGHT',
};

export const agentHarnessFlow: TemplateModel = {
  id: 306,
  name: 'Agent Harness Demo',
  value: diagram,
  icon: 'Terminal',
};
