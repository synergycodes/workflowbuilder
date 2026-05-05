import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

const PRODUCT_KNOWLEDGE = `You work for Synergy Codes, the company behind Workflow Builder.

Key product facts:
- Workflow Builder is a frontend-only SDK for building visual workflow editors, not a SaaS platform
- It's built on React Flow, extends it with node library, schema-driven properties panel, design system, plugin architecture
- White-label: can be themed and branded to match the customer's product
- Community Edition: Apache 2.0 (free, commercial use allowed)
- Enterprise Edition: one-time license EUR 6,990 (no subscription, no revenue sharing)
- Source code ownership: customer gets full source code, can modify and extend
- Use cases: embed workflow editors into B2B SaaS, build AI agent platforms, visual rule engines, automation tools
- NOT an iPaaS like n8n/Make/Zapier — those are hosted platforms, WB is an embeddable SDK
- Execution-agnostic: outputs JSON, customer builds their own execution backend
- Handles up to ~500 nodes, supports undo/redo, keyboard shortcuts, WCAG accessibility
- No telemetry, no external data — runs entirely in customer's infrastructure
- Tech stack: React, Zustand, React Flow, JSONForms, Overflow UI`;

const diagram: DiagramModel = {
  name: 'Sales Inquiry Pipeline',
  diagram: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'start-node',
        position: { x: 0, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Incoming Email',
            description: 'Customer inquiry arrives via email.',
            inputPrompt: `Hi there,

I'm a product manager at DataFlow Inc. We're building an internal automation platform and need a visual workflow editor for our users to design data pipelines.

We've looked at building something custom with React Flow but realized it would take months to get to production quality. A colleague mentioned Workflow Builder.

A few questions:
1. Can we embed it into our existing React app?
2. How does pricing work — is it per-seat or per-deployment?
3. Do you support custom node types? Our nodes would need to represent database connections, API calls, and ML model steps.
4. How does it compare to just using React Flow directly?

We'd need this for about 200 internal users. Timeline is Q3 this year.

Best,
Sarah Chen
Product Manager, DataFlow Inc.`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/trigger',
          icon: 'Lightning',
        },
        selected: false,
        measured: { width: 258, height: 63 },
        dragging: false,
      },
      {
        id: 'classify-1',
        type: 'node',
        position: { x: 350, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Classify & Extract',
            description: 'Classifies the inquiry type and extracts key details.',
            systemPrompt: `${PRODUCT_KNOWLEDGE}

Analyze the incoming customer email. Return a structured classification:

**Type:** [pricing / technical / feature-request / partnership / general]
**Urgency:** [high / medium / low]
**Company:** [extract company name if mentioned]
**Key Questions:** [bullet list of specific questions asked]
**Product Interest:** [which aspects of Workflow Builder they're asking about]

Be concise. Use the exact format above.`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'decision-1',
        type: 'decision-node',
        position: { x: 700, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Route by Type',
            description: 'Routes the inquiry to the right specialist.',
            decisionBranches: [
              {
                id: 'branch-pricing',
                sourceHandle: 'source:inner:pricing',
                label: 'Pricing',
                conditions: [
                  {
                    x: '{{nodes.classify-1.response}}',
                    y: 'pricing',
                    comparisonOperator: 'isContaining',
                    logicalOperator: 'AND',
                  },
                ],
              },
              {
                id: 'branch-technical',
                sourceHandle: 'source:inner:technical',
                label: 'Technical',
                conditions: [
                  {
                    x: '{{nodes.classify-1.response}}',
                    y: 'technical',
                    comparisonOperator: 'isContaining',
                    logicalOperator: 'AND',
                  },
                ],
              },
              {
                id: 'branch-general',
                sourceHandle: 'source:inner:general',
                label: 'General',
                conditions: [],
              },
            ],
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/decision',
          icon: 'ArrowsSplit',
        },
        selected: false,
        measured: { width: 258, height: 236 },
        dragging: false,
      },
      {
        id: 'pricing-1',
        type: 'node',
        position: { x: 1100, y: 50 },
        data: {
          segments: [],
          properties: {
            label: 'Pricing Specialist',
            description: 'Drafts a pricing-focused reply.',
            systemPrompt: `${PRODUCT_KNOWLEDGE}

You are a pricing specialist at Synergy Codes. Write a pricing-focused reply to the customer:
- Lead with clear pricing info: Enterprise EUR 6,990 one-time, Community free (Apache 2.0)
- Explain what's included in each tier
- Address any specific pricing question they asked
- Offer a call to walk through licensing details
- Keep under 180 words. Sign as "Synergy Codes Sales".`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'technical-1',
        type: 'node',
        position: { x: 1100, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Technical Specialist',
            description: 'Drafts a technical reply.',
            systemPrompt: `${PRODUCT_KNOWLEDGE}

You are a senior engineer at Synergy Codes. Write a technical reply focused on integration and extension:
- Answer technical questions concretely (embedding, custom nodes, React Flow comparison)
- Reference how the plugin architecture and schema-driven properties panel work
- Offer a demo call to show custom node patterns
- Keep under 180 words. Sign as "Synergy Codes Engineering".`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'general-1',
        type: 'node',
        position: { x: 1100, y: 550 },
        data: {
          segments: [],
          properties: {
            label: 'General Response',
            description: 'Drafts a general reply when no specialist branch matches.',
            systemPrompt: `${PRODUCT_KNOWLEDGE}

You are a sales engineer at Synergy Codes. Write a friendly general reply:
- Acknowledge the inquiry
- Summarize what Workflow Builder is in 2-3 sentences
- Ask a clarifying question to direct the conversation
- Offer a discovery call
- Keep under 150 words. Sign as "Synergy Codes Team".`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
        selected: false,
        measured: { width: 258, height: 123 },
        dragging: false,
      },
      {
        id: 'review-1',
        type: 'node',
        position: { x: 1500, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Final QA Check',
            description: 'Reviews the draft for accuracy and tone before sending.',
            systemPrompt: `${PRODUCT_KNOWLEDGE}

Review the draft email reply from the previous step. Check for:
1. **Factual accuracy** — does it match the product knowledge? Any wrong claims?
2. **Tone** — professional but approachable? Not too salesy?
3. **Completeness** — did it address all the customer's questions?
4. **Call to action** — is there a clear next step?

If everything is good, output: "✅ APPROVED" followed by the final email text.
If there are issues, output: "⚠️ NEEDS REVISION" followed by specific corrections.`,
            errors: [],
            errorPolicy: 'fail',
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
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
        target: 'classify-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-classify',
        data: {},
      },
      {
        source: 'classify-1',
        sourceHandle: 'source',
        target: 'decision-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-classify-decision',
        data: {},
      },
      {
        source: 'decision-1',
        sourceHandle: 'source:inner:pricing',
        target: 'pricing-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-decision-pricing',
        data: {},
      },
      {
        source: 'decision-1',
        sourceHandle: 'source:inner:technical',
        target: 'technical-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-decision-technical',
        data: {},
      },
      {
        source: 'decision-1',
        sourceHandle: 'source:inner:general',
        target: 'general-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-decision-general',
        data: {},
      },
      {
        source: 'pricing-1',
        sourceHandle: 'source',
        target: 'review-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-pricing-review',
        data: {},
      },
      {
        source: 'technical-1',
        sourceHandle: 'source',
        target: 'review-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-technical-review',
        data: {},
      },
      {
        source: 'general-1',
        sourceHandle: 'source',
        target: 'review-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-general-review',
        data: {},
      },
    ],
    viewport: { x: 100, y: 100, zoom: 0.6 },
  },
  layoutDirection: 'RIGHT',
};

export const salesInquiryFlow: TemplateModel = {
  id: 202,
  name: 'Sales Inquiry Pipeline',
  value: diagram,
  icon: 'Envelope',
};
