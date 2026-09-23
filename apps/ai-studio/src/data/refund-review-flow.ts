import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { refundReviewOutputSchema } from '../nodes/ai-agent/response-options';
import { humanDecisionNodeType } from '../nodes/human-decision';
import { defaultDecisionRequest } from '../nodes/human-decision/default-properties-data';

const REFUND_CONTEXT = `You work in customer support for Lumen, a SaaS analytics product.

Refund policy: a duplicate charge is refunded in full; an unused month on the Pro plan ($49 / month)
is refunded pro rata; refunds go back to the original card within 5 to 10 business days.
Style: empathetic, concise, no promises the team cannot keep.`;

// The palette preset with the refund form on top: the amount and the reply may be corrected, the order
// date may not, and the reasoning stays with the team, so it is not a field of the form at all.
// Only the confirmation prompt keeps it out of the reply to the customer.
export const refundReviewRequest = {
  ...defaultDecisionRequest,
  schema: {
    type: 'object',
    properties: {
      refundAmount: { type: 'number', title: 'Refund amount' },
      orderDate: { type: 'string', title: 'Order date', readOnly: true },
      replyDraft: { type: 'string', title: 'Reply draft' },
    },
    required: ['refundAmount'],
  },
} satisfies DecisionRequest;

const diagram: DiagramModel = {
  name: 'Refund Review',
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
            label: 'Refund Request',
            description: 'A customer asks for a refund.',
            inputPrompt: `Subject: Refund for a duplicate charge

Hi, on 2026-09-02 I was charged $49 twice for my Pro plan (order #48213). Could you refund the extra charge? I would also like to know whether this will happen again next month.

Thanks,
Marcus
Head of Ops, Brightwave`,
          },
          type: 'ai-studio/trigger',
          icon: 'Lightning',
        },
      },
      {
        id: 'draft-1',
        type: 'node',
        position: { x: 350, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Draft the Refund Reply',
            description: 'Proposes a refund and drafts the reply.',
            systemPrompt: `${REFUND_CONTEXT}

Read the customer's message. Decide the refund amount under the policy, take the order date from the
message, and draft the reply. Keep your reasoning about the policy for the team, not for the customer.`,
            webSearch: false,
            outputSchema: refundReviewOutputSchema,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
      },
      {
        id: 'human-1',
        type: humanDecisionNodeType,
        position: { x: 700, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Review Refund',
            description: 'A person approves or rejects it.',
            decisionRequest: refundReviewRequest,
          },
          type: humanDecisionNodeType,
          icon: 'UserCheck',
        },
      },
      {
        id: 'send-1',
        type: 'node',
        position: { x: 1100, y: 200 },
        data: {
          segments: [],
          properties: {
            label: 'Send the Confirmation',
            description: 'Writes the confirmation to the customer.',
            systemPrompt: `${REFUND_CONTEXT}

A person approved the refund. The context holds the draft (refundAmount, orderDate, replyDraft,
internalReasoning) and the decision record. If the decision carries edits (for example a corrected
refundAmount), the edited values win over the draft. internalReasoning is for the team: leave it out.

Write the final confirmation to the customer: the amount refunded, where and when it arrives,
and one sentence on preventing a repeat. Under 100 words, signed "Lumen Support".`,
            webSearch: false,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
      },
      {
        id: 'done-1',
        type: 'node',
        position: { x: 1450, y: 200 },
        data: {
          segments: [],
          properties: {
            label: 'Confirmation',
            description: 'What the customer receives.',
            mode: 'markdown',
          },
          type: 'ai-studio/visualize',
          icon: 'Eye',
        },
      },
      {
        id: 'rejected-1',
        type: 'node',
        position: { x: 1100, y: 600 },
        data: {
          segments: [],
          properties: {
            label: 'Rejected',
            description: 'The decision record.',
            mode: 'json',
          },
          type: 'ai-studio/visualize',
          icon: 'Eye',
        },
      },
    ],
    edges: [
      {
        source: 'trigger-1',
        sourceHandle: 'source',
        target: 'draft-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-draft',
        data: {},
      },
      {
        source: 'draft-1',
        sourceHandle: 'source',
        target: 'human-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-draft-human',
        data: {},
      },
      {
        source: 'human-1',
        sourceHandle: 'source:inner:approved',
        zIndex: 1001,
        target: 'send-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-human-send',
        data: {},
      },
      {
        source: 'human-1',
        sourceHandle: 'source:inner:rejected',
        zIndex: 1001,
        target: 'rejected-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-human-rejected',
        data: {},
      },
      {
        source: 'send-1',
        sourceHandle: 'source',
        target: 'done-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-send-done',
        data: {},
      },
    ],
    viewport: { x: 100, y: 100, zoom: 0.6 },
  },
  layoutDirection: 'RIGHT',
};

export const refundReviewFlow: TemplateModel = {
  id: 306,
  name: 'Refund Review',
  value: diagram,
  icon: 'Receipt',
};
