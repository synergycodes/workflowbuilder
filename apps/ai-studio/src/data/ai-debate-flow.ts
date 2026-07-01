import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

const diagram: DiagramModel = {
  name: 'AI Debate',
  diagram: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'start-node',
        position: { x: 0, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'The Question',
            description: 'A decision to stress-test from both sides.',
            inputPrompt:
              'Should our 12-person startup build a native mobile app now, or keep doubling down on the web app first?',
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
        id: 'optimist-1',
        type: 'node',
        position: { x: 400, y: 120 },
        data: {
          segments: [],
          properties: {
            label: 'Optimist',
            description: 'Argues the strongest case in favour.',
            systemPrompt: `You are an optimistic strategist. Argue the strongest possible case FOR the
proposal in the question. Give 3-4 crisp bullet points - upside, opportunity,
why now. Be persuasive but honest, no hype.`,
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
        id: 'skeptic-1',
        type: 'node',
        position: { x: 400, y: 480 },
        data: {
          segments: [],
          properties: {
            label: 'Skeptic',
            description: "Argues the strongest case against - devil's advocate.",
            systemPrompt: `You are a rigorous skeptic and devil's advocate. Argue the strongest possible
case AGAINST the proposal in the question. Give 3-4 crisp bullet points - risks,
hidden costs, what could go wrong. Surface the objections others gloss over.`,
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
        id: 'verdict-1',
        type: 'node',
        position: { x: 820, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Balanced Verdict',
            description: 'Weighs both sides and recommends.',
            systemPrompt: `You moderate a debate. You receive an optimist's case and a skeptic's case for
the same proposal. Weigh both and deliver a balanced recommendation as markdown,
in exactly this shape:

**Verdict:** [one decisive line - pick a direction]

| For | Against |
| --- | --- |
| [strongest point in favour] | [strongest point against] |
| [second point in favour] | [second point against] |

**Reasoning:** [2-3 sentences: why this verdict, and the first concrete step.]

Be decisive.`,
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
        position: { x: 1240, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Visualize',
            description: 'Renders the verdict (auto-detects the format).',
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
        target: 'optimist-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-optimist',
        data: {},
      },
      {
        source: 'trigger-1',
        sourceHandle: 'source',
        target: 'skeptic-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-skeptic',
        data: {},
      },
      {
        source: 'optimist-1',
        sourceHandle: 'source',
        target: 'verdict-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-optimist-verdict',
        data: {},
      },
      {
        source: 'skeptic-1',
        sourceHandle: 'source',
        target: 'verdict-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-skeptic-verdict',
        data: {},
      },
      {
        source: 'verdict-1',
        sourceHandle: 'source',
        target: 'visualize-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-verdict-visualize',
        data: {},
      },
    ],
    viewport: { x: 80, y: 80, zoom: 0.55 },
  },
  layoutDirection: 'RIGHT',
};

export const aiDebateFlow: TemplateModel = {
  id: 302,
  name: 'AI Debate',
  value: diagram,
  icon: 'ChatCircleDots',
};
