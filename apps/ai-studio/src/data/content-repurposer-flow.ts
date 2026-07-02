import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

const diagram: DiagramModel = {
  name: 'Content Repurposer',
  diagram: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'start-node',
        position: { x: 0, y: 320 },
        data: {
          segments: [],
          properties: {
            label: 'Source Content',
            description: 'One piece of long-form content to repurpose.',
            inputPrompt: `We just shipped Scheduled Reports in Lumen. You can now build any dashboard view
and have it delivered as a PDF to your inbox or a Slack channel on a daily,
weekly, or monthly cadence - no more manual exports before the Monday standup.

It works with every chart type, respects your team's access permissions, and
takes about 30 seconds to set up. Early users tell us it has quietly removed one
of the most tedious parts of their week.`,
          },
          type: 'ai-studio/trigger',
          icon: 'Lightning',
        },
        selected: false,
        measured: { width: 258, height: 63 },
        dragging: false,
      },
      {
        id: 'twitter-1',
        type: 'node',
        position: { x: 420, y: 100 },
        data: {
          segments: [],
          properties: {
            label: 'X / Twitter Thread',
            description: 'Rewrites the content as a thread.',
            systemPrompt: `Turn the source content into an engaging X/Twitter thread of 4-6 posts.
- Open with a scroll-stopping hook
- One idea per post, punchy and concrete
- End with a clear call to action
Number each post (1/, 2/, ...).`,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'linkedin-1',
        type: 'node',
        position: { x: 420, y: 320 },
        data: {
          segments: [],
          properties: {
            label: 'LinkedIn Post',
            description: 'Rewrites the content for LinkedIn.',
            systemPrompt: `Turn the source content into a LinkedIn post:
- A strong first line that earns the click-to-expand
- Short, skimmable paragraphs
- 2-3 concrete takeaways
- A closing question to drive comments
Keep it under 200 words. Professional but human.`,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'instagram-1',
        type: 'node',
        position: { x: 420, y: 540 },
        data: {
          segments: [],
          properties: {
            label: 'Instagram Caption',
            description: 'Rewrites the content as a caption.',
            systemPrompt: `Turn the source content into an Instagram caption:
- Punchy and friendly, conversational tone
- A few relevant emojis (not too many)
- A short call to action
- 5 relevant hashtags on the last line`,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'pack-1',
        type: 'node',
        position: { x: 840, y: 320 },
        data: {
          segments: [],
          properties: {
            label: 'Content Pack',
            description: 'Collects every channel into one document.',
            systemPrompt: `You receive a source brief and three repurposed drafts from previous steps: an
X/Twitter thread, a LinkedIn post, and an Instagram caption. Identify each draft
by its content and assemble them into a single content pack as markdown, one
section per channel, in exactly this shape:

## X / Twitter
[the thread]

## LinkedIn
[the post]

## Instagram
[the caption]

Keep each draft's wording as-is - do not rewrite it. Just organize and label.`,
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
        position: { x: 1260, y: 320 },
        data: {
          segments: [],
          properties: {
            label: 'Visualize',
            description: 'Renders the content pack (auto-detects the format).',
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
        target: 'twitter-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-twitter',
        data: {},
      },
      {
        source: 'trigger-1',
        sourceHandle: 'source',
        target: 'linkedin-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-linkedin',
        data: {},
      },
      {
        source: 'trigger-1',
        sourceHandle: 'source',
        target: 'instagram-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-instagram',
        data: {},
      },
      {
        source: 'twitter-1',
        sourceHandle: 'source',
        target: 'pack-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-twitter-pack',
        data: {},
      },
      {
        source: 'linkedin-1',
        sourceHandle: 'source',
        target: 'pack-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-linkedin-pack',
        data: {},
      },
      {
        source: 'instagram-1',
        sourceHandle: 'source',
        target: 'pack-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-instagram-pack',
        data: {},
      },
      {
        source: 'pack-1',
        sourceHandle: 'source',
        target: 'visualize-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-pack-visualize',
        data: {},
      },
    ],
    viewport: { x: 120, y: 80, zoom: 0.5 },
  },
  layoutDirection: 'RIGHT',
};

export const contentRepurposerFlow: TemplateModel = {
  id: 303,
  name: 'Content Repurposer',
  value: diagram,
  icon: 'Broadcast',
};
