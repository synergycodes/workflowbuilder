import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

const SUPPORT_CONTEXT = `You are part of the customer support team for Lumen, a SaaS analytics product.

Plans: Free, Pro ($49 / month), and Team (custom pricing).
Support style: empathetic, concise, solution-first. Always acknowledge how the
customer feels, give concrete next steps, and never promise a timeline you cannot keep.`;

const diagram: DiagramModel = {
  name: 'Customer Support Triage',
  diagram: {
    nodes: [
      {
        id: 'trigger-1',
        type: 'start-node',
        position: { x: 0, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'New Support Ticket',
            description: 'A support ticket arrives in the shared inbox.',
            inputPrompt: `Subject: Charged twice AND export is broken

Hi, I've been on the Pro plan for 8 months and I just noticed TWO $49 charges on my card this month instead of one. On top of that, the CSV export on the Reports page has been stuck on a spinner for two days.

I have a board meeting on Thursday and I genuinely need that export working. This is really frustrating - can someone please sort out the refund and tell me how to get my data out?

Thanks,
Marcus
Head of Ops, Brightwave`,
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
        id: 'classify-1',
        type: 'node',
        position: { x: 350, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Classify Ticket',
            description: 'Detects the primary issue type, urgency and sentiment.',
            systemPrompt: `${SUPPORT_CONTEXT}

Read the incoming support ticket and classify it. A ticket may mention several
problems - pick the SINGLE most important one as the primary type.

Return exactly this format:

**Type:** [one of: billing / bug / how-to / other]
**Urgency:** [high / medium / low]
**Sentiment:** [happy / neutral / frustrated]
**Summary:** [one sentence describing the core request]
**Also mentioned:** [any secondary issues, or "none"]

Use the exact lowercase keyword on the Type line - it drives downstream routing.`,
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
        id: 'decision-1',
        type: 'decision-node',
        position: { x: 700, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Route by Type',
            description: 'Sends the ticket to the right responder.',
            decisionBranches: [
              {
                id: 'branch-billing',
                sourceHandle: 'source:inner:billing',
                label: 'Billing',
                conditions: [
                  {
                    x: '{{nodes.classify-1.response}}',
                    y: 'billing',
                    comparisonOperator: 'isContaining',
                    logicalOperator: 'AND',
                  },
                ],
              },
              {
                id: 'branch-bug',
                sourceHandle: 'source:inner:bug',
                label: 'Bug',
                conditions: [
                  {
                    x: '{{nodes.classify-1.response}}',
                    y: 'bug',
                    comparisonOperator: 'isContaining',
                    logicalOperator: 'AND',
                  },
                ],
              },
              {
                id: 'branch-general',
                sourceHandle: 'source:inner:general',
                label: 'How-to / Other',
                conditions: [],
              },
            ],
            errors: [],
          },
          type: 'ai-studio/decision',
          icon: 'ArrowsSplit',
        },
        selected: false,
        measured: { width: 258, height: 236 },
        dragging: false,
      },
      {
        id: 'billing-1',
        type: 'node',
        position: { x: 1100, y: 50 },
        data: {
          segments: [],
          properties: {
            label: 'Billing Reply',
            description: 'Drafts a reply for billing and payment issues.',
            systemPrompt: `${SUPPORT_CONTEXT}

You handle billing issues. Draft a reply to the customer:
- Open by acknowledging the problem and apologising for the duplicate charge
- Explain the refund will be issued to the original card and how long it usually takes
- If they also reported a non-billing problem, tell them you've looped in the right team and they'll hear back separately
- End with a clear next step
- Keep it under 160 words. Sign as "Lumen Support".`,
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
        id: 'bug-1',
        type: 'node',
        position: { x: 1100, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Bug Triage Reply',
            description: 'Drafts a reply for product bugs and breakage.',
            systemPrompt: `${SUPPORT_CONTEXT}

You triage product bugs. Draft a reply to the customer:
- Acknowledge the broken behaviour and that it is not expected
- Offer a workaround if a plausible one exists (e.g. a different export path)
- Ask for the details engineering will need: browser, time it last worked, a screenshot
- Set honest expectations - it has been escalated, not "fixed by Thursday"
- Keep it under 160 words. Sign as "Lumen Support".`,
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
        id: 'general-1',
        type: 'node',
        position: { x: 1100, y: 550 },
        data: {
          segments: [],
          properties: {
            label: 'How-to Reply',
            description: 'Drafts a reply for how-to questions and everything else.',
            systemPrompt: `${SUPPORT_CONTEXT}

You answer how-to and general questions. Draft a friendly reply:
- Acknowledge the question
- Give a concrete, step-by-step answer if you can, or ask one clarifying question if you can't
- Point to the relevant Help Center section
- Keep it under 140 words. Sign as "Lumen Support".`,
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
        id: 'qa-1',
        type: 'node',
        position: { x: 1500, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Tone & Accuracy QA',
            description: 'Reviews the drafted reply before it goes out.',
            systemPrompt: `${SUPPORT_CONTEXT}

Review the drafted reply from the previous step before it is sent. Check:
1. **Tone** - empathetic and professional, not defensive or robotic?
2. **Accuracy** - does it match the plan and policy facts above? No invented promises?
3. **Completeness** - did it address the customer's main request?
4. **Next step** - is there a clear call to action?

If it is good, output "✅ APPROVED" followed by the final reply text.
If not, output "⚠️ NEEDS REVISION" followed by specific, actionable fixes.`,
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
        position: { x: 1850, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Visualize',
            description: 'Visualizes the approved reply (auto-detects the format).',
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
        sourceHandle: 'source:inner:billing',
        zIndex: 1001,
        target: 'billing-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-decision-billing',
        data: {},
      },
      {
        source: 'decision-1',
        sourceHandle: 'source:inner:bug',
        zIndex: 1001,
        target: 'bug-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-decision-bug',
        data: {},
      },
      {
        source: 'decision-1',
        sourceHandle: 'source:inner:general',
        zIndex: 1001,
        target: 'general-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-decision-general',
        data: {},
      },
      {
        source: 'billing-1',
        sourceHandle: 'source',
        target: 'qa-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-billing-qa',
        data: {},
      },
      {
        source: 'bug-1',
        sourceHandle: 'source',
        target: 'qa-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-bug-qa',
        data: {},
      },
      {
        source: 'general-1',
        sourceHandle: 'source',
        target: 'qa-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-general-qa',
        data: {},
      },
      {
        source: 'qa-1',
        sourceHandle: 'source',
        target: 'visualize-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-qa-visualize',
        data: {},
      },
    ],
    viewport: { x: 100, y: 100, zoom: 0.6 },
  },
  layoutDirection: 'RIGHT',
};

export const supportTriageFlow: TemplateModel = {
  id: 301,
  name: 'Customer Support Triage',
  value: diagram,
  icon: 'Envelope',
};
