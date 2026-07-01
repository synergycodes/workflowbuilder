import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

const diagram: DiagramModel = {
  name: 'Market Research Brief',
  diagram: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'start-node',
        position: { x: 0, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Research Topic',
            description: 'The question to research on the web.',
            inputPrompt: `Give me a briefing on the current market for AI-powered customer support tools: the main products, any notable recent launches or updates, and what users commonly praise or complain about.`,
            errors: [],
          },
          type: 'ai-studio/trigger',
          icon: 'Lightning',
        },
        selected: false,
        measured: { width: 258, height: 63 },
        dragging: false,
      },
      {
        id: 'research-1',
        type: 'node',
        position: { x: 380, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Research Agent',
            description: 'Searches the web and writes a sourced brief.',
            systemPrompt: `You are a research analyst. Use the web_search tool to gather current, factual
information about the topic in the request - search more than once if it helps.
Then write a concise brief in Markdown, in exactly this shape:

## Summary
2-3 sentences answering the request.

## Key findings
- 3-5 bullets, each a concrete fact you found.

## Sources
- A short list of the page titles and URLs you actually used.

Only state things you found via search. If a claim isn't supported by a result, leave it out.`,
            webSearch: true,
            errors: [],
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
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
            description: 'Renders the research brief (auto-detects the format).',
            errors: [],
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
        target: 'research-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-research',
        data: {},
      },
      {
        source: 'research-1',
        sourceHandle: 'source',
        target: 'visualize-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-research-visualize',
        data: {},
      },
    ],
    viewport: { x: 180, y: 150, zoom: 0.7 },
  },
  layoutDirection: 'RIGHT',
};

export const researchFlow: TemplateModel = {
  id: 305,
  name: 'Market Research Brief',
  value: diagram,
  icon: 'MagnifyingGlass',
};
