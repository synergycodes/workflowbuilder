import type { DiagramModel, TemplateModel } from '@workflowbuilder/sdk';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { humanDecisionNodeType } from '../nodes/human-decision';
import { defaultDecisionRequest } from '../nodes/human-decision/default-properties-data';

const CLAIMS_CONTEXT = `You work in claims handling for XYZ Insurance, a home and travel insurer.

Rules: a covered loss is paid at the amount claimed minus the policy deductible, never above the
coverage limit; a loss the policy excludes is not paid; earlier claims of the same kind are worth a
note for the reviewer, not a reason to refuse on their own.
Style: plain, respectful, no promises beyond the decision. Address the claimant by the name as the
claim gives it, adding no title.`;

const policyRecords = {
  'HM-20417': {
    product: 'Home',
    coverage: ['water damage', 'fire', 'theft'],
    coverageLimit: 50_000,
    deductible: 250,
    exclusions: ['gradual leaks left unrepaired', 'flood from outside the building'],
  },
  'HM-31088': {
    product: 'Travel',
    coverage: ['medical costs abroad', 'lost luggage', 'trip cancellation'],
    coverageLimit: 10_000,
    deductible: 100,
    exclusions: ['pre-existing conditions', 'luggage left unattended'],
  },
};

// Every policy needs a record here too: a lookup with no record fails the run.
const claimHistoryRecords = {
  'HM-20417': {
    claims: [{ date: '2026-03-14', kind: 'water damage', paid: 1900 }],
  },
  'HM-31088': {
    claims: [],
  },
};

const claimRequest = {
  claimId: 'CL-48213',
  policyNumber: 'HM-20417',
  claimant: 'M. Keller',
  incident: 'A washing machine hose burst on 2026-09-21 and flooded the kitchen floor of the insured flat.',
  amountClaimed: 2400,
};

export const claimAssessmentSchema = {
  type: 'object',
  properties: {
    proposedPayout: {
      type: 'number',
      title: 'Proposed payout',
      description: 'In USD, under the payout rules; 0 when not covered.',
    },
    coverageVerdict: {
      type: 'string',
      title: 'Coverage verdict',
      description: 'One sentence: whether the policy covers this loss and under which coverage or exclusion.',
    },
    rationale: {
      type: 'string',
      title: 'Rationale',
      description: 'For the reviewer: how the payout follows from the policy and what the claim history adds.',
    },
  },
  required: ['proposedPayout', 'coverageVerdict', 'rationale'],
  additionalProperties: false,
};

const letterSchema = {
  type: 'object',
  properties: {
    letter: {
      type: 'string',
      title: 'Letter',
      description: 'The letter to the insured, no subject line: under 150 words, signed "XYZ Insurance Claims".',
    },
  },
  required: ['letter'],
  additionalProperties: false,
};

export const claimReviewRequest = {
  ...defaultDecisionRequest,
  schema: {
    type: 'object',
    properties: {
      proposedPayout: { type: 'number', title: 'Proposed payout' },
      coverageVerdict: { type: 'string', title: 'Coverage verdict', readOnly: true },
      rationale: { type: 'string', title: 'Rationale', readOnly: true },
    },
    required: ['proposedPayout'],
  },
} satisfies DecisionRequest;

