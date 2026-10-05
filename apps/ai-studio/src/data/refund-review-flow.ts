import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { humanDecisionNodeType } from '../nodes/human-decision';
import { defaultDecisionRequest } from '../nodes/human-decision/default-properties-data';
import { reviewNodeType } from '../nodes/review';
import { reviewDecisionRequest } from '../nodes/review/default-properties-data';
import { refundReviewOutputSchema } from '../utils/ai-agent/response-options';

const REFUND_CONTEXT = `You work in customer support for Lumen, a SaaS analytics product.

Refund policy: a duplicate charge is refunded in full; an unused month on the Pro plan ($49 / month)
is refunded pro rata; refunds go back to the original card within 5 to 10 business days.
Style: empathetic, concise, no promises the team cannot keep.`;

// The Review preset with the refund form on top: the amount and the reply may be corrected, the order
// date may not, and the reasoning stays with the team, so it is not a field of the form at all.
// Only the confirmation prompt keeps it out of the reply to the customer.
export const refundReviewRequest = {
  ...reviewDecisionRequest,
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

// The senior decides on the brief, whose reasoning is the escalation note, so it is on this form, read-only.
export const seniorReviewRequest = {
  ...defaultDecisionRequest,
  schema: {
    type: 'object',
    properties: {
      refundAmount: { type: 'number', title: 'Refund amount' },
      orderDate: { type: 'string', title: 'Order date', readOnly: true },
      replyDraft: { type: 'string', title: 'Reply draft' },
      internalReasoning: { type: 'string', title: 'Internal reasoning', readOnly: true },
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
message, and draft the reply: the amount refunded, where and when it arrives, and one sentence on
preventing a repeat. Keep your reasoning about the policy for the team, not for the customer.`,
            webSearch: false,
            outputSchema: refundReviewOutputSchema,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
      },
      {
        id: 'review-1',
        type: reviewNodeType,
        position: { x: 700, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Review Refund',
            description: 'A person approves, escalates or rejects it.',
            decisionRequest: refundReviewRequest,
          },
          type: reviewNodeType,
          icon: 'Scales',
        },
      },
      {
        id: 'escalate-1',
        type: 'node',
        position: { x: 1100, y: 470 },
        data: {
          segments: [],
          properties: {
            label: 'Prepare the Escalation',
            description: 'Briefs the senior reviewer.',
            systemPrompt: `${REFUND_CONTEXT}

A first reviewer escalated the refund instead of approving it. The context holds the draft
(refundAmount, orderDate, replyDraft, internalReasoning) and their decision record, whose edits hold
every field they corrected and whose comment says why they escalated.

Re-propose the refund in the same shape, for a senior reviewer. An edited value wins over the draft,
and orderDate stays as it is. Write internalReasoning as the escalation note: why it was escalated, in
the reviewer's words, what they changed, and the policy reasoning behind the amount. It stays with
the team.`,
            webSearch: false,
            outputSchema: refundReviewOutputSchema,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
      },
      {
        id: 'senior-1',
        type: humanDecisionNodeType,
        position: { x: 1450, y: 470 },
        data: {
          segments: [],
          properties: {
            label: 'Senior Review',
            description: 'A second person decides the escalated refund.',
            decisionRequest: seniorReviewRequest,
          },
          type: humanDecisionNodeType,
          icon: 'UserCheck',
        },
      },
      {
        id: 'send-1',
        type: 'node',
        position: { x: 1800, y: 100 },
        data: {
          segments: [],
          properties: {
            label: 'Send the Confirmation',
            description: 'Writes the confirmation to the customer.',
            systemPrompt: `${REFUND_CONTEXT}

A person approved the refund, straight away or after an escalation. The context holds the draft
(refundAmount, orderDate, replyDraft, internalReasoning), an escalation brief in the same shape when
there was one, and one decision record per person who decided; the latest record's edits hold every
field that person corrected. An edited value wins over the brief, and the brief wins over the draft.
internalReasoning is for the team: leave it out.

Send replyDraft to the customer as the confirmation, keeping its wording. Change it only where the
amount it names differs from the approved refundAmount, and keep it signed "Lumen Support".
Answer with the message alone.`,
            webSearch: false,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
      },
      {
        id: 'done-1',
        type: 'node',
        position: { x: 2150, y: 100 },
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
        position: { x: 1100, y: 780 },
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
      {
        id: 'rejected-2',
        type: 'node',
        position: { x: 1800, y: 700 },
        data: {
          segments: [],
          properties: {
            label: 'Rejected by Senior',
            description: 'The senior decision record.',
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
        target: 'review-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-draft-review',
        data: {},
      },
      {
        source: 'review-1',
        sourceHandle: 'source:inner:approved',
        zIndex: 1001,
        target: 'send-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-review-send',
        data: {},
      },
      {
        source: 'review-1',
        sourceHandle: 'source:inner:escalated',
        zIndex: 1001,
        target: 'escalate-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-review-escalate',
        data: {},
      },
      {
        source: 'review-1',
        sourceHandle: 'source:inner:rejected',
        zIndex: 1001,
        target: 'rejected-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-review-rejected',
        data: {},
      },
      {
        source: 'escalate-1',
        sourceHandle: 'source',
        target: 'senior-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-escalate-senior',
        data: {},
      },
      {
        source: 'senior-1',
        sourceHandle: 'source:inner:approved',
        zIndex: 1001,
        target: 'send-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-senior-send',
        data: {},
      },
      {
        source: 'senior-1',
        sourceHandle: 'source:inner:rejected',
        zIndex: 1001,
        target: 'rejected-2',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-senior-rejected',
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
    viewport: { x: 60, y: 80, zoom: 0.5 },
  },
  layoutDirection: 'RIGHT',
};

export const refundReviewFlow: TemplateModel = {
  id: 306,
  name: 'Refund Review',
  value: diagram,
  icon: 'Receipt',
};