const diagram: DiagramModel = {
  name: 'Claim Review',
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
            label: 'Claim comes in',
            description: 'The insured reports a loss.',
            inputPrompt: JSON.stringify(claimRequest, null, 2),
          },
          type: 'ai-studio/trigger',
          icon: 'Lightning',
        },
      },
      {
        id: 'policy-1',
        type: 'node',
        position: { x: 350, y: 150 },
        data: {
          segments: [],
          properties: {
            label: 'Get the policy',
            description: 'Coverage, limit and deductible.',
            key: '{{trigger.policyNumber}}',
            records: JSON.stringify(policyRecords, null, 2),
          },
          type: 'ai-studio/lookup',
          icon: 'MagnifyingGlass',
        },
      },
      {
        id: 'history-1',
        type: 'node',
        position: { x: 350, y: 450 },
        data: {
          segments: [],
          properties: {
            label: 'Get claim history',
            description: 'Earlier claims on the policy.',
            key: '{{trigger.policyNumber}}',
            records: JSON.stringify(claimHistoryRecords, null, 2),
          },
          type: 'ai-studio/lookup',
          icon: 'MagnifyingGlass',
        },
      },
      {
        id: 'assess-1',
        type: 'node',
        position: { x: 700, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Assess the claim',
            description: 'Proposes a payout for the reviewer.',
            systemPrompt: `${CLAIMS_CONTEXT}

The context holds the claim (trigger-1), the policy (policy-1) and the claim history (history-1).
Decide whether the policy covers the loss and propose the payout under the rules. Explain it for the
reviewer.`,
            webSearch: false,
            outputSchema: claimAssessmentSchema,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
      },
      {
        id: 'review-1',
        type: humanDecisionNodeType,
        position: { x: 1050, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Review the claim',
            description: 'A claims handler approves or rejects it.',
            decisionRequest: claimReviewRequest,
          },
          type: humanDecisionNodeType,
          icon: 'UserCheck',
        },
      },
      {
        id: 'letter-1',
        type: 'node',
        position: { x: 1450, y: 150 },
        data: {
          segments: [],
          properties: {
            label: 'Draft the letter',
            description: 'Writes the settlement letter.',
            systemPrompt: `${CLAIMS_CONTEXT}

A claims handler approved the claim. The context holds the claim, the policy, the assessment
(proposedPayout, coverageVerdict, rationale) and the decision record (review-1), whose edits hold
every field the handler corrected. An edited value wins over the assessment.

Write the settlement letter to the claimant: the claim number, the loss it covers and the approved
payout in USD. Do not show how the amount was calculated. Leave the rationale and the claim history
out.`,
            webSearch: false,
            outputSchema: letterSchema,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
      },
      {
        id: 'decline-1',
        type: 'node',
        position: { x: 1450, y: 500 },
        data: {
          segments: [],
          properties: {
            label: 'Record the decline',
            description: 'The decision record.',
            mode: 'json',
          },
          type: 'ai-studio/visualize',
          icon: 'Eye',
        },
      },
      {
        id: 'notify-1',
        type: 'node',
        position: { x: 1800, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Notify the insured',
            description: 'Writes the message the insured receives.',
            systemPrompt: `${CLAIMS_CONTEXT}

The context holds the claim and the decision record (review-1). If the claim was approved, it also
holds the letter (letter-1): send the letter, keeping its wording, and apply any later edit from a
decision record, where an edited value wins. If the claim was rejected, write a short message with
the claim number and the reason from the decision record, signed "XYZ Insurance Claims".
Answer with the message alone.`,
            webSearch: false,
          },
          type: 'ai-studio/ai-agent',
          icon: 'AiAgent',
        },
      },
      {
        id: 'sent-1',
        type: 'node',
        position: { x: 2150, y: 300 },
        data: {
          segments: [],
          properties: {
            label: 'Sent to the insured',
            description: 'What the insured receives.',
            mode: 'markdown',
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
        target: 'policy-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-policy',
        data: {},
      },
      {
        source: 'trigger-1',
        sourceHandle: 'source',
        target: 'history-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-trigger-history',
        data: {},
      },
      {
        source: 'policy-1',
        sourceHandle: 'source',
        target: 'assess-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-policy-assess',
        data: {},
      },
      {
        source: 'history-1',
        sourceHandle: 'source',
        target: 'assess-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-history-assess',
        data: {},
      },
      {
        source: 'assess-1',
        sourceHandle: 'source',
        target: 'review-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-assess-review',
        data: {},
      },
      {
        source: 'review-1',
        sourceHandle: 'source:inner:approved',
        zIndex: 1001,
        target: 'letter-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-review-letter',
        data: {},
      },
      {
        source: 'review-1',
        sourceHandle: 'source:inner:rejected',
        zIndex: 1001,
        target: 'decline-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-review-decline',
        data: {},
      },
      {
        source: 'letter-1',
        sourceHandle: 'source',
        target: 'notify-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-letter-notify',
        data: {},
      },
      {
        source: 'decline-1',
        sourceHandle: 'source',
        target: 'notify-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-decline-notify',
        data: {},
      },
      {
        source: 'notify-1',
        sourceHandle: 'source',
        target: 'sent-1',
        targetHandle: 'target',
        type: 'labelEdge',
        id: 'edge-notify-sent',
        data: {},
      },
    ],
    viewport: { x: 100, y: 100, zoom: 0.5 },
  },
  layoutDirection: 'RIGHT',
};

export const claimReviewFlow: TemplateModel = {
  id: 307,
  name: 'Claim Review',
  value: diagram,
  icon: 'ShieldCheck',
};
